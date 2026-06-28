'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function WorkoutCalendar({
  doneByDate,
  onSelectDone,
  onSelectFuture,
}: {
  // 'YYYY-MM-DD' -> workoutId del entrenamiento completado ese día
  doneByDate: Record<string, string>
  onSelectDone: (workoutId: string) => void
  onSelectFuture: (dateKey: string) => void
}) {
  const today = new Date()
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate())
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })

  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))

  const handleDay = (d: number) => {
    const key = ymd(view.y, view.m, d)
    const doneId = doneByDate[key]
    if (doneId) onSelectDone(doneId)
    else if (key > todayKey) onSelectFuture(key)
  }

  return (
    <Card sx={{ p: 2 }}>
      {/* Header mes */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <IconButton size="small" onClick={prevMonth}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {MONTHS[view.m]} {view.y}
        </Typography>
        <IconButton size="small" onClick={nextMonth}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Días de la semana */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {WEEKDAYS.map((w, i) => (
          <Typography
            key={i}
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            {w}
          </Typography>
        ))}
      </Box>

      {/* Grilla */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 0.5 }}>
        {cells.map((d, i) => {
          if (d === null) return <Box key={`b${i}`} />
          const key = ymd(view.y, view.m, d)
          const doneId = doneByDate[key]
          const isToday = key === todayKey
          const isFuture = key > todayKey
          const clickable = !!doneId || isFuture
          return (
            <Box
              key={key}
              onClick={() => handleDay(d)}
              sx={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                cursor: clickable ? 'pointer' : 'default',
                bgcolor: isToday ? 'action.selected' : 'transparent',
                color: isFuture && !doneId ? 'text.secondary' : 'text.primary',
                '&:hover': clickable ? { bgcolor: 'action.hover' } : undefined,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: isToday ? 700 : 400 }}>
                {d}
              </Typography>
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  mt: 0.25,
                  borderRadius: '50%',
                  bgcolor: doneId ? 'primary.main' : 'transparent',
                }}
              />
            </Box>
          )
        })}
      </Box>
    </Card>
  )
}
