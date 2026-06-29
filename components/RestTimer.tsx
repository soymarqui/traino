'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { createClient } from '@/lib/supabase/client'

type Ctx = {
  start: (seconds: number) => void
  stop: () => void
  startCountdown: (seconds?: number) => void
  secondsLeft: number
  active: boolean
}

const RestTimerContext = createContext<Ctx>({
  start: () => {},
  stop: () => {},
  startCountdown: () => {},
  secondsLeft: 0,
  active: false,
})

export const useRestTimer = () => useContext(RestTimerContext)

// Umbral (en segundos) del overlay grande del timer de descanso.
const REST_OVERLAY_SECONDS = 5

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(false)
  const [enabled, setEnabled] = useState(true)
  // Countdown de inicio de entrenamiento (separado del descanso).
  const [cd, setCd] = useState(0)
  const [cdActive, setCdActive] = useState(false)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const cdTick = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEnabled(user?.user_metadata?.timer_enabled !== false)
    })
  }, [])

  const start = (seconds: number) => {
    if (!enabled || seconds <= 0) return
    setTotal(seconds)
    setSecondsLeft(seconds)
    setActive(true)
  }

  const stop = () => {
    setActive(false)
    setSecondsLeft(0)
  }

  // Countdown motivador antes de empezar a entrenar (no depende del toggle de descanso).
  const startCountdown = (seconds = 5) => {
    setCd(seconds)
    setCdActive(true)
  }

  useEffect(() => {
    if (!active) return
    tick.current = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => {
      if (tick.current) clearInterval(tick.current)
    }
  }, [active])

  // Al llegar a 0: mostrar el mensaje un instante y cerrar.
  useEffect(() => {
    if (active && secondsLeft === 0) {
      const t = setTimeout(() => setActive(false), 1600)
      return () => clearTimeout(t)
    }
  }, [active, secondsLeft])

  // Tick del countdown de inicio.
  useEffect(() => {
    if (!cdActive) return
    cdTick.current = setInterval(() => {
      setCd((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => {
      if (cdTick.current) clearInterval(cdTick.current)
    }
  }, [cdActive])

  useEffect(() => {
    if (cdActive && cd === 0) {
      const t = setTimeout(() => setCdActive(false), 900)
      return () => clearTimeout(t)
    }
  }, [cdActive, cd])

  return (
    <RestTimerContext.Provider value={{ start, stop, startCountdown, secondsLeft, active }}>
      {/* Barra global */}
      {active && (
        <LinearProgress
          variant="determinate"
          value={total ? (secondsLeft / total) * 100 : 0}
          sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1500, height: 4 }}
        />
      )}

      {children}

      {/* Overlay del descanso (últimos segundos) — preparado para reemplazar por Lottie */}
      {active && secondsLeft <= REST_OVERLAY_SECONDS && (
        <Box
          onClick={stop}
          sx={{
            position: 'fixed', inset: 0, zIndex: 1600, bgcolor: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          }}
        >
          {secondsLeft > 0 ? (
            <Typography sx={{ fontSize: 180, fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
              {secondsLeft}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 64, fontWeight: 800, color: 'primary.main', textAlign: 'center' }}>
              ¡VOS PODÉS!
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            tocá para saltar
          </Typography>
        </Box>
      )}

      {/* Countdown de inicio de entrenamiento — preparado para reemplazar por Lottie */}
      {cdActive && (
        <Box
          onClick={() => setCdActive(false)}
          sx={{
            position: 'fixed', inset: 0, zIndex: 1700,
            bgcolor: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          }}
        >
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 3 }}>
            Preparate
          </Typography>
          {cd > 0 ? (
            <Typography sx={{ fontSize: 200, fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
              {cd}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 72, fontWeight: 800, color: 'primary.main' }}>
              ¡DALE! 🔥
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            tocá para saltar
          </Typography>
        </Box>
      )}
    </RestTimerContext.Provider>
  )
}
