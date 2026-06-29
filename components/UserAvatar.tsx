'use client'

import Avatar from '@mui/material/Avatar'
import PersonIcon from '@mui/icons-material/Person'
import type { SxProps, Theme } from '@mui/material/styles'

// Avatar estándar de usuario: muestra la foto si existe; si no, la inicial
// sobre fondo lima; y si no hay nombre, un ícono de persona. Evita el
// "espacio vacío" cuando el usuario no tiene foto.
export default function UserAvatar({
  src,
  name,
  size = 40,
  sx,
  onClick,
}: {
  src?: string | null
  name?: string | null
  size?: number
  sx?: SxProps<Theme>
  onClick?: () => void
}) {
  const letter = (name ?? '').trim().replace(/^@/, '')[0]?.toUpperCase()
  return (
    <Avatar
      src={src || undefined}
      onClick={onClick}
      sx={{ width: size, height: size, bgcolor: 'primary.main', color: '#0A0A0A', fontWeight: 700, fontSize: size * 0.42, cursor: onClick ? 'pointer' : 'default', ...sx }}
    >
      {letter || <PersonIcon sx={{ fontSize: size * 0.6, color: '#0A0A0A' }} />}
    </Avatar>
  )
}
