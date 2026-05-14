import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'

type Pending = {
  id: number
  email: string
  display_name: string
  approval_status: string
  created_at: string
}

export function StaffDashboardPage() {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const pendingQuery = useQuery({
    queryKey: ['pending-consultants'],
    queryFn: async () => {
      const { data } = await api.get<Pending[]>('/consultants/staff/pending/')
      return data
    },
  })

  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, number>>('/metrics/summary/')
      return data
    },
  })

  const approve = useMutation({
    mutationFn: async (id: number) => api.post(`/consultants/staff/${id}/approve/`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pending-consultants'] }),
  })
  const reject = useMutation({
    mutationFn: async (id: number) =>
      api.post(`/consultants/staff/${id}/reject/`, { reason }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pending-consultants'] }),
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Staff</Typography>
      {metricsQuery.data && (
        <Alert severity="info">
          Usuarios: {metricsQuery.data.users_total} · Pendientes: {metricsQuery.data.consultants_pending} · Reservas:{' '}
          {metricsQuery.data.bookings_total} · Pagos OK: {metricsQuery.data.payments_succeeded}
        </Alert>
      )}
      <TextField
        label="Motivo de rechazo (plantilla)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        fullWidth
      />
      <Typography variant="h6">Consultores pendientes</Typography>
      {pendingQuery.isError && <Alert severity="error">No autorizado o error de red.</Alert>}
      <Stack spacing={1}>
        {(pendingQuery.data ?? []).map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Typography variant="h6">{p.display_name}</Typography>
              <Typography color="text.secondary">{p.email}</Typography>
            </CardContent>
            <CardActions>
              <Button disabled={approve.isPending} onClick={() => approve.mutate(p.id)}>
                Aprobar
              </Button>
              <Button color="error" disabled={reject.isPending} onClick={() => reject.mutate(p.id)}>
                Rechazar
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
