import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'

type Followed = {
  id: number
  service_id: number
  service_name: string
  service_description: string
  price_usd: string
  consultant_id: number
  consultant_name: string
  category_name: string
}

type Inquiry = {
  id: number
  service_id: number
  service_name: string
  question: string
  consultant_reply: string
  status: string
  created_at: string
}

export function FollowedServicesPanel() {
  const followedQuery = useQuery({
    queryKey: ['followed-services'],
    queryFn: async () => {
      const { data } = await api.get<Followed[]>('/candidates/me/followed-services/')
      return data
    },
  })

  const inquiriesQuery = useQuery({
    queryKey: ['candidate-inquiries'],
    queryFn: async () => {
      const { data } = await api.get<Inquiry[]>('/candidates/me/service-inquiries/')
      return data
    },
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Servicios seguidos</Typography>
      <Typography variant="body2" color="text.secondary">
        Servicios que marcó con <strong>Seguir</strong> y consultas adicionales enviadas.
      </Typography>

      {(followedQuery.data ?? []).length === 0 && (
        <Alert severity="info">Aún no sigue ningún servicio. Use Seguir en el catálogo de consultores.</Alert>
      )}
      {(followedQuery.data ?? []).map((f) => (
        <Card key={f.id} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1">{f.service_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {f.consultant_name} · {f.category_name} · {f.price_usd} USD
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {f.service_description}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              variant="contained"
              component={RouterLink}
              to={`/consultores/${f.consultant_id}`}
            >
              Reservar / ver consultor
            </Button>
          </CardActions>
        </Card>
      ))}

      <Typography variant="h6" sx={{ mt: 2 }}>
        Mis consultas por servicio
      </Typography>
      {(inquiriesQuery.data ?? []).length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Sin consultas enviadas.
        </Typography>
      )}
      {(inquiriesQuery.data ?? []).map((q) => (
        <Card key={q.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
              <Typography variant="subtitle2">{q.service_name}</Typography>
              <Chip
                size="small"
                label={q.status === 'answered' ? 'Respondida' : 'Pendiente'}
                color={q.status === 'answered' ? 'success' : 'warning'}
              />
            </Stack>
            <Typography variant="body2">
              <strong>Pregunta:</strong> {q.question}
            </Typography>
            {q.consultant_reply && (
              <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                <strong>Respuesta del consultor:</strong> {q.consultant_reply}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
