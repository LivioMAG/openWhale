-- Tabelle für Bildbearbeitungs-Vorlagen
create table if not exists public.image_editings (
  id bigint generated always as identity primary key,
  template boolean not null default false,
  template_img_url text,
  variable_template_text boolean not null default false,
  template_info text,
  image_editing text not null,
  banana2_prompt text,
  image boolean not null default true,
  created_at timestamptz not null default now()
);

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

-- Storage Bucket für Template-Bilder
insert into storage.buckets (id, name, public)
values ('template-images', 'template-images', true)
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
