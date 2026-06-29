'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined'
import SendIcon from '@mui/icons-material/Send'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'

type CommentRow = {
  id: string
  user_id: string
  body: string
  created_at: string
  handle?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

export default function PostComments({
  postId,
  userId,
  count,
  onCount,
}: {
  postId: string
  userId: string | null
  count: number
  onCount: (n: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('post_comments')
      .select('id, user_id, body, created_at')
      .eq('post_id', postId)
      .order('created_at')
    const rows = (data as CommentRow[]) || []
    const uids = [...new Set(rows.map((r) => r.user_id))]
    const profs: Record<string, { handle: string | null; display_name: string | null; avatar_url: string | null }> = {}
    if (uids.length) {
      const { data: p } = await supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', uids)
      ;(p || []).forEach((x: any) => (profs[x.id] = { handle: x.handle, display_name: x.display_name, avatar_url: x.avatar_url }))
    }
    setList(rows.map((r) => ({ ...r, ...profs[r.user_id] })))
    onCount(rows.length)
    setLoading(false)
  }

  const openDialog = () => {
    setOpen(true)
    load()
  }

  const send = async () => {
    if (!body.trim() || !userId) return
    setSending(true)
    await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, body: body.trim() })
    setBody('')
    setSending(false)
    load()
  }

  const nameOf = (c: CommentRow) => (c.handle ? `@${c.handle}` : c.display_name || 'usuario')

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <IconButton size="small" onClick={openDialog} aria-label="Comentarios">
          <CommentOutlinedIcon sx={{ fontSize: '1.05rem', color: 'text.secondary' }} />
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {count}
        </Typography>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Comentarios</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
          {loading && <Typography variant="body2" color="text.secondary">Cargando...</Typography>}
          {!loading && list.length === 0 && (
            <Typography variant="body2" color="text.secondary">Sé el primero en comentar.</Typography>
          )}
          {list.map((c) => (
            <Box key={c.id} sx={{ display: 'flex', gap: 1.5 }}>
              <UserAvatar src={c.avatar_url} name={nameOf(c)} size={32} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{nameOf(c)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{c.body}</Typography>
              </Box>
            </Box>
          ))}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Escribí un comentario..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              maxRows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <Button variant="contained" onClick={send} disabled={sending || !body.trim()} sx={{ minWidth: 0, px: 2 }}>
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
