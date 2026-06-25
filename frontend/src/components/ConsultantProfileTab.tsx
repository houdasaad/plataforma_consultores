import LinkedInIcon from '@mui/icons-material/LinkedIn'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { MOCK_CONSULTANT_PROFILE } from '../data/mockExamples'

const mockBase = MOCK_CONSULTANT_PROFILE as Partial<ConsultantProfileForm>

export type SocialLinks = {
  linkedin: string
  twitter: string
  instagram: string
  facebook: string
  youtube: string
  website: string
}

export type ConsultantProfileForm = {
  display_name?: string
  full_name: string
  identity_document: string
  phone: string
  city: string
  country: string
  professional_title: string
  headline: string
  bio: string
  default_meeting_url: string
  payout_account_number: string
  hourly_rate: string
  category_ids: number[]
  social_links: SocialLinks
  academic_titles?: { degree: string; institution: string }[]
  interest_countries?: string[]
  interest_cities?: string[]
  election_levels_interest?: string[]
}

const emptySocial = (): SocialLinks => ({
  linkedin: '',
  twitter: '',
  instagram: '',
  facebook: '',
  youtube: '',
  website: '',
})

export const consultantProfileDefaultForm = (): ConsultantProfileForm => ({
  display_name: '',
  full_name: mockBase.full_name ?? '',
  identity_document: mockBase.identity_document ?? '',
  phone: mockBase.phone ?? '',
  city: mockBase.city ?? '',
  country: mockBase.country ?? '',
  professional_title: mockBase.professional_title ?? '',
  headline: '',
  bio: '',
  default_meeting_url: '',
  payout_account_number: mockBase.payout_account_number ?? '',
  hourly_rate: '',
  category_ids: [],
  social_links: emptySocial(),
  academic_titles: mockBase.academic_titles,
  interest_countries: mockBase.interest_countries,
  interest_cities: mockBase.interest_cities,
  election_levels_interest: mockBase.election_levels_interest,
})

type Props = {
  profileForm: ConsultantProfileForm
  setProfileForm: React.Dispatch<React.SetStateAction<ConsultantProfileForm>>
}

export function ConsultantProfileTab({ profileForm, setProfileForm }: Props) {
  const qc = useQueryClient()
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [importNotice, setImportNotice] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['consultant-me-profile'],
    queryFn: async () => {
      const { data } = await api.get<ConsultantProfileForm & { email?: string; categories?: { id: number; name: string; slug: string }[] }>('/consultants/me/')
      return data
    },
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ id: number; name: string; slug: string }[]>('/catalog/categories/')
      return data
    },
    staleTime: 60000,
  })

  useEffect(() => {
    if (!meQuery.data) return
    const d = meQuery.data
    setProfileForm({
      display_name: d.display_name ?? '',
      full_name: d.full_name ?? '',
      identity_document: d.identity_document ?? '',
      phone: d.phone ?? '',
      city: d.city ?? '',
      country: d.country ?? '',
      professional_title: d.professional_title ?? '',
      headline: d.headline ?? '',
      bio: d.bio ?? '',
      default_meeting_url: d.default_meeting_url ?? '',
      payout_account_number: d.payout_account_number ?? '',
      hourly_rate: d.hourly_rate ?? '',
      category_ids: (d as unknown as { category_ids?: number[] }).category_ids ?? (d.categories ?? []).map((c: { id: number }) => c.id),
      social_links: { ...emptySocial(), ...(d.social_links ?? {}) },
      academic_titles: d.academic_titles ?? [],
      interest_countries: d.interest_countries ?? [],
      interest_cities: d.interest_cities ?? [],
      election_levels_interest: d.election_levels_interest ?? [],
    })
    if (d.social_links?.linkedin) setLinkedinUrl(d.social_links.linkedin)
  }, [meQuery.data, setProfileForm])

  const saveProfile = useMutation({
    mutationFn: async () => api.patch('/consultants/me/', profileForm),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['consultant-me-profile'] })
      void qc.invalidateQueries({ queryKey: ['consultant-portal'] })
      void qc.invalidateQueries({ queryKey: ['consultants'] })
    },
  })

  const verifyProfile = useMutation({
    mutationFn: async () => api.post('/consultants/me/verify/', profileForm),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['consultant-portal'] }),
  })

  const linkedinImport = useMutation({
    mutationFn: async (apply: boolean) =>
      api.post('/consultants/me/linkedin-import/', {
        linkedin_url: linkedinUrl,
        apply,
      }),
    onSuccess: (res, apply) => {
      const extracted = res.data?.extracted as ConsultantProfileForm | undefined
      if (apply && res.data?.profile) {
        const p = res.data.profile as ConsultantProfileForm
        setProfileForm((prev) => ({
          ...prev,
          ...p,
          social_links: { ...emptySocial(), ...(p.social_links ?? {}) },
        }))
        setImportNotice('Perfil rellenado desde LinkedIn. Revise y guarde los cambios.')
      } else if (extracted) {
        setProfileForm((prev) => ({
          ...prev,
          display_name: extracted.display_name ?? prev.display_name,
          full_name: extracted.full_name ?? prev.full_name,
          professional_title: extracted.professional_title ?? prev.professional_title,
          headline: extracted.headline ?? prev.headline,
          bio: extracted.bio ?? prev.bio,
          city: extracted.city ?? prev.city,
          country: extracted.country ?? prev.country,
          phone: extracted.phone ?? prev.phone,
          social_links: {
            ...prev.social_links,
            ...(extracted.social_links ?? {}),
          },
        }))
        setImportNotice('Vista previa aplicada al formulario. Pulse Guardar perfil para confirmar.')
      }
    },
  })

  const setSocial = (key: keyof SocialLinks, value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: value },
    }))
  }

  return (
    <Stack spacing={2} component="form" onSubmit={(e) => { e.preventDefault(); saveProfile.mutate() }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Importar desde LinkedIn
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Pegue la URL pública de su perfil (ej. https://www.linkedin.com/in/su-usuario). La
          plataforma completará nombre, titular, bio y redes (simulación MVP).
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label="URL de LinkedIn"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/..."
            fullWidth
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<LinkedInIcon />}
            onClick={() => linkedinImport.mutate(false)}
            disabled={!linkedinUrl.trim() || linkedinImport.isPending}
          >
            Vista previa
          </Button>
          <Button
            variant="contained"
            onClick={() => linkedinImport.mutate(true)}
            disabled={!linkedinUrl.trim() || linkedinImport.isPending}
          >
            Rellenar y guardar
          </Button>
        </Stack>
        {importNotice && (
          <Alert severity="success" sx={{ mt: 1.5 }} onClose={() => setImportNotice(null)}>
            {importNotice}
          </Alert>
        )}
        {linkedinImport.isError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            No se pudo importar. Use una URL válida de linkedin.com/in/...
          </Alert>
        )}
      </Paper>

      <TextField
        label="Nombre para mostrar"
        value={profileForm.display_name ?? ''}
        onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
        fullWidth
      />
      <TextField
        label="Nombre completo"
        value={profileForm.full_name}
        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
        fullWidth
      />
      <TextField
        label="Titular (headline)"
        value={profileForm.headline}
        onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
        fullWidth
      />
      <TextField
        label="Biografía"
        value={profileForm.bio}
        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
        multiline
        minRows={3}
        fullWidth
      />
      <TextField
        label="Documento de identidad"
        value={profileForm.identity_document}
        onChange={(e) => setProfileForm({ ...profileForm, identity_document: e.target.value })}
        fullWidth
      />
      <TextField
        label="Teléfono"
        value={profileForm.phone}
        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Ciudad"
          value={profileForm.city}
          onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
          fullWidth
        />
        <TextField
          label="País"
          value={profileForm.country}
          onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
          fullWidth
        />
      </Stack>
      <TextField
        label="Título profesional"
        value={profileForm.professional_title}
        onChange={(e) => setProfileForm({ ...profileForm, professional_title: e.target.value })}
        fullWidth
      />
      <TextField
        label="Enlace de reunión (Zoom/Meet)"
        value={profileForm.default_meeting_url}
        onChange={(e) => setProfileForm({ ...profileForm, default_meeting_url: e.target.value })}
        fullWidth
      />
      <TextField
        label="Tarifa por hora (USD)"
        value={profileForm.hourly_rate}
        onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
        fullWidth
        type="number"
        helperText="Tarifa en USD que cobra por cada consulta individual de una hora"
        slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
      />

      <FormControl fullWidth>
        <InputLabel id="category-select-label">Áreas de consultoría</InputLabel>
        <Select
          labelId="category-select-label"
          multiple
          value={profileForm.category_ids}
          onChange={(e) => {
            const val = e.target.value
            const ids = Array.isArray(val) ? (val as number[]) : []
            setProfileForm({ ...profileForm, category_ids: ids })
          }}
          input={<OutlinedInput label="Áreas de consultoría" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as number[]).map((id) => {
                const cat = (categoriesQuery.data ?? []).find((c) => c.id === id)
                return <Chip key={id} label={cat?.name ?? String(id)} size="small" />
              })}
            </Box>
          )}
        >
          {(categoriesQuery.data ?? []).map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2" color="text.secondary">
        Seleccione las áreas en las que ofrece consultoría por hora. Estas categorías se mostrarán en el catálogo público para que los candidatos puedan filtrar y encontrar sus servicios.
      </Typography>

      <Divider />
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Redes sociales y sitio web
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Visible en su perfil público para candidatos.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <TextField
          label="LinkedIn"
          value={profileForm.social_links.linkedin}
          onChange={(e) => setSocial('linkedin', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="X (Twitter)"
          value={profileForm.social_links.twitter}
          onChange={(e) => setSocial('twitter', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Instagram"
          value={profileForm.social_links.instagram}
          onChange={(e) => setSocial('instagram', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Facebook"
          value={profileForm.social_links.facebook}
          onChange={(e) => setSocial('facebook', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="YouTube"
          value={profileForm.social_links.youtube}
          onChange={(e) => setSocial('youtube', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Sitio web"
          value={profileForm.social_links.website}
          onChange={(e) => setSocial('website', e.target.value)}
          fullWidth
          size="small"
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button type="submit" variant="contained" disabled={saveProfile.isPending}>
          Guardar perfil
        </Button>
        <Button variant="outlined" onClick={() => verifyProfile.mutate()} disabled={verifyProfile.isPending}>
          Verificar con IA (mock)
        </Button>
      </Stack>
      {saveProfile.isSuccess && <Alert severity="success">Perfil guardado.</Alert>}
      {verifyProfile.isSuccess && verifyProfile.data?.data && (
        <Alert
          severity={
            (verifyProfile.data.data as { needs_manual_review?: boolean }).needs_manual_review
              ? 'warning'
              : 'success'
          }
        >
          Score: {(verifyProfile.data.data as { score?: number }).score} — Revisión manual:{' '}
          {(verifyProfile.data.data as { needs_manual_review?: boolean }).needs_manual_review
            ? 'sí'
            : 'no'}
        </Alert>
      )}
    </Stack>
  )
}
