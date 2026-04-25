-- 007_create_image_order_outputs.sql
-- Separate Tabelle für mehrere Output-Bilder pro Auftrag

create table if not exists public.image_order_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.image_orders(id) on delete cascade,
  image_path text not null,
  prompt text,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists image_order_outputs_job_id_created_idx
  on public.image_order_outputs(job_id, created_at desc);
create index if not exists image_order_outputs_user_id_idx
  on public.image_order_outputs(user_id);

alter table public.image_order_outputs enable row level security;

drop policy if exists "image_order_outputs_select_own" on public.image_order_outputs;
create policy "image_order_outputs_select_own" on public.image_order_outputs
for select using (auth.uid() = user_id);

drop policy if exists "image_order_outputs_insert_own" on public.image_order_outputs;
create policy "image_order_outputs_insert_own" on public.image_order_outputs
for insert with check (auth.uid() = user_id);

drop policy if exists "image_order_outputs_delete_own" on public.image_order_outputs;
create policy "image_order_outputs_delete_own" on public.image_order_outputs
for delete using (auth.uid() = user_id);

grant select on table public.image_order_outputs to anon;
grant select, insert, delete on table public.image_order_outputs to authenticated;
grant all privileges on table public.image_order_outputs to service_role;

insert into public.image_order_outputs (user_id, job_id, image_path, status, created_at)
select io.user_id, io.id, io.output_image, 'completed', io.updated_at
from public.image_orders io
where io.output_image is not null
  and not exists (
    select 1
    from public.image_order_outputs out
    where out.job_id = io.id
      and out.image_path = io.output_image
  );
