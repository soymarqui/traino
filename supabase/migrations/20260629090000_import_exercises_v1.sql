-- Importación de ejercicios desde "Guía de Entrenamiento v1" (Word).
-- El doc aporta: nombre, músculo principal y equipo (y alternativas, que se
-- importan como ejercicios propios del mismo músculo → sirven de variantes).
-- Series/reps/descanso/dificultad/notas no venían en el doc → valores por defecto.
-- Idempotente: no inserta si ya existe un ejercicio con el mismo nombre.

with incoming(name, slug, eq) as (
  values
    -- Principales + alternativas
    ('Dominadas', 'espalda', 'peso_corporal'),
    ('Jalón al pecho', 'espalda', 'polea'),
    ('Remo con barra', 'espalda', 'barra'),
    ('Remo sentado', 'espalda', 'polea'),
    ('Press plano con barra', 'pecho', 'barra'),
    ('Press con mancuernas', 'pecho', 'mancuernas'),
    ('Hip Thrust', 'gluteos', 'barra'),
    ('Puente de glúteos', 'gluteos', 'peso_corporal'),
    ('Peso muerto rumano', 'isquios', 'barra'),
    ('Buenos días', 'isquios', 'barra'),
    ('Press militar con mancuernas', 'hombros', 'mancuernas'),
    ('Press militar en máquina', 'hombros', 'maquina'),
    -- Core
    ('Plancha', 'abdominales', 'peso_corporal'),
    ('Plancha lateral', 'abdominales', 'peso_corporal'),
    ('Dead Bug', 'abdominales', 'peso_corporal'),
    ('Bird Dog', 'abdominales', 'peso_corporal'),
    ('Pallof Press', 'abdominales', 'polea'),
    ('Elevaciones de piernas', 'abdominales', 'barra'),
    ('Crunch en polea', 'abdominales', 'polea'),
    ('Ab Wheel', 'abdominales', 'peso_corporal'),
    ('Russian Twist', 'abdominales', 'peso_corporal'),
    ('Farmer Carry', 'abdominales', 'mancuernas')
)
insert into public.exercises
  (name, muscle_id, equipment, suggested_sets, reps_min, reps_max, rest_seconds, unit, difficulty, active, is_warmup, secondary_muscles)
select
  i.name, m.id, array[i.eq]::text[], 4, 8, 12, 90, 'reps', 'intermediate', true, false, '{}'::uuid[]
from incoming i
join public.muscles m on m.slug = i.slug
where not exists (select 1 from public.exercises e where lower(e.name) = lower(i.name))
returning name;
