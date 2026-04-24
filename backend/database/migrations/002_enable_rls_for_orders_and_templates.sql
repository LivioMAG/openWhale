alter table public.image_orders enable row level security;
alter table public.image_templates enable row level security;

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
