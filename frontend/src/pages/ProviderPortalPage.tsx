import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { PaymentHistoryPanel } from '../components/PaymentHistoryPanel'
import { ProviderMarketplaceTab } from '../components/ProviderMarketplaceTab'

type ProviderProfile = {
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
  recent_reviews: {
    id: number
    score: number
    comment: string
    created_at: string
    reviewer_name: string
  }[]
  is_verified: boolean
  created_at: string
}

function ProviderProfileTab({ profile }: { profile: ProviderProfile }) {
  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {profile.name}
            </Typography>
            {profile.is_verified ? (
              <Chip label="Verificado" color="success" size="small" />
            ) : (
              <Chip label="Pendiente" color="warning" size="small" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {profile.description || 'Sin descripción.'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
            {profile.categories.map((cat) => (
              <Chip key={cat} label={cat} size="small" variant="outlined" color="primary" />
            ))}
          </Stack>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>RUT:</strong> {profile.identifier}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {profile.contact_email}
            </Typography>
            {profile.phone && (
              <Typography variant="body2">
                <strong>Teléfono:</strong> {profile.phone}
              </Typography>
            )}
            {profile.website && (
              <Typography variant="body2">
                <strong>Sitio web:</strong>{' '}
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  {profile.website}
                </a>
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Reseñas recibidas
          </Typography>
          {profile.avg_rating != null && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              Calificación promedio: {profile.avg_rating} / 5 ({profile.total_reviews}{' '}
              {profile.total_reviews === 1 ? 'reseña' : 'reseñas'})
            </Typography>
          )}
          {profile.recent_reviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no ha recibido reseñas.
            </Typography>
          ) : (
            profile.recent_reviews.map((r) => (
              <Box key={r.id} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.reviewer_name}
                  </Typography>
                  <Chip label={`${r.score}/5`} size="small" color="primary" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {r.comment}
                </Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export function ProviderPortalPage() {
  const [tab, setTab] = useState(0)

  const profileQuery = useQuery({
    queryKey: ['provider-me'],
    queryFn: async () => {
      const { data } = await api.get<ProviderProfile>('/providers/me/')
      return data
    },
  })

  if (profileQuery.isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Alert severity="warning">
        No se encontró un perfil de proveedor vinculado a su cuenta. Contacte al administrador si cree que debería tener acceso.
      </Alert>
    )
  }

  const profile = profileQuery.data

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal del Proveedor</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Mi Perfil" />
        <Tab label="Mis rubros" />
        <Tab label="Todos los rubros" />
        <Tab label="Mis Cotizaciones" />
        <Tab label="Pagos recibidos" />
      </Tabs>

      <Divider />

      {tab === 0 && <ProviderProfileTab profile={profile} />}
      {tab === 1 && <ProviderMarketplaceTab provider={profile} />}
      {tab === 2 && <ProviderMarketplaceTab provider={profile} showAll />}
      {tab === 3 && <ProviderMarketplaceTab provider={profile} viewMode="myBids" />}

      {tab === 4 && (
        <PaymentHistoryPanel
          endpoint="/providers/me/payments/"
          role="provider"
          title="Pagos recibidos"
        />
      )}
    </Stack>
  )
}
