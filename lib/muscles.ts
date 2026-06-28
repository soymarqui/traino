// Emoji representativo por músculo (MUI no tiene íconos por grupo muscular).
// Mapeado por slug de la tabla muscles.
const MUSCLE_EMOJI: Record<string, string> = {
  pecho: '🎽',
  espalda: '🦅',
  hombros: '🏔️',
  biceps: '💪',
  triceps: '🦾',
  cuadriceps: '🦵',
  isquios: '🦿',
  gluteos: '🍑',
  pantorrillas: '🦶',
  abdominales: '🧱',
  antebrazos: '🤜',
}

export function muscleEmoji(slug?: string | null): string {
  return slug ? MUSCLE_EMOJI[slug] ?? '' : ''
}

// "🍑 Glúteos" (cae al nombre si no hay emoji)
export function muscleLabel(slug: string | null | undefined, name: string): string {
  const e = muscleEmoji(slug)
  return e ? `${e} ${name}` : name
}
