-- Días/sesiones dentro de una rutina (Pull, Full Body, ...).
-- Los ejercicios pasan a colgar de un día.

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists routine_days_routine_idx on public.routine_days(routine_id);
alter table public.routine_days enable row level security;

drop policy if exists "routine_days_select" on public.routine_days;
create policy "routine_days_select" on public.routine_days for select to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and (r.owner_id = auth.uid() or r.is_public)));

drop policy if exists "routine_days_write_own" on public.routine_days;
create policy "routine_days_write_own" on public.routine_days for all to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()));

-- Los ejercicios ahora pertenecen a un día.
alter table public.routine_exercises
  add column if not exists routine_day_id uuid references public.routine_days(id) on delete cascade;

-- Día por defecto en cada rutina que aún no tenga.
insert into public.routine_days (routine_id, name, position)
select id, 'Día 1', 0 from public.routines r
where not exists (select 1 from public.routine_days d where d.routine_id = r.id);

-- Asignar los ejercicios existentes al primer día de su rutina.
update public.routine_exercises re
set routine_day_id = (
  select d.id from public.routine_days d
  where d.routine_id = re.routine_id order by d.position limit 1
)
where re.routine_day_id is null;
