-- Múltiples rutinas por usuario (reemplaza la lista plana user_exercises).
-- IMPORTANTE: la sección de migración de datos del final está pensada para correr UNA vez.

-- routines -------------------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.routines enable row level security;

drop policy if exists "routines_select" on public.routines;
create policy "routines_select" on public.routines for select to authenticated
  using (owner_id = auth.uid() or is_public);

drop policy if exists "routines_write_own" on public.routines;
create policy "routines_write_own" on public.routines for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- routine_exercises ----------------------------------------------------------
create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  rest_seconds int,
  equipment text check (equipment in ('maquina','mancuernas','barra','polea','peso_corporal')),
  unilateral boolean not null default false,
  notes text,
  position int not null default 0
);
create index if not exists routine_exercises_routine_idx on public.routine_exercises(routine_id);
alter table public.routine_exercises enable row level security;

drop policy if exists "routine_exercises_select" on public.routine_exercises;
create policy "routine_exercises_select" on public.routine_exercises for select to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and (r.owner_id = auth.uid() or r.is_public)));

drop policy if exists "routine_exercises_write_own" on public.routine_exercises;
create policy "routine_exercises_write_own" on public.routine_exercises for all to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()));

-- routine_exercise_sets ------------------------------------------------------
create table if not exists public.routine_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises(id) on delete cascade,
  set_number int not null,
  reps int,
  reps_max int,
  duration_seconds int,
  to_failure boolean not null default false,
  weight numeric
);
create index if not exists routine_exercise_sets_parent_idx on public.routine_exercise_sets(routine_exercise_id);
alter table public.routine_exercise_sets enable row level security;

drop policy if exists "routine_exercise_sets_select" on public.routine_exercise_sets;
create policy "routine_exercise_sets_select" on public.routine_exercise_sets for select to authenticated
  using (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and (r.owner_id = auth.uid() or r.is_public)
  ));

drop policy if exists "routine_exercise_sets_write_own" on public.routine_exercise_sets;
create policy "routine_exercise_sets_write_own" on public.routine_exercise_sets for all to authenticated
  using (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and r.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and r.owner_id = auth.uid()
  ));

-- Migración de datos: lista plana actual -> rutina "Mi rutina" por usuario ----
insert into public.routines (owner_id, name)
select distinct user_id, 'Mi rutina' from public.user_exercises ue
where not exists (select 1 from public.routines r where r.owner_id = ue.user_id and r.name = 'Mi rutina');

alter table public.routine_exercises add column if not exists legacy_ue_id uuid;

insert into public.routine_exercises
  (routine_id, exercise_id, rest_seconds, equipment, unilateral, notes, position, legacy_ue_id)
select r.id, ue.exercise_id, ue.rest_seconds, ue.equipment, ue.unilateral, ue.notes, ue.position, ue.id
from public.user_exercises ue
join public.routines r on r.owner_id = ue.user_id and r.name = 'Mi rutina'
where not exists (
  select 1 from public.routine_exercises re where re.routine_id = r.id and re.exercise_id = ue.exercise_id
);

insert into public.routine_exercise_sets
  (routine_exercise_id, set_number, reps, reps_max, duration_seconds, to_failure, weight)
select re.id, ues.set_number, ues.reps, ues.reps_max, ues.duration_seconds, ues.to_failure, ues.weight
from public.user_exercise_sets ues
join public.routine_exercises re on re.legacy_ue_id = ues.user_exercise_id
where re.legacy_ue_id is not null;

alter table public.routine_exercises drop column if exists legacy_ue_id;
