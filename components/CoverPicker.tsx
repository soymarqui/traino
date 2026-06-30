'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

// Mini biblioteca de portadas: fondos con gradiente generados como SVG (data URI).
// Cargan siempre (sin depender de un CDN externo) y se usan como cualquier imagen.
function gradientCover(c1: string, c2: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'><defs><linearGradient id='g' gradientTransform='rotate(45)'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const COVER_LIBRARY: { id: string; url: string }[] = [
  { id: 'lime', url: gradientCover('#C6F135', '#0A0A0A') },
  { id: 'blue', url: gradientCover('#4D8BFF', '#15235E') },
  { id: 'violet', url: gradientCover('#8B5CF6', '#1E1145') },
  { id: 'sunset', url: gradientCover('#FF8A00', '#E0245E') },
  { id: 'teal', url: gradientCover('#22D3EE', '#0A5C3E') },
  { id: 'pink', url: gradientCover('#FF5FA2', '#5B1E6B') },
  { id: 'amber', url: gradientCover('#F5C518', '#1A1A1A') },
  { id: 'slate', url: gradientCover('#94A3B8', '#1E293B') },
]

export default function CoverPicker({
  open,
  onClose,
  onPick,
  onUpload,
  uploading,
}: {
  open: boolean
  onClose: () => void
  onPick: (url: string) => void
  onUpload: (file: File) => void
  uploading?: boolean
}) {
  const [tab] = useState(0)
  void tab
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Imagen de portada</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
        <Button variant="outlined" color="inherit" component="label" startIcon={<CloudUploadIcon />} disabled={uploading}>
          {uploading ? 'Subiendo...' : 'Subir mi propia imagen'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
            }}
          />
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddPhotoAlternateIcon sx={{ color: 'text.hint', fontSize: 18 }} />
          <Typography variant="body2" color="text.hint">O elegí una de la biblioteca</Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {COVER_LIBRARY.map((c) => (
            <Box
              key={c.id}
              onClick={() => onPick(c.url)}
              sx={{
                position: 'relative',
                aspectRatio: '16 / 9',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid transparent',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Box component="img" src={c.url} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
