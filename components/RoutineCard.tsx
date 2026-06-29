'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'

// Card de rutina con portada de fondo, título, descripción y contadores
// (💪 likes + seguidores). Reutilizable en perfil y resultados.
export default function RoutineCard({
  name,
  coverUrl,
  description,
  exerciseCount,
  likes = 0,
  followers = 0,
  byHandle,
  onClick,
}: {
  name: string
  coverUrl?: string | null
  description?: string | null
  exerciseCount?: number
  likes?: number
  followers?: number
  byHandle?: string | null
  onClick?: () => void
}) {
  const hasCover = !!coverUrl
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        minHeight: 132,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {hasCover && (
        <Box component="img" src={coverUrl!} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: hasCover
            ? 'linear-gradient(to top right, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.9) 35%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.2) 100%)'
            : 'transparent',
        }}
      />
      <Box sx={{ position: 'relative', p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: hasCover ? '#fff' : 'text.primary' }}>
          {name}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            sx={{
              color: hasCover ? 'rgba(255,255,255,0.85)' : 'text.secondary',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="body2" sx={{ color: hasCover ? 'rgba(255,255,255,0.75)' : 'text.secondary' }}>
            {exerciseCount != null ? `${exerciseCount} ejercicios` : ''}
            {byHandle ? `${exerciseCount != null ? ' · ' : ''}por @${byHandle}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: hasCover ? 'rgba(255,255,255,0.9)' : 'text.secondary' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <span style={{ fontSize: '0.95rem' }}>💪</span>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{likes}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <PeopleAltIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{followers}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
