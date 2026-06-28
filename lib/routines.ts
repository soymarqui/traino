import type { SupabaseClient } from '@supabase/supabase-js'

// Copia completa de una rutina (días + ejercicios + series) a una rutina propia.
// Funciona con rutinas propias o públicas (suscritas). Devuelve el id nuevo o null.
export async function duplicateRoutine(
  supabase: SupabaseClient,
  sourceId: string,
  ownerId: string,
  nameSuffix = ' (copia)'
): Promise<string | null> {
  const { data: src } = await supabase.from('routines').select('name, owner_id').eq('id', sourceId).single()
  // Si la rutina es de otro usuario, NO se copian los pesos (son personales).
  const foreign = !!src?.owner_id && src.owner_id !== ownerId
  const { data: days } = await supabase
    .from('routine_days')
    .select('*')
    .eq('routine_id', sourceId)
    .order('position')
  const { data: exs } = await supabase
    .from('routine_exercises')
    .select('*, sets:routine_exercise_sets(*)')
    .eq('routine_id', sourceId)
    .order('position')

  const { data: newR } = await supabase
    .from('routines')
    .insert({ owner_id: ownerId, name: `${src?.name ?? 'Rutina'}${nameSuffix}` })
    .select()
    .single()
  if (!newR) return null

  const dayMap: Record<string, string> = {}
  for (const d of days || []) {
    const { data: nd } = await supabase
      .from('routine_days')
      .insert({ routine_id: newR.id, name: d.name, position: d.position })
      .select()
      .single()
    if (nd) dayMap[d.id] = nd.id
  }

  for (const ex of exs || []) {
    const { data: ne } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: newR.id,
        routine_day_id: ex.routine_day_id ? dayMap[ex.routine_day_id] : null,
        exercise_id: ex.exercise_id,
        rest_seconds: ex.rest_seconds,
        equipment: ex.equipment,
        unilateral: ex.unilateral,
        notes: ex.notes,
        position: ex.position,
      })
      .select()
      .single()
    if (ne && ex.sets?.length) {
      await supabase.from('routine_exercise_sets').insert(
        ex.sets.map((s: { set_number: number; reps: number | null; reps_max: number | null; duration_seconds: number | null; to_failure: boolean; weight: number | null }) => ({
          routine_exercise_id: ne.id,
          set_number: s.set_number,
          reps: s.reps,
          reps_max: s.reps_max,
          duration_seconds: s.duration_seconds,
          to_failure: s.to_failure,
          weight: foreign ? null : s.weight,
        }))
      )
    }
  }

  return newR.id
}
