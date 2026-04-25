-- 006_fix_comment_validation_jsonb_key_count.sql
-- Fix compatibility: some Postgres/Supabase versions do not provide jsonb_object_length(jsonb).
-- Recreate validator using jsonb_object_keys(...) key count instead.

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
