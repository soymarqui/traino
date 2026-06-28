'use client'

import { Suspense, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { useRouter, useSearchParams } from 'next/navigation'
import ExerciseForm, { ExerciseFormValues } from '../ExerciseForm'
import RequestForm from './RequestForm'

function NewExerciseInner() {
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [initial, setInitial] = useState<Partial<ExerciseFormValues>>({})
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const duplicateId = searchParams.get('duplicate')
  const fromRequestId = searchParams.get('from_request')
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const isAdminUser = isAdmin(user?.email)
      setAdmin(isAdminUser)

      if (isAdminUser && duplicateId) {
        const { data } = await supabase
          .from('exercises')
          .select('*')
          .eq('id', duplicateId)
          .single()
        if (data) {
          setInitial({
            name: `${data.name} (copia)`,
            muscle_id: data.muscle_id,
            equipment: data.equipment ?? [],
            unit: data.unit ?? 'reps',
            distance_unit: data.distance_unit ?? '',
            video_url: data.video_url ?? '',
            description: data.description ?? '',
            notes: data.notes ?? '',
            is_warmup: data.is_warmup ?? false,
          })
        }
      } else if (isAdminUser && fromRequestId) {
        const { data } = await supabase
          .from('exercise_requests')
          .select('*')
          .eq('id', fromRequestId)
          .single()
        if (data) {
          setInitial({
            name: data.name,
            muscle_id: data.muscle_id,
            notes: data.notes ?? '',
          })
        }
      }
      setReady(true)
    }
    init()
  }, [])

  const title = admin ? 'Agregar ejercicio' : 'Solicitar ejercicio'

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>

      {!ready && (
        <Typography color="text.secondary" sx={{ px: 3 }}>
          Cargando...
        </Typography>
      )}

      {ready && admin && (
        <ExerciseForm
          mode="create"
          requestId={fromRequestId ?? undefined}
          initial={initial}
        />
      )}

      {ready && !admin && <RequestForm />}
    </Box>
  )
}

export default function NewExercisePage() {
  return (
    <Suspense fallback={null}>
      <NewExerciseInner />
    </Suspense>
  )
}
