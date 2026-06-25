import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'

type Inquiry = {
  id: number
  service_id: number
  service_name: string
  candidate_user_id: number
  candidate_name: string
  candidate_email: string
  question: string
  consultant_reply: string
  status: string
  created_at: string
}

export function ConsultantServiceInquiriesTab() {
  const qc = useQueryClient()
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({})

  const inquiriesQuery = useQuery({
    queryKey: ['consultant-service-inquiries'],
    queryFn: async () => {
      const { data } = await api.get<Inquiry[]>('/candidates/consultant/service-inquiries/')
      return data
    },
  })

  const replyMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) =>
      api.post(`/candidates/consultant/service-inquiries/${id}/reply/`, { reply }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['consultant-service-inquiries'] })
      void qc.invalidateQueries({ queryKey: ['consultant-portal'] })
    },
  })

  const openCount = (inquiriesQuery.data ?? []).filter((i) => i.status === 'open').length

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Preguntas adicionales de candidatos sobre sus servicios. Responda aquí; el candidato verá la
        respuesta en su portal.
      </Typography>
      {openCount > 0 && (
        <Alert severity="warning">{openCount} consulta(s) pendiente(s) de respuesta.</Alert>
      )}

      {(inquiriesQuery.data ?? []).length === 0 && (
        <Alert severity="info">No hay consultas por servicio todavía.</Alert>
      )}

      {(inquiriesQuery.data ?? []).map((inq) => (
        <Card key={inq.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
              <Chip label={inq.service_name} size="small" color="primary" variant="outlined" />
              <Chip
                size="small"
                label={inq.status === 'answered' ? 'Respondida' : 'Pendiente'}
                color={inq.status === 'answered' ? 'success' : 'warning'}
              />
            </Stack>
            <Typography variant="subtitle2">
              {inq.candidate_name} · {inq.candidate_email}
            </Typography>
            <Button
              size="small"
              component={RouterLink}
              to={`/consultor/candidato/${inq.candidate_user_id}`}
              sx={{ mt: 0.5, mb: 1 }}
            >
              Ver perfil del candidato
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Pregunta:</strong> {inq.question}
            </Typography>
            {inq.consultant_reply && (
              <Alert severity="success" sx={{ mt: 1 }}>
                <strong>Respuesta publicada:</strong> {inq.consultant_reply}
              </Alert>
            )}
            {inq.status === 'open' && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Su respuesta"
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  value={replyDraft[inq.id] ?? ''}
                  onChange={(e) =>
                    setReplyDraft((prev) => ({ ...prev, [inq.id]: e.target.value }))
                  }
                />
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1 }}
                  disabled={
                    (replyDraft[inq.id] ?? '').trim().length < 1 || replyMutation.isPending
                  }
                  onClick={() =>
                    replyMutation.mutate({
                      id: inq.id,
                      reply: replyDraft[inq.id] ?? '',
                    })
                  }
                >
                  Enviar respuesta
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
