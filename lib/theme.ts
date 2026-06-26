import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C6F135',
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
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          '&.MuiButton-containedPrimary': {
            color: '#0A0A0A',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #222222',
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
          borderRadius: 8,
        },
      },
    },
  },
})