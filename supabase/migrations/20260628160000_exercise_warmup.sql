-- Marca un ejercicio como de warm-up.
alter table public.exercises add column if not exists is_warmup boolean not null default false;
