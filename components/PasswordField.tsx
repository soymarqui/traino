'use client'

import { useState } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

// Campo de contraseña con "ojito" para mostrar/ocultar el texto.
export default function PasswordField(props: TextFieldProps) {
  const [show, setShow] = useState(false)
  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShow((s) => !s)}
                edge="end"
                size="small"
                tabIndex={-1}
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                sx={{ color: 'text.secondary' }}
              >
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
