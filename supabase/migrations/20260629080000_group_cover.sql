-- Imagen de portada para comunidades.
alter table public.groups add column if not exists cover_url text;
