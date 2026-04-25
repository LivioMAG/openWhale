-- XXX_full_setup.sql
-- Komplettes Setup für eine neue Supabase-Instanz
-- Enthält: profiles, image_orders, image_templates + Storage Bucket/Policies

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

-- -----------------------------------------------------
-- Basisfunktionen
-- -----------------------------------------------------
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

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

-- -----------------------------------------------------
-- Tabellen
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

create table if not exists public.image_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.profiles(id) on delete set null,
  order_number text not null unique default public.generate_order_number(),
  order_name text,
  immobilie_uid text,
  input_image text,
  output_image text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.image_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.profiles(id) on delete set null,
  note text not null default '',
  prompt text not null,
  comment jsonb not null default '[]'::jsonb,
  tag text,
  color text not null default '#E8F8F0',
  usage_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint image_templates_usage_count_non_negative check (usage_count >= 0),
  constraint image_templates_comment_shape_check
    check (public.is_comment_list_of_user_system(comment))
);

-- -----------------------------------------------------
-- Trigger/Funktionen für Profile
-- -----------------------------------------------------
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

-- updated_at triggers

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists set_image_orders_updated_at on public.image_orders;
create trigger set_image_orders_updated_at
before update on public.image_orders
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists set_image_templates_updated_at on public.image_templates;
create trigger set_image_templates_updated_at
before update on public.image_templates
for each row execute function public.set_updated_at_timestamp();

-- -----------------------------------------------------
-- Indizes
-- -----------------------------------------------------
create index if not exists profiles_email_idx on public.profiles(email);

create index if not exists image_orders_user_id_idx on public.image_orders(user_id);
create index if not exists image_orders_account_id_idx on public.image_orders(account_id);
create index if not exists image_orders_created_at_idx on public.image_orders(created_at desc);

create index if not exists image_templates_user_id_idx on public.image_templates(user_id);
create index if not exists image_templates_tag_search_idx on public.image_templates(lower(tag));
create index if not exists image_templates_usage_count_idx on public.image_templates(usage_count desc);

-- -----------------------------------------------------
-- RLS + Policies
-- -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.image_orders enable row level security;
alter table public.image_templates enable row level security;

-- profiles

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

-- image_orders

drop policy if exists "image_orders_select_own" on public.image_orders;
create policy "image_orders_select_own" on public.image_orders
for select using (auth.uid() = user_id);

drop policy if exists "image_orders_insert_own" on public.image_orders;
create policy "image_orders_insert_own" on public.image_orders
for insert with check (auth.uid() = user_id);

drop policy if exists "image_orders_update_own" on public.image_orders;
create policy "image_orders_update_own" on public.image_orders
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "image_orders_delete_own" on public.image_orders;
create policy "image_orders_delete_own" on public.image_orders
for delete using (auth.uid() = user_id);

-- image_templates

drop policy if exists "image_templates_select_own" on public.image_templates;
create policy "image_templates_select_own" on public.image_templates
for select using (auth.uid() = user_id);

drop policy if exists "image_templates_insert_own" on public.image_templates;
create policy "image_templates_insert_own" on public.image_templates
for insert with check (auth.uid() = user_id);

drop policy if exists "image_templates_update_own" on public.image_templates;
create policy "image_templates_update_own" on public.image_templates
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "image_templates_delete_own" on public.image_templates;
create policy "image_templates_delete_own" on public.image_templates
for delete using (auth.uid() = user_id);

-- -----------------------------------------------------
-- Grants
-- -----------------------------------------------------
grant select on table public.profiles to anon;
grant select, insert, update, delete on table public.profiles to authenticated;
grant all privileges on table public.profiles to service_role;

grant select on table public.image_orders to anon;
grant select, insert, update, delete on table public.image_orders to authenticated;
grant all privileges on table public.image_orders to service_role;

grant select on table public.image_templates to anon;
grant select, insert, update, delete on table public.image_templates to authenticated;
grant all privileges on table public.image_templates to service_role;

-- -----------------------------------------------------
-- Storage (nur ein Bucket: order-images)
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

-- Andere Buckets nur dann entfernen, wenn sie leer sind.
-- WICHTIG: Objekte über die Storage API entfernen, z. B. supabase.storage.from(bucket).remove([...]).
-- Direktes DELETE auf storage.objects ist durch storage.protect_delete() gesperrt.
delete from storage.buckets b
where b.id <> 'order-images'
  and not exists (
    select 1
    from storage.objects o
    where o.bucket_id = b.id
  );

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
