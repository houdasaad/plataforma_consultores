import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'

export function ConsultantDashboardPage() {
  const qc = useQueryClient()
  const meQuery = useQuery({
    queryKey: ['consultant-me'],
    queryFn: async () => {
      const { data } = await api.get<{
        display_name: string
        headline: string
        bio: string
        default_meeting_url: string
        hourly_rate: string | null
        approval_status: string
        rejection_reason: string
      }>('/consultants/me/')
      return data
    },
  })

  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const createSlot = useMutation({
    mutationFn: async () => {
      await api.post('/bookings/consultant/slots/', { start_at: startAt, end_at: endAt })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['consultant-slots'] })
    },
  })

  const slotsQuery = useQuery({
    queryKey: ['consultant-slots'],
    queryFn: async () => {
      const { data } = await api.get<{ id: number; start_at: string; end_at: string; is_booked: boolean }[]>(
        '/bookings/consultant/slots/',
      )
      return data
    },
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Panel consultor</Typography>
      {meQuery.data && (
        <Alert severity={meQuery.data.approval_status === 'approved' ? 'success' : 'info'}>
          Estado: {meQuery.data.approval_status}
          {meQuery.data.rejection_reason ? ` — ${meQuery.data.rejection_reason}` : ''}
        </Alert>
      )}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Perfil (solo lectura en este MVP UI)</Typography>
          {meQuery.data && (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <TextField label="Nombre" value={meQuery.data.display_name} disabled />
              <TextField label="Headline" value={meQuery.data.headline} disabled />
              <TextField label="Bio" value={meQuery.data.bio} disabled multiline minRows={3} />
              <TextField label="URL reunión" value={meQuery.data.default_meeting_url} disabled />
            </Stack>
          )}
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Puedes editar desde el admin o ampliar este formulario a PATCH en una siguiente iteración.
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h6">Crear turno</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Inicio (ISO)"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          placeholder="2026-05-20T15:00:00Z"
          fullWidth
        />
        <TextField
          label="Fin (ISO)"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          placeholder="2026-05-20T16:00:00Z"
          fullWidth
        />
      </Stack>
      <Button variant="contained" disabled={createSlot.isPending} onClick={() => createSlot.mutate()}>
        Guardar turno
      </Button>
      {createSlot.isError && <Alert severity="error">No se pudo crear el turno (formato/fecha).</Alert>}

      <Typography variant="h6" sx={{ mt: 2 }}>
        Mis turnos
      </Typography>
      <Stack spacing={1}>
        {(slotsQuery.data ?? []).map((s) => (
          <Typography key={s.id} variant="body2">
            {new Date(s.start_at).toLocaleString()} — {s.is_booked ? 'reservado' : 'libre'}
          </Typography>
        ))}
      </Stack>
    </Stack>
  )
}
