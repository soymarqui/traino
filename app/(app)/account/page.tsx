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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import VerifiedIcon from '@mui/icons-material/Verified'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { useRouter } from 'next/navigation'

const GOALS = [
  { value: 'bajar_peso', label: 'Bajar de peso' },
  { value: 'ganar_musculo', label: 'Ganar masa muscular' },
  { value: 'mantenerse', label: 'Mantenerse' },
  { value: 'rendimiento', label: 'Mejorar rendimiento deportivo' },
  { value: 'otro', label: 'Otro' },
]

const GENDERS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'no_binarie', label: 'No binarie' },
]

const IDENTITIES = [
  { value: 'gymbro', label: 'GymBro' },
  { value: 'gymsis', label: 'GymSis' },
  { value: 'gympal', label: 'GymPal' },
]

export default function AccountPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [avatar, setAvatar] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [allowAdd, setAllowAdd] = useState(true)
  const [instagram, setInstagram] = useState('')
  const [instagramVis, setInstagramVis] = useState<'public' | 'contacts' | 'hidden'>('public')
  const [isCertified, setIsCertified] = useState(false)
  const [certStatus, setCertStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [certOpen, setCertOpen] = useState(false)
  const [certNote, setCertNote] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certSubmitting, setCertSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    handle: '',
    age: '',
    height: '',
    weight: '',
    goal: '',
    gender: '',
    identity: '',
    observations: '',
    bio: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email || '')
      setUserId(user?.id ?? null)
      const m = user?.user_metadata ?? {}
      setAvatar(m.avatar_url ?? '')

      let handle = ''
      let bio = ''
      let identity = ''
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('handle, bio, identity, is_public, allow_community_add, instagram, instagram_visibility, is_certified')
          .eq('id', user.id)
          .maybeSingle()
        setIsCertified(!!profile?.is_certified)

        const { data: lastReq } = await supabase
          .from('certification_requests')
          .select('status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastReq?.status) setCertStatus(lastReq.status as 'pending' | 'approved' | 'rejected')
        handle = profile?.handle ?? ''
        bio = profile?.bio ?? ''
        identity = profile?.identity ?? ''
        setIsPublic(profile?.is_public !== false)
        setAllowAdd(profile?.allow_community_add !== false)
        setInstagram(profile?.instagram ?? '')
        setInstagramVis((profile?.instagram_visibility as 'public' | 'contacts' | 'hidden') ?? 'public')
      }

      setForm({
        name: m.full_name ?? '',
        handle,
        age: m.age != null ? String(m.age) : '',
        height: m.height_cm != null ? String(m.height_cm) : '',
        weight: m.weight_kg != null ? String(m.weight_kg) : '',
        goal: m.goal ?? '',
        gender: m.gender ?? '',
        identity,
        observations: m.observations ?? '',
        bio,
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
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await supabase.auth.updateUser({ data: { avatar_url: url } })
      await supabase.from('profiles').upsert({ id: userId, avatar_url: url })
      setAvatar(url)
      setSaved(true)
    }
    setUploading(false)
  }

  const initial = (form.name || email || '?').trim()[0]?.toUpperCase() ?? '?'

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  const savePrivacy = async (patch: { is_public?: boolean; allow_community_add?: boolean }) => {
    if (patch.is_public !== undefined) setIsPublic(patch.is_public)
    if (patch.allow_community_add !== undefined) setAllowAdd(patch.allow_community_add)
    await supabase.from('profiles').upsert({ id: userId, ...patch })
    setSaved(true)
  }

  const handleSave = async () => {
    setError('')
    const cleanHandle = form.handle.trim().toLowerCase()
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
      data: {
        full_name: form.name.trim(),
        age: num(form.age),
        height_cm: num(form.height),
        weight_kg: num(form.weight),
        goal: form.goal || null,
        gender: form.gender || null,
        observations: form.observations.trim() || null,
      },
    })

    const { error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      handle: cleanHandle,
      display_name: form.name.trim(),
      avatar_url: avatar || null,
      bio: form.bio.trim() || null,
      identity: form.identity || null,
      instagram: instagram.trim().replace(/^@/, '') || null,
      instagram_visibility: instagramVis,
    })

    setSaving(false)
    if (profErr) {
      setError('No se pudo guardar el perfil. Intentá de nuevo.')
      return
    }
    setSaved(true)
  }

  const submitCert = async () => {
    if (!userId || !certFile) return
    setCertSubmitting(true)
    const ext = (certFile.name.split('.').pop() || 'pdf').toLowerCase()
    const path = `${userId}/cert-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('certifications').upload(path, certFile)
    if (upErr) {
      setCertSubmitting(false)
      setError('No se pudo subir el documento.')
      return
    }
    await supabase.from('certification_requests').insert({ user_id: userId, document_url: path, note: certNote.trim() || null })
    setCertSubmitting(false)
    setCertOpen(false)
    setCertNote('')
    setCertFile(null)
    setCertStatus('pending')
    setSaved(true)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    const res = await fetch('/api/delete-account', { method: 'POST' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/login')
    } else {
      setDeleting(false)
      setDeleteOpen(false)
      setError('No se pudo borrar la cuenta. Intentá de nuevo.')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Configuración de cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tus datos, privacidad y preferencias de cuenta.
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={avatar || undefined}
              onClick={() => fileRef.current?.click()}
              sx={{ width: 64, height: 64, cursor: 'pointer', bgcolor: 'primary.main', color: '#0A0A0A', fontWeight: 700, fontSize: '1.5rem' }}
            >
              {initial}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                {loading ? 'Cargando...' : email || 'Sin sesión'}
              </Typography>
              <Box>
                <Button size="small" onClick={() => fileRef.current?.click()} disabled={uploading} sx={{ mt: 0.5, ml: -0.5 }}>
                  {uploading ? 'Subiendo...' : 'Cambiar foto'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Privacidad */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Privacidad
          </Typography>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={<Switch checked={isPublic} onChange={(e) => savePrivacy({ is_public: e.target.checked })} disabled={loading} />}
                label="Perfil público"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 6 }}>
                {isPublic ? 'Tu perfil aparece en búsquedas y es visible para la comunidad.' : 'Tu perfil es privado: no aparece en búsquedas.'}
              </Typography>
              <FormControlLabel
                control={<Switch checked={allowAdd} onChange={(e) => savePrivacy({ allow_community_add: e.target.checked })} disabled={loading} />}
                label="Permitir que me agreguen a comunidades"
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 6 }}>
                {allowAdd ? 'Los admins pueden sumarte a sus comunidades.' : 'Solo te podés unir vos mismo a una comunidad.'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Integraciones */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Integraciones
          </Typography>
          <Card sx={{ opacity: 0.6 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  🎧 Vincular con Spotify
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tu música mientras entrenás.
                </Typography>
              </Box>
              <Chip label="Próximamente" size="small" />
            </CardContent>
          </Card>
        </Box>

        {/* Certificación */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Certificación
          </Typography>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <VerifiedIcon sx={{ color: isCertified ? 'primary.main' : 'text.secondary' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {isCertified ? 'Perfil certificado' : 'Profesores y entrenadores'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isCertified
                    ? 'Tu perfil muestra el badge de verificación.'
                    : certStatus === 'pending'
                    ? 'Tu solicitud está en revisión.'
                    : certStatus === 'rejected'
                    ? 'Tu solicitud fue rechazada. Podés volver a enviarla.'
                    : 'Solicitá la certificación adjuntando tu título o certificado.'}
                </Typography>
              </Box>
              {!isCertified && certStatus !== 'pending' && (
                <Button size="small" variant="outlined" onClick={() => setCertOpen(true)}>
                  Solicitar
                </Button>
              )}
            </CardContent>
          </Card>
          {isAdmin(email) && (
            <Button size="small" onClick={() => router.push('/admin/certifications')} sx={{ alignSelf: 'flex-start' }}>
              Panel de certificaciones (admin)
            </Button>
          )}
        </Box>

        {/* Datos del perfil */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Mi perfil
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} fullWidth placeholder="¿Cómo querés que te llamemos?" />

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
            <TextField label="Edad" type="number" value={form.age} onChange={(e) => set('age', e.target.value)} fullWidth />
            <TextField label="Altura (cm)" type="number" value={form.height} onChange={(e) => set('height', e.target.value)} fullWidth />
            <TextField label="Peso (kg)" type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} fullWidth />
          </Box>

          <TextField label="Objetivo de entrenamiento" value={form.goal} onChange={(e) => set('goal', e.target.value)} fullWidth select>
            <MenuItem value="">Sin especificar</MenuItem>
            {GOALS.map((g) => (
              <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
            ))}
          </TextField>

          <TextField label="Género" value={form.gender} onChange={(e) => set('gender', e.target.value)} fullWidth select>
            <MenuItem value="">Prefiero no decir</MenuItem>
            {GENDERS.map((g) => (
              <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
            ))}
          </TextField>

          <TextField label="Identidad" value={form.identity} onChange={(e) => set('identity', e.target.value)} fullWidth select helperText="Cómo te ven en la comunidad">
            <MenuItem value="">Sin especificar</MenuItem>
            {IDENTITIES.map((g) => (
              <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Observaciones personales"
            value={form.observations}
            onChange={(e) => set('observations', e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Lesiones, restricciones, aclaraciones (ej: hombro derecho operado)"
            helperText="Privado. Lo usamos para avisarte si un ejercicio puede no ser apto para vos."
          />

          <TextField
            label="Bio"
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Contá algo sobre vos"
            helperText="Pública (para la sección de comunidad)."
          />

          <TextField
            label="Instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            fullWidth
            placeholder="tu_usuario"
            slotProps={{ input: { startAdornment: <span style={{ color: '#888', marginRight: 2 }}>@</span> } }}
          />

          <TextField
            select
            label="Visibilidad del Instagram"
            value={instagramVis}
            onChange={(e) => setInstagramVis(e.target.value as 'public' | 'contacts' | 'hidden')}
            fullWidth
          >
            <MenuItem value="public">🌐 Público (cualquiera)</MenuItem>
            <MenuItem value="contacts">👥 Solo GymBros/GymSis/GymPals</MenuItem>
            <MenuItem value="hidden">🙈 Oculto</MenuItem>
          </TextField>

          <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </Button>
        </Box>

        <Button color="error" fullWidth onClick={() => setDeleteOpen(true)} sx={{ mt: 1 }}>
          Borrar cuenta
        </Button>
      </Box>

      {/* Solicitar certificación */}
      <Dialog open={certOpen} onClose={() => setCertOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Solicitar certificación</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Adjuntá tu título, certificado o documentación que acredite tu formación. El equipo de Traino lo revisa manualmente.
          </Typography>
          <Button variant="outlined" color="inherit" component="label">
            {certFile ? certFile.name : 'Adjuntar documento'}
            <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
          </Button>
          <TextField
            label="Nota (opcional)"
            value={certNote}
            onChange={(e) => setCertNote(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Contanos sobre tu formación o experiencia."
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCertOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={submitCert} disabled={certSubmitting || !certFile}>
            {certSubmitting ? 'Enviando...' : 'Enviar solicitud'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Borrar cuenta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esto es <b>irreversible</b>: se eliminan tu cuenta y todos tus datos
            (rutinas, entrenamientos, fotos, etc.). ¿Seguro?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button color="error" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? 'Borrando...' : 'Borrar definitivamente'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message="Guardado"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
