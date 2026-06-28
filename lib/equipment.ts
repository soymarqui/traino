// Equipamiento que puede requerir un ejercicio del catálogo global.
// Es multi-select: un ejercicio puede necesitar varios (ej. banco + mancuernas).

export const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'mancuernas', label: 'Mancuernas' },
  { value: 'barra', label: 'Barra' },
  { value: 'maquina', label: 'Máquina' },
  { value: 'polea', label: 'Polea' },
  { value: 'banco', label: 'Banco' },
  { value: 'colchoneta', label: 'Colchoneta' },
  { value: 'banda', label: 'Banda elástica' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'peso_corporal', label: 'Peso corporal' },
]

const LABELS = new Map(EQUIPMENT_OPTIONS.map((o) => [o.value, o.label]))

export function equipmentLabel(value: string): string {
  return LABELS.get(value) ?? value
}
