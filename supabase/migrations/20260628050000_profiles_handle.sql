-- Perfiles públicos con handle (necesario para compartir/atribución en Fase B).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Lectura pública (para mostrar el creador de una rutina y validar handles).
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- Crea el profile al registrarse, tomando handle/nombre de la metadata del signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'handle',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed de usuarios ya existentes (handle provisional desde el email; editable luego).
insert into public.profiles (id, handle, display_name)
select
  u.id,
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g')),
  u.raw_user_meta_data->>'full_name'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
