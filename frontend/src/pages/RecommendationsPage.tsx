import { Alert, Card, CardContent, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

type Consultant = {
  id: number
  display_name: string
  headline: string
  bio: string
  hourly_rate: string | null
  categories: string[]
}

type RecoResponse = {
  submission_id: number | null
  campaign_run_id: number | null
  results: Consultant[]
}

export function RecommendationsPage() {
  const q = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const { data } = await api.get<RecoResponse>('/recommendations/')
      return data
    },
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Recomendaciones</Typography>
      {q.isError && (
        <Alert severity="error">
          Primero ejecuta un <strong>diagnóstico de campaña</strong> en el panel o completa el cuestionario legacy si
          aplica.
        </Alert>
      )}
      {q.data && (
        <Stack spacing={0.5}>
          {q.data.submission_id != null ? (
            <Typography color="text.secondary">Cuestionario (envío): {q.data.submission_id}</Typography>
          ) : null}
          {q.data.campaign_run_id != null ? (
            <Typography color="text.secondary">
              Recomendaciones basadas en el último diagnóstico de campaña (ejecución #{q.data.campaign_run_id}).
            </Typography>
          ) : null}
        </Stack>
      )}
      <Stack spacing={1}>
        {(q.data?.results ?? []).map((c) => (
          <Card key={c.id} variant="outlined">
            <CardContent>
              <Typography variant="h6">{c.display_name}</Typography>
              <Typography color="text.secondary">{c.headline}</Typography>
              <Typography sx={{ mt: 1 }} variant="body2">
                {c.bio}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
