import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'

type CandidatePublic = {
  user_id: number
  email: string
  display_name: string
  phone: string
  election_country: string
  election_district: string
  election_date: string | null
  election_level: string
  interest_areas: string
  verification_score: number | null
}

export function ConsultantCandidateProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)
  const [message, setMessage] = useState('')

  const profileQuery = useQuery({
    queryKey: ['candidate-public', userId],
    queryFn: async () => {
      const { data } = await api.get<CandidatePublic>(`/candidates/public/${userId}/`)
      return data
    },
    enabled: Boolean(userId),
  })

  const reportMutation = useMutation({
    mutationFn: async () =>
      api.post(`/candidates/public/${userId}/clarification-report/`, { message }),
    onSuccess: () => {
      setReportOpen(false)
      setMessage('')
    },
  })

  if (!userId) return null

  return (
    <Stack spacing={2}>
      <Button size="small" onClick={() => navigate('/consultor')}>
        ← Volver al portal consultor
      </Button>
      <Typography variant="h5">Perfil del candidato</Typography>
      <Typography variant="body2" color="text.secondary">
        Información visible para consultores. Si detecta datos imprecisos, puede reportar al
        administrador del sitio para solicitar aclaraciones al candidato.
      </Typography>

      {profileQuery.isError && <Alert severity="error">No se pudo cargar el perfil.</Alert>}

      {profileQuery.data && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">{profileQuery.data.display_name}</Typography>
            <Typography color="text.secondary">{profileQuery.data.email}</Typography>
            {profileQuery.data.phone && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Teléfono: {profileQuery.data.phone}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Elección: {profileQuery.data.election_country}{' '}
              {profileQuery.data.election_district} · Nivel: {profileQuery.data.election_level || '—'}
              {profileQuery.data.election_date ? ` · Fecha: ${profileQuery.data.election_date}` : ''}
            </Typography>
            {profileQuery.data.interest_areas && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Áreas de interés: {profileQuery.data.interest_areas}
              </Typography>
            )}
            {profileQuery.data.verification_score != null && (
              <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                Score verificación: {profileQuery.data.verification_score}
              </Typography>
            )}
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ReportProblemIcon />}
              sx={{ mt: 2 }}
              onClick={() => setReportOpen(true)}
            >
              Información imprecisa (reportar al administrador)
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reportar información imprecisa</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Este mensaje se envía al <strong>administrador del sitio</strong>. Él podrá pedir al
            candidato aclaraciones; usted también puede responder consultas por servicio en la pestaña
            Consultas.
          </Typography>
          <TextField
            label="Comentario para el administrador"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            minRows={5}
            fullWidth
            placeholder="Indique qué datos parecen incorrectos o incompletos…"
          />
          {reportMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Reporte enviado. El administrador lo revisará.
            </Alert>
          )}
          {reportMutation.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              No se pudo enviar el reporte.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)}>Cerrar</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={message.trim().length < 10 || reportMutation.isPending}
            onClick={() => reportMutation.mutate()}
          >
            Enviar al administrador
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
