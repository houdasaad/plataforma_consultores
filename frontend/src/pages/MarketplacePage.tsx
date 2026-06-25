import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type BidInfo = {
  id: number
  requirement: number
  provider: number
  provider_id: number
  provider_name: string
  service_name: string
  description: string
  max_days: number
  max_price_usd: string
  status: string
  created_at: string
}

type RequirementInfo = {
  id: number
  title: string
  description: string
  max_deadline_days: number
  max_budget_usd: string
  category_slug: string
  category_name: string
  candidate_name: string
  candidate_email: string
  status: string
  ai_status: string
  bid_count: number
  bids: BidInfo[]
  created_at: string
}

function BidChip({ status }: { status: string }) {
  if (status === 'accepted') return <Chip label="Aceptada" size="small" color="success" />
  if (status === 'rejected') return <Chip label="Rechazada" size="small" color="error" />
  return <Chip label="Pendiente" size="small" color="info" />
}

function StatusChip({ status }: { status: string }) {
  if (status === 'published') return <Chip label="Publicado" size="small" color="success" variant="outlined" />
  if (status === 'closed') return <Chip label="Cerrado" size="small" color="default" variant="outlined" />
  return <Chip label={status} size="small" variant="outlined" />
}

function BidDialog({
  open,
  onClose,
  requirement,
}: {
  open: boolean
  onClose: () => void
  requirement: RequirementInfo
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
      const { data } = await api.post<BidInfo>('/providers/me/marketplace/bids/create/', {
        requirement: requirement.id,
        service_name: form.service_name || `Cotización para: ${requirement.title}`,
        description: form.description || `Propuesta para el requerimiento: ${requirement.title}`,
        max_days: form.max_days,
        max_price_usd: form.max_price_usd,
      })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['marketplace-dashboard'] })
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
            placeholder={`Ej: Servicio de ${requirement.category_name}`}
          />
          <TextField
            label="Descripción / Notas de la propuesta"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={3}
            fullWidth
            placeholder="Detalle su propuesta, condiciones, entregables, etc."
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="Plazo de entrega (días)"
              value={form.max_days}
              onChange={(e) => setForm({ ...form, max_days: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="Precio (USD)"
              value={form.max_price_usd}
              onChange={(e) => setForm({ ...form, max_price_usd: e.target.value })}
              fullWidth
              required
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => createBid.mutate()}
          disabled={createBid.isPending || !form.max_price_usd || !form.max_days}
        >
          {createBid.isPending ? 'Enviando...' : 'Enviar cotización'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RequirementCard({
  req,
  isProvider,
  onBidClick,
}: {
  req: RequirementInfo
  isProvider: boolean
  onBidClick: (req: RequirementInfo) => void
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          {/* Title row */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {req.title}
            </Typography>
            <Chip label={req.category_name} size="small" variant="outlined" color="primary" />
            <StatusChip status={req.status} />
          </Stack>

          {/* Description */}
          <Typography variant="body2" color="text.secondary">
            {req.description.slice(0, 200)}{req.description.length > 200 ? '...' : ''}
          </Typography>

          {/* Meta row */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              Presupuesto máx: {req.max_budget_usd} USD
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Plazo: {req.max_deadline_days} días
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Candidato: {req.candidate_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Publicado: {new Date(req.created_at).toLocaleDateString('es-CL')}
            </Typography>
          </Stack>

          {/* Bids section */}
          {req.bids && req.bids.length > 0 && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Cotizaciones ({req.bids.length})
              </Typography>
              <Stack spacing={1}>
                {req.bids.map((bid) => (
                  <Card key={bid.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {bid.provider_name}
                          </Typography>
                          <BidChip status={bid.status} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {bid.service_name}: {bid.description.slice(0, 100)}
                          {bid.description.length > 100 ? '...' : ''}
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          <Typography variant="caption" color="text.secondary">
                            Precio: {bid.max_price_usd} USD
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Plazo: {bid.max_days} días
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Enviada: {new Date(bid.created_at).toLocaleDateString('es-CL')}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </>
          )}

          {(!req.bids || req.bids.length === 0) && req.status === 'published' && (
            <Typography variant="caption" color="text.secondary">
              Sin cotizaciones recibidas aún.
            </Typography>
          )}
        </Stack>
      </CardContent>
      {isProvider && req.status === 'published' && (
        <CardActions>
          <Button size="small" variant="contained" onClick={() => onBidClick(req)}>
            Enviar cotización
          </Button>
        </CardActions>
      )}
    </Card>
  )
}

export function MarketplacePage() {
  const { user } = useAuth()
  const [bidDialogOpen, setBidDialogOpen] = useState<RequirementInfo | null>(null)

  const isProvider = Boolean(user?.demo_capabilities?.includes('provider'))

  const dashboardQuery = useQuery({
    queryKey: ['marketplace-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<RequirementInfo[]>('/candidates/marketplace/dashboard/')
      return data ?? []
    },
  })

  const requirements = dashboardQuery.data ?? []

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Marketplace — Panel público</Typography>

      <Alert severity="info">
        Vista general de todos los requerimientos del marketplace y sus cotizaciones.
        {isProvider && ' Como proveedor, puede enviar cotizaciones haciendo clic en el botón de cada requerimiento publicado.'}
      </Alert>

      {requirements.length === 0 && !dashboardQuery.isLoading && (
        <Alert severity="info">
          No hay requerimientos en el marketplace en este momento.
        </Alert>
      )}

      <Stack spacing={2}>
        {requirements.map((req) => (
          <RequirementCard
            key={req.id}
            req={req}
            isProvider={isProvider}
            onBidClick={setBidDialogOpen}
          />
        ))}
      </Stack>

      {bidDialogOpen && (
        <BidDialog
          open={Boolean(bidDialogOpen)}
          onClose={() => setBidDialogOpen(null)}
          requirement={bidDialogOpen}
        />
      )}
    </Stack>
  )
}
