'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import { createClient } from '@/lib/supabase/client'
import { displayName } from '@/lib/user'
import { useRouter } from 'next/navigation'
import WorkoutCalendar from './WorkoutCalendar'

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function DashboardPage() {
  const [name, setName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [doneByDate, setDoneByDate] = useState<Record<string, string>>({})
  const [plannedDates, setPlannedDates] = useState<string[]>([])
  const [snack, setSnack] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setName(displayName(user))
      setUserId(user?.id ?? null)

      // Días con entrenamiento (iniciado o terminado) -> punto lleno.
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, started_at')
        .not('started_at', 'is', null)
      const map: Record<string, string> = {}
      ;(workouts || []).forEach((w: { id: string; started_at: string }) => {
        map[dateKey(w.started_at)] = w.id
      })
      setDoneByDate(map)

      // Días planificados -> contorno.
      const { data: planned } = await supabase
        .from('planned_workouts')
        .select('date')
      setPlannedDates((planned || []).map((p: { date: string }) => p.date))
    }
    load()
  }, [])

  const toggleFuture = async (key: string) => {
    if (!userId) return
    if (plannedDates.includes(key)) {
      setPlannedDates((prev) => prev.filter((d) => d !== key))
      await supabase.from('planned_workouts').delete().eq('user_id', userId).eq('date', key)
      setSnack('Plan quitado')
    } else {
      setPlannedDates((prev) => [...prev, key])
      await supabase.from('planned_workouts').insert({ user_id: userId, date: key })
      setSnack('Día planificado')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {name ? `Hola, ${name} 💪` : 'Hola 💪'}
        </Typography>
      </Box>

      {/* Calendario */}
      <Box sx={{ px: 3 }}>
        <WorkoutCalendar
          doneByDate={doneByDate}
          plannedDates={plannedDates}
          onSelectDone={(id) => router.push(`/train/${id}`)}
          onToggleFuture={toggleFuture}
        />
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
