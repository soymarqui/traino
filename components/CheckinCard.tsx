'use client'

import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import ChecklistIcon from '@mui/icons-material/Checklist'
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined'
import SendIcon from '@mui/icons-material/Send'
import UserAvatar from '@/components/UserAvatar'
import { createClient } from '@/lib/supabase/client'

export type CheckinPost = {
  id: string
  user_id: string
  photo_url: string | null
  summary: string | null
  created_at: string
  workoutDate?: string | null
  routineName?: string | null
  routineId?: string | null
  group_id?: string | null
}

type CommentRow = { id: string; user_id: string; body: string; handle?: string | null; display_name?: string | null; avatar_url?: string | null }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function CheckinCard({
  post,
  authorHandle,
  authorName,
  authorAvatar,
  userId,
  likeCount,
  liked,
  onToggleLike,
  commentCount,
  onCommentCount,
  onOpenProfile,
  onOpenRoutine,
}: {
  post: CheckinPost
  authorHandle: string | null
  authorName: string | null
  authorAvatar: string | null
  userId: string | null
  likeCount: number
  liked: boolean
  onToggleLike: () => void
  commentCount: number
  onCommentCount: (n: number) => void
  onOpenProfile: () => void
  onOpenRoutine: () => void
}) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [showAll, setShowAll] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const lastTap = useRef(0)
  const supabase = createClient()

  const loadComments = async () => {
    const { data } = await supabase
      .from('post_comments')
      .select('id, user_id, body, created_at')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    const rows = (data as CommentRow[]) || []
    const uids = [...new Set(rows.map((r) => r.user_id))]
    const profs: Record<string, { handle: string | null; display_name: string | null; avatar_url: string | null }> = {}
    if (uids.length) {
      const { data: p } = await supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', uids)
      ;(p || []).forEach((x: any) => (profs[x.id] = { handle: x.handle, display_name: x.display_name, avatar_url: x.avatar_url }))
    }
    setComments(rows.map((r) => ({ ...r, ...profs[r.user_id] })))
    onCommentCount(rows.length)
  }

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  const send = async () => {
    if (!body.trim() || !userId) return
    setSending(true)
    await supabase.from('post_comments').insert({ post_id: post.id, user_id: userId, body: body.trim() })
    setBody('')
    setSending(false)
    loadComments()
  }

  const handleImageTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) onToggleLike()
    }
    lastTap.current = now
  }

  const cName = (c: CommentRow) => (c.handle ? `@${c.handle}` : c.display_name || 'usuario')
  const shown = showAll ? comments : comments.slice(-3)

  return (
    <Card sx={{ overflow: 'hidden' }}>
      {/* Header: foto de perfil + usuario */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
        <UserAvatar src={authorAvatar} name={authorName || authorHandle} size={36} onClick={onOpenProfile} />
        <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpenProfile}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {authorHandle ? `@${authorHandle}` : authorName || 'usuario'}
          </Typography>
          <Typography variant="caption" color="text.hint">
            {fmtDate(post.workoutDate || post.created_at)}
            {post.routineName ? ` · 📋 ${post.routineName}` : ''}
          </Typography>
        </Box>
      </Box>

      {/* Imagen 4:5 con overlays */}
      <Box
        onClick={handleImageTap}
        sx={{
          position: 'relative', width: '100%', aspectRatio: '4 / 5', overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a1a1a, #0A0A0A)', cursor: 'pointer',
        }}
      >
        {post.photo_url ? (
          <Box component="img" src={post.photo_url} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 84, opacity: 0.4 }}>🏋️</Typography>
          </Box>
        )}

        {/* Botón rutina (arriba derecha) */}
        {post.routineId && (
          <IconButton
            aria-label="Ver rutina"
            onClick={(e) => { e.stopPropagation(); onOpenRoutine() }}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
          >
            <ChecklistIcon />
          </IconButton>
        )}

        {/* Gradiente inferior + texto + contadores */}
        <Box
          sx={{
            position: 'absolute', left: 0, right: 0, bottom: 0, p: 1.5, pt: 5,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
          }}
        >
          <Typography variant="body2" sx={{ color: '#fff', flex: 1, fontWeight: 500 }}>
            {post.summary || ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggleLike() }} aria-label="Me gusta" sx={{ p: 0.25 }}>
                <span style={{ fontSize: '1.2rem', opacity: liked ? 1 : 0.55, filter: liked ? 'none' : 'grayscale(1)' }}>💪</span>
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{likeCount}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <CommentOutlinedIcon sx={{ fontSize: '1.05rem' }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{commentCount}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Comentarios (estilo IG, debajo del post, hasta 3) */}
      <Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {comments.length > 3 && !showAll && (
          <Typography variant="caption" color="text.hint" sx={{ cursor: 'pointer' }} onClick={() => setShowAll(true)}>
            Ver los {comments.length} comentarios
          </Typography>
        )}
        {shown.map((c) => (
          <Typography key={c.id} variant="body2">
            <b>{cName(c)}</b> <span style={{ opacity: 0.85 }}>{c.body}</span>
          </Typography>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Agregá un comentario..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            slotProps={{ input: { disableUnderline: true } }}
          />
          {body.trim() && (
            <IconButton size="small" onClick={send} disabled={sending} aria-label="Enviar">
              <SendIcon fontSize="small" color="primary" />
            </IconButton>
          )}
        </Box>
      </Box>
    </Card>
  )
}
