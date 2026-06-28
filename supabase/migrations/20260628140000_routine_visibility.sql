-- Visibilidad de rutinas: privada / no listada / pública.
alter table public.routines
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'unlisted', 'public'));

-- Migrar el flag viejo: lo que era público pasa a 'public'.
update public.routines set visibility = 'public' where is_public = true and visibility = 'private';

-- RLS: el dueño ve todo; el resto puede leer públicas y NO listadas (por link).
drop policy if exists "routines_select" on public.routines;
create policy "routines_select" on public.routines for select to authenticated
  using (owner_id = auth.uid() or visibility in ('public', 'unlisted'));

drop policy if exists "routine_exercises_select" on public.routine_exercises;
create policy "routine_exercises_select" on public.routine_exercises for select to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_id and (r.owner_id = auth.uid() or r.visibility in ('public', 'unlisted'))
  ));

drop policy if exists "routine_days_select" on public.routine_days;
create policy "routine_days_select" on public.routine_days for select to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_id and (r.owner_id = auth.uid() or r.visibility in ('public', 'unlisted'))
  ));

drop policy if exists "routine_exercise_sets_select" on public.routine_exercise_sets;
create policy "routine_exercise_sets_select" on public.routine_exercise_sets for select to authenticated
  using (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and (r.owner_id = auth.uid() or r.visibility in ('public', 'unlisted'))
  ));
