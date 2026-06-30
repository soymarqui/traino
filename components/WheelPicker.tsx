'use client'

import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'

const ITEM_H = 34
const VISIBLE = 3

// Picker tipo drum-roll (estilo iOS) para enteros.
export default function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 60,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const pad = ((VISIBLE - 1) / 2) * ITEM_H

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = (value - min) * ITEM_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const v = Math.min(max, Math.max(min, min + idx))
    if (v !== value) onChange(v)
  }

  return (
    <Box sx={{ position: 'relative', height: VISIBLE * ITEM_H }}>
      <Box
        sx={{
          position: 'absolute',
          top: pad,
          left: 0,
          right: 0,
          height: ITEM_H,
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'primary.main',
          pointerEvents: 'none',
        }}
      />
      <Box
        ref={ref}
        onScroll={onScroll}
        sx={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Box sx={{ height: pad }} />
        {items.map((n) => (
          <Box
            key={n}
            sx={{
              height: ITEM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: n === value ? '1.25rem' : '0.95rem',
              fontWeight: n === value ? 800 : 400,
              color: n === value ? 'primary.main' : 'text.secondary',
              transition: 'font-size 0.1s',
            }}
          >
            {n}
          </Box>
        ))}
        <Box sx={{ height: pad }} />
      </Box>
    </Box>
  )
}
