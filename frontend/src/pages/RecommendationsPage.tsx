import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'
import { ApprovedConsultantsList } from '../components/ApprovedConsultantsList'

type Consultant = {
  id: number
  display_name: string
  headline: string
  bio: string
  hourly_rate: string | null
  categories: string[]
}

type RecoResponse = {
  source: string
  scope?: string
  country_code?: string
  district?: string
  results: Consultant[]
}

export function RecommendationsPage() {
  const [scope, setScope] = useState('national')
  const [countryCode, setCountryCode] = useState('MX')
  const [district, setDistrict] = useState('')

  const q = useQuery({
    queryKey: ['recommendations', scope, countryCode, district],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (scope) params.scope = scope
      if (countryCode) params.country_code = countryCode
      if (district) params.district = district
      const { data } = await api.get<RecoResponse>('/recommendations/', { params })
      return data
    },
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Recomendaciones</Typography>
      <Alert severity="info">
        Seleccione el nivel de elección, país y distrito para recibir consultores recomendados según su campaña.
      </Alert>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Nivel electoral"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="national">Nacional</MenuItem>
          <MenuItem value="regional">Regional</MenuItem>
          <MenuItem value="local">Local</MenuItem>
        </TextField>
        <TextField
          label="Código de país (ISO)"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          size="small"
          placeholder="MX, AR, CL..."
        />
        <TextField
          label="Distrito o región"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          size="small"
          placeholder="Ej. CDMX, Buenos Aires..."
        />
      </Stack>

      {q.isError && (
        <Alert severity="error">
          No se encontraron recomendaciones. Complete los campos de país y nivel electoral.
        </Alert>
      )}

      <Typography variant="subtitle1">Recomendados para usted</Typography>
      {(q.data?.results ?? []).length === 0 && !q.isLoading && (
        <Typography variant="body2" color="text.secondary">
          No hay consultores que coincidan con los criterios actuales.
        </Typography>
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
              {c.hourly_rate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Tarifa: {c.hourly_rate} USD/hora
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button component={RouterLink} to={`/consultores/${c.id}`} size="small" variant="contained">
                Ver perfil
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      <ApprovedConsultantsList
        title="Todos los consultores aprobados"
        description="Explorar el catálogo completo además de las recomendaciones."
        showFilters={false}
        limit={5}
      />
    </Stack>
  )
}
