'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Snackbar from '@mui/material/Snackbar'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [timerEnabled, setTimerEnabled] = useState(true)
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const m = user?.user_metadata ?? {}
      setTimerEnabled(m.timer_enabled !== false)
      setWeightUnit(m.weight_unit === 'lbs' ? 'lbs' : 'kg')
      setLoading(false)
    }
    load()
  }, [])

  const saveTimer = async (value: boolean) => {
    setTimerEnabled(value)
    await supabase.auth.updateUser({ data: { timer_enabled: value } })
    setSaved(true)
  }

  const saveUnit = async (value: 'kg' | 'lbs') => {
    if (!value) return
    setWeightUnit(value)
    await supabase.auth.updateUser({ data: { weight_unit: value } })
    setSaved(true)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ajustes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preferencias de la app.
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Timer de descanso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Countdown automático entre series.
            </Typography>
            <FormControlLabel
              control={<Switch checked={timerEnabled} onChange={(e) => saveTimer(e.target.checked)} disabled={loading} />}
              label={timerEnabled ? 'Activado' : 'Desactivado'}
              sx={{ mt: 0.5 }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Unidad de peso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cómo se muestran los pesos en la app.
            </Typography>
            <ToggleButtonGroup
              value={weightUnit}
              exclusive
              onChange={(_, v) => saveUnit(v)}
              disabled={loading}
              sx={{ mt: 0.5 }}
            >
              <ToggleButton value="kg" sx={{ px: 3 }}>KG</ToggleButton>
              <ToggleButton value="lbs" sx={{ px: 3 }}>LBS</ToggleButton>
            </ToggleButtonGroup>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={saved}
        autoHideDuration={2000}
        onClose={() => setSaved(false)}
        message="Ajustes guardados"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
