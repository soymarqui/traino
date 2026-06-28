'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { useRouter, useParams } from 'next/navigation'
import ExerciseForm, { ExerciseFormValues } from '../../ExerciseForm'

export default function EditExercisePage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [initial, setInitial] = useState<Partial<ExerciseFormValues> | null>(null)
  const router = useRouter()
  const params = useParams()
  const exerciseId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isAdmin(user?.email)) {
        setAllowed(false)
        return
      }
      setAllowed(true)

      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single()

      if (data) {
        setInitial({
          name: data.name,
          muscle_id: data.muscle_id,
          equipment: data.equipment ?? [],
          unit: data.unit ?? 'reps',
          video_url: data.video_url ?? '',
          notes: data.notes ?? '',
        })
      }
    }
    init()
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Editar ejercicio
        </Typography>
      </Box>

      {allowed === false && (
        <Typography color="text.secondary" sx={{ px: 3 }}>
          No tenés permisos para editar ejercicios.
        </Typography>
      )}

      {allowed && !initial && (
        <Typography color="text.secondary" sx={{ px: 3 }}>
          Cargando...
        </Typography>
      )}

      {allowed && initial && (
        <ExerciseForm mode="edit" exerciseId={exerciseId} initial={initial} />
      )}
    </Box>
  )
}
