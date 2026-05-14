import { alpha, createTheme } from '@mui/material/styles'

const fontStack = '"Plus Jakarta Sans", "DM Sans", system-ui, -apple-system, sans-serif'

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4338ca',
      light: '#6366f1',
      dark: '#312e81',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0d9488',
      light: '#14b8a6',
      dark: '#0f766e',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: alpha('#0f172a', 0.08),
    success: { main: '#059669' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#2563eb' },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: fontStack,
    h1: { fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 },
    h2: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500, letterSpacing: '0.01em' },
    button: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' as const },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollBehavior: 'smooth',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 18,
          minHeight: 44,
        },
        contained: {
          '&.MuiButton-colorPrimary': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #4338ca 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #312e81 100%)',
            },
          },
        },
        outlined: {
          borderColor: alpha('#0f172a', 0.12),
          '&:hover': {
            borderColor: alpha('#4338ca', 0.45),
            backgroundColor: alpha('#4338ca', 0.04),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: `1px solid ${alpha('#0f172a', 0.06)}`,
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 1)}`,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRight: `1px solid ${theme.palette.divider}`,
          background: theme.palette.background.paper,
        }),
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          backgroundColor: alpha(theme.palette.common.white, 0.65),
          transition: theme.transitions.create(['box-shadow', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha('#4338ca', 0.35),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 10 },
      },
    },
    MuiContainer: {
      defaultProps: { maxWidth: 'lg' },
    },
  },
})
