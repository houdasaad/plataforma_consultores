import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
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

type Category = { id: number; name: string; slug: string }
type Consultant = {
  id: number
  display_name: string
  headline: string
  bio: string
  hourly_rate: string | null
  categories: string[]
}

export function ConsultantsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/catalog/categories/')
      return data
    },
  })

  const consultantsQuery = useQuery({
    queryKey: ['consultants', search, category],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (category) params.categories__slug = category
      const { data } = await api.get<Consultant[]>('/consultants/', { params })
      return data
    },
  })

  const categoryOptions = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>
          Directorio
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>
          Consultores aprobados
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '70ch' }}>
          Filtra por especialidad o busca por nombre, bio o titular. Diseño responsive: en móvil los filtros se apilan.
        </Typography>
      </Box>

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
            placeholder="Nombre, titular, palabras clave…"
          />
          <TextField
            select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            sx={{ minWidth: { sm: 240 }, width: { xs: '100%', sm: 'auto' } }}
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

      {consultantsQuery.isError && <Alert severity="error">No se pudo cargar el listado.</Alert>}

      <Stack spacing={2}>
        {(consultantsQuery.data ?? []).map((c) => (
          <Card key={c.id} variant="outlined">
            <CardContent>
              <Typography variant="h6">{c.display_name}</Typography>
              <Typography color="text.secondary">{c.headline}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {c.bio}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                Categorías: {c.categories.join(', ') || '—'} · Tarifa: {c.hourly_rate ?? '—'}
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button component={RouterLink} to={`/consultores/${c.id}`} variant="contained" size="small">
                Ver detalle
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
