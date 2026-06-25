import {
  Alert,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'

type Requirement = {
  id: number
  title: string
  description: string
  status: string
  max_budget_usd: string
  max_deadline_days: number
  category_slug: string
  category_name: string
  bid_count: number
  created_at: string
}

type Bid = {
  id: number
  requirement: number
  provider_name: string
  service_name: string
  description: string
  max_days: number
  max_price_usd: string
  status: string
  created_at: string
}

type ProviderProfile = {
  id: number
  name: string
  categories: string[]
}

type Props = {
  provider: ProviderProfile
  viewMode?: 'marketplace' | 'myBids'
  showAll?: boolean
}

function BidDialog({
  open,
  onClose,
  requirement,
  provider,
}: {
  open: boolean
  onClose: () => void
  requirement: Requirement
  provider: ProviderProfile
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    service_name: '',
    description: '',
    max_days: requirement.max_deadline_days,
    max_price_usd: '',
  })

  const createBid = useMutation({
    mutationFn: async () => {
      const endpoint = '/providers/me/marketplace/bids/create/'
      const { data } = await api.post<Bid>(endpoint, {
        requirement: requirement.id,
        service_name: form.service_name || `Cotización de ${provider.name}`,
        description: form.description || `Propuesta para: ${requirement.title}`,
        max_days: form.max_days,
        max_price_usd: form.max_price_usd,
      })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-marketplace'] })
      void qc.invalidateQueries({ queryKey: ['provider-bids'] })
      onClose()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Enviar cotización</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Requerimiento: <strong>{requirement.title}</strong> ({requirement.category_name})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Presupuesto máximo: {requirement.max_budget_usd} USD | Plazo máximo: {requirement.max_deadline_days} días
          </Typography>
          <TextField
            label="Nombre del servicio"
            value={form.service_name}
            onChange={(e) => setForm({ ...form, service_name: e.target.value })}
            fullWidth
            placeholder={`Ej: Impresión de ${requirement.category_slug === 'printing' ? 'volantes' : 'anuncios'}`}
          />
          <TextField
            label="Descripción de la propuesta"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={3}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="Plazo (días)"
              value={form.max_days}
              onChange={(e) => setForm({ ...form, max_days: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Precio (USD)"
              value={form.max_price_usd}
              onChange={(e) => setForm({ ...form, max_price_usd: e.target.value })}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => createBid.mutate()}
          disabled={createBid.isPending || !form.max_price_usd}
        >
          Enviar cotización
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function ProviderMarketplaceTab({ provider, viewMode = 'marketplace', showAll = false }: Props) {
  const [bidDialogOpen, setBidDialogOpen] = useState<Requirement | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  const requirementsQuery = useQuery({
    queryKey: ['provider-marketplace', showAll ? 'all' : 'filtered', categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (showAll) params.set('all', 'true')
      const qs = params.toString()
      const { data } = await api.get<Requirement[]>(`/providers/me/marketplace/${qs ? `?${qs}` : ''}`)
      return data ?? []
    },
    enabled: viewMode === 'marketplace',
  })

  const bidsQuery = useQuery({
    queryKey: ['provider-bids'],
    queryFn: async () => {
      const { data } = await api.get<Bid[]>('/providers/me/marketplace/bids/')
      return data ?? []
    },
    enabled: viewMode === 'myBids',
  })

  // ── myBids view ──
  if (viewMode === 'myBids') {
    const bids = bidsQuery.data ?? []
    return (
      <Stack spacing={3}>
        <Typography variant="h6">Mis cotizaciones enviadas</Typography>
        {bids.length === 0 && !bidsQuery.isLoading && (
          <Alert severity="info">
            No ha enviado cotizaciones aún. Vaya a la pestaña Marketplace o Todos los rubros para encontrar requerimientos.
          </Alert>
        )}
        {bids.map((bid) => (
          <Card key={bid.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {bid.service_name}
                </Typography>
                <Chip
                  label={bid.status === 'pending' ? 'Pendiente' : bid.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                  size="small"
                  color={bid.status === 'accepted' ? 'success' : bid.status === 'rejected' ? 'error' : 'info'}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {bid.description}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Typography variant="caption">Precio: {bid.max_price_usd} USD</Typography>
                <Typography variant="caption">Plazo: {bid.max_days} días</Typography>
                <Typography variant="caption">
                  Enviada: {new Date(bid.created_at).toLocaleDateString('es-CL')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    )
  }

  // ── marketplace view (shared card layout) ──
  const requirements = requirementsQuery.data ?? []
  const activeCategory = categoryFilter || 'all'
  const title = showAll ? 'Todos los requerimientos del Marketplace' : 'Requerimientos en mis rubros'
  const emptyMsg = showAll
    ? 'No hay requerimientos activos en el marketplace en este momento.'
    : 'No hay requerimientos activos en sus categorías en este momento.'

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <Typography variant="h6">{title}</Typography>
        <TextField
          select
          size="small"
          label="Filtrar por categoría"
          value={activeCategory}
          onChange={(e) => setCategoryFilter(e.target.value === 'all' ? '' : e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">Todas las categorías</MenuItem>
          {provider.categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat === 'printing' ? 'Impresión electoral' : 'Publicidad digital'}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {requirements.length === 0 && !requirementsQuery.isLoading && (
        <Alert severity="info">{emptyMsg}</Alert>
      )}

      {requirements.map((req) => (
        <Card key={req.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {req.title}
              </Typography>
              <Chip label={req.category_name} size="small" variant="outlined" color="primary" />
              {req.bid_count > 0 && (
                <Chip
                  label={`${req.bid_count} cotización${req.bid_count !== 1 ? 'es' : ''}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {req.description.slice(0, 200)}{req.description.length > 200 ? '...' : ''}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Typography variant="caption">Presupuesto máx: {req.max_budget_usd} USD</Typography>
              <Typography variant="caption">Plazo máx: {req.max_deadline_days} días</Typography>
              <Typography variant="caption">
                Publicado: {new Date(req.created_at).toLocaleDateString('es-CL')}
              </Typography>
            </Stack>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              variant="contained"
              onClick={() => setBidDialogOpen(req)}
            >
              Enviar cotización
            </Button>
          </CardActions>
        </Card>
      ))}

      {bidDialogOpen && (
        <BidDialog
          open={Boolean(bidDialogOpen)}
          onClose={() => setBidDialogOpen(null)}
          requirement={bidDialogOpen}
          provider={provider}
        />
      )}
    </Stack>
  )
}
