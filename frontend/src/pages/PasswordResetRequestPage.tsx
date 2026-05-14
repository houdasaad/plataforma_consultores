import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { api } from '../api/client'

export function PasswordResetRequestPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/auth/password-reset/request/', { email })
    setMsg('Si el email existe, se enviaron instrucciones.')
  }

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} sx={{ maxWidth: 520 }}>
      <Typography variant="h5">Recuperar contraseña</Typography>
      {msg && <Alert severity="info">{msg}</Alert>}
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" variant="contained">
        Enviar
      </Button>
    </Stack>
  )
}
