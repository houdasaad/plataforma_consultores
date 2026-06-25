import {
  Alert,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { ConsultantAvailabilityCalendar } from '../components/ConsultantAvailabilityCalendar'
import { ConsultantProfileTab, consultantProfileDefaultForm } from '../components/ConsultantProfileTab'
import { ConsultantCvProfileTab } from '../components/ConsultantCvProfileTab'
import { PaymentHistoryPanel } from '../components/PaymentHistoryPanel'
// FROZEN — ConsultantServiceInquiriesTab excluded from MVP (CORFO model v1)
// import { ConsultantServiceInquiriesTab } from '../components/ConsultantServiceInquiriesTab'

type Portal = {
  profile_status: string
  verification_score: number | null
  payout_account_number: string
  bookings: { id: number; status: string; amount: string }[]
  marketplace_bids: { id: number; service_name: string; status: string; requirement_title: string }[]
  open_slots: number
}

export function ConsultantPortalPage() {
  const [tab, setTab] = useState(0)
  const [profileForm, setProfileForm] = useState(consultantProfileDefaultForm())

  const portal = useQuery({
    queryKey: ['consultant-portal'],
    queryFn: async () => {
      const { data } = await api.get<Portal>('/consultants/me/portal/')
      return data
    },
  })

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Portal del consultor</Typography>
      <Alert severity="info">
        Complete su perfil profesional, defina su tarifa por hora, seleccione sus áreas de consultoría, y configure sus horarios disponibles para que los candidatos puedan reservar consultas.
      </Alert>

      {portal.data && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Estado: <strong>{portal.data.profile_status}</strong>
          </Typography>
          {portal.data.verification_score != null && (
            <Typography variant="body2" color="text.secondary">
              Score IA: <strong>{portal.data.verification_score}</strong>
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Turnos libres: {portal.data.open_slots}
          </Typography>
        </Stack>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Perfil y verificación" />
        <Tab label="Información CV" />
        <Tab label="Reservas y cotizaciones" />
        <Tab label="Agenda (calendario)" />
        <Tab label="Pagos recibidos" />
      </Tabs>

      {tab === 0 && (
        <ConsultantProfileTab profileForm={profileForm} setProfileForm={setProfileForm} />
      )}

      {tab === 1 && <ConsultantCvProfileTab />}

      {tab === 2 && (
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Consultas contratadas (reservas)
          </Typography>
          {(portal.data?.bookings ?? []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No tiene consultas contratadas aún.
            </Typography>
          )}
          {(portal.data?.bookings ?? []).map((b) => (
            <Alert key={b.id} severity={b.status === 'confirmed' ? 'success' : 'info'}>
              Reserva #{b.id} · {b.status} · {b.amount} USD
            </Alert>
          ))}

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2 }}>
            Cotizaciones enviadas a marketplace
          </Typography>
          {(portal.data?.marketplace_bids ?? []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No ha enviado cotizaciones aún.
            </Typography>
          )}
          {(portal.data?.marketplace_bids ?? []).map((b) => (
            <Alert
              key={b.id}
              severity={b.status === 'accepted' ? 'success' : b.status === 'rejected' ? 'error' : 'info'}
            >
              <strong>{b.service_name}</strong> → {b.requirement_title} ({b.status})
            </Alert>
          ))}
        </Stack>
      )}

      {tab === 3 && <ConsultantAvailabilityCalendar />}

      {tab === 4 && (
        <PaymentHistoryPanel
          endpoint="/consultants/me/payments/"
          role="consultant"
          title="Pagos recibidos"
        />
      )}
    </Stack>
  )
}
