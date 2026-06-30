'use client'

import { ViewTransition } from 'react'

// Envuelve el contenido de cada página para animar la navegación.
// - 'nav-forward' / 'nav-back': deslizamiento direccional (tabs de abajo).
// - cualquier otra navegación: crossfade suave con leve desenfoque ('cross').
// La barra superior y el nav inferior viven en el layout (fuera de este límite),
// así que quedan anclados mientras el contenido se mueve.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'cross' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'cross' }}
    >
      {children}
    </ViewTransition>
  )
}
