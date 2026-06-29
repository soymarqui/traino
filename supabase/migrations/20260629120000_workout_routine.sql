-- Vincular cada entrenamiento con la rutina que se siguió (para mostrarlo en el feed).
alter table public.workouts add column if not exists routine_id uuid references public.routines(id) on delete set null;
