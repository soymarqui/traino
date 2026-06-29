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

// Mini biblioteca de portadas predefinidas (genéricas, modernas, de entrenamiento).
// Usamos imágenes de Unsplash (Source) con parámetros de tamaño/recorte.
export const COVER_LIBRARY: { id: string; url: string }[] = [
  { id: 'gym1', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym2', url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym3', url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym4', url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym5', url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym6', url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym7', url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=70' },
  { id: 'gym8', url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1200&q=70' },
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
