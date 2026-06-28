-- Entrenamientos planificados a futuro (marcadores en el calendario).
-- Un registro por día planificado por usuario.
create table if not exists public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.planned_workouts enable row level security;

drop policy if exists "planned_workouts_all_own" on public.planned_workouts;
create policy "planned_workouts_all_own"
  on public.planned_workouts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
