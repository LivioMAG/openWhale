-- Tabelle für Bildbearbeitungs-Einträge
create table if not exists public.image_editings (
  id bigint generated always as identity primary key,
  name text not null default 'Neuer Eintrag',
  template boolean not null default false,
  template_img_url text,
  variable_template_text boolean not null default false,
  template_info text,
  editing_instructions text not null,
  image_url text,
  nano2_prompt text,
  active boolean not null default false,
  image boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migration bestehender Installationen (falls Tabelle/Spalten schon vorhanden sind)
alter table public.image_editings add column if not exists image_url text;
alter table public.image_editings add column if not exists nano2_prompt text;
alter table public.image_editings add column if not exists active boolean not null default false;
alter table public.image_editings add column if not exists editing_instructions text;
alter table public.image_editings add column if not exists name text;

update public.image_editings
set editing_instructions = coalesce(editing_instructions, template_info, 'Keine Angabe')
where editing_instructions is null;

update public.image_editings
set name = coalesce(nullif(trim(name), ''), 'Eintrag #' || id::text)
where name is null or trim(name) = '';

alter table public.image_editings alter column editing_instructions set not null;
alter table public.image_editings alter column name set not null;
alter table public.image_editings alter column image_url drop not null;

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

alter table public.image_editings
  drop constraint if exists image_editings_editing_instructions_required,
  add constraint image_editings_editing_instructions_required
  check (coalesce(length(trim(editing_instructions)), 0) > 0);

alter table public.image_editings
  drop constraint if exists image_editings_name_required,
  add constraint image_editings_name_required
  check (coalesce(length(trim(name)), 0) > 0);

-- Behebt "permission denied for schema public"
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.image_editings to authenticated, service_role;
grant usage, select on sequence public.image_editings_id_seq to authenticated, service_role;
alter default privileges in schema public
  grant all on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

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

drop policy if exists "auth users can delete image_editings" on public.image_editings;
create policy "auth users can delete image_editings"
  on public.image_editings
  for delete
  to authenticated
  using (true);

-- Tabelle für Vorschau-Jobs zur Bildbearbeitung
create table if not exists public.image_editing_previews (
  id bigint generated always as identity primary key,
  image_editing_id bigint not null references public.image_editings(id) on delete cascade,
  source_image_url text not null,
  result_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_editing_previews_source_required
    check (coalesce(length(trim(source_image_url)), 0) > 0)
);

create or replace function public.set_image_editing_previews_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_image_editing_previews_updated_at on public.image_editing_previews;
create trigger trg_image_editing_previews_updated_at
before update on public.image_editing_previews
for each row
execute function public.set_image_editing_previews_updated_at();

grant all on table public.image_editing_previews to authenticated, service_role;
grant usage, select on sequence public.image_editing_previews_id_seq to authenticated, service_role;
alter table public.image_editing_previews enable row level security;

drop policy if exists "auth users can read image_editing_previews" on public.image_editing_previews;
create policy "auth users can read image_editing_previews"
  on public.image_editing_previews
  for select
  to authenticated
  using (true);

drop policy if exists "auth users can insert image_editing_previews" on public.image_editing_previews;
create policy "auth users can insert image_editing_previews"
  on public.image_editing_previews
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth users can update image_editing_previews" on public.image_editing_previews;
create policy "auth users can update image_editing_previews"
  on public.image_editing_previews
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

-- =========================================
-- Vorlagen (Post + Carousel)
-- =========================================

create table if not exists public.content_templates (
  id bigint generated always as identity primary key,
  template_type text not null check (template_type in ('post', 'carousel')),
  name text not null default 'Neue Vorlage',
  caption_requirements text not null,
  hashtag_requirements text not null,
  special_requirements text,
  image_editing_template_id bigint not null references public.image_editings(id),
  carousel_structure jsonb,
  caption_prompt text,
  hashtag_prompt text,
  webhook_status text not null default 'pending' check (webhook_status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_templates_name_required
    check (coalesce(length(trim(name)), 0) > 0),
  constraint content_templates_caption_required
    check (coalesce(length(trim(caption_requirements)), 0) > 0),
  constraint content_templates_hashtag_required
    check (coalesce(length(trim(hashtag_requirements)), 0) > 0),
  constraint content_templates_carousel_structure_required
    check (
      template_type = 'post'
      or (
        jsonb_typeof(carousel_structure) = 'array'
        and jsonb_array_length(carousel_structure) > 0
        and jsonb_array_length(carousel_structure) <= 10
      )
    ),
  constraint content_templates_post_without_carousel_structure
    check (
      template_type = 'carousel'
      or carousel_structure is null
    )
);

alter table public.content_templates add column if not exists special_requirements text;

alter table public.content_templates
  drop constraint if exists content_templates_carousel_structure_required,
  add constraint content_templates_carousel_structure_required
  check (
    template_type = 'post'
    or (
      jsonb_typeof(carousel_structure) = 'array'
      and jsonb_array_length(carousel_structure) > 0
      and jsonb_array_length(carousel_structure) <= 10
    )
  );

comment on table public.content_templates is
  'Vorlagen für Beitragserstellung (Post/Carousel) inkl. Prompt- und Webhook-Status.';

comment on column public.content_templates.carousel_structure is
  'Nur bei Carousel: JSONB List of Maps mit Reihenfolge z. B. [{"position":1,"template_id":10},{"position":2,"template_id":12}]';

create or replace function public.set_content_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_content_templates_updated_at on public.content_templates;
create trigger trg_content_templates_updated_at
before update on public.content_templates
for each row
execute function public.set_content_templates_updated_at();

grant all on table public.content_templates to authenticated, service_role;
grant usage, select on sequence public.content_templates_id_seq to authenticated, service_role;

alter table public.content_templates enable row level security;

drop policy if exists "auth users can read content_templates" on public.content_templates;
create policy "auth users can read content_templates"
  on public.content_templates
  for select
  to authenticated
  using (true);

drop policy if exists "auth users can insert content_templates" on public.content_templates;
create policy "auth users can insert content_templates"
  on public.content_templates
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth users can update content_templates" on public.content_templates;
create policy "auth users can update content_templates"
  on public.content_templates
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "auth users can delete content_templates" on public.content_templates;
create policy "auth users can delete content_templates"
  on public.content_templates
  for delete
  to authenticated
  using (true);

-- =========================================
-- Medienpool für Post-Vorbereitung (Bilder + Videos + Gruppen)
-- =========================================

create table if not exists public.media_assets (
  id text primary key default substr(gen_random_uuid()::text, 1, 8),
  name text not null,
  media_type text not null check (media_type in ('image', 'video')),
  file_url text not null,
  group_id text,
  group_name text,
  rating smallint check (rating between 1 and 3),
  created_at timestamptz not null default now()
);

alter table public.media_assets add column if not exists group_name text;
alter table public.media_assets add column if not exists rating smallint;
alter table public.media_assets drop constraint if exists media_assets_rating_range;
alter table public.media_assets
  add constraint media_assets_rating_range
  check (rating is null or rating between 1 and 3);

grant all on table public.media_assets to authenticated, service_role;
alter table public.media_assets enable row level security;

drop policy if exists "auth users can read media_assets" on public.media_assets;
create policy "auth users can read media_assets"
  on public.media_assets
  for select
  to authenticated
  using (true);

drop policy if exists "auth users can insert media_assets" on public.media_assets;
create policy "auth users can insert media_assets"
  on public.media_assets
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth users can update media_assets" on public.media_assets;
create policy "auth users can update media_assets"
  on public.media_assets
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "auth users can delete media_assets" on public.media_assets;
create policy "auth users can delete media_assets"
  on public.media_assets
  for delete
  to authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('media-assets', 'media-assets', true)
on conflict (id) do nothing;

drop policy if exists "auth users can upload media assets" on storage.objects;
create policy "auth users can upload media assets"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'media-assets');

drop policy if exists "auth users can read media assets" on storage.objects;
create policy "auth users can read media assets"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'media-assets');

-- =========================================
-- Posting Queue (aus Bibliothek -> Weiter)
-- =========================================

create table if not exists public.posting_jobs (
  id bigint generated always as identity primary key,
  payload jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  "isDone" boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posting_jobs add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.posting_jobs add column if not exists output jsonb not null default '{}'::jsonb;
alter table public.posting_jobs add column if not exists "isDone" boolean not null default false;
alter table public.posting_jobs add column if not exists updated_at timestamptz not null default now();

alter table public.posting_jobs drop column if exists content_template_id;
alter table public.posting_jobs drop column if exists content_template_name;
alter table public.posting_jobs drop column if exists content_type;
alter table public.posting_jobs drop column if exists posted_by_user_id;
alter table public.posting_jobs drop column if exists post_input;
alter table public.posting_jobs drop column if exists posting_name;
alter table public.posting_jobs drop column if exists units;
alter table public.posting_jobs drop column if exists image_editing_image_map;

create or replace function public.set_posting_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_posting_jobs_updated_at on public.posting_jobs;
create trigger trg_posting_jobs_updated_at
before update on public.posting_jobs
for each row
execute function public.set_posting_jobs_updated_at();

grant all on table public.posting_jobs to authenticated, service_role;
grant usage, select on sequence public.posting_jobs_id_seq to authenticated, service_role;

alter table public.posting_jobs enable row level security;

drop policy if exists "auth users can read posting_jobs" on public.posting_jobs;
create policy "auth users can read posting_jobs"
  on public.posting_jobs
  for select
  to authenticated
  using (true);

drop policy if exists "auth users can insert posting_jobs" on public.posting_jobs;
create policy "auth users can insert posting_jobs"
  on public.posting_jobs
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth users can update posting_jobs" on public.posting_jobs;
create policy "auth users can update posting_jobs"
  on public.posting_jobs
  for update
  to authenticated
  using (true)
  with check (true);
