import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Chip,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { StarRating } from './StarRating'
import { VerificationBadge } from './VerificationBadge'

export type ProviderReview = {
  id: number
  score: number
  comment: string
  created_at: string
  reviewer_name: string
}

export type Provider = {
  id: number
  name: string
  identifier: string
  description: string
  categories: string[]
  approval_status: string
  website: string
  phone: string
  contact_email: string
  avg_rating: number | null
  total_reviews: number
  recent_reviews: ProviderReview[]
  is_verified: boolean
  created_at: string
}

type Category = { id: number; name: string; slug: string }

export function ProviderList() {
  const providersQuery = useQuery({
    queryKey: ['public-providers'],
    queryFn: async () => {
      const { data } = await api.get<Provider[]>('/providers/')
      return Array.isArray(data)
        ? data
        : (data as { results: Provider[] }).results ?? []
    },
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/catalog/categories/')
      return data
    },
  })

  const [categoryFilter, setCategoryFilter] = useState('')

  const filtered = (providersQuery.data ?? []).filter((p) =>
    categoryFilter ? p.categories.includes(categoryFilter) : true,
  )

  const printingCategories =
    categoriesQuery.data?.filter((c) =>
      ['printing', 'digital-ads'].includes(c.slug),
    ) ?? []

  if (providersQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (providersQuery.isError) {
    return <Alert severity="error">Error al cargar los proveedores.</Alert>
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6">Proveedores verificados</Typography>
        <TextField
          select
          label="Filtrar por rubro"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {printingCategories.map((c) => (
            <MenuItem key={c.id} value={c.slug}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {filtered.length === 0 && (
        <Typography color="text.secondary">
          No se encontraron proveedores.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {filtered.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </Stack>
    </Stack>
  )
}

function ProviderCard({ provider }: { provider: Provider }) {
  const [showReview, setShowReview] = useState(false)

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {provider.name}
          </Typography>
          <VerificationBadge visible={provider.is_verified} />
        </Stack>

        {provider.avg_rating != null && provider.total_reviews > 0 && (
          <StarRating value={provider.avg_rating} count={provider.total_reviews} />
        )}

        {provider.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {provider.description}
          </Typography>
        )}

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}
        >
          {provider.categories.map((cat) => (
            <Chip key={cat} label={cat} size="small" />
          ))}
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}
        >
          {provider.website && (
            <Typography variant="caption" color="text.secondary">
              {provider.website}
            </Typography>
          )}
          {provider.phone && (
            <Typography variant="caption" color="text.secondary">
              {provider.phone}
            </Typography>
          )}
        </Stack>

        {provider.recent_reviews.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Reseñas recientes:
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {provider.recent_reviews.map((r) => (
                <Box
                  key={r.id}
                  sx={{
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Rating
                      value={r.score}
                      readOnly
                      size="small"
                      sx={{ color: '#faaf00' }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {r.reviewer_name}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {r.comment}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>

      <CardActions>
        <Button size="small" onClick={() => setShowReview(!showReview)}>
          {showReview ? 'Cancelar' : 'Dejar reseña'}
        </Button>
      </CardActions>

      {showReview && (
        <CardContent sx={{ pt: 0 }}>
          <ProviderReviewForm
            providerId={provider.id}
            onSuccess={() => setShowReview(false)}
          />
        </CardContent>
      )}
    </Card>
  )
}

export function ProviderReviewForm({
  providerId,
  onSuccess,
}: {
  providerId: number
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [score, setScore] = useState<number | null>(0)
  const [comment, setComment] = useState('')

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/providers/${providerId}/reviews/`, {
        score,
        comment,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-providers'] })
      onSuccess()
    },
  })

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Tu evaluación</Typography>
      <Box>
        <Rating
          value={score}
          onChange={(_e, v) => setScore(v)}
          size="medium"
          sx={{ color: '#faaf00' }}
        />
      </Box>
      <TextField
        label="Comentario"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        multiline
        rows={2}
        fullWidth
      />
      {reviewMutation.isError && (
        <Alert severity="error">
          {(reviewMutation.error as { response?: { data?: { detail?: string } } })
            ?.response?.data?.detail ?? 'Error al enviar la reseña.'}
        </Alert>
      )}
      <Button
        variant="contained"
        size="small"
        disabled={!score || reviewMutation.isPending}
        onClick={() => reviewMutation.mutate()}
        sx={{ alignSelf: 'flex-start' }}
      >
        {reviewMutation.isPending ? 'Enviando…' : 'Enviar reseña'}
      </Button>
    </Stack>
  )
}
