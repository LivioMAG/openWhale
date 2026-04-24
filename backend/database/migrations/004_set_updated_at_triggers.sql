create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_image_orders_updated_at on public.image_orders;
create trigger set_image_orders_updated_at
before update on public.image_orders
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists set_image_templates_updated_at on public.image_templates;
create trigger set_image_templates_updated_at
before update on public.image_templates
for each row execute function public.set_updated_at_timestamp();
