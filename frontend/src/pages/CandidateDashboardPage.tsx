import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ApprovedConsultantsList } from '../components/ApprovedConsultantsList'
import { PaymentHistoryPanel } from '../components/PaymentHistoryPanel'
// FROZEN — FollowedService excluded from MVP (CORFO model v1)
// import { FollowedServicesPanel } from '../components/FollowedServicesPanel'

type Booking = {
  id: number
  consultant_name: string
  status: string
  amount: string
  currency: string
  meeting_url: string
}

type Profile = {
  display_name: string
  phone: string
  election_country: string
  election_district: string
  election_date: string | null
  election_level: string
  interest_areas: string
  verification_score: number | null
}

export function CandidateDashboardPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  const profileQuery = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: async () => {
      const { data } = await api.get<Profile>('/candidates/me/')
      return data
    },
  })

  const saveProfile = useMutation({
    mutationFn: async (body: Partial<Profile>) => api.patch('/candidates/me/', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['candidate-profile'] }),
  })

  const verifyProfile = useMutation({
    mutationFn: async () => api.post('/candidates/me/verify/', profileQuery.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['candidate-profile'] }),
  })

  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/bookings/')
      return data
    },
  })

  const payMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const { data } = await api.post('/payments/mock-checkout/', { booking_id: bookingId })
      return data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const mpPay = useMutation({
    mutationFn: async (bookingId: number) => {
      const { data } = await api.post<{ init_point: string }>('/payments/mercadopago/preference/', {
        booking_id: bookingId,
      })
      return data
    },
    onSuccess: (pref) => navigate(pref.init_point),
  })

  const [form, setForm] = useState<Partial<Profile>>({})
  useEffect(() => {
    if (profileQuery.data) setForm(profileQuery.data)
  }, [profileQuery.data])

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Portal del candidato</Typography>
      <Alert severity="info">
        Consulte el catálogo de consultores, reserve una consulta por hora o solicite cotizaciones para servicios
        complementarios (impresión, publicidad digital). Pagos en <strong>USD</strong> vía Mercado Pago (simulación).
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Consultores" />
        <Tab label="Mi perfil" />
        <Tab label="Mis reservas" />
        <Tab label="Pagos" />
      </Tabs>

      {tab === 0 && (
        <ApprovedConsultantsList
          title="Consultores disponibles para contratar"
          description="Listado actualizado con consultores aprobados. Elija uno para ver su perfil y reservar una consulta."
          showFilters
        />
      )}

      {tab === 1 && (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Perfil y campaña</Typography>
          {form.display_name != null && (
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
              component="form"
              onSubmit={(e) => {
                e.preventDefault()
                saveProfile.mutate(form)
              }}
            >
              <TextField label="Nombre" value={form.display_name ?? ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} fullWidth />
              <TextField label="Teléfono" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="País" value={form.election_country ?? ''} onChange={(e) => setForm({ ...form, election_country: e.target.value })} fullWidth />
                <TextField label="Distrito" value={form.election_district ?? ''} onChange={(e) => setForm({ ...form, election_district: e.target.value })} fullWidth />
              </Stack>
              <TextField
                label="Fecha de elección"
                type="date"
                value={form.election_date ?? ''}
                onChange={(e) => setForm({ ...form, election_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField select label="Nivel" value={form.election_level || ''} onChange={(e) => setForm({ ...form, election_level: e.target.value })} fullWidth>
                <MenuItem value="national">Nacional</MenuItem>
                <MenuItem value="regional">Regional</MenuItem>
                <MenuItem value="local">Local</MenuItem>
              </TextField>
              <TextField label="Áreas de interés" value={form.interest_areas ?? ''} onChange={(e) => setForm({ ...form, interest_areas: e.target.value })} multiline minRows={2} fullWidth />
              {form.verification_score != null && (
                <Typography variant="caption">Score verificación IA: {form.verification_score}</Typography>
              )}
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={saveProfile.isPending}>
                  Guardar
                </Button>
                <Button variant="outlined" onClick={() => verifyProfile.mutate()} disabled={verifyProfile.isPending}>
                  Verificar con IA
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
        <CardActions>
          <Button component={RouterLink} to="/candidato/diagnostico">
            Diagnóstico de campaña
          </Button>
          <Button component={RouterLink} to="/candidato/recomendaciones">
            Recomendaciones
          </Button>
          <Button component={RouterLink} to="/candidato/marketplace" variant="contained">
            Solicitar cotización
          </Button>
          <Button component={RouterLink} to="/consultores">
            Buscar consultores
          </Button>
        </CardActions>
      </Card>
      )}

      {tab === 2 && (
      <>
      <Typography variant="h6">Mis reservas</Typography>
      <Stack spacing={1}>
        {(bookingsQuery.data ?? []).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No tiene reservas aún. Explore consultores o acepte una cotización del marketplace.
          </Typography>
        )}
        {(bookingsQuery.data ?? []).map((b) => (
          <Card key={b.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">
                #{b.id} · {b.consultant_name}
              </Typography>
              <Typography color="text.secondary">Estado: {b.status}</Typography>
              <Typography color="text.secondary">
                Monto: {b.amount} {b.currency || 'USD'}
              </Typography>
              {b.meeting_url ? (
                <Typography sx={{ mt: 1 }}>
                  Reunión:{' '}
                  <a href={b.meeting_url} target="_blank" rel="noreferrer">
                    {b.meeting_url}
                  </a>
                </Typography>
              ) : null}
            </CardContent>
            <CardActions>
              {b.status === 'pending_payment' ? (
                <>
                  <Button variant="contained" disabled={mpPay.isPending} onClick={() => mpPay.mutate(b.id)}>
                    Mercado Pago (mock)
                  </Button>
                  <Button variant="outlined" disabled={payMutation.isPending} onClick={() => payMutation.mutate(b.id)}>
                    Pago rápido
                  </Button>
                </>
              ) : null}
            </CardActions>
          </Card>
        ))}
      </Stack>
      <Divider />
      </>
      )}

      {tab === 3 && (
        <PaymentHistoryPanel
          endpoint="/candidates/me/payments/"
          role="candidate"
          title="Pagos realizados"
        />
      )}
    </Stack>
  )
}
