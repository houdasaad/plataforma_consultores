import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'
import { StarRating } from './StarRating'
import { VerificationBadge } from './VerificationBadge'
// FROZEN — ServiceEngagementActions excluded from MVP (CORFO model v1)
// import { ServiceEngagementActions } from './ServiceEngagementActions'

export type PublicService = {
  id: number
  name: string
  description: string
  price_usd: string
  category_name: string
}

export type PublicConsultant = {
  id: number
  display_name: string
  headline: string
  bio: string
  hourly_rate: string | null
  professional_title?: string
  city?: string
  country?: string
  categories: string[]
  services?: PublicService[]
  published_cv?: {
    education: unknown[]
    campaign_experience: unknown[]
  } | null
  is_verified?: boolean
  avg_rating?: number | null
  total_ratings?: number
}

type Category = { id: number; name: string; slug: string }

type Props = {
  title?: string
  description?: string
  showFilters?: boolean
  limit?: number
}

export function ApprovedConsultantsList({
  title = 'Consultores aprobados',
  description = 'Consultores con consultoría por hora publicados para contratar.',
  showFilters = true,
  limit,
}: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/catalog/categories/')
      return data
    },
    enabled: showFilters,
  })

  const consultantsQuery = useQuery({
    queryKey: ['consultants', search, category],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (category) params.categories__slug = category
      const { data } = await api.get<PublicConsultant[] | { results: PublicConsultant[] }>(
        '/consultants/',
        { params },
      )
      if (Array.isArray(data)) return data
      return data.results ?? []
    },
  })

  const categoryOptions = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const consultants = useMemo(() => {
    const rows = consultantsQuery.data ?? []
    return limit ? rows.slice(0, limit) : rows
  }, [consultantsQuery.data, limit])

  return (
    <Stack spacing={2}>
      {(title || description) && (
        <Box>
          {title && (
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: title ? 0.5 : 0 }}>
              {description}
            </Typography>
          )}
        </Box>
      )}

      {showFilters && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' } }}>
            <TextField
              label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="small"
              placeholder="Nombre, titular, palabras clave…"
            />
            <TextField
              select
              label="Categoría"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              size="small"
              sx={{ minWidth: { sm: 220 }, width: { xs: '100%', sm: 'auto' } }}
            >
              <MenuItem value="">Todas</MenuItem>
              {categoryOptions.map((c) => (
                <MenuItem key={c.id} value={c.slug}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>
      )}

      {consultantsQuery.isLoading && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">
            Cargando consultores…
          </Typography>
        </Stack>
      )}

      {consultantsQuery.isError && (
        <Alert severity="error">No se pudo cargar el listado de consultores.</Alert>
      )}

      {!consultantsQuery.isLoading && !consultantsQuery.isError && consultants.length === 0 && (
        <Alert severity="info">
          No hay consultores en el catálogo. Registre un consultor o ejecute en el backend:{' '}
          <code>python manage.py sync_catalog_visibility</code>
        </Alert>
      )}

      <Stack spacing={2}>
        {consultants.map((c) => (
          <Card key={c.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Typography variant="h6">{c.display_name}</Typography>
                <VerificationBadge visible={c.is_verified === true} />
              </Stack>
              {c.professional_title && (
                <Typography variant="body2" color="text.secondary">
                  {c.professional_title}
                </Typography>
              )}
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {c.headline}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {c.bio}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                {[c.city, c.country].filter(Boolean).join(', ') || 'Ubicación no indicada'}
                {' · '}
                Categorías: {c.categories.join(', ') || '—'}
                {' · '}
                Tarifa: {c.hourly_rate != null ? `${c.hourly_rate} USD/h` : '—'}
              </Typography>
              {c.avg_rating != null && c.avg_rating > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <StarRating value={c.avg_rating} count={c.total_ratings} />
                </Box>
              )}
              {c.published_cv &&
                (c.published_cv.education?.length > 0 ||
                  c.published_cv.campaign_experience?.length > 0) && (
                  <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                    CV publicado (formación y experiencia en campañas)
                  </Typography>
                )}
              {c.categories.length > 0 ? (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Áreas de consultoría por hora:
                  </Typography>
                  <Typography variant="body2">
                    {c.categories.join(', ')}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                  Sin áreas de consultoría definidas
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button component={RouterLink} to={`/consultores/${c.id}`} variant="contained" size="small">
                Ver perfil y reservar
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      {limit && (consultantsQuery.data?.length ?? 0) > limit && (
        <Button component={RouterLink} to="/consultores" variant="outlined" size="small">
          Ver todos los consultores
        </Button>
      )}
    </Stack>
  )
}
