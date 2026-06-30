import { createTheme } from '@mui/material/styles'

export type ColorMode = 'dark' | 'light'

// Tono extra para hints / textos terciarios (más apagado que el secundario,
// pero legible). Se usa para placeholders, ayudas y etiquetas tenues.
declare module '@mui/material/styles' {
  interface TypeText {
    hint: string
  }
}

// Gradiente de acento por modo (botón primario, headers, bordes destacados).
export const limeGradient = 'linear-gradient(135deg, #D4F94F 0%, #A6D811 100%)'
const blueGradient = 'linear-gradient(135deg, #4D8BFF 0%, #1E5FE0 100%)'

export function accentGradient(mode: ColorMode) {
  return mode === 'light' ? blueGradient : limeGradient
}

// Animación de entrada tipo slide para el contenido de pestañas (usar con key={tab}).
export const slideInSx = {
  animation: 'trainoSlideIn 0.28s ease',
  '@keyframes trainoSlideIn': {
    from: { opacity: 0, transform: 'translateX(18px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
}

// Estilo para títulos destacados (ejercicios / rutinas): fuente display Archivo,
// peso black y ancho expandido.
export const displayTitleSx = {
  fontFamily: 'var(--font-display), var(--font-instrument), sans-serif',
  fontWeight: 900,
  fontStretch: '112%',
  letterSpacing: '0.005em',
}

// Borde con gradiente para elementos seleccionados/destacados. Se adapta al tema.
export const gradientBorderSx = (radius = 16) => (t: { palette: { background: { paper: string }; primary: { main: string; dark: string } } }) => ({
  borderRadius: `${radius}px`,
  border: '2px solid transparent',
  background: `linear-gradient(${t.palette.background.paper}, ${t.palette.background.paper}) padding-box, linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark}) border-box`,
})

export function makeTheme(mode: ColorMode) {
  const isLight = mode === 'light'

  const primaryMain = isLight ? '#1E6BFF' : '#C6F135'
  const primaryDark = isLight ? '#1450C8' : '#9BC91F'
  const primaryContrast = isLight ? '#FFFFFF' : '#0A0A0A'
  const bgDefault = isLight ? '#FFFFFF' : '#0A0A0A'
  const bgPaper = isLight ? '#F4F5F7' : '#141414'
  const textPrimary = isLight ? '#101114' : '#F5F5F5'
  const textSecondary = isLight ? '#5B6470' : '#888888'
  // Tono "hint": gris más tenue para indicaciones, placeholders y ayudas.
  const textHint = isLight ? '#9AA1AC' : '#6E6E6E'
  const dividerColor = isLight ? '#E2E5EA' : '#222222'
  const accentHover = isLight
    ? 'linear-gradient(135deg, #1E6BFF 0%, #1248B0 100%)'
    : 'linear-gradient(135deg, #C6F135 0%, #8FB81A 100%)'

  return createTheme({
    palette: {
      mode,
      primary: { main: primaryMain, dark: primaryDark, contrastText: primaryContrast },
      secondary: { main: primaryMain },
      background: { default: bgDefault, paper: bgPaper },
      text: { primary: textPrimary, secondary: textSecondary, hint: textHint },
      divider: dividerColor,
    },
    typography: {
      fontFamily: 'var(--font-instrument), "Inter", "Helvetica", sans-serif',
      // Títulos con la fuente display (Archivo): black + expandida.
      h1: { fontFamily: 'var(--font-display), var(--font-instrument), sans-serif', fontWeight: 900, fontStretch: '110%', letterSpacing: '0.005em' },
      h2: { fontFamily: 'var(--font-display), var(--font-instrument), sans-serif', fontWeight: 900, fontStretch: '110%', letterSpacing: '0.005em' },
      h3: { fontFamily: 'var(--font-display), var(--font-instrument), sans-serif', fontWeight: 900, fontStretch: '110%', letterSpacing: '0.005em' },
      h4: { fontFamily: 'var(--font-display), var(--font-instrument), sans-serif', fontWeight: 900, fontStretch: '110%', letterSpacing: '0.005em' },
      h5: { fontFamily: 'var(--font-display), var(--font-instrument), sans-serif', fontWeight: 900, fontStretch: '110%', letterSpacing: '0.005em' },
      h6: { fontWeight: 700, letterSpacing: '0.01em' },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
            '&.MuiButton-containedPrimary': {
              color: primaryContrast,
              backgroundImage: accentGradient(mode),
            },
            '&.MuiButton-containedPrimary:hover': {
              backgroundImage: accentHover,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${dividerColor}`,
            borderRadius: 18,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            '&::placeholder': { color: textHint, opacity: 1 },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
      },
    },
  })
}

// Tema por defecto (dark) — usado en SSR y como fallback.
export const theme = makeTheme('dark')
