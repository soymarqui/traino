-- "Mi rutina": ejercicios que el usuario elige para su entrenamiento, con su
-- propia configuración (series, reps/tiempo por serie, descanso, peso, equipo).

-- ---------------------------------------------------------------------------
-- user_exercises: un ejercicio elegido por el usuario para su rutina.
-- ---------------------------------------------------------------------------
create table if not exists public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  rest_seconds int,
  equipment text check (equipment in ('maquina','mancuernas','barra','polea','peso_corporal')),
  unilateral boolean not null default false,
  notes text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists user_exercises_user_id_idx on public.user_exercises(user_id);

alter table public.user_exercises enable row level security;

drop policy if exists "user_exercises_all_own" on public.user_exercises;
create policy "user_exercises_all_own"
  on public.user_exercises for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_exercise_sets: una fila por serie configurada.
-- Soporta reps fijas, rango (reps..reps_max), tiempo (duration_seconds),
-- "al fallo" (to_failure) y peso sugerido por serie.
-- ---------------------------------------------------------------------------
create table if not exists public.user_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  user_exercise_id uuid not null references public.user_exercises(id) on delete cascade,
  set_number int not null,
  reps int,
  reps_max int,
  duration_seconds int,
  to_failure boolean not null default false,
  weight numeric
);

create index if not exists user_exercise_sets_parent_idx
  on public.user_exercise_sets(user_exercise_id);

alter table public.user_exercise_sets enable row level security;

-- El acceso se delega al dueño del user_exercise padre.
drop policy if exists "user_exercise_sets_all_own" on public.user_exercise_sets;
create policy "user_exercise_sets_all_own"
  on public.user_exercise_sets for all
  to authenticated
  using (
    exists (
      select 1 from public.user_exercises ue
      where ue.id = user_exercise_id and ue.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_exercises ue
      where ue.id = user_exercise_id and ue.user_id = auth.uid()
    )
  );
