import {
  Alert,
  Box,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'

type Requirement = {
  id: number
  title: string
  description: string
  max_budget_usd: string
  max_deadline_days: number
  category_slug: string
  bid_count: number
}

type BidForm = {
  requirement: number
  service_name: string
  description: string
  max_days: number
  max_price_usd: string
}

export function ConsultantQuotationTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [bidForm, setBidForm] = useState<BidForm>({
    requirement: 0,
    service_name: '',
    description: '',
    max_days: 14,
    max_price_usd: '',
  })

  const feed = useQuery({
    queryKey: ['marketplace-feed'],
    queryFn: async () => {
      const { data } = await api.get<Requirement[]>('/candidates/marketplace/feed/')
      return data
    },
  })

  const placeBid = useMutation({
    mutationFn: async () =>
      api.post('/candidates/marketplace/bids/', {
        requirement: bidForm.requirement,
        service_name: bidForm.service_name,
        description: bidForm.description,
        max_days: bidForm.max_days,
        max_price_usd: bidForm.max_price_usd,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-feed'] })
      qc.invalidateQueries({ queryKey: ['consultant-portal'] })
      setOpen(false)
    },
  })

  const openBidDialog = (req: Requirement) => {
    setBidForm({
      requirement: req.id,
      service_name: req.title,
      description: `Propuesta de servicio para: ${req.title}`,
      max_days: req.max_deadline_days,
      max_price_usd: req.max_budget_usd,
    })
    setOpen(true)
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Requerimientos de servicios complementarios (impresión electoral, publicidad digital).
        Envíe una cotización con nombre, descripción, plazo y precio en USD.
      </Typography>

      {(feed.data ?? []).length === 0 && (
        <Alert severity="info">
          No hay requerimientos activos en este momento.
        </Alert>
      )}

      {(feed.data ?? []).map((r) => (
        <Card key={r.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {r.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.category_slug} · Presupuesto máx. {r.max_budget_usd} USD · {r.max_deadline_days} días
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {r.description.slice(0, 200)}
                  {r.description.length > 200 ? '...' : ''}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
          <CardContent>
            <Button
              size="small"
              variant="contained"
              onClick={() => openBidDialog(r)}
            >
              Enviar cotización
            </Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar cotización</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre del servicio o propuesta"
              value={bidForm.service_name}
              onChange={(e) => setBidForm({ ...bidForm, service_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Descripción de la propuesta"
              value={bidForm.description}
              onChange={(e) => setBidForm({ ...bidForm, description: e.target.value })}
              multiline
              minRows={3}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Plazo (días)"
                type="number"
                value={bidForm.max_days}
                onChange={(e) => setBidForm({ ...bidForm, max_days: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Precio USD"
                value={bidForm.max_price_usd}
                onChange={(e) => setBidForm({ ...bidForm, max_price_usd: e.target.value })}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => placeBid.mutate()}
            disabled={!bidForm.service_name || !bidForm.max_price_usd || placeBid.isPending}
          >
            Enviar cotización
          </Button>
        </DialogActions>
      </Dialog>

      {placeBid.isSuccess && (
        <Alert severity="success">Cotización enviada. El candidato podrá revisarla y aceptarla.</Alert>
      )}
    </Stack>
  )
}
