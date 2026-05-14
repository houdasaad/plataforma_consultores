import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'candidate' | 'consultant'>('candidate')
  const [displayName, setDisplayName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMsg(null)
    try {
      await api.post('/auth/register/', {
        email,
        password,
        role,
        display_name: displayName,
      })
      setMsg('Cuenta creada. Revisa tu correo para verificar el email.')
    } catch (err: unknown) {
      setError('No se pudo registrar. Revisa los datos.')
    }
  }

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} sx={{ maxWidth: 520 }}>
      <Typography variant="h5">Registro</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <TextField
        label="Contraseña (mín. 8)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <TextField label="Nombre para mostrar" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <TextField select label="Tipo de cuenta" value={role} onChange={(e) => setRole(e.target.value as 'candidate' | 'consultant')}>
        <MenuItem value="candidate">Candidato</MenuItem>
        <MenuItem value="consultant">Consultor</MenuItem>
      </TextField>
      <Button type="submit" variant="contained">
        Registrarme
      </Button>
      <Button component={RouterLink} to="/login">
        Ya tengo cuenta
      </Button>
    </Stack>
  )
}
