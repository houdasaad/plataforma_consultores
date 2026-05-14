import { Alert, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Falta el token en la URL.')
      return
    }
    void (async () => {
      try {
        await api.get(`/auth/verify-email/${token}/`)
        setMsg('Email verificado correctamente.')
      } catch {
        setError('Token inválido o expirado.')
      }
    })()
  }, [token])

  return (
    <>
      <Typography variant="h5">Verificación de email</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </>
  )
}
