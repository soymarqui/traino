-- Descanso por serie (copiado de la rutina al crear el workout) + borrado de entrenamientos.

alter table public.sets add column if not exists rest_seconds int;

-- Borrar entrenamientos propios (y sus series).
drop policy if exists "workouts_delete_own" on public.workouts;
create policy "workouts_delete_own" on public.workouts for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "sets_delete_own" on public.sets;
create policy "sets_delete_own" on public.sets for delete to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
