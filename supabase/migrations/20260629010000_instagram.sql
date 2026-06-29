-- @ de Instagram en el perfil, con visibilidad configurable.

alter table public.profiles add column if not exists instagram text;
-- Visibilidad del @: 'public' (todos) | 'contacts' (solo co-miembros de comunidades) | 'hidden'
alter table public.profiles add column if not exists instagram_visibility text not null default 'public'
  check (instagram_visibility in ('public', 'contacts', 'hidden'));
