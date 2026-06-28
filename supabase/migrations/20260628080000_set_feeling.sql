-- Sensación al completar una serie (1 = más cansado ... 5 = más fácil).
alter table public.sets add column if not exists feeling smallint;
