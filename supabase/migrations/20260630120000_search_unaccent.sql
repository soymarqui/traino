-- Búsqueda insensible a acentos: columnas normalizadas (sin tildes, minúsculas).
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Wrapper IMMUTABLE para poder usar unaccent en columnas generadas.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$ select extensions.unaccent('extensions.unaccent', $1) $$;

alter table public.profiles
  add column if not exists search_norm text
  generated always as (lower(public.immutable_unaccent(coalesce(display_name, '') || ' ' || coalesce(handle, '')))) stored;

alter table public.groups
  add column if not exists search_norm text
  generated always as (lower(public.immutable_unaccent(coalesce(name, '')))) stored;

alter table public.routines
  add column if not exists search_norm text
  generated always as (lower(public.immutable_unaccent(coalesce(name, '')))) stored;

alter table public.challenges
  add column if not exists search_norm text
  generated always as (lower(public.immutable_unaccent(coalesce(name, '')))) stored;

create index if not exists profiles_search_norm_idx on public.profiles using gin (search_norm extensions.gin_trgm_ops);
create index if not exists groups_search_norm_idx on public.groups using gin (search_norm extensions.gin_trgm_ops);
create index if not exists routines_search_norm_idx on public.routines using gin (search_norm extensions.gin_trgm_ops);
create index if not exists challenges_search_norm_idx on public.challenges using gin (search_norm extensions.gin_trgm_ops);
