create table if not exists public.image_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  order_name text,
  immobilie_uid text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.image_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note jsonb not null default '{}'::jsonb,
  prompt text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists image_orders_user_id_idx on public.image_orders(user_id);
create index if not exists image_templates_user_id_idx on public.image_templates(user_id);
create index if not exists image_templates_tags_gin_idx on public.image_templates using gin(tags);
