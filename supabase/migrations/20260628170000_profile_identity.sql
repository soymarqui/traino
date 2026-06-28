-- Identidad social del usuario (se muestra en contexto de comunidad).
alter table public.profiles
  add column if not exists identity text check (identity in ('gymbro', 'gymsis', 'gympal'));
