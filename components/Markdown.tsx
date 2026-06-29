'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Renderiza Markdown básico: **bold**, *italic* / _italic_, listas (- , * , 1.) y párrafos.
// Liviano y autocontenido (sin dependencias externas).

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g
  let lastIndex = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index))
    if (m[2] != null) nodes.push(<strong key={key++}>{m[2]}</strong>)
    else if (m[3] != null) nodes.push(<em key={key++}>{m[3]}</em>)
    else if (m[4] != null) nodes.push(<em key={key++}>{m[4]}</em>)
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

type Block =
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; lines: string[] }

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let cur: Block | null = null
  const flush = () => {
    if (cur) blocks.push(cur)
    cur = null
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const ulMatch = /^\s*[-*]\s+(.*)$/.exec(line)
    const olMatch = /^\s*\d+\.\s+(.*)$/.exec(line)
    if (ulMatch) {
      if (!cur || cur.type !== 'ul') {
        flush()
        cur = { type: 'ul', items: [] }
      }
      cur.items.push(ulMatch[1])
    } else if (olMatch) {
      if (!cur || cur.type !== 'ol') {
        flush()
        cur = { type: 'ol', items: [] }
      }
      cur.items.push(olMatch[1])
    } else if (line.trim() === '') {
      flush()
    } else {
      if (!cur || cur.type !== 'p') {
        flush()
        cur = { type: 'p', lines: [] }
      }
      cur.lines.push(line)
    }
  }
  flush()
  return blocks
}

export default function Markdown({
  text,
  color = 'text.secondary',
}: {
  text: string
  color?: string
}) {
  const blocks = parseBlocks(text)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {blocks.map((b, i) => {
        if (b.type === 'ul' || b.type === 'ol') {
          return (
            <Box
              key={i}
              component={b.type}
              sx={{ m: 0, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}
            >
              {b.items.map((it, j) => (
                <Typography key={j} component="li" variant="body2" color={color}>
                  {renderInline(it)}
                </Typography>
              ))}
            </Box>
          )
        }
        return (
          <Typography key={i} variant="body2" color={color}>
            {b.lines.map((ln, j) => (
              <React.Fragment key={j}>
                {renderInline(ln)}
                {j < b.lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </Typography>
        )
      })}
    </Box>
  )
}
