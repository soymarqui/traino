-- Bio pública del usuario (para la sección social futura).
alter table public.profiles add column if not exists bio text;
