import { createTheme } from '@mui/material/styles'

// Gradiente lima de acento (para botones primarios, headers y bordes destacados).
export const limeGradient = 'linear-gradient(135deg, #D4F94F 0%, #A6D811 100%)'

// Borde con gradiente para elementos seleccionados/destacados. Se adapta al tema.
export const gradientBorderSx = (radius = 16) => (t: { palette: { background: { paper: string }; primary: { main: string; dark: string } } }) => ({
  borderRadius: `${radius}px`,
  border: '2px solid transparent',
  background: `linear-gradient(${t.palette.background.paper}, ${t.palette.background.paper}) padding-box, linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark}) border-box`,
})

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C6F135',
      dark: '#9BC91F',
      contrastText: '#0A0A0A',
    },
    secondary: {
      main: '#C6F135',
    },
    background: {
      default: '#0A0A0A',
      paper: '#141414',
    },
    text: {
      primary: '#F5F5F5',
      secondary: '#888888',
    },
    divider: '#222222',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
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
            color: '#0A0A0A',
            backgroundImage: limeGradient,
          },
          '&.MuiButton-containedPrimary:hover': {
            backgroundImage: 'linear-gradient(135deg, #C6F135 0%, #8FB81A 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #222222',
          borderRadius: 18,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
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