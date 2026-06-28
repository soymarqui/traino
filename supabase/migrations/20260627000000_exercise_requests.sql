-- Ejercicios globales + solicitudes de ejercicios (exercise_requests)
-- Fase: biblioteca global de ejercicios con flujo de solicitud/aprobación.

-- ---------------------------------------------------------------------------
-- Helper: allowlist de admins por email.
-- Por ahora la lista vive acá. Para sumar un admin, agregá su email al IN (...).
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') in (
      'marcos.bazterrica@superside.com',
      'bazterrica.marcos@gmail.com'
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- exercises ahora son globales: ya no pertenecen a un usuario.
-- CASCADE: elimina cualquier policy vieja que dependa de la columna user_id
-- (p. ej. "ver/editar solo ejercicios propios"). Las reemplazamos abajo.
-- ---------------------------------------------------------------------------
alter table public.exercises drop column if exists user_id cascade;

-- Lectura global de ejercicios activos para cualquier usuario autenticado.
drop policy if exists "exercises_select_all" on public.exercises;
create policy "exercises_select_all"
  on public.exercises for select
  to authenticated
  using (true);

-- Solo admins pueden crear/editar/borrar ejercicios de la biblioteca.
drop policy if exists "exercises_write_admin" on public.exercises;
create policy "exercises_write_admin"
  on public.exercises for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- exercise_requests: un usuario solicita un ejercicio para la biblioteca.
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_id uuid not null references public.muscles(id),
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists exercise_requests_user_id_idx
  on public.exercise_requests (user_id);
create index if not exists exercise_requests_status_idx
  on public.exercise_requests (status);

alter table public.exercise_requests enable row level security;

-- El usuario ve sus propias solicitudes; el admin ve todas.
drop policy if exists "exercise_requests_select" on public.exercise_requests;
create policy "exercise_requests_select"
  on public.exercise_requests for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- El usuario crea solicitudes solo a su nombre.
drop policy if exists "exercise_requests_insert_own" on public.exercise_requests;
create policy "exercise_requests_insert_own"
  on public.exercise_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo el admin puede aprobar/rechazar (update).
drop policy if exists "exercise_requests_update_admin" on public.exercise_requests;
create policy "exercise_requests_update_admin"
  on public.exercise_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
