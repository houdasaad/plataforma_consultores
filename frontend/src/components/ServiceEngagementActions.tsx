import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'

type FollowedRow = { service_id: number }

type Props = {
  serviceId: number
  consultantId: number
  serviceName: string
  compact?: boolean
}

export function ServiceEngagementActions({
  serviceId,
  consultantId,
  serviceName,
  compact,
}: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [askOpen, setAskOpen] = useState(false)
  const [question, setQuestion] = useState('')

  const followedQuery = useQuery({
    queryKey: ['followed-services'],
    queryFn: async () => {
      const { data } = await api.get<FollowedRow[]>('/candidates/me/followed-services/')
      return data
    },
    enabled: user?.role === 'candidate',
  })

  const isFollowed = (followedQuery.data ?? []).some((r) => r.service_id === serviceId)

  const follow = useMutation({
    mutationFn: async () => api.post('/candidates/me/followed-services/', { service_id: serviceId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['followed-services'] })
      void qc.invalidateQueries({ queryKey: ['candidate-portal'] })
    },
  })

  const unfollow = useMutation({
    mutationFn: async () => api.delete(`/candidates/me/followed-services/${serviceId}/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['followed-services'] })
      void qc.invalidateQueries({ queryKey: ['candidate-portal'] })
    },
  })

  const ask = useMutation({
    mutationFn: async () =>
      api.post('/candidates/me/service-inquiries/', { service_id: serviceId, question }),
    onSuccess: () => {
      setAskOpen(false)
      setQuestion('')
      void qc.invalidateQueries({ queryKey: ['candidate-inquiries'] })
      void qc.invalidateQueries({ queryKey: ['candidate-portal'] })
    },
  })

  if (user?.role !== 'candidate') {
    return null
  }

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: compact ? 0.5 : 1 }}>
        <Button
          size="small"
          variant={isFollowed ? 'contained' : 'outlined'}
          color={isFollowed ? 'secondary' : 'primary'}
          startIcon={isFollowed ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          onClick={() => (isFollowed ? unfollow.mutate() : follow.mutate())}
          disabled={follow.isPending || unfollow.isPending}
        >
          {isFollowed ? 'Siguiendo' : 'Seguir'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<QuestionAnswerIcon />}
          onClick={() => setAskOpen(true)}
        >
          Consulta adicional
        </Button>
        <Button size="small" component={RouterLink} to={`/consultores/${consultantId}`}>
          Ver perfil
        </Button>
      </Stack>

      <Dialog open={askOpen} onClose={() => setAskOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Consulta sobre: {serviceName}</DialogTitle>
        <DialogContent>
          <TextField
            label="Su pregunta al consultor"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            multiline
            minRows={4}
            fullWidth
            sx={{ mt: 1 }}
            placeholder="Detalle qué necesita aclarar sobre este servicio…"
          />
          {ask.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              No se pudo enviar la consulta.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={question.trim().length < 5 || ask.isPending}
            onClick={() => ask.mutate()}
          >
            Enviar consulta
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
