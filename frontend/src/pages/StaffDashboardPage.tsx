import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { PaymentHistoryPanel } from '../components/PaymentHistoryPanel'
import { StarRating } from '../components/StarRating'
import { VerificationBadge } from '../components/VerificationBadge'

type Pending = {
  id: number
  email: string
  display_name: string
  approval_status: string
  created_at: string
}

type Report = {
  id: number
  candidate_name: string
  candidate_email: string
  consultant_name: string
  message: string
  status: string
  created_at: string
}

type Category = { id: number; name: string; slug: string }

type StaffConsultant = {
  id: number
  email: string
  display_name: string
  full_name: string
  identity_document: string
  phone: string
  country: string
  city: string
  professional_title: string
  approval_status: string
  rejection_reason: string
  categories: string[]
  verification_score: number | null
  needs_manual_review: boolean
  created_at: string
}

type ConsultantForm = {
  email: string
  display_name: string
  full_name: string
  identity_document: string
  phone: string
  country: string
  city: string
  professional_title: string
  headline: string
  bio: string
  hourly_rate: string
  approval_status: string
  category_ids: number[]
}

const initialForm: ConsultantForm = {
  email: '',
  display_name: '',
  full_name: '',
  identity_document: '',
  phone: '',
  country: '',
  city: '',
  professional_title: '',
  headline: '',
  bio: '',
  hourly_rate: '',
  approval_status: 'pending',
  category_ids: [],
}

/* -------------------------------------------------------------------------- */
/* Provider types                                                             */
/* -------------------------------------------------------------------------- */

type StaffProvider = {
  id: number
  name: string
  identifier: string
  contact_email: string
  phone: string
  website: string
  description: string
  categories: string[]
  approval_status: string
  rejection_reason: string
  avg_rating: number | null
  total_reviews: number
  is_verified: boolean
  created_at: string
  updated_at: string
}

type ProviderForm = {
  name: string
  identifier: string
  contact_email: string
  phone: string
  website: string
  description: string
  approval_status: string
  category_ids: number[]
}

const PROVIDER_STATUS_OPTIONS = ['pending', 'approved', 'rejected'] as const
const PROVIDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const initialProviderForm: ProviderForm = {
  name: '',
  identifier: '',
  contact_email: '',
  phone: '',
  website: '',
  description: '',
  approval_status: 'pending',
  category_ids: [],
}

export function StaffDashboardPage() {
  const [tab, setTab] = useState(0)
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Staff</Typography>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
        <Tab label="Pendientes" />
        <Tab label="Gestión de consultores" />
        <Tab label="Gestión de proveedores" />
        <Tab label="Reportes" />
        <Tab label="Finanzas" />
      </Tabs>
      {tab === 0 && <PendingTab />}
      {tab === 1 && <ConsultantManagementTab />}
      {tab === 2 && <ProviderManagementTab />}
      {tab === 3 && <ClarificationReportsSection />}
      {tab === 4 && <FinanceTab />}
    </Stack>
  )
}

function PendingTab() {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const pendingQuery = useQuery({
    queryKey: ['pending-consultants'],
    queryFn: async () => {
      const { data } = await api.get<Pending[]>('/consultants/staff/pending/')
      return data
    },
  })

  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, number>>('/metrics/summary/')
      return data
    },
  })

  const approve = useMutation({
    mutationFn: async (id: number) => api.post(`/consultants/staff/${id}/approve/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pending-consultants'] })
      void qc.invalidateQueries({ queryKey: ['staff-consultants'] })
    },
  })

  const reject = useMutation({
    mutationFn: async (id: number) =>
      api.post(`/consultants/staff/${id}/reject/`, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pending-consultants'] })
      void qc.invalidateQueries({ queryKey: ['staff-consultants'] })
    },
  })

  const financeQuery = useQuery({
    queryKey: ['staff-finance'],
    queryFn: async () => {
      const { data } = await api.get<{
        payments_count: number
        total_amount: string
        total_commission: string
      }>('/payments/staff/summary/')
      return data
    },
  })

  return (
    <Stack spacing={2}>
      {metricsQuery.data && (
        <Alert severity="info">
          Usuarios: {metricsQuery.data.users_total} · Pendientes: {metricsQuery.data.consultants_pending} · Reservas:{' '}
          {metricsQuery.data.bookings_total} · Pagos OK: {metricsQuery.data.payments_succeeded}
        </Alert>
      )}

      <TextField
        label="Motivo de rechazo (plantilla)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        fullWidth
      />
      <Typography variant="h6">Consultores pendientes</Typography>
      {pendingQuery.isError && <Alert severity="error">No autorizado o error de red.</Alert>}
      <Stack spacing={1}>
        {(pendingQuery.data ?? []).map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Typography variant="h6">{p.display_name}</Typography>
              <Typography color="text.secondary">{p.email}</Typography>
            </CardContent>
            <CardActions>
              <Button disabled={approve.isPending} onClick={() => approve.mutate(p.id)}>
                Aprobar
              </Button>
              <Button color="error" disabled={reject.isPending} onClick={() => reject.mutate(p.id)}>
                Rechazar
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}

/* -------------------------------------------------------------------------- */
/* Consultant Management Tab — full CRUD                                      */
/* -------------------------------------------------------------------------- */

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'manual_review'] as const
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  manual_review: 'Revisión manual',
}

function ConsultantManagementTab() {
  const qc = useQueryClient()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ConsultantForm>(initialForm)
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' })

  const consultantsQuery = useQuery({
    queryKey: ['staff-consultants'],
    queryFn: async () => {
      const { data } = await api.get<StaffConsultant[]>('/consultants/staff/')
      return Array.isArray(data) ? data : (data as { results: StaffConsultant[] }).results ?? []
    },
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/catalog/categories/')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: ConsultantForm) => {
      const body: Record<string, unknown> = {
        ...payload,
        hourly_rate: payload.hourly_rate ? Number(payload.hourly_rate) : undefined,
      }
      if (editingId) {
        await api.patch(`/consultants/staff/${editingId}/`, body)
      } else {
        await api.post('/consultants/staff/create/', body)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-consultants'] })
      setOpenDialog(false)
      setEditingId(null)
      setForm(initialForm)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/consultants/staff/${id}/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-consultants'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason: string }) =>
      api.post(`/consultants/staff/${id}/change-status/`, {
        approval_status: status,
        rejection_reason: reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-consultants'] })
      void qc.invalidateQueries({ queryKey: ['pending-consultants'] })
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(initialForm)
    setOpenDialog(true)
  }

  function openEdit(c: StaffConsultant) {
    setEditingId(c.id)
    setForm({
      email: c.email,
      display_name: c.display_name,
      full_name: c.full_name,
      identity_document: c.identity_document,
      phone: c.phone,
      country: c.country,
      city: c.city,
      professional_title: c.professional_title,
      headline: '',
      bio: '',
      hourly_rate: '',
      approval_status: c.approval_status,
      category_ids: [],
    })
    setOpenDialog(true)
  }

  function handleCategoryChange(e: { target: { value: number[] | string } }) {
    const val = e.target.value
    setForm((f) => ({
      ...f,
      category_ids: typeof val === 'string' ? val.split(',').map(Number) : val,
    }))
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Gestión de consultores</Typography>
        <Button variant="contained" onClick={openCreate}>
          Agregar consultor
        </Button>
      </Box>

      {consultantsQuery.isError && <Alert severity="error">No se pudieron cargar los consultores.</Alert>}

      <Stack spacing={1}>
        {(consultantsQuery.data ?? []).map((c) => (
          <Card key={c.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {c.display_name}
                </Typography>
                <Chip
                  label={STATUS_LABELS[c.approval_status] ?? c.approval_status}
                  size="small"
                  color={
                    c.approval_status === 'approved'
                      ? 'success'
                      : c.approval_status === 'rejected'
                        ? 'error'
                        : 'warning'
                  }
                  variant="outlined"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {c.email}
                {c.city ? ` · ${c.city}` : ''}
                {c.country ? `, ${c.country}` : ''}
              </Typography>
              {c.categories && c.categories.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  {c.categories.map((cat) => (
                    <Chip key={cat} label={cat} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              )}
              {c.identity_document && (
                <Typography variant="caption" color="text.disabled">
                  ID: {c.identity_document}
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ flexWrap: 'wrap', gap: 0.5, px: 2, pb: 2 }}>
              <Button size="small" variant="outlined" onClick={() => openEdit(c)}>
                Editar
              </Button>
              <Button
                size="small"
                color="success"
                variant="outlined"
                disabled={c.approval_status === 'approved' || statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: c.id, status: 'approved', reason: '' })}
              >
                Verificar
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={c.approval_status === 'rejected' || statusMutation.isPending}
                onClick={() => {
                  const reason = prompt('Motivo de rechazo:')
                  if (reason !== null) {
                    statusMutation.mutate({ id: c.id, status: 'rejected', reason })
                  }
                }}
              >
                Rechazar
              </Button>
              <Button
                size="small"
                color="error"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`Eliminar a ${c.display_name}? Esta acción no se puede deshacer.`)) {
                    deleteMutation.mutate(c.id)
                  }
                }}
              >
                Eliminar
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar consultor' : 'Agregar consultor'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {!editingId && (
              <TextField
                label="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                fullWidth
                required
              />
            )}
            <TextField
              label="Nombre"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Nombre completo"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Documento de identidad (RUT)"
              value={form.identity_document}
              onChange={(e) => setForm((f) => ({ ...f, identity_document: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="País"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Ciudad"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Título profesional"
              value={form.professional_title}
              onChange={(e) => setForm((f) => ({ ...f, professional_title: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Rubros / Categorías</InputLabel>
              <Select
                multiple
                value={form.category_ids}
                onChange={handleCategoryChange}
                input={<OutlinedInput label="Rubros / Categorías" />}
                renderValue={(selected) =>
                  (selected as number[])
                    .map((id) => categoriesQuery.data?.find((c) => c.id === id)?.name ?? id)
                    .join(', ')
                }
              >
                {(categoriesQuery.data ?? []).map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Estado de verificación</InputLabel>
              <Select
                value={form.approval_status}
                label="Estado de verificación"
                onChange={(e) => setForm((f) => ({ ...f, approval_status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={createMutation.isPending || (!editingId && !form.email)}
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear consultor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

/* -------------------------------------------------------------------------- */
/* Provider Management Tab — full CRUD for providers                          */
/* -------------------------------------------------------------------------- */

function ProviderManagementTab() {
  const qc = useQueryClient()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProviderForm>(initialProviderForm)

  const providersQuery = useQuery({
    queryKey: ['staff-providers'],
    queryFn: async () => {
      const { data } = await api.get<StaffProvider[]>('/providers/staff/')
      return Array.isArray(data)
        ? data
        : (data as { results: StaffProvider[] }).results ?? []
    },
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/catalog/categories/')
      return data
    },
  })

  const printingCategories =
    categoriesQuery.data?.filter((c) =>
      ['printing', 'digital-ads'].includes(c.slug),
    ) ?? []

  const createMutation = useMutation({
    mutationFn: async (payload: ProviderForm) => {
      if (editingId) {
        await api.patch(`/providers/staff/${editingId}/`, payload)
      } else {
        await api.post('/providers/staff/create/', payload)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-providers'] })
      setOpenDialog(false)
      setEditingId(null)
      setForm(initialProviderForm)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/providers/staff/${id}/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-providers'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: number
      status: string
      reason: string
    }) =>
      api.post(`/providers/staff/${id}/change-status/`, {
        approval_status: status,
        rejection_reason: reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-providers'] })
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(initialProviderForm)
    setOpenDialog(true)
  }

  function openEdit(p: StaffProvider) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      identifier: p.identifier,
      contact_email: p.contact_email,
      phone: p.phone,
      website: p.website,
      description: p.description,
      approval_status: p.approval_status,
      category_ids: [],
    })
    setOpenDialog(true)
  }

  function handleCategoryChange(e: { target: { value: number[] | string } }) {
    const val = e.target.value
    setForm((f) => ({
      ...f,
      category_ids: typeof val === 'string' ? val.split(',').map(Number) : val,
    }))
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">Gestión de proveedores</Typography>
        <Button variant="contained" onClick={openCreate}>
          Agregar proveedor
        </Button>
      </Box>

      {providersQuery.isError && (
        <Alert severity="error">
          No se pudieron cargar los proveedores.
        </Alert>
      )}

      <Stack spacing={1}>
        {(providersQuery.data ?? []).map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {p.name}
                </Typography>
                <VerificationBadge visible={p.is_verified} />
                <Chip
                  label={
                    PROVIDER_STATUS_LABELS[p.approval_status] ??
                    p.approval_status
                  }
                  size="small"
                  color={
                    p.approval_status === 'approved'
                      ? 'success'
                      : p.approval_status === 'rejected'
                        ? 'error'
                        : 'warning'
                  }
                  variant="outlined"
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {p.contact_email}
                {p.phone ? ` · ${p.phone}` : ''}
              </Typography>

              <Typography
                variant="caption"
                color="text.disabled"
                component="div"
              >
                ID: {p.identifier}
                {p.website ? ` · ${p.website}` : ''}
              </Typography>

              {p.avg_rating != null && p.total_reviews > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <StarRating
                    value={p.avg_rating}
                    count={p.total_reviews}
                  />
                </Box>
              )}

              {p.categories.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  {p.categories.map((cat) => (
                    <Chip
                      key={cat}
                      label={cat}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </CardContent>

            <CardActions sx={{ flexWrap: 'wrap', gap: 0.5, px: 2, pb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => openEdit(p)}
              >
                Editar
              </Button>
              <Button
                size="small"
                color="success"
                variant="outlined"
                disabled={
                  p.approval_status === 'approved' || statusMutation.isPending
                }
                onClick={() =>
                  statusMutation.mutate({
                    id: p.id,
                    status: 'approved',
                    reason: '',
                  })
                }
              >
                Verificar
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={
                  p.approval_status === 'rejected' || statusMutation.isPending
                }
                onClick={() => {
                  const reason = prompt('Motivo de rechazo:')
                  if (reason !== null) {
                    statusMutation.mutate({
                      id: p.id,
                      status: 'rejected',
                      reason,
                    })
                  }
                }}
              >
                Rechazar
              </Button>
              <Button
                size="small"
                color="error"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    confirm(
                      `¿Eliminar a ${p.name}? Esta acción no se puede deshacer.`,
                    )
                  ) {
                    deleteMutation.mutate(p.id)
                  }
                }}
              >
                Eliminar
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingId ? 'Editar proveedor' : 'Agregar proveedor'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Nombre de la empresa"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Identificador (RUT)"
              value={form.identifier}
              onChange={(e) =>
                setForm((f) => ({ ...f, identifier: e.target.value }))
              }
              fullWidth
              required
              disabled={!!editingId}
            />
            <TextField
              label="Email de contacto"
              value={form.contact_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, contact_email: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Sitio web"
              value={form.website}
              onChange={(e) =>
                setForm((f) => ({ ...f, website: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Rubros / Categorías</InputLabel>
              <Select
                multiple
                value={form.category_ids}
                onChange={handleCategoryChange}
                input={<OutlinedInput label="Rubros / Categorías" />}
                renderValue={(selected) =>
                  (selected as number[])
                    .map(
                      (id) =>
                        printingCategories.find((c) => c.id === id)?.name ??
                        id,
                    )
                    .join(', ')
                }
              >
                {printingCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={form.approval_status}
                label="Estado"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    approval_status: e.target.value,
                  }))
                }
              >
                {PROVIDER_STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {PROVIDER_STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              createMutation.isPending ||
              (!editingId && (!form.name || !form.identifier))
            }
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending
              ? 'Guardando…'
              : editingId
                ? 'Guardar cambios'
                : 'Crear proveedor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

/* -------------------------------------------------------------------------- */
/* Clarification reports (unchanged)                                          */
/* -------------------------------------------------------------------------- */

function ClarificationReportsSection() {
  const reportsQuery = useQuery({
    queryKey: ['staff-clarification-reports'],
    queryFn: async () => {
      const { data } = await api.get<Report[]>('/candidates/staff/clarification-reports/')
      return data
    },
  })

  return (
    <>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Reportes de información imprecisa (candidatos)
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Enviados por consultores al administrador para solicitar aclaraciones al candidato.
      </Typography>
      {reportsQuery.isError && <Alert severity="error">No se pudieron cargar los reportes.</Alert>}
      <Stack spacing={1}>
        {(reportsQuery.data ?? []).map((r) => (
          <Card key={r.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2">
                Candidato: {r.candidate_name} ({r.candidate_email})
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                Consultor: {r.consultant_name} · {r.status} ·{' '}
                {new Date(r.created_at).toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {r.message}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Finance Tab — full payment history with summary                            */
/* -------------------------------------------------------------------------- */

function FinanceTab() {
  const financeQuery = useQuery({
    queryKey: ['staff-finance'],
    queryFn: async () => {
      const { data } = await api.get<{
        payments_count: number
        total_amount: string
        total_commission: string
      }>('/payments/staff/summary/')
      return data
    },
  })

  return (
    <Stack spacing={2}>
      {financeQuery.data && (
        <Alert severity="success" variant="outlined">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Ingresos y comisiones
          </Typography>
          <Typography variant="body2">
            Pagos exitosos: {financeQuery.data.payments_count} · Total facturado:{' '}
            {financeQuery.data.total_amount} USD · Comisiones:{' '}
            {financeQuery.data.total_commission} USD
          </Typography>
        </Alert>
      )}

      <PaymentHistoryPanel
        endpoint="/payments/staff/list/"
        role="staff"
        title="Historial completo de pagos"
      />
    </Stack>
  )
}
