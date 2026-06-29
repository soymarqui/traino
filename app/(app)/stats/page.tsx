'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { createClient } from '@/lib/supabase/client'
import { muscleEmoji, muscleLabel } from '@/lib/muscles'

const LIME = '#C6F135'

function localDay(d: Date): string {
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD en hora local
}

function mondayOf(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

// --- Mini-gráficos SVG autocontenidos ---

function LineChart({ points, unit = '' }: { points: { label: string; value: number }[]; unit?: string }) {
  if (points.length < 2) {
    return <Typography variant="body2" color="text.secondary">Necesitás al menos 2 sesiones para ver la evolución.</Typography>
  }
  const W = 320
  const H = 120
  const pad = 24
  const values = points.map((p) => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1)
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <text x={pad} y={14} fill="#888" fontSize="10">{max}{unit}</text>
        <text x={pad} y={H - pad + 12} fill="#888" fontSize="10">{min}{unit}</text>
        <path d={path} fill="none" stroke={LIME} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill={LIME} />
        ))}
        <text x={pad} y={H - 4} fill="#888" fontSize="9">{points[0].label}</text>
        <text x={W - pad} y={H - 4} fill="#888" fontSize="9" textAnchor="end">{points[points.length - 1].label}</text>
      </svg>
    </Box>
  )
}

function BarChart({ bars, unit = '' }: { bars: { label: string; value: number }[]; unit?: string }) {
  if (!bars.length) {
    return <Typography variant="body2" color="text.secondary">Sin datos todavía.</Typography>
  }
  const W = 320
  const H = 130
  const pad = 20
  const max = Math.max(...bars.map((b) => b.value), 1)
  const bw = (W - pad * 2) / bars.length
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {bars.map((b, i) => {
          const h = (b.value / max) * (H - pad * 2)
          return (
            <g key={i}>
              <rect
                x={pad + i * bw + bw * 0.15}
                y={H - pad - h}
                width={bw * 0.7}
                height={h}
                rx="3"
                fill={LIME}
                opacity={0.85}
              />
              <text x={pad + i * bw + bw / 2} y={H - 6} fill="#888" fontSize="8" textAnchor="middle">{b.label}</text>
            </g>
          )
        })}
        <text x={pad} y={12} fill="#888" fontSize="10">máx {Math.round(max)}{unit}</text>
      </svg>
    </Box>
  )
}

type WorkoutRow = { id: string; started_at: string; finished_at: string | null; duration_seconds: number | null }
type SetRow = { exercise_id: string; workout_id: string; weight: number | null; reps_actual: number | null }
type ExInfo = { id: string; name: string; slug: string | null; muscleName: string | null }

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [sets, setSets] = useState<SetRow[]>([])
  const [exInfo, setExInfo] = useState<Record<string, ExInfo>>({})
  const [selectedEx, setSelectedEx] = useState('')
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data: ws } = await supabase
      .from('workouts')
      .select('id, started_at, finished_at, duration_seconds')
      .eq('user_id', user.id)
      .order('started_at')
    const wl = (ws as WorkoutRow[]) || []
    setWorkouts(wl)

    if (wl.length) {
      const { data: ss } = await supabase
        .from('sets')
        .select('exercise_id, workout_id, weight, reps_actual, exercise:exercises(id, name, muscle:muscles(slug, name))')
        .in('workout_id', wl.map((w) => w.id))
        .eq('completed', true)
      const sl = (ss as any[]) || []
      const info: Record<string, ExInfo> = {}
      sl.forEach((s: any) => {
        if (!info[s.exercise_id]) {
          const ex = Array.isArray(s.exercise) ? s.exercise[0] : s.exercise
          const m = ex && (Array.isArray(ex.muscle) ? ex.muscle[0] : ex.muscle)
          info[s.exercise_id] = {
            id: s.exercise_id,
            name: ex?.name ?? 'Ejercicio',
            slug: m?.slug ?? null,
            muscleName: m?.name ?? null,
          }
        }
      })
      setExInfo(info)
      setSets(sl.map((s: any) => ({ exercise_id: s.exercise_id, workout_id: s.workout_id, weight: s.weight, reps_actual: s.reps_actual })))

      // Ejercicio por defecto: el que tiene más sets con peso.
      const counts: Record<string, number> = {}
      sl.forEach((s: any) => {
        if (s.weight != null) counts[s.exercise_id] = (counts[s.exercise_id] ?? 0) + 1
      })
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (best) setSelectedEx(best[0])
    }
    setLoading(false)
  }

  const wDate: Record<string, Date> = {}
  workouts.forEach((w) => (wDate[w.id] = new Date(w.started_at)))

  // --- Racha ---
  const trainedDays = new Set(workouts.map((w) => localDay(new Date(w.started_at))))
  let streak = 0
  let streakStart: string | null = null
  {
    const cur = new Date()
    if (!trainedDays.has(localDay(cur))) cur.setDate(cur.getDate() - 1)
    while (trainedDays.has(localDay(cur))) {
      streak++
      streakStart = localDay(cur)
      cur.setDate(cur.getDate() - 1)
    }
  }

  // --- Evolución de peso por ejercicio (máximo por sesión) ---
  const weightPoints = (() => {
    const byWorkout: Record<string, number> = {}
    sets
      .filter((s) => s.exercise_id === selectedEx && s.weight != null)
      .forEach((s) => {
        byWorkout[s.workout_id] = Math.max(byWorkout[s.workout_id] ?? 0, s.weight as number)
      })
    return Object.entries(byWorkout)
      .map(([wid, v]) => ({ date: wDate[wid], value: v }))
      .filter((p) => p.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((p) => ({ label: p.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }), value: p.value }))
  })()

  // --- Volumen semanal (últimas 8 semanas) ---
  const volumeBars = (() => {
    const thisMonday = mondayOf(new Date())
    const weeks: { start: Date; label: string; value: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date(thisMonday)
      start.setDate(start.getDate() - i * 7)
      weeks.push({ start, label: start.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }), value: 0 })
    }
    sets.forEach((s) => {
      const d = wDate[s.workout_id]
      if (!d) return
      const vol = (s.weight ?? 0) * (s.reps_actual ?? 0)
      if (!vol) return
      const wm = mondayOf(d).getTime()
      const wk = weeks.find((w) => w.start.getTime() === wm)
      if (wk) wk.value += vol
    })
    return weeks.map((w) => ({ label: w.label, value: Math.round(w.value) }))
  })()

  // --- Frecuencia por músculo (último mes) ---
  const muscleFreq = (() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const counts: Record<string, { label: string; emoji: string; value: number }> = {}
    sets.forEach((s) => {
      const d = wDate[s.workout_id]
      if (!d || d < cutoff) return
      const info = exInfo[s.exercise_id]
      const slug = info?.slug ?? 'otro'
      if (!counts[slug]) {
        counts[slug] = {
          label: muscleLabel(info?.slug ?? undefined, info?.muscleName ?? 'Otro'),
          emoji: muscleEmoji(info?.slug) || '💪',
          value: 0,
        }
      }
      counts[slug].value += 1
    })
    return Object.values(counts).sort((a, b) => b.value - a.value)
  })()
  const muscleMax = Math.max(...muscleFreq.map((m) => m.value), 1)

  // --- Duración (por sesión, en minutos) ---
  const durationData = workouts
    .map((w) => {
      let sec = w.duration_seconds
      if (sec == null && w.finished_at) sec = Math.round((new Date(w.finished_at).getTime() - new Date(w.started_at).getTime()) / 1000)
      return sec != null && sec > 0 ? { date: new Date(w.started_at), min: Math.round(sec / 60) } : null
    })
    .filter(Boolean) as { date: Date; min: number }[]
  const durationPoints = durationData
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-15)
    .map((d) => ({ label: d.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }), value: d.min }))
  const avgDuration = durationData.length
    ? Math.round(durationData.reduce((a, d) => a + d.min, 0) / durationData.length)
    : 0

  const exOptions = Object.values(exInfo).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Estadísticas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tu progreso a lo largo del tiempo.
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && workouts.length === 0 && (
          <Typography color="text.secondary">
            Todavía no tenés entrenamientos registrados. ¡Entrená para ver tus estadísticas!
          </Typography>
        )}

        {!loading && workouts.length > 0 && (
          <>
            {/* Racha */}
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LocalFireDepartmentIcon sx={{ color: LIME, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {streak} {streak === 1 ? 'día' : 'días'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {streak > 0 && streakStart
                      ? `Racha activa desde el ${new Date(`${streakStart}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
                      : 'Sin racha activa. ¡Entrená hoy para arrancar una!'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Evolución de peso */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Evolución de peso por ejercicio
                </Typography>
                {exOptions.length > 0 && (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={selectedEx}
                    onChange={(e) => setSelectedEx(e.target.value)}
                    sx={{ mb: 2 }}
                  >
                    {exOptions.map((ex) => (
                      <MenuItem key={ex.id} value={ex.id}>{ex.name}</MenuItem>
                    ))}
                  </TextField>
                )}
                <LineChart points={weightPoints} unit="kg" />
              </CardContent>
            </Card>

            {/* Volumen semanal */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Volumen semanal
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  series × reps × peso, por semana
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <BarChart bars={volumeBars} />
                </Box>
              </CardContent>
            </Card>

            {/* Frecuencia por músculo */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Frecuencia por músculo (último mes)
                </Typography>
                {muscleFreq.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin series en los últimos 30 días.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {muscleFreq.map((m) => (
                      <Box key={m.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ width: 28, fontSize: '1.1rem' }}>{m.emoji}</Typography>
                        <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>{m.label}</Typography>
                        <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, height: 16, overflow: 'hidden' }}>
                          <Box sx={{ width: `${(m.value / muscleMax) * 100}%`, bgcolor: LIME, height: '100%', borderRadius: 1 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ width: 28, textAlign: 'right' }}>{m.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Duración */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Duración de entrenamiento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Promedio: <b>{avgDuration} min</b>
                </Typography>
                <LineChart points={durationPoints} unit="m" />
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </Box>
  )
}
