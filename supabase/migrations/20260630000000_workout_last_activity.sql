-- Última actividad del entrenamiento (para detectar inactividad y auto-finalizar).
alter table public.workouts add column if not exists last_activity_at timestamptz not null default now();
