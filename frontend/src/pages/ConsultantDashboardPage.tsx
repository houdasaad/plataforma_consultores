import {
  Alert,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { ConsultantAvailabilityCalendar } from '../components/ConsultantAvailabilityCalendar'

export function ConsultantDashboardPage() {
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
            Edite su perfil completo en el portal consultor (/consultor).
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h6">Agenda y disponibilidad</Typography>
      <ConsultantAvailabilityCalendar />
    </Stack>
  )
}
