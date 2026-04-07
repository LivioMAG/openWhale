-- Tabelle für Bildbearbeitungs-Einträge
create table if not exists public.image_editings (
  id bigint generated always as identity primary key,
  template boolean not null default false,
  template_img_url text,
  variable_template_text boolean not null default false,
  template_info text,
  image_url text not null,
  nano2_prompt text,
  active boolean not null default true,
  image boolean not null default true,
  created_at timestamptz not null default now()
);

-- Migration bestehender Installationen (falls Tabelle/Spalten schon vorhanden sind)
alter table public.image_editings add column if not exists image_url text;
alter table public.image_editings add column if not exists nano2_prompt text;
alter table public.image_editings add column if not exists active boolean not null default true;

-- Falls alte Spalte banana2_prompt vorhanden ist, Werte übernehmen
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'image_editings'
      and column_name = 'banana2_prompt'
  ) then
    execute 'update public.image_editings set nano2_prompt = coalesce(nano2_prompt, banana2_prompt)';
  end if;
end $$;

-- Grundlegende Validierungen
alter table public.image_editings
  drop constraint if exists image_editings_template_requires_image,
  add constraint image_editings_template_requires_image
  check (template = false or template_img_url is not null);

alter table public.image_editings
  drop constraint if exists image_editings_variable_text_requires_info,
  add constraint image_editings_variable_text_requires_info
  check (variable_template_text = false or coalesce(length(trim(template_info)), 0) > 0);

-- Row Level Security aktivieren
alter table public.image_editings enable row level security;

-- Policies (für authentifizierte Benutzer)
drop policy if exists "auth users can read image_editings" on public.image_editings;
create policy "auth users can read image_editings"
  on public.image_editings
  for select
  to authenticated
  using (true);

drop policy if exists "auth users can insert image_editings" on public.image_editings;
create policy "auth users can insert image_editings"
  on public.image_editings
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth users can update image_editings" on public.image_editings;
create policy "auth users can update image_editings"
  on public.image_editings
  for update
  to authenticated
  using (true)
  with check (true);

-- Storage Buckets für Uploads
insert into storage.buckets (id, name, public)
values ('template-images', 'template-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('image-editing-images', 'image-editing-images', true)
on conflict (id) do nothing;

-- Storage Policy: Upload/Lesen für authentifizierte Benutzer
drop policy if exists "auth users can upload template images" on storage.objects;
create policy "auth users can upload template images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'template-images');

drop policy if exists "auth users can read template images" on storage.objects;
create policy "auth users can read template images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'template-images');

drop policy if exists "auth users can upload image-editing images" on storage.objects;
create policy "auth users can upload image-editing images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'image-editing-images');

drop policy if exists "auth users can read image-editing images" on storage.objects;
create policy "auth users can read image-editing images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'image-editing-images');
