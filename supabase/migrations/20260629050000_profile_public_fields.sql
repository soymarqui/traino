-- Datos del perfil visibles para otros (edad, género) + portada + visibilidad de datos.
-- La edad/género viven hoy en user_metadata (no accesible para terceros); los
-- espejamos en profiles para poder mostrarlos en el perfil público.

alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists cover_url text;
-- Qué datos personales se muestran y a quién: 'public' | 'friends' | 'hidden'
alter table public.profiles add column if not exists details_visibility text not null default 'public'
  check (details_visibility in ('public', 'friends', 'hidden'));
