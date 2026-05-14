import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export function PasswordResetConfirmPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/auth/password-reset/confirm/', { uid, token, new_password: password })
      setMsg('Contraseña actualizada. Ya puedes iniciar sesión.')
    } catch {
      setError('No se pudo actualizar. Revisa el enlace.')
    }
  }

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} sx={{ maxWidth: 520 }}>
      <Typography variant="h5">Nueva contraseña</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Nueva contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="contained">
        Guardar
      </Button>
    </Stack>
  )
}
