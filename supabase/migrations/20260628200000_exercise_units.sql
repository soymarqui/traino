-- Nuevas unidades: distancia (km/m) y pasos.
alter table public.exercises drop constraint if exists exercises_unit_check;
alter table public.exercises
  add constraint exercises_unit_check check (unit in ('reps', 'time', 'distance', 'steps'));
alter table public.exercises
  add column if not exists distance_unit text check (distance_unit in ('km', 'm'));
