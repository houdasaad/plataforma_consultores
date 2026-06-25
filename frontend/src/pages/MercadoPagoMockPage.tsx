import { Alert, Button, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export function MercadoPagoMockPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = params.get('booking_id')
  const preferenceId = params.get('preference_id') ?? 'MP-MOCK'

  const confirm = useMutation({
    mutationFn: async () =>
      api.post('/payments/mercadopago/confirm/', {
        booking_id: Number(bookingId),
        preference_id: preferenceId,
      }),
    onSuccess: () => navigate('/candidato'),
  })

  return (
    <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto', py: 4 }}>
      <Typography variant="h5">Mercado Pago (simulación)</Typography>
      <Alert severity="info">
        Flujo mock de checkout. En producción se usaría la preferencia real de Mercado Pago con{' '}
        <code>MERCADOPAGO_ACCESS_TOKEN</code>.
      </Alert>
      <Typography variant="body2">Reserva #{bookingId}</Typography>
      <Typography variant="body2">Preferencia: {preferenceId}</Typography>
      <Button variant="contained" size="large" onClick={() => confirm.mutate()} disabled={!bookingId || confirm.isPending}>
        Confirmar pago simulado
      </Button>
      {confirm.isSuccess && <Alert severity="success">Pago confirmado. Redirigiendo al portal candidato…</Alert>}
    </Stack>
  )
}
