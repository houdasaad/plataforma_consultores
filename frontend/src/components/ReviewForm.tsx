import { ChangeEvent, FormEvent, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Star, StarBorder } from '@mui/icons-material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

type Props = {
  consultantId: number
  /** The candidate can only review if they have a verified completed booking with this consultant. */
  canReview: boolean
  /** The specific booking ID this review relates to. */
  bookingId?: number
  /** Called after a successful review submission */
  onReviewSubmitted?: () => void
}

export function ReviewForm({ consultantId, canReview, bookingId, onReviewSubmitted }: Props) {
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const qc = useQueryClient()

  const reviewMutation = useMutation({
    mutationFn: async (payload: { work_quality_score: number; comment: string; consultant_id: number; booking_id: number }) => {
      const { data } = await api.post('/consultants/community-ratings/', payload)
      return data
    },
    onSuccess: () => {
      setScore(null)
      setComment('')
      void qc.invalidateQueries({ queryKey: ['consultant', String(consultantId)] })
      onReviewSubmitted?.()
    },
  })

  if (!canReview) return null

  const errorMsg = reviewMutation.isError
    ? 'No se pudo enviar la reseña. Asegúrate de tener una consulta confirmada con este consultor.'
    : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (score == null || score < 1 || !bookingId) return
    reviewMutation.mutate({
      work_quality_score: score,
      comment: comment.trim(),
      consultant_id: consultantId,
      booking_id: bookingId,
    })
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Dejar una reseña
        </Typography>
        {reviewMutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            Reseña enviada. Gracias por tu feedback.
          </Alert>
        )}
        {errorMsg && <Alert severity="error" sx={{ mb: 1.5 }}>{errorMsg}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Puntuación
              </Typography>
              <Rating
                value={score}
                onChange={(_e: unknown, val: number | null) => setScore(val)}
                size="large"
                icon={<Star fontSize="inherit" sx={{ color: '#faaf00' }} />}
                emptyIcon={<StarBorder fontSize="inherit" sx={{ color: '#faaf00', opacity: 0.4 }} />}
              />
            </Box>
            <TextField
              label="Comentario"
              value={comment}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setComment(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              placeholder="Cuéntanos cómo fue tu experiencia con este consultor…"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={score == null || score < 1 || reviewMutation.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {reviewMutation.isPending ? 'Enviando…' : 'Enviar reseña'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
