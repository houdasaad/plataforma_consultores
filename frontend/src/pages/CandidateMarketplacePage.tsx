import {
  Alert,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { CandidateBidComparison } from '../components/CandidateBidComparison'

type Category = { id: number; name: string; slug: string }
type Requirement = {
  id: number
  title: string
  description: string
  status: string
  ai_status: string
  max_budget_usd: string
  max_deadline_days: number
  category_slug: string
  category_name: string
  bid_count: number
  bids: Bid[]
}
type Bid = {
  id: number
  provider_name: string
  provider_id: number
  service_name: string
  description: string
  max_days: number
  max_price_usd: string
  status: string
  created_at: string
}

const MARKETPLACE_CATEGORIES = ['printing', 'digital-ads']

const PRINTING_FIELDS = {
  quantity: '',
  material_type: 'volantes',
  size: 'A5',
  color: 'full_color',
  finish: '',
}
const DIGITAL_ADS_FIELDS = {
  platform: 'facebook_instagram',
  campaign_type: 'awareness',
  estimated_reach: '',
  start_date: '',
  end_date: '',
}

export function CandidateMarketplacePage() {
  const qc = useQueryClient()
  const [categorySlug, setCategorySlug] = useState('printing')
  const [form, setForm] = useState({
    title: '',
    description: '',
    max_deadline_days: 15,
    max_budget_usd: '',
  })
  const [printing, setPrinting] = useState(PRINTING_FIELDS)
  const [digitalAds, setDigitalAds] = useState(DIGITAL_ADS_FIELDS)
  const [viewBidsFor, setViewBidsFor] = useState<number | null>(null)

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/catalog/categories/')
      return (data ?? []).filter((c) => MARKETPLACE_CATEGORIES.includes(c.slug))
    },
  })

  const requirements = useQuery({
    queryKey: ['my-requirements'],
    queryFn: async () => {
      const { data } = await api.get<Requirement[]>('/candidates/marketplace/requirements/')
      return data
    },
  })

  const buildDescription = (): string => {
    if (categorySlug === 'printing') {
      const parts = [
        printing.quantity && `Cantidad: ${printing.quantity} unidades`,
        printing.material_type && `Tipo: ${printing.material_type}`,
        printing.size && `Tamaño: ${printing.size}`,
        printing.color && `Color: ${printing.color === 'full_color' ? 'Full color' : 'Blanco y negro'}`,
        printing.finish && `Acabado: ${printing.finish}`,
      ].filter(Boolean)
      return parts.join('. ') + (parts.length ? '.' : '')
    }
    const parts = [
      digitalAds.platform && `Plataforma: ${digitalAds.platform === 'facebook_instagram' ? 'Facebook/Instagram' : digitalAds.platform === 'google_ads' ? 'Google Ads' : digitalAds.platform}`,
      digitalAds.campaign_type && `Tipo de campaña: ${digitalAds.campaign_type}`,
      digitalAds.estimated_reach && `Alcance estimado: ${digitalAds.estimated_reach}`,
      digitalAds.start_date && `Inicio: ${digitalAds.start_date}`,
      digitalAds.end_date && `Fin: ${digitalAds.end_date}`,
    ].filter(Boolean)
    return parts.join('. ') + (parts.length ? '.' : '')
  }

  const createReq = useMutation({
    mutationFn: async () => {
      const cat = (categories.data ?? []).find((c) => c.slug === categorySlug)
      if (!cat) throw new Error('Seleccione una categoría válida')
      const desc = form.description || buildDescription()
      if (!desc) throw new Error('Complete la descripción o los campos del formulario')
      const { data } = await api.post<Requirement>('/candidates/marketplace/requirements/', {
        title: form.title || `Cotización: ${cat.name}`,
        description: desc,
        max_deadline_days: form.max_deadline_days,
        max_budget_usd: form.max_budget_usd || '0',
        category_id: cat.id,
      })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-requirements'] })
      setForm({ title: '', description: '', max_deadline_days: 15, max_budget_usd: '' })
      setPrinting(PRINTING_FIELDS)
      setDigitalAds(DIGITAL_ADS_FIELDS)
    },
  })

  const publishReq = useMutation({
    mutationFn: async (id: number) => api.post(`/candidates/marketplace/requirements/${id}/publish/`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-requirements'] }),
  })

  const assist = useMutation({
    mutationFn: async () => {
      const desc = form.description || buildDescription()
      return api.post('/candidates/marketplace/requirements/assist/', { prompt: desc })
    },
  })

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Solicitar cotización a proveedores</Typography>
      <Alert severity="info">
        Solicite cotizaciones para servicios de impresión electoral y publicidad digital.
        Los proveedores verificados le enviarán propuestas que podrá comparar y aceptar.
      </Alert>

      {/* Category selector */}
      <TextField
        select
        label="Categoría del servicio"
        value={categorySlug}
        onChange={(e) => setCategorySlug(e.target.value)}
        fullWidth
      >
        {(categories.data ?? []).map((c) => (
          <MenuItem key={c.id} value={c.slug}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Structured form per category */}
      {categorySlug === 'printing' && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Detalles de impresión
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Cantidad de unidades"
                type="number"
                value={printing.quantity}
                onChange={(e) => setPrinting({ ...printing, quantity: e.target.value })}
                fullWidth
                helperText="Ej: 50000"
              />
              <TextField
                select
                label="Tipo de material"
                value={printing.material_type}
                onChange={(e) => setPrinting({ ...printing, material_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="volantes">Volantes</MenuItem>
                <MenuItem value="afiches">Afiches</MenuItem>
                <MenuItem value="boletas">Boletas electorales</MenuItem>
                <MenuItem value="folletos">Folletos</MenuItem>
                <MenuItem value="gigantografias">Gigantografías</MenuItem>
                <MenuItem value="otros">Otros</MenuItem>
              </TextField>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Tamaño"
                  value={printing.size}
                  onChange={(e) => setPrinting({ ...printing, size: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="A5">A5 (14.8 x 21 cm)</MenuItem>
                  <MenuItem value="A4">A4 (21 x 29.7 cm)</MenuItem>
                  <MenuItem value="A3">A3 (29.7 x 42 cm)</MenuItem>
                  <MenuItem value="A2">A2 (42 x 59.4 cm)</MenuItem>
                  <MenuItem value="personalizado">Personalizado</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Color"
                  value={printing.color}
                  onChange={(e) => setPrinting({ ...printing, color: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="full_color">Full color</MenuItem>
                  <MenuItem value="bw">Blanco y negro</MenuItem>
                  <MenuItem value="both">Ambos</MenuItem>
                </TextField>
              </Stack>
              <TextField
                label="Acabado / notas adicionales"
                value={printing.finish}
                onChange={(e) => setPrinting({ ...printing, finish: e.target.value })}
                fullWidth
                placeholder="Ej: laminado, encuadernado, corte especial"
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {categorySlug === 'digital-ads' && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Detalles de publicidad digital
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label="Plataforma"
                value={digitalAds.platform}
                onChange={(e) => setDigitalAds({ ...digitalAds, platform: e.target.value })}
                fullWidth
              >
                <MenuItem value="facebook_instagram">Facebook e Instagram (Meta Ads)</MenuItem>
                <MenuItem value="google_ads">Google Ads</MenuItem>
                <MenuItem value="tiktok">TikTok Ads</MenuItem>
                <MenuItem value="multi">Múltiples plataformas</MenuItem>
              </TextField>
              <TextField
                select
                label="Tipo de campaña"
                value={digitalAds.campaign_type}
                onChange={(e) => setDigitalAds({ ...digitalAds, campaign_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="awareness">Reconocimiento (awareness)</MenuItem>
                <MenuItem value="engagement">Interacción (engagement)</MenuItem>
                <MenuItem value="conversion">Conversión / leads</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="retargeting">Retargeting</MenuItem>
              </TextField>
              <TextField
                label="Alcance estimado"
                value={digitalAds.estimated_reach}
                onChange={(e) => setDigitalAds({ ...digitalAds, estimated_reach: e.target.value })}
                fullWidth
                helperText="Ej: 100,000 personas en Región Metropolitana"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  type="date"
                  label="Fecha inicio"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={digitalAds.start_date}
                  onChange={(e) => setDigitalAds({ ...digitalAds, start_date: e.target.value })}
                  fullWidth
                />
                <TextField
                  type="date"
                  label="Fecha fin"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={digitalAds.end_date}
                  onChange={(e) => setDigitalAds({ ...digitalAds, end_date: e.target.value })}
                  fullWidth
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Common fields */}
      <TextField
        label="Título de la solicitud"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        fullWidth
        helperText="Dejar vacío para usar un título automático"
      />
      <TextField
        label="Descripción adicional (opcional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        multiline
        minRows={2}
        fullWidth
        helperText="La descripción generada desde los campos anteriores se usará si deja esto vacío"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="number"
          label="Plazo máximo (días)"
          value={form.max_deadline_days}
          onChange={(e) => setForm({ ...form, max_deadline_days: Number(e.target.value) })}
          fullWidth
        />
        <TextField
          label="Presupuesto máximo (USD)"
          value={form.max_budget_usd}
          onChange={(e) => setForm({ ...form, max_budget_usd: e.target.value })}
          fullWidth
          placeholder="Ej: 3000.00"
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => assist.mutate()} disabled={assist.isPending}>
          Asistencia IA (mock)
        </Button>
        <Button variant="contained" onClick={() => createReq.mutate()} disabled={createReq.isPending}>
          Guardar borrador
        </Button>
      </Stack>
      {assist.data?.data && (
        <Alert severity="success">
          {(assist.data.data as { suggested_title?: string }).suggested_title
            ? `Sugerencia: ${(assist.data.data as { suggested_title: string }).suggested_title}`
            : JSON.stringify(assist.data.data)}
        </Alert>
      )}

      <Divider sx={{ my: 1 }} />

      <Typography variant="h6">Mis solicitudes de cotización</Typography>
      {(requirements.data ?? []).length === 0 && !requirements.isLoading && (
        <Typography variant="body2" color="text.secondary">
          No tiene solicitudes de cotización aún. Complete el formulario para crear una.
        </Typography>
      )}
      {(requirements.data ?? []).map((r) => (
        <Card key={r.id} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {r.title}
            </Typography>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
              {r.category_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {r.description.slice(0, 120)}{r.description.length > 120 ? '...' : ''}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                Estado: {r.status}{r.ai_status ? ` / ${r.ai_status}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Presupuesto: {r.max_budget_usd} USD
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Plazo: {r.max_deadline_days} días
              </Typography>
              {r.bid_count > 0 && (
                <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                  {r.bid_count} cotización{r.bid_count !== 1 ? 'es' : ''} recibida{r.bid_count !== 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>
          </CardContent>
          <CardActions>
            {r.status === 'draft' && (
              <Button size="small" onClick={() => publishReq.mutate(r.id)}>
                Publicar
              </Button>
            )}
            {r.bid_count > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setViewBidsFor(viewBidsFor === r.id ? null : r.id)}
              >
                {viewBidsFor === r.id ? 'Ocultar cotizaciones' : 'Ver cotizaciones'}
              </Button>
            )}
          </CardActions>
          {viewBidsFor === r.id && (
            <CardContent>
              <CandidateBidComparison requirementId={r.id} />
            </CardContent>
          )}
        </Card>
      ))}
    </Stack>
  )
}
