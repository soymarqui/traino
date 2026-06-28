-- Catálogo de ejercicios gestionado por admin:
-- - unit: cómo se mide el ejercicio (reps o tiempo)
-- - equipment pasa de un único texto a una lista (puede requerir varios)

-- Unidad de medición del ejercicio.
alter table public.exercises
  add column if not exists unit text not null default 'reps'
  check (unit in ('reps', 'time'));

-- equipment: text -> text[] (migra el valor existente a un array de un elemento).
-- Envuelto en un guard para que sea idempotente (no falla si ya es text[]).
do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'equipment'
  ) <> 'ARRAY' then
    alter table public.exercises
      alter column equipment type text[]
      using (case when equipment is null then null else array[equipment] end);
  end if;
end $$;
