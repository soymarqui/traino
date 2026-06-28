'use client'

import { useRef, useState } from 'react'
import Box from '@mui/material/Box'

export type SwipeAction = {
  label: string
  bg: string
  color?: string
  onClick: () => void
}

const ACTION_W = 80

export default function SwipeableRow({
  leading,
  trailing = [],
  onPress,
  children,
}: {
  leading?: SwipeAction
  trailing?: SwipeAction[]
  onPress?: () => void
  children: React.ReactNode
}) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const moved = useRef(false)
  const dragging = useRef(false)

  const leadW = leading ? ACTION_W : 0
  const trailW = trailing.length * ACTION_W

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    moved.current = false
    startX.current = e.clientX
    startOffset.current = offset
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 4) moved.current = true
    let next = startOffset.current + dx
    next = Math.max(-trailW, Math.min(leadW, next))
    setOffset(next)
  }

  const onPointerUp = () => {
    dragging.current = false
    if (offset > leadW / 2 && leading) setOffset(leadW)
    else if (offset < -trailW / 2 && trailing.length) setOffset(-trailW)
    else setOffset(0)
  }

  const handleClick = () => {
    if (moved.current) return
    if (offset !== 0) {
      setOffset(0)
      return
    }
    onPress?.()
  }

  const runAction = (a: SwipeAction) => {
    setOffset(0)
    a.onClick()
  }

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
      {/* Acción leading (izquierda) */}
      {leading && (
        <Box
          onClick={() => runAction(leading)}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: leadW,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: leading.bg,
            color: leading.color ?? '#fff',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {leading.label}
        </Box>
      )}

      {/* Acciones trailing (derecha) */}
      {trailing.length > 0 && (
        <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex' }}>
          {trailing.map((a) => (
            <Box
              key={a.label}
              onClick={() => runAction(a)}
              sx={{
                width: ACTION_W,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: a.bg,
                color: a.color ?? '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {a.label}
            </Box>
          ))}
        </Box>
      )}

      {/* Contenido (se desliza) */}
      <Box
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleClick}
        sx={{
          position: 'relative',
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
