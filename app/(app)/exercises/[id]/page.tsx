'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { equipmentLabel } from '@/lib/equipment'
import { muscleLabel } from '@/lib/muscles'
import { Exercise } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'
import AddToRoutineDialog from './AddToRoutineDialog'

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

// Extrae el ID de un video de YouTube desde las URLs más comunes:
// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, /shorts/ID
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return u.pathname.slice(1) || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v')
      }
      const match = u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)
      if (match) return match[1]
    }
    return null
  } catch {
    return null
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function ExerciseDetailPage() {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [admin, setAdmin] = useState(false)
  const router = useRouter()
  const params = useParams()
  const exerciseId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    fetchExercise()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdmin(isAdmin(user?.email))
    })
  }, [])

  const fetchExercise = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('*, muscle:muscles(id, name, slug)')
      .eq('id', exerciseId)
      .single()

    setExercise(data)
    setLoading(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ejercicio
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && !exercise && (
          <Typography color="text.secondary">
            No se encontró el ejercicio.
          </Typography>
        )}

        {!loading && exercise && (
          <>
            {/* Título */}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {exercise.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                {exercise.muscle && (
                  <Chip
                    label={muscleLabel(exercise.muscle.slug, exercise.muscle.name)}
                    size="small"
                    color="primary"
                  />
                )}
                {exercise.difficulty && (
                  <Chip
                    label={DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty}
                    size="small"
                  />
                )}
              </Box>
            </Box>

            {/* Agregar a entrenamiento */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Agregar a rutina
            </Button>

            {/* Acciones de admin */}
            {admin && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<EditIcon />}
                  onClick={() => router.push(`/exercises/${exerciseId}/edit`)}
                  sx={{ flex: 1 }}
                >
                  Editar
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => router.push(`/exercises/new?duplicate=${exerciseId}`)}
                  sx={{ flex: 1 }}
                >
                  Duplicar
                </Button>
              </Box>
            )}

            {/* Video de YouTube */}
            {exercise.video_url && getYouTubeId(exercise.video_url) && (
              <Box
                component="iframe"
                src={`https://www.youtube.com/embed/${getYouTubeId(exercise.video_url)}`}
                title={exercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sx={{
                  width: '100%',
                  border: 0,
                  borderRadius: 2,
                  bgcolor: 'black',
                  aspectRatio: '16 / 9',
                }}
              />
            )}

            {/* Datos */}
            <Card>
              <CardContent sx={{ py: 1 }}>
                <DetailRow
                  label="Músculo"
                  value={exercise.muscle?.name ?? '—'}
                />
                <Divider />
                <DetailRow
                  label="Series sugeridas"
                  value={String(exercise.suggested_sets)}
                />
                <Divider />
                <DetailRow
                  label="Repeticiones"
                  value={`${exercise.reps_min}–${exercise.reps_max}`}
                />
                <Divider />
                <DetailRow
                  label="Descanso"
                  value={`${exercise.rest_seconds}s`}
                />
                <Divider />
                <DetailRow
                  label="Equipamiento"
                  value={
                    exercise.equipment?.length
                      ? exercise.equipment.map(equipmentLabel).join(', ')
                      : '—'
                  }
                />
                <Divider />
                <DetailRow
                  label="Dificultad"
                  value={
                    exercise.difficulty
                      ? DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty
                      : '—'
                  }
                />
              </CardContent>
            </Card>

            {/* Notas */}
            {exercise.notes && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Notas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {exercise.notes}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      {exercise && (
        <AddToRoutineDialog
          exercise={exercise}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAdded={() => setAdded(true)}
        />
      )}

      <Snackbar
        open={added}
        autoHideDuration={3000}
        onClose={() => setAdded(false)}
        message="Agregado a tu rutina"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
