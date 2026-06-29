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
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { equipmentLabel } from '@/lib/equipment'
import { muscleLabel, muscleEmoji } from '@/lib/muscles'
import { unitShort } from '@/lib/units'
import { displayTitleSx } from '@/lib/theme'
import Markdown from '@/components/Markdown'
import { Exercise } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'
import AddToRoutineDialog from './AddToRoutineDialog'

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Palabras de una observación que sugieren cuidado con cada músculo.
const INJURY_KEYWORDS: Record<string, string[]> = {
  pecho: ['pecho', 'pectoral'],
  espalda: ['espalda', 'lumbar', 'columna', 'dorsal'],
  hombros: ['hombro'],
  biceps: ['biceps', 'codo'],
  triceps: ['triceps', 'codo'],
  cuadriceps: ['cuadriceps', 'rodilla', 'sentadilla'],
  isquios: ['isquio', 'rodilla', 'femoral'],
  gluteos: ['gluteo', 'cadera'],
  pantorrillas: ['pantorrilla', 'gemelo', 'tobillo'],
  abdominales: ['abdomen', 'abdominal', 'core'],
  antebrazos: ['antebrazo', 'muneca'],
}

function alignsWithGoal(goals: string[], ex: Exercise): boolean {
  if (!goals.length || ex.unit !== 'reps') return false
  if (goals.includes('ganar_musculo') && ex.suggested_sets >= 3 && ex.reps_min >= 6 && ex.reps_max <= 15) return true
  if (goals.includes('bajar_peso') && ex.reps_max >= 12) return true
  if (goals.includes('rendimiento') && ex.reps_min <= 6) return true
  return false
}

function injuryWarning(observations: string, slug?: string | null): boolean {
  if (!observations.trim() || !slug) return false
  const obs = norm(observations)
  return (INJURY_KEYWORDS[slug] || []).some((k) => obs.includes(norm(k)))
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
  const [goals, setGoals] = useState<string[]>([])
  const [observations, setObservations] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isFav, setIsFav] = useState(false)
  const [inActiveRoutine, setInActiveRoutine] = useState(false)
  const [routinesWith, setRoutinesWith] = useState<{ id: string; name: string }[]>([])
  const [scrollY, setScrollY] = useState(0)
  const router = useRouter()
  const params = useParams()
  const exerciseId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    fetchExercise()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdmin(isAdmin(user?.email))
      const m = user?.user_metadata ?? {}
      setGoals(Array.isArray(m.goals) ? m.goals : m.goal ? [m.goal] : [])
      setObservations((user?.user_metadata?.observations as string | undefined) ?? '')
      setUserId(user?.id ?? null)
      if (user) {
        supabase
          .from('exercise_favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)
          .maybeSingle()
          .then(({ data }) => setIsFav(!!data))

        // ¿Ya está en la rutina activa?
        supabase
          .from('profiles')
          .select('active_routine_id')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            const rid = (prof as { active_routine_id: string | null } | null)?.active_routine_id
            if (!rid) return
            supabase
              .from('routine_exercises')
              .select('id')
              .eq('routine_id', rid)
              .eq('exercise_id', exerciseId)
              .maybeSingle()
              .then(({ data }) => setInActiveRoutine(!!data))
          })

        // Rutinas (propias) que incluyen este ejercicio.
        supabase
          .from('routine_exercises')
          .select('routine:routines(id, name, owner_id)')
          .eq('exercise_id', exerciseId)
          .then(({ data }) => {
            const seen = new Set<string>()
            const list: { id: string; name: string }[] = []
            ;(data || []).forEach((row: any) => {
              const rt = Array.isArray(row.routine) ? row.routine[0] : row.routine
              if (rt && rt.owner_id === user.id && !seen.has(rt.id)) {
                seen.add(rt.id)
                list.push({ id: rt.id, name: rt.name })
              }
            })
            setRoutinesWith(list)
          })
      }
    })
  }, [])

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
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

  const toggleFav = async () => {
    if (!userId) return
    if (isFav) {
      setIsFav(false)
      await supabase.from('exercise_favorites').delete().eq('user_id', userId).eq('exercise_id', exerciseId)
    } else {
      setIsFav(true)
      await supabase.from('exercise_favorites').insert({ user_id: userId, exercise_id: exerciseId })
    }
  }

  const videoId = exercise?.video_url ? getYouTubeId(exercise.video_url) : null
  const videoOpacity = Math.max(0, 1 - scrollY / 320)

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Botones flotantes */}
      <IconButton
        onClick={() => router.back()}
        aria-label="Atrás"
        sx={{
          position: 'fixed', top: 12, left: 12, zIndex: 3,
          bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
          backdropFilter: 'blur(4px)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
        <ArrowBackIcon />
      </IconButton>
      {!loading && exercise && (
        <IconButton
          onClick={toggleFav}
          aria-label="favorito"
          sx={{
            position: 'fixed', top: 12, right: 12, zIndex: 3,
            bgcolor: 'rgba(0,0,0,0.5)', color: isFav ? 'primary.main' : '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          {isFav ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
      )}

      {/* Header fijo: video de fondo (4:5), se desvanece con el scroll */}
      <Box
        sx={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '60vh', zIndex: 0,
          bgcolor: 'black', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: videoOpacity,
          transition: 'opacity 0.1s linear',
        }}
      >
        {videoId ? (
          <Box
            component="iframe"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&playsinline=1&rel=0`}
            title={exercise?.name}
            allow="autoplay; encrypted-media"
            sx={{
              border: 0, pointerEvents: 'none',
              // Cubrir manteniendo proporción 4:5 (1080x1350).
              width: 'max(100%, 80vh)',
              height: 'max(100%, 125vw)',
            }}
          />
        ) : (
          <Typography sx={{ fontSize: 72, opacity: 0.6 }}>
            {muscleEmoji(exercise?.muscle?.slug) || '🏋️'}
          </Typography>
        )}
        {/* Gradiente para legibilidad del nombre */}
        <Box
          sx={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
            background: 'linear-gradient(to top, rgba(10,10,10,0.95), rgba(10,10,10,0))',
          }}
        />
        {!loading && exercise && (
          <Typography
            variant="h4"
            sx={{ ...displayTitleSx, position: 'absolute', left: 24, right: 24, bottom: 24, color: '#fff' }}
          >
            {exercise.name}
          </Typography>
        )}
      </Box>

      {/* Sheet que sube sobre el video al hacer scroll */}
      <Box
        sx={{
          position: 'relative', zIndex: 1, mt: '54vh', minHeight: '64vh',
          bgcolor: 'background.default',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.6)',
          px: 3, pt: 2, pb: 12,
          display: 'flex', flexDirection: 'column', gap: 3,
        }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', alignSelf: 'center' }} />

        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && !exercise && (
          <Typography color="text.secondary">No se encontró el ejercicio.</Typography>
        )}

        {!loading && exercise && (
          <>
            {/* El nombre ya se muestra sobre el video; acá solo descripción + chips */}
            <Box>
              {exercise.description && (
                <Box>
                  <Markdown text={exercise.description} />
                </Box>
              )}
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
                {alignsWithGoal(goals, exercise) && (
                  <Chip label="✅ Se alinea con tu objetivo" size="small" color="success" />
                )}
                {inActiveRoutine && (
                  <Chip label="✓ En tu rutina activa" size="small" color="success" />
                )}
              </Box>
            </Box>

            {injuryWarning(observations, exercise.muscle?.slug) && (
              <Alert severity="warning">
                ⚠️ Revisá si esto es apto para vos — tenés una observación que involucra este músculo.
              </Alert>
            )}

            <Button
              variant={inActiveRoutine ? 'outlined' : 'contained'}
              color={inActiveRoutine ? 'success' : 'primary'}
              size="large"
              fullWidth
              startIcon={inActiveRoutine ? <CheckCircleIcon /> : <AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              {inActiveRoutine ? 'En tu rutina activa · agregar a otra' : 'Agregar a rutina'}
            </Button>

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

            {/* Datos / requisitos */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Estos valores son una <b>sugerencia</b>. Los confirmás o ajustás
                cuando agregás el ejercicio a tu rutina.
              </Typography>
              <Card>
                <CardContent sx={{ py: 1 }}>
                  <DetailRow label="Músculo" value={exercise.muscle?.name ?? '—'} />
                  <Divider />
                  <DetailRow
                    label="Series sugeridas"
                    value={`${exercise.suggested_sets} × ${exercise.reps_min}–${exercise.reps_max} ${unitShort(exercise.unit, exercise.distance_unit)}`}
                  />
                  <Divider />
                  <DetailRow label="Descanso sugerido" value={`${exercise.rest_seconds}s`} />
                  <Divider />
                  <DetailRow
                    label="Equipo necesario"
                    value={
                      exercise.equipment?.length
                        ? exercise.equipment.map(equipmentLabel).join(', ')
                        : '—'
                    }
                  />
                </CardContent>
              </Card>
            </Box>

            {/* Cómo hacerlo */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                Indicaciones
              </Typography>
              {exercise.notes ? (
                <Markdown text={exercise.notes} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Todavía no hay indicaciones para este ejercicio.
                </Typography>
              )}
            </Box>

            {/* Rutinas con este ejercicio */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                Rutinas con este ejercicio
              </Typography>
              {routinesWith.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Todavía no está en ninguna de tus rutinas.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {routinesWith.map((r) => (
                    <Chip
                      key={r.id}
                      label={r.name}
                      onClick={() => router.push(`/routine/${r.id}`)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
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
