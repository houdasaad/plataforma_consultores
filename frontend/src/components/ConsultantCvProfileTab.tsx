import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { CvFileDropzone } from './CvFileDropzone'

export type EducationRow = {
  type: string
  university: string
  year_start: string
  year_end: string
}

export type CampaignRow = {
  campaign: string
  service: string
  year: string
  contact_name: string
  contact_email: string
  contact_phone: string
}

export type CvProfile = {
  education: EducationRow[]
  campaign_experience: CampaignRow[]
}

const emptyEducation = (): EducationRow => ({
  type: '',
  university: '',
  year_start: '',
  year_end: '',
})

const emptyCampaign = (): CampaignRow => ({
  campaign: '',
  service: '',
  year: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
})

const defaultProfile = (): CvProfile => ({
  education: [emptyEducation()],
  campaign_experience: [emptyCampaign()],
})

async function downloadCvSample(path: string, filename: string) {
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  const token = localStorage.getItem('access')
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ConsultantCvProfileTab() {
  const qc = useQueryClient()
  const [cvProfile, setCvProfile] = useState<CvProfile>(defaultProfile())
  const [importCode, setImportCode] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvText, setCvText] = useState('')
  const [snapshotCode, setSnapshotCode] = useState('')
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'published'>('draft')
  const [extractNotice, setExtractNotice] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['consultant-cv-profile'],
    queryFn: async () => {
      const { data } = await api.get<{
        cv_profile: CvProfile
        cv_publication_status: string
        cv_snapshot_code: string
      }>('/consultants/me/cv/profile/')
      return data
    },
  })

  useEffect(() => {
    if (!profileQuery.data) return
    const p = profileQuery.data.cv_profile
    if (p?.education?.length || p?.campaign_experience?.length) {
      setCvProfile({
        education: p.education?.length ? p.education : [emptyEducation()],
        campaign_experience: p.campaign_experience?.length
          ? p.campaign_experience
          : [emptyCampaign()],
      })
    }
    setSnapshotCode(profileQuery.data.cv_snapshot_code || '')
    setPublicationStatus(
      profileQuery.data.cv_publication_status === 'published' ? 'published' : 'draft',
    )
  }, [profileQuery.data])

  const saveCv = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/consultants/me/cv/save/', { cv_profile: cvProfile })
      return data
    },
    onSuccess: (data) => {
      const d = data as { cv_snapshot_code?: string; cv_publication_status?: string }
      if (d.cv_snapshot_code) setSnapshotCode(d.cv_snapshot_code)
      if (d.cv_publication_status) setPublicationStatus(d.cv_publication_status as 'draft')
      void qc.invalidateQueries({ queryKey: ['consultant-cv-profile'] })
    },
  })

  const publishCv = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/consultants/me/cv/publish/', { cv_profile: cvProfile })
      return data
    },
    onSuccess: (data) => {
      const d = data as { cv_snapshot_code?: string; cv_publication_status?: string }
      if (d.cv_snapshot_code) setSnapshotCode(d.cv_snapshot_code)
      setPublicationStatus('published')
      void qc.invalidateQueries({ queryKey: ['consultant-cv-profile'] })
    },
  })

  const importCv = useMutation({
    mutationFn: async () =>
      api.post('/consultants/me/cv/import/', importCode.trim() ? { code: importCode.trim() } : {}),
    onSuccess: (res) => {
      const p = res.data?.cv_profile as CvProfile
      if (p) {
        setCvProfile({
          education: p.education?.length ? p.education : [emptyEducation()],
          campaign_experience: p.campaign_experience?.length
            ? p.campaign_experience
            : [emptyCampaign()],
        })
      }
      if (res.data?.cv_snapshot_code) setSnapshotCode(res.data.cv_snapshot_code)
    },
  })

  const extractCv = useMutation({
    mutationFn: async (opts: { useOcr?: boolean }) => {
      if (cvFile) {
        const form = new FormData()
        form.append('file', cvFile)
        if (opts.useOcr) form.append('use_ocr', 'true')
        return api.post('/consultants/me/cv/extract/', form)
      }
      return api.post('/consultants/me/cv/extract/', {
        text: cvText,
        filename: 'cv.txt',
        use_ocr: opts.useOcr ? 'true' : undefined,
      })
    },
    onSuccess: (res) => {
      const p = res.data?.cv_profile as CvProfile | undefined
      const method = String(res.data?.extraction_method ?? 'IA')
      if (p?.education?.length || p?.campaign_experience?.length) {
        setCvProfile({
          education: p.education?.length ? p.education : [emptyEducation()],
          campaign_experience: p.campaign_experience?.length
            ? p.campaign_experience
            : [emptyCampaign()],
        })
        setExtractNotice(`Formulario actualizado (${method}).`)
      } else {
        setExtractNotice('No se detectaron secciones en el CV. Revise el formato o edite manualmente.')
      }
      const preview = res.data?.raw_text_preview as string | undefined
      if (preview) setCvText(preview)
    },
  })

  const updateEducation = (index: number, field: keyof EducationRow, value: string) => {
    setCvProfile((prev) => {
      const education = [...prev.education]
      education[index] = { ...education[index], [field]: value }
      return { ...prev, education }
    })
  }

  const updateCampaign = (index: number, field: keyof CampaignRow, value: string) => {
    setCvProfile((prev) => {
      const campaign_experience = [...prev.campaign_experience]
      campaign_experience[index] = { ...campaign_experience[index], [field]: value }
      return { ...prev, campaign_experience }
    })
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Complete su información profesional. Use <strong>Guardar</strong> para borrador o{' '}
        <strong>Publicar</strong> para que educación y experiencia en campañas aparezcan en el
        catálogo público. Solo la extracción con IA rellena el formulario desde un archivo.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip
          label={publicationStatus === 'published' ? 'Publicado' : 'Borrador'}
          color={publicationStatus === 'published' ? 'success' : 'default'}
          size="small"
        />
        {snapshotCode && (
          <Typography variant="caption" color="text.secondary">
            Código CV guardado: <strong>{snapshotCode}</strong>
          </Typography>
        )}
      </Stack>

      <Divider />

      <Typography variant="subtitle1">Educación</Typography>
      {cvProfile.education.map((row, i) => (
        <Box
          key={`edu-${i}`}
          sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          <Stack spacing={1.5}>
            <TextField
              label="Tipo (licenciatura, maestría, etc.)"
              value={row.type}
              onChange={(e) => updateEducation(i, 'type', e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Universidad"
              value={row.university}
              onChange={(e) => updateEducation(i, 'university', e.target.value)}
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Año inicio"
                value={row.year_start}
                onChange={(e) => updateEducation(i, 'year_start', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Año término"
                value={row.year_end}
                onChange={(e) => updateEducation(i, 'year_end', e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            {cvProfile.education.length > 1 && (
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  setCvProfile((p) => ({
                    ...p,
                    education: p.education.filter((_, j) => j !== i),
                  }))
                }
                aria-label="Eliminar educación"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Box>
      ))}
      <Button
        startIcon={<AddIcon />}
        size="small"
        onClick={() =>
          setCvProfile((p) => ({ ...p, education: [...p.education, emptyEducation()] }))
        }
      >
        Agregar educación
      </Button>

      <Divider />

      <Typography variant="subtitle1">Experiencia en campañas</Typography>
      {cvProfile.campaign_experience.map((row, i) => (
        <Box
          key={`camp-${i}`}
          sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          <Stack spacing={1.5}>
            <TextField
              label="Campaña"
              value={row.campaign}
              onChange={(e) => updateCampaign(i, 'campaign', e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Servicio realizado"
              value={row.service}
              onChange={(e) => updateCampaign(i, 'service', e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Año"
              value={row.year}
              onChange={(e) => updateCampaign(i, 'year', e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Nombre de contacto"
              value={row.contact_name}
              onChange={(e) => updateCampaign(i, 'contact_name', e.target.value)}
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Email de contacto"
                value={row.contact_email}
                onChange={(e) => updateCampaign(i, 'contact_email', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Teléfono de contacto"
                value={row.contact_phone}
                onChange={(e) => updateCampaign(i, 'contact_phone', e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            {cvProfile.campaign_experience.length > 1 && (
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  setCvProfile((p) => ({
                    ...p,
                    campaign_experience: p.campaign_experience.filter((_, j) => j !== i),
                  }))
                }
                aria-label="Eliminar campaña"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Box>
      ))}
      <Button
        startIcon={<AddIcon />}
        size="small"
        onClick={() =>
          setCvProfile((p) => ({
            ...p,
            campaign_experience: [...p.campaign_experience, emptyCampaign()],
          }))
        }
      >
        Agregar experiencia
      </Button>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => saveCv.mutate()} disabled={saveCv.isPending}>
          Guardar (borrador)
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => publishCv.mutate()}
          disabled={publishCv.isPending}
        >
          Publicar
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => {
            setCvProfile(defaultProfile())
            setCvText('')
            setCvFile(null)
            setImportCode('')
            setExtractNotice('Formulario vaciado (demostración).')
          }}
        >
          Borrar formulario
        </Button>
      </Stack>
      {(saveCv.isSuccess || publishCv.isSuccess) && (
        <Alert severity="success">
          {publishCv.isSuccess
            ? 'CV publicado. Los candidatos verán educación y campañas en su ficha.'
            : 'CV guardado en borrador.'}
        </Alert>
      )}

      <Divider />

      <Typography variant="subtitle1">Importar desde CV guardado</Typography>
      <Typography variant="body2" color="text.secondary">
        Tras guardar, use su código o el botón para cargar el borrador guardado en el formulario.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label="Código de CV guardado"
          value={importCode}
          onChange={(e) => setImportCode(e.target.value)}
          placeholder={snapshotCode || 'CV-XXXXXX'}
          fullWidth
          size="small"
        />
        <Button variant="outlined" onClick={() => importCv.mutate()} disabled={importCv.isPending}>
          Cargar al formulario
        </Button>
      </Stack>
      {importCv.isError && <Alert severity="error">No se pudo importar. Guarde primero o verifique el código.</Alert>}

      <Divider />

      <Typography variant="subtitle1">CV de ejemplo y extracción con IA</Typography>
      <Typography variant="body2" color="text.secondary">
        Descargue muestras con datos distintos (Word o PDF). Suba el archivo y use{' '}
        <strong>Extraer con IA</strong> o <strong>Extraer PDF (OCR)</strong> para rellenar el
        formulario automáticamente.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            void downloadCvSample('/consultants/me/cv/samples/word/', 'cv-ejemplo-consultor.docx')
          }
        >
          Descargar CV Word (mock)
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            void downloadCvSample(
              '/consultants/me/cv/samples/pdf/',
              'cv-ejemplo-consultor-ocr.pdf',
            )
          }
        >
          Descargar CV PDF (OCR)
        </Button>
      </Stack>

      <CvFileDropzone
        file={cvFile}
        onFileChange={(f) => {
          setCvFile(f)
          if (f?.name.toLowerCase().endsWith('.txt')) {
            const reader = new FileReader()
            reader.onload = () => setCvText(String(reader.result ?? ''))
            reader.readAsText(f)
          }
        }}
        disabled={extractCv.isPending}
      />
      <TextField
        multiline
        minRows={4}
        value={cvText}
        onChange={(e) => setCvText(e.target.value)}
        fullWidth
        size="small"
        label="Vista previa de texto (opcional)"
        placeholder="Texto del CV…"
      />
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => extractCv.mutate({})}
          disabled={extractCv.isPending || (!cvFile && !cvText.trim())}
        >
          Extraer con IA
        </Button>
        <Button
          variant="outlined"
          onClick={() => extractCv.mutate({ useOcr: true })}
          disabled={
            extractCv.isPending ||
            (!cvFile && !cvText.trim()) ||
            Boolean(cvFile && !cvFile.name.toLowerCase().endsWith('.pdf'))
          }
        >
          Extraer PDF (OCR)
        </Button>
      </Stack>
      {extractCv.isError && (
        <Alert severity="error">
          {(extractCv.error as AxiosError<{ detail?: string }>)?.response?.data?.detail ??
            'No se pudo procesar el CV. Suba un archivo (PDF, Word, TXT) o pegue texto en la vista previa.'}
        </Alert>
      )}
      {extractNotice && (
        <Alert severity={extractNotice.startsWith('Formulario') ? 'success' : 'warning'}>
          {extractNotice}
        </Alert>
      )}
    </Stack>
  )
}
