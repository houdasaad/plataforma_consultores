import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const drawerWidth = 280

export function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: { label: string; to: string }[] = [
    { label: 'Inicio', to: '/' },
    { label: 'Consultores', to: '/consultores' },
  ]

  const drawer = (
    <Box onClick={() => setMobileOpen(false)} sx={{ pt: 1 }}>
      <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', letterSpacing: '0.12em' }}>
        Menú
      </Typography>
      <List sx={{ py: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            sx={{
              mx: 1,
              borderRadius: 2,
              '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12) },
            }}
          >
            <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
          </ListItemButton>
        ))}
        {user?.role === 'candidate' && (
          <>
            <ListItemButton component={RouterLink} to="/candidato" sx={{ mx: 1, borderRadius: 2 }}>
              <ListItemText primary="Panel candidato" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/candidato/diagnostico" sx={{ mx: 1, borderRadius: 2 }}>
              <ListItemText primary="Diagnóstico de campaña" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
            </ListItemButton>
          </>
        )}
        {user?.role === 'consultant' && (
          <ListItemButton component={RouterLink} to="/consultor" sx={{ mx: 1, borderRadius: 2 }}>
            <ListItemText primary="Panel consultor" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
          </ListItemButton>
        )}
        {user?.role === 'admin' && (
          <ListItemButton component={RouterLink} to="/staff" sx={{ mx: 1, borderRadius: 2 }}>
            <ListItemText primary="Staff" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
          </ListItemButton>
        )}
      </List>
    </Box>
  )

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        bgcolor: 'background.default',
        backgroundImage: (t) =>
          `radial-gradient(900px 420px at 12% -8%, ${alpha(t.palette.primary.main, 0.14)} 0%, transparent 55%),
           radial-gradient(700px 380px at 100% 0%, ${alpha(t.palette.secondary.main, 0.12)} 0%, transparent 50%)`,
      }}
    >
      <AppBar position="sticky" elevation={0}>
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <Container
            maxWidth="lg"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: '100%',
              px: { xs: 2, sm: 3 },
            }}
          >
            <IconButton
              edge="start"
              sx={{ display: { sm: 'none' }, color: 'text.primary' }}
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuRoundedIcon />
            </IconButton>

            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              sx={{
                flexGrow: { xs: 1, sm: 0 },
                mr: { sm: 4 },
                fontWeight: 800,
                letterSpacing: '-0.03em',
                textDecoration: 'none',
                color: 'text.primary',
                background: (t) =>
                  `linear-gradient(120deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 45%, ${t.palette.secondary.dark} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Atlas Consulta
            </Typography>

            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' }, flexGrow: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  color="inherit"
                  sx={{ color: 'text.secondary', fontWeight: 600, px: 1.5 }}
                >
                  {item.label}
                </Button>
              ))}
              {user?.role === 'candidate' && (
                <>
                  <Button component={RouterLink} to="/candidato" color="inherit" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Candidato
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/candidato/diagnostico"
                    color="inherit"
                    sx={{ color: 'text.secondary', fontWeight: 600 }}
                  >
                    Diagnóstico
                  </Button>
                </>
              )}
              {user?.role === 'consultant' && (
                <Button component={RouterLink} to="/consultor" color="inherit" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Consultor
                </Button>
              )}
              {user?.role === 'admin' && (
                <Button component={RouterLink} to="/staff" color="inherit" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Staff
                </Button>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ ml: 'auto', alignItems: 'center' }}>
              {!user && (
                <>
                  <Button component={RouterLink} to="/login" color="inherit" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Entrar
                  </Button>
                  <Button component={RouterLink} to="/registro" variant="contained" size="medium">
                    Registro
                  </Button>
                </>
              )}
              {user && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  sx={{ borderColor: (t) => alpha(t.palette.text.primary, 0.15), color: 'text.primary' }}
                >
                  Salir
                </Button>
              )}
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ width: drawerWidth }}>{drawer}</Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 }, flex: 1 }}>
          <Outlet />
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2.5,
          mt: 'auto',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.65),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Typography variant="body2" color="text.secondary">
              MVP plataforma de consultoría política · Material UI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Responsive · {new Date().getFullYear()}
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
