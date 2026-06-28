-- Seed de la biblioteca global con los ejercicios del plan de entrenamiento (PDF).
-- Mapea cada ejercicio a su músculo por slug. Idempotente: no duplica por nombre.
-- El admin luego refina cada uno (video, equipo, etc.) desde la plataforma.

insert into public.exercises
  (name, muscle_id, equipment, unit, active, secondary_muscles,
   suggested_sets, reps_min, reps_max, rest_seconds)
select
  v.name, m.id, v.equipment, v.unit, true, '{}'::uuid[], 3, 8, 12, 90
from (
  values
    ('Retracciones y protracciones escapulares', 'espalda', array['peso_corporal']::text[], 'reps'),
    ('Dominadas',                                 'espalda', array['peso_corporal'], 'reps'),
    ('Remo con barra',                            'espalda', array['barra'],         'reps'),
    ('Bíceps 21',                                 'biceps',  array['barra'],         'reps'),
    ('Remo unilateral en polea',                  'espalda', array['polea'],         'reps'),
    ('Jalón al pecho',                            'espalda', array['polea'],         'reps'),
    ('Bíceps martillo',                           'biceps',  array['mancuernas'],    'reps'),
    ('Bíceps con trampa',                         'biceps',  array['mancuernas'],    'reps'),
    ('Press plano',                               'pecho',   array['barra','banco'], 'reps'),
    ('Press en máquina inclinada',                'pecho',   array['maquina'],       'reps'),
    ('Fondos en paralelas',                       'triceps', array['peso_corporal'], 'reps'),
    ('Extensión de tríceps',                      'triceps', array['polea'],         'reps'),
    ('Cruce en polea hacia arriba',               'pecho',   array['polea'],         'reps'),
    ('Cruce en polea medio',                      'pecho',   array['polea'],         'reps'),
    ('Patada de tríceps',                         'triceps', array['polea'],         'reps'),
    ('Sentadilla isométrica',                     'cuadriceps', array['peso_corporal'], 'time'),
    ('Estocada isométrica',                       'cuadriceps', array['peso_corporal'], 'time'),
    ('Sentadilla en máquina',                     'cuadriceps', array['maquina'],    'reps'),
    ('Hip thrust',                                'gluteos', array['barra'],         'reps'),
    ('Press militar',                             'hombros', array['mancuernas'],    'reps'),
    ('Peso muerto rumano',                        'isquios', array['barra'],         'reps'),
    ('Vuelos laterales',                          'hombros', array['mancuernas'],    'reps'),
    ('Aducciones en máquina',                     'gluteos', array['maquina'],       'reps'),
    ('Sillón de isquios',                         'isquios', array['maquina'],       'reps'),
    ('Dominadas neutras',                         'espalda', array['peso_corporal'], 'reps'),
    ('Prensa',                                    'cuadriceps', array['maquina'],    'reps'),
    ('Press inclinado con barra',                 'pecho',   array['barra','banco'], 'reps'),
    ('Bíceps en polea',                           'biceps',  array['polea'],         'reps'),
    ('Press francés',                             'triceps', array['barra'],         'reps'),
    ('Sillón de cuádriceps',                      'cuadriceps', array['maquina'],    'reps'),
    ('Peck deck',                                 'pecho',   array['maquina'],       'reps'),
    ('Vuelo lateral en polea',                    'hombros', array['polea'],         'reps')
) as v(name, slug, equipment, unit)
join public.muscles m on m.slug = v.slug
where not exists (
  select 1 from public.exercises e where e.name = v.name
);
