-- 005_profiles_orders_templates_storage.sql
-- Erweiterung: profiles, image_orders, image_templates, storage + grants/policies

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- Schema- und Tabellenrechte (Fix für "permission denied for public schema")
-- -----------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

-- Für App-Rollen keine CREATE-Rechte auf public vergeben (Sicherheitsstandard).
-- Der Migrations-User (postgres/service_role) erstellt Strukturen.

-- -----------------------------------------------------
-- Profiles: 1:1 zu auth.users
-- -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  company_name text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select on table public.profiles to anon;
grant all privileges on table public.profiles to service_role;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = id);

create index if not exists profiles_email_idx on public.profiles(email);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, company_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        company_name = excluded.company_name,
        phone = excluded.phone,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- -----------------------------------------------------
-- image_orders: input/output Bildpfade + account_id + automatische Auftragsnummer
-- -----------------------------------------------------
create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  date_part text;
  random_chunk text;
begin
  date_part := to_char(timezone('utc', now()), 'YYYYMMDD');
  random_chunk := upper(substring(md5(gen_random_uuid()::text) from 1 for 4));
  return 'AUF-' || date_part || '-' || random_chunk;
end;
$$;

alter table public.image_orders
  add column if not exists account_id uuid references public.profiles(id) on delete set null,
  add column if not exists input_image text,
  add column if not exists output_image text;

alter table public.image_orders
  alter column order_number set default public.generate_order_number();

update public.image_orders
set order_number = public.generate_order_number()
where order_number is null or btrim(order_number) = '';

alter table public.image_orders
  alter column order_number set not null;

create index if not exists image_orders_account_id_idx on public.image_orders(account_id);
create index if not exists image_orders_created_at_idx on public.image_orders(created_at desc);

-- -----------------------------------------------------
-- image_templates: single tag, color, usage_count, note/comment Struktur
-- -----------------------------------------------------

-- note von jsonb -> text migrieren
alter table public.image_templates
  alter column note drop default;

alter table public.image_templates
  alter column note type text
  using (
    case
      when note is null then ''
      when jsonb_typeof(note) = 'string' then trim(both '"' from note::text)
      when note = '{}'::jsonb then ''
      else note::text
    end
  );

alter table public.image_templates
  alter column note set default '',
  alter column note set not null;

alter table public.image_templates
  add column if not exists account_id uuid references public.profiles(id) on delete set null,
  add column if not exists comment jsonb not null default '[]'::jsonb,
  add column if not exists tag text,
  add column if not exists color text not null default '#E8F8F0',
  add column if not exists usage_count integer not null default 0;

-- tags[] -> tag (nur erster Tag)
update public.image_templates
set tag = nullif(tags[1], '')
where tag is null and array_length(tags, 1) is not null;

alter table public.image_templates drop column if exists tags;

update public.image_templates
set comment = '[]'::jsonb
where comment is null;

alter table public.image_templates
  drop constraint if exists image_templates_usage_count_non_negative;

alter table public.image_templates
  add constraint image_templates_usage_count_non_negative check (usage_count >= 0);

create or replace function public.is_comment_list_of_user_system(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(payload) = 'array'
    and coalesce((
      select bool_and(
        jsonb_typeof(elem) = 'object'
        and (elem ? 'User')
        and (elem ? 'System')
        and (
          select count(*)
          from jsonb_object_keys(elem)
        ) = 2
        and jsonb_typeof(elem->'User') = 'string'
        and jsonb_typeof(elem->'System') = 'string'
      )
      from jsonb_array_elements(payload) elem
    ), true);
$$;

alter table public.image_templates
  drop constraint if exists image_templates_comment_shape_check;

alter table public.image_templates
  add constraint image_templates_comment_shape_check
  check (public.is_comment_list_of_user_system(comment));

create index if not exists image_templates_tag_search_idx on public.image_templates(lower(tag));
create index if not exists image_templates_usage_count_idx on public.image_templates(usage_count desc);

-- -----------------------------------------------------
-- Grants auf bestehende Tabellen (Client read/write via RLS)
-- -----------------------------------------------------
grant select, insert, update, delete on table public.image_orders to authenticated;
grant select on table public.image_orders to anon;
grant all privileges on table public.image_orders to service_role;

grant select, insert, update, delete on table public.image_templates to authenticated;
grant select on table public.image_templates to anon;
grant all privileges on table public.image_templates to service_role;

-- -----------------------------------------------------
-- Storage Bucket + Policies
-- -----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-images',
  'order-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Alte Buckets manuell prüfen/entfernen (optional):
-- select id, name, public from storage.buckets order by name;
-- delete from storage.objects where bucket_id in ('ALTER_BUCKET_1', 'ALTER_BUCKET_2');
-- delete from storage.buckets where id in ('ALTER_BUCKET_1', 'ALTER_BUCKET_2');

alter table storage.objects enable row level security;

drop policy if exists "order_images_read_own" on storage.objects;
create policy "order_images_read_own"
on storage.objects
for select
using (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "order_images_insert_own" on storage.objects;
create policy "order_images_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "order_images_update_own" on storage.objects;
create policy "order_images_update_own"
on storage.objects
for update
using (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "order_images_delete_own" on storage.objects;
create policy "order_images_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- updated_at Trigger für profiles ergänzen (nutzt bestehende Funktion aus 004)
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at_timestamp();
