import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Consultant = {
  id: number
  display_name: string
  headline: string
  bio: string
  hourly_rate: string | null
  categories: string[]
}

type Slot = { id: number; start_at: string; end_at: string; is_booked: boolean }

export function ConsultantDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()

  const consultantQuery = useQuery({
    queryKey: ['consultant', id],
    queryFn: async () => {
      const { data } = await api.get<Consultant>(`/consultants/${id}/`)
      return data
    },
    enabled: Boolean(id),
  })

  const slotsQuery = useQuery({
    queryKey: ['slots', id],
    queryFn: async () => {
      const { data } = await api.get<Slot[]>('/bookings/slots/', { params: { consultant: id } })
      return data
    },
    enabled: Boolean(id),
  })

  const bookMutation = useMutation({
    mutationFn: async (slotId: number) => {
      const { data } = await api.post('/bookings/create/', { slot_id: slotId })
      return data as { id: number }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['slots', id] })
    },
  })

  if (!id) return null

  return (
    <Stack spacing={2}>
      {consultantQuery.isError && <Alert severity="error">Consultor no encontrado.</Alert>}
      {consultantQuery.data && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h5">{consultantQuery.data.display_name}</Typography>
            <Typography color="text.secondary">{consultantQuery.data.headline}</Typography>
            <Typography sx={{ mt: 2 }}>{consultantQuery.data.bio}</Typography>
            <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
              Tarifa: {consultantQuery.data.hourly_rate ?? '—'}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Typography variant="h6">Horarios disponibles</Typography>
      {!user && (
        <Alert severity="info">Inicia sesión como candidato para reservar un turno.</Alert>
      )}
      {user && user.role !== 'candidate' && (
        <Alert severity="warning">Solo candidatos pueden reservar desde este MVP.</Alert>
      )}
      {slotsQuery.isError && <Alert severity="error">No se pudieron cargar los turnos.</Alert>}
      <List>
        {(slotsQuery.data ?? []).map((s) => (
          <Box key={s.id}>
            <ListItem
              secondaryAction={
                user?.role === 'candidate' ? (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={bookMutation.isPending}
                    onClick={() => bookMutation.mutate(s.id)}
                  >
                    Reservar
                  </Button>
                ) : null
              }
            >
              <ListItemText primary={new Date(s.start_at).toLocaleString()} secondary={s.end_at} />
            </ListItem>
            <Divider component="li" />
          </Box>
        ))}
      </List>
      {bookMutation.isSuccess && (
        <Alert severity="success">
          Reserva creada (pendiente de pago). ID: {String(bookMutation.data?.id)} — ve a{' '}
          <strong>Panel candidato</strong> para pagar (simulación).
        </Alert>
      )}
      {bookMutation.isError && <Alert severity="error">No se pudo crear la reserva.</Alert>}
    </Stack>
  )
}
