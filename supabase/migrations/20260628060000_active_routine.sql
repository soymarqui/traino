-- Rutina activa del usuario (la que se usa por defecto al entrenar).
alter table public.profiles
  add column if not exists active_routine_id uuid references public.routines(id) on delete set null;
