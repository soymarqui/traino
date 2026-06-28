-- Ejercicios planificados para un día futuro.
create table if not exists public.planned_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  planned_workout_id uuid not null references public.planned_workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position int not null default 0
);
create index if not exists planned_workout_exercises_parent_idx
  on public.planned_workout_exercises(planned_workout_id);
alter table public.planned_workout_exercises enable row level security;

drop policy if exists "planned_workout_exercises_all_own" on public.planned_workout_exercises;
create policy "planned_workout_exercises_all_own" on public.planned_workout_exercises for all to authenticated
  using (exists (select 1 from public.planned_workouts p where p.id = planned_workout_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.planned_workouts p where p.id = planned_workout_id and p.user_id = auth.uid()));
