'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { makeTheme, type ColorMode } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'

type ColorModeCtx = { mode: ColorMode; setMode: (m: ColorMode) => void }
const ColorModeContext = createContext<ColorModeCtx>({ mode: 'dark', setMode: () => {} })

export const useColorMode = () => useContext(ColorModeContext)

const STORAGE_KEY = 'traino-theme'

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  // Estado inicial: caché en localStorage (evita parpadeo). Default dark.
  const [mode, setModeState] = useState<ColorMode>('dark')

  useEffect(() => {
    // 1) Aplicar la preferencia cacheada localmente.
    const cached = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (cached === 'light' || cached === 'dark') setModeState(cached)

    // 2) Reconciliar con la preferencia guardada en Supabase.
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const pref = user?.user_metadata?.theme
      if (pref === 'light' || pref === 'dark') {
        setModeState(pref)
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, pref)
      }
    })
  }, [])

  const setMode = (m: ColorMode) => {
    setModeState(m)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, m)
    // Persistir en Supabase (no bloqueante).
    const supabase = createClient()
    supabase.auth.updateUser({ data: { theme: m } })
  }

  const theme = useMemo(() => makeTheme(mode), [mode])

  return (
    <ColorModeContext.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
