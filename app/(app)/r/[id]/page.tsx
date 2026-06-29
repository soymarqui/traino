'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ShareIcon from '@mui/icons-material/Share'
import VerifiedIcon from '@mui/icons-material/Verified'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import { createClient } from '@/lib/supabase/client'
import { Equipment, Routine, RoutineDay, RoutineExercise, RoutineExerciseSet } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  maquina: 'Máquina',
  mancuernas: 'Mancuernas',
  barra: 'Barra',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
}

const IDENTITY_LABELS: Record<string, string> = { gymbro: 'GymBro', gymsis: 'GymSis', gympal: 'GymPal' }

function setsSummary(sets: RoutineExerciseSet[]): string {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => {
      if (s.to_failure) return 'fallo'
      if (s.duration_seconds != null) return `${s.duration_seconds}s`
      if (s.reps != null) return s.reps_max ? `${s.reps}-${s.reps_max}` : String(s.reps)
      return '—'
    })
    .join(' · ')
}

type Owner = { handle: string | null; display_name: string | null; identity: string | null; is_certified: boolean }

export default function PublicRoutinePage() {
  const params = useParams()
  const routineId = params.id as string
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [days, setDays] = useState<RoutineDay[]>([])
  const [items, setItems] = useState<RoutineExercise[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [snack, setSnack] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { data: r } = await supabase.from('routines').select('*').eq('id', routineId).maybeSingle()
    if (!r) {
      setLoading(false)
      return
    }
    setRoutine(r as Routine)

    const [{ data: prof }, { data: d }, { data: ex }, { data: sub }] = await Promise.all([
      supabase.from('profiles').select('handle, display_name, identity, is_certified').eq('id', (r as Routine).owner_id).maybeSingle(),
      supabase.from('routine_days').select('*').eq('routine_id', routineId).order('position'),
      supabase
        .from('routine_exercises')
        .select('*, exercise:exercises(id, name, muscle:muscles(name)), sets:routine_exercise_sets(*)')
        .eq('routine_id', routineId)
        .order('position'),
      user
        ? supabase.from('routine_subscriptions').select('id').eq('user_id', user.id).eq('routine_id', routineId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setOwner(prof as Owner | null)
    setDays((d as RoutineDay[]) || [])
    setItems((ex as RoutineExercise[]) || [])
    setSubscribed(!!sub)

    // Likes 💪 y seguidores.
    const [{ data: rl }, { count: subsCount }] = await Promise.all([
      supabase.from('routine_likes').select('user_id').eq('routine_id', routineId),
      supabase.from('routine_subscriptions').select('id', { count: 'exact', head: true }).eq('routine_id', routineId),
    ])
    const likeRows = (rl as { user_id: string }[]) || []
    setLikeCount(likeRows.length)
    setLiked(!!user && likeRows.some((x) => x.user_id === user.id))
    setFollowerCount(subsCount ?? 0)
    setLoading(false)
  }

  const toggleLike = async () => {
    if (!userId) return
    setLiked((v) => !v)
    setLikeCount((c) => c + (liked ? -1 : 1))
    if (liked) {
      await supabase.from('routine_likes').delete().eq('routine_id', routineId).eq('user_id', userId)
    } else {
      await supabase.from('routine_likes').upsert({ routine_id: routineId, user_id: userId }, { onConflict: 'routine_id,user_id' })
    }
  }

  const isOwner = userId && routine && routine.owner_id === userId
  const coverOpacity = Math.max(0, 1 - scrollY / 320)

  const toggleSubscribe = async () => {
    if (!userId) return
    setBusy(true)
    if (subscribed) {
      setSubscribed(false)
      setFollowerCount((c) => Math.max(0, c - 1))
      await supabase.from('routine_subscriptions').delete().eq('user_id', userId).eq('routine_id', routineId)
    } else {
      setSubscribed(true)
      setFollowerCount((c) => c + 1)
      await supabase.from('routine_subscriptions').insert({ user_id: userId, routine_id: routineId })
      setSnack('¡Agregada a tus rutinas!')
    }
    setBusy(false)
  }

  const share = async () => {
    const url = `${window.location.origin}/r/${routineId}`
    try {
      if (navigator.share) await navigator.share({ title: routine?.name ?? 'Rutina', url })
      else {
        await navigator.clipboard.writeText(url)
        setSnack('Link copiado')
      }
    } catch {
      /* cancelado */
    }
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <IconButton
        onClick={() => router.back()}
        aria-label="Atrás"
        sx={{
          position: 'fixed', top: 12, left: 12, zIndex: 3,
          bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(4px)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      {/* Header fijo: portada de fondo, se desvanece con el scroll */}
      <Box
        sx={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '42vh', zIndex: 0,
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: coverOpacity, transition: 'opacity 0.1s linear',
          background: 'linear-gradient(135deg, #1a1a1a, #0A0A0A)',
        }}
      >
        {routine?.cover_url ? (
          <Box component="img" src={routine.cover_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Typography sx={{ fontSize: 72, opacity: 0.5 }}>🏋️</Typography>
        )}
        <Box
          sx={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%',
            background: 'linear-gradient(to top, rgba(10,10,10,0.95), rgba(10,10,10,0))',
          }}
        />
        {!loading && routine && (
          <Box sx={{ position: 'absolute', left: 24, right: 24, bottom: 20 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
              {routine.name}
            </Typography>
            {owner?.handle && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  por @{owner.handle}
                </Typography>
                {owner.is_certified && <VerifiedIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Sheet */}
      <Box
        sx={{
          position: 'relative', zIndex: 1, mt: '38vh', minHeight: '64vh',
          bgcolor: 'background.default',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.6)',
          px: 3, pt: 2, pb: 12,
          display: 'flex', flexDirection: 'column', gap: 3,
        }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', alignSelf: 'center' }} />

        {loading && <Typography color="text.secondary">Cargando...</Typography>}
        {!loading && !routine && <Typography color="text.secondary">Esta rutina no existe o no es pública.</Typography>}

        {!loading && routine && (
          <>
            {owner?.identity && (
              <Chip
                label={IDENTITY_LABELS[owner.identity] ?? owner.identity}
                size="small"
                color="primary"
                sx={{ alignSelf: 'flex-start', height: 22 }}
              />
            )}

            {routine.description && (
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {routine.description}
              </Typography>
            )}

            {/* Contadores */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                onClick={isOwner ? undefined : toggleLike}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: isOwner ? 'default' : 'pointer' }}
              >
                <span style={{ fontSize: '1.25rem', filter: liked ? 'none' : 'grayscale(1)', opacity: liked ? 1 : 0.6 }}>💪</span>
                <Typography variant="body2" sx={{ fontWeight: 700, color: liked ? 'primary.main' : 'text.secondary' }}>
                  {likeCount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <PeopleAltIcon sx={{ fontSize: '1.15rem' }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{followerCount}</Typography>
                <Typography variant="body2" color="text.secondary">siguiendo</Typography>
              </Box>
            </Box>

            {/* Acciones */}
            {!isOwner ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={subscribed ? 'outlined' : 'contained'}
                  color={subscribed ? 'success' : 'primary'}
                  startIcon={subscribed ? <CheckCircleIcon /> : <AddIcon />}
                  onClick={toggleSubscribe}
                  disabled={busy}
                  sx={{ flex: 1 }}
                >
                  {subscribed ? 'En mis rutinas' : 'Agregar a mi rutina'}
                </Button>
                <Button variant="outlined" color="inherit" onClick={share} aria-label="Compartir">
                  <ShareIcon />
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" color="inherit" startIcon={<ShareIcon />} onClick={share} sx={{ flex: 1 }}>
                  Compartir
                </Button>
              </Box>
            )}

            {/* Rutina */}
            {days.map((day) => {
              const dayItems = items.filter((i) => i.routine_day_id === day.id)
              return (
                <Box key={day.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {day.name}
                  </Typography>
                  {dayItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item.exercise?.name ?? 'Ejercicio'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.sets?.length ?? 0} series · {setsSummary(item.sets ?? [])}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {item.equipment && <Chip label={EQUIPMENT_LABELS[item.equipment]} size="small" />}
                          {item.unilateral && <Chip label="Unilateral" size="small" sx={{ opacity: 0.8 }} />}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )
            })}
          </>
        )}
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
