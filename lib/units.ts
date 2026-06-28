// Etiqueta corta de la unidad de un ejercicio (para mostrar al registrar/sugerir).
export function unitShort(
  unit: string | null | undefined,
  distanceUnit?: string | null
): string {
  if (unit === 'time') return 'seg'
  if (unit === 'steps') return 'pasos'
  if (unit === 'distance') return distanceUnit === 'km' ? 'km' : 'm'
  return 'reps'
}
