import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Credenciales inválidas.')
    }
  }

  return (
    <Stack sx={{ alignItems: 'center', py: { xs: 2, md: 4 } }}>
      <Paper
        component="form"
        onSubmit={onSubmit}
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
          boxShadow: (t) => t.shadows[3],
        }}
      >
        <Stack spacing={2.5}>
          <div>
            <Typography variant="h5" gutterBottom>
              Bienvenido de nuevo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Accede con tu email y contraseña.
            </Typography>
          </div>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth autoComplete="email" />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" fullWidth>
            Continuar
          </Button>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ justifyContent: 'space-between' }}
          >
            <Button component={RouterLink} to="/registro" variant="text">
              Crear cuenta
            </Button>
            <Button component={RouterLink} to="/recuperar" variant="text">
              Olvidé mi contraseña
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
