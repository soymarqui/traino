'use client'

import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import LogoutIcon from '@mui/icons-material/Logout'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { useRouter } from 'next/navigation'

const GOALS = [
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'perdida_grasa', label: 'Pérdida de grasa' },
  { value: 'salud', label: 'Salud general' },
]

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [avatar, setAvatar] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    handle: '',
    age: '',
    height: '',
    weight: '',
    goal: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email || '')
      setAdmin(isAdmin(user?.email))
      setUserId(user?.id ?? null)
      const m = user?.user_metadata ?? {}
      setAvatar(m.avatar_url ?? '')

      let handle = ''
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', user.id)
          .maybeSingle()
        handle = profile?.handle ?? ''
      }

      setForm({
        name: m.full_name ?? '',
        handle,
        age: m.age != null ? String(m.age) : '',
        height: m.height_cm != null ? String(m.height_cm) : '',
        weight: m.weight_kg != null ? String(m.weight_kg) : '',
        goal: m.goal ?? '',
      })
      setLoading(false)
    }
    load()
  }, [])

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await supabase.auth.updateUser({ data: { avatar_url: url } })
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      setAvatar(url)
      setSaved(true)
    }
    setUploading(false)
  }

  const initial = (form.name || email || '?').trim()[0]?.toUpperCase() ?? '?'

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  const handleSave = async () => {
    setError('')
    const cleanHandle = form.handle.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      setError('El usuario debe tener 3-20 caracteres: letras, números o _ (sin espacios).')
      return
    }
    setSaving(true)

    // ¿Handle disponible? (excluyendo el propio)
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
      data: {
        full_name: form.name.trim(),
        age: num(form.age),
        height_cm: num(form.height),
        weight_kg: num(form.weight),
        goal: form.goal || null,
      },
    })

    await supabase
      .from('profiles')
      .update({ handle: cleanHandle, display_name: form.name.trim(), avatar_url: avatar || null })
      .eq('id', userId ?? '')

    setSaving(false)
    setSaved(true)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Configuración
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhoto}
        />
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={avatar || undefined}
              onClick={() => fileRef.current?.click()}
              sx={{
                width: 64,
                height: 64,
                cursor: 'pointer',
                bgcolor: 'primary.main',
                color: '#0A0A0A',
                fontWeight: 700,
                fontSize: '1.5rem',
              }}
            >
              {initial}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, wordBreak: 'break-all' }}
              >
                {loading ? 'Cargando...' : email || 'Sin sesión'}
              </Typography>
              {admin && (
                <Chip label="Admin" size="small" color="primary" sx={{ mt: 0.5 }} />
              )}
              <Box>
                <Button
                  size="small"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  sx={{ mt: 0.5, ml: -0.5 }}
                >
                  {uploading ? 'Subiendo...' : 'Cambiar foto'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Datos del perfil */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            Mi perfil
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            fullWidth
            placeholder="¿Cómo querés que te llamemos?"
          />

          <TextField
            label="Nombre de usuario"
            value={form.handle}
            onChange={(e) => set('handle', e.target.value)}
            fullWidth
            placeholder="marcos_fit"
            helperText="Tu @ para compartir rutinas"
            slotProps={{ input: { startAdornment: <span style={{ color: '#888', marginRight: 2 }}>@</span> } }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Edad"
              type="number"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
              fullWidth
            />
            <TextField
              label="Altura (cm)"
              type="number"
              value={form.height}
              onChange={(e) => set('height', e.target.value)}
              fullWidth
            />
            <TextField
              label="Peso (kg)"
              type="number"
              value={form.weight}
              onChange={(e) => set('weight', e.target.value)}
              fullWidth
            />
          </Box>

          <TextField
            label="Objetivo de entrenamiento"
            value={form.goal}
            onChange={(e) => set('goal', e.target.value)}
            fullWidth
            select
          >
            <MenuItem value="">Sin especificar</MenuItem>
            {GOALS.map((g) => (
              <MenuItem key={g.value} value={g.value}>
                {g.label}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </Button>
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          size="large"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
      </Box>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message="Perfil actualizado"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
