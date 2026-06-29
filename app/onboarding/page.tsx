'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const GOALS = [
  { value: 'bajar_peso', label: 'Bajar de peso' },
  { value: 'ganar_musculo', label: 'Ganar masa muscular' },
  { value: 'mantenerse', label: 'Mantenerse' },
  { value: 'rendimiento', label: 'Mejorar rendimiento deportivo' },
  { value: 'otro', label: 'Otro' },
]

export default function OnboardingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [avatar, setAvatar] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [goal, setGoal] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUserId(user.id)
      const m = user.user_metadata ?? {}
      setName(m.full_name ?? m.name ?? '')
      setAvatar(m.avatar_url ?? m.picture ?? '')

      // Si ya tiene handle, no necesita onboarding.
      const { data: profile } = await supabase.from('profiles').select('handle').eq('id', user.id).maybeSingle()
      if (profile?.handle) {
        router.replace('/dashboard')
        return
      }
      // Sugerir un handle a partir del email.
      const suggested = (user.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
      setHandle(suggested.slice(0, 20))
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    setError('')
    const cleanHandle = handle.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      setError('El usuario debe tener 3-20 caracteres: letras, números o _ (sin espacios).')
      return
    }
    setSaving(true)

    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', cleanHandle)
      .neq('id', userId ?? '')
      .maybeSingle()
    if (taken) {
      setError('Ese nombre de usuario ya está en uso.')
      setSaving(false)
      return
    }

    await supabase.auth.updateUser({
      data: { full_name: name.trim(), goal: goal || null, ...(avatar ? { avatar_url: avatar } : {}) },
    })
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      handle: cleanHandle,
      display_name: name.trim() || null,
      avatar_url: avatar || null,
    })
    if (profErr) {
      setError('No se pudo guardar. Intentá de nuevo.')
      setSaving(false)
      return
    }
    router.replace('/dashboard')
  }

  if (loading) return null

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          TRAINO
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={avatar || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: '#0A0A0A', fontWeight: 700 }}>
            {(name || '?')[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>¡Bienvenide a Traino!</Typography>
            <Typography variant="body2" color="text.secondary">Completá tu perfil para arrancar.</Typography>
          </Box>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} fullWidth placeholder="¿Cómo querés que te llamemos?" />

        <TextField
          label="Nombre de usuario"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          fullWidth
          placeholder="marcos_fit"
          helperText="Tu @ para compartir rutinas"
          slotProps={{ input: { startAdornment: <span style={{ color: '#888', marginRight: 2 }}>@</span> } }}
        />

        <TextField label="Objetivo de entrenamiento" value={goal} onChange={(e) => setGoal(e.target.value)} fullWidth select>
          <MenuItem value="">Sin especificar</MenuItem>
          {GOALS.map((g) => (
            <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
          ))}
        </TextField>

        <Button variant="contained" size="large" fullWidth onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Empezar a entrenar'}
        </Button>
      </Box>
    </Box>
  )
}
