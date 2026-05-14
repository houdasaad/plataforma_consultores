import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'

type Booking = {
  id: number
  consultant_name: string
  status: string
  amount: string
  meeting_url: string
}

export function CandidateDashboardPage() {
  const qc = useQueryClient()
  const profileQuery = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: async () => {
      const { data } = await api.get<{ display_name: string; phone: string; notes: string }>(
        '/candidates/me/',
      )
      return data
    },
  })

  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/bookings/')
      return data
    },
  })

  const payMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const { data } = await api.post('/payments/mock-checkout/', { booking_id: bookingId })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Panel candidato</Typography>
      <Alert severity="info">
        Flujo sugerido: completar el <strong>diagnóstico de campaña</strong>, revisar <strong>recomendaciones</strong>,
        reservar un turno y pagar (simulación).
      </Alert>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Mi perfil</Typography>
          {profileQuery.data && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Nombre" value={profileQuery.data.display_name} disabled />
              <TextField label="Teléfono" value={profileQuery.data.phone} disabled />
              <TextField label="Notas" value={profileQuery.data.notes} disabled multiline minRows={2} />
            </Stack>
          )}
        </CardContent>
        <CardActions>
          <Button component={RouterLink} to="/candidato/diagnostico" variant="contained">
            Diagnóstico de campaña
          </Button>
          <Button component={RouterLink} to="/candidato/recomendaciones">
            Recomendaciones
          </Button>
        </CardActions>
      </Card>

      <Typography variant="h6">Mis reservas</Typography>
      <Stack spacing={1}>
        {(bookingsQuery.data ?? []).map((b) => (
          <Card key={b.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">
                #{b.id} · {b.consultant_name}
              </Typography>
              <Typography color="text.secondary">Estado: {b.status}</Typography>
              <Typography color="text.secondary">Monto: {b.amount}</Typography>
              {b.meeting_url ? (
                <Typography sx={{ mt: 1 }}>
                  Reunión:{' '}
                  <a href={b.meeting_url} target="_blank" rel="noreferrer">
                    {b.meeting_url}
                  </a>
                </Typography>
              ) : null}
            </CardContent>
            <CardActions>
              {b.status === 'pending_payment' ? (
                <Button
                  variant="contained"
                  disabled={payMutation.isPending}
                  onClick={() => payMutation.mutate(b.id)}
                >
                  Pagar (simulación)
                </Button>
              ) : null}
            </CardActions>
          </Card>
        ))}
      </Stack>
      {payMutation.isSuccess && <Alert severity="success">Pago simulado completado.</Alert>}
      {payMutation.isError && <Alert severity="error">No se pudo procesar el pago simulado.</Alert>}
      <Divider />
    </Stack>
  )
}
