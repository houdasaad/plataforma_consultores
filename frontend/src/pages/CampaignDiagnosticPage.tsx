import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { buildWeeklyProgress, type WeekProgressBucket } from './campaignDiagnosticWeeks'

type Scope = 'national' | 'regional' | 'local'

type Phase = { name: string; start: string; end: string; tasks: string[] }

type RunResult = {
  id: number
  cronograma: {
    phases?: Phase[]
    days_total?: number
    election_date?: string
    start_date?: string
    country_code?: string
    scope?: string
    district?: string
    llm_notes?: string
  }
  llm_narrative: string
  llm_mode: string
  retrieval_scores: { id: number; score: number; method: string }[]
}

const AVANCES_STORAGE_PREFIX = 'cd_avances_checks:v1:'

function CampaignAvancesPanel({ runId, weeks }: { runId: number; weeks: WeekProgressBucket[] }) {
  const [weekTab, setWeekTab] = useState(0)
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${AVANCES_STORAGE_PREFIX}${runId}`)
      setChecks(raw ? (JSON.parse(raw) as Record<string, boolean>) : {})
    } catch {
      setChecks({})
    }
    setWeekTab(0)
  }, [runId])

  useEffect(() => {
    if (weekTab >= weeks.length) setWeekTab(0)
  }, [weekTab, weeks.length])

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      try {
        localStorage.setItem(`${AVANCES_STORAGE_PREFIX}${runId}`, JSON.stringify(next))
      } catch {
        /* ignore quota / private mode */
      }
    },
    [runId],
  )

  const toggle = (itemId: string) => {
    setChecks((prev) => {
      const nextDone = !prev[itemId]
      const next = { ...prev }
      if (nextDone) next[itemId] = true
      else delete next[itemId]
      persist(next)
      return next
    })
  }

  if (!weeks.length) {
    return (
      <Alert severity="warning" sx={{ mt: 1 }}>
        No hay semanas derivadas del cronograma. Genera de nuevo el diagnóstico o revisa las fechas de las fases.
      </Alert>
    )
  }

  const safeWeek = Math.min(weekTab, weeks.length - 1)
  const w = weeks[safeWeek]!

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Lista de tareas por semana (calendario lunes–domingo). Las casillas se guardan en este navegador para este run
        (#{runId}).
      </Typography>
      <Tabs
        value={safeWeek}
        onChange={(_, v) => setWeekTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {weeks.map((wk) => (
          <Tab
            key={wk.index}
            label={
              <Stack spacing={0.25} sx={{ py: 0.25, alignItems: 'center' }}>
                <Typography variant="button" component="span" sx={{ fontWeight: 700 }}>
                  {wk.label}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1.15, maxWidth: 140, textAlign: 'center', display: 'block' }}
                >
                  {wk.rangeLabel}
                </Typography>
              </Stack>
            }
            sx={{ minHeight: 72 }}
          />
        ))}
      </Tabs>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          {w.label} · {w.rangeLabel}
        </Typography>
        {!w.items.length ? (
          <Typography variant="body2" color="text.secondary">
            No hay tareas asignadas a esta semana en la distribución automática; revisa la pestaña Cronograma por fases.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {w.items.map((it) => (
              <FormControlLabel
                key={it.id}
                control={
                  <Checkbox checked={Boolean(checks[it.id])} onChange={() => toggle(it.id)} size="small" />
                }
                label={
                  <Box>
                    <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                      {it.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fase: {it.phaseName}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', ml: 0, mr: 0, gap: 1 }}
              />
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}

const COUNTRIES = [
  { code: 'MX', label: 'México' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },
  { code: 'PE', label: 'Perú' },
  { code: 'UY', label: 'Uruguay' },
]

export function CampaignDiagnosticPage() {
  const [country, setCountry] = useState('MX')
  const [scope, setScope] = useState<Scope>('national')
  const [district, setDistrict] = useState('')
  const [electionDate, setElectionDate] = useState('')
  const [resultTab, setResultTab] = useState(0)

  const runsQuery = useQuery({
    queryKey: ['campaign-runs'],
    queryFn: async () => {
      const { data } = await api.get<RunResult[]>('/campaign-diagnostic/runs/')
      return data
    },
  })

  const analyze = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<RunResult>('/campaign-diagnostic/analyze/', {
        country_code: country,
        scope,
        election_date: electionDate,
        district: scope === 'local' ? district : '',
      })
      return data
    },
    onSuccess: () => {
      void runsQuery.refetch()
    },
  })

  const latest = useMemo(() => analyze.data ?? runsQuery.data?.[0], [analyze.data, runsQuery.data])

  const weekBuckets = useMemo(() => buildWeeklyProgress(latest?.cronograma), [latest?.cronograma])

  useEffect(() => {
    setResultTab(0)
  }, [latest?.id])

  const minDate = useMemo(() => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return t.toISOString().slice(0, 10)
  }, [])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>
          Inteligencia de campaña
        </Typography>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
        >
          Diagnóstico de campaña
          <PsychologyRoundedIcon color="primary" />
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '72ch' }}>
          Pantalla de candidato: elige país, ámbito (nacional / regional / local), fecha de elección y, si aplica,
          distrito. El sistema recupera fragmentos de una base de conocimiento (búsqueda semántica con embeddings si
          configuraste <strong>OPENAI_API_KEY</strong>) y, cuando hay clave, un LLM refina el cronograma entre hoy y la
          fecha del comicio.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ borderRadius: 3 }}>
        Sin API key de OpenAI, el cronograma se genera con reglas proporcionales y texto explicativo; la recuperación
        usa puntuación por palabras clave. Con API key, se activan embeddings y refinamiento JSON del modelo.
      </Alert>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
        }}
      >
        <Box component="form" onSubmit={(e) => { e.preventDefault(); analyze.mutate() }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField select label="País" value={country} onChange={(e) => setCountry(e.target.value)} fullWidth>
              {COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.label} ({c.code})
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Ámbito de campaña" value={scope} onChange={(e) => setScope(e.target.value as Scope)} fullWidth>
              <MenuItem value="national">Nacional</MenuItem>
              <MenuItem value="regional">Regional</MenuItem>
              <MenuItem value="local">Local</MenuItem>
            </TextField>
            <TextField
              label="Fecha de la elección"
              type="date"
              value={electionDate}
              onChange={(e) => setElectionDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: minDate },
              }}
              fullWidth
              required
            />
          </Stack>
          {scope === 'local' && (
            <TextField
              label="Distrito / municipio / comuna"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
              fullWidth
              placeholder="Ej. CDMX · Comuna 14"
            />
          )}
          <Button type="submit" variant="contained" size="large" disabled={analyze.isPending || !electionDate}>
            Generar cronograma
          </Button>
          {analyze.isError && (
            <Alert severity="error">No se pudo generar. Revisa fechas (debe ser futura) y distrito en campañas locales.</Alert>
          )}
        </Stack>
        </Box>
      </Paper>

      {latest && (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 1)}` }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <EventNoteRoundedIcon color="primary" />
              <Typography variant="h6">Cronograma sugerido</Typography>
              <Typography variant="caption" color="text.secondary">
                Run #{latest.id} · {latest.llm_mode}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {latest.llm_narrative}
            </Typography>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">
              Recuperación (documentos):{' '}
              {(latest.retrieval_scores ?? [])
                .map((s) => `${s.id}(${s.method}:${s.score.toFixed(2)})`)
                .join(' · ') || '—'}
            </Typography>

            <Tabs
              value={resultTab}
              onChange={(_, v) => setResultTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<EventNoteRoundedIcon />} iconPosition="start" label="Cronograma" />
              <Tab icon={<TrendingUpRoundedIcon />} iconPosition="start" label="Avances" />
            </Tabs>

            {resultTab === 0 && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                {(latest.cronograma?.phases ?? []).map((ph) => (
                  <Box
                    key={`${ph.name}-${ph.start}`}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                      border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {ph.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {ph.start} → {ph.end}
                    </Typography>
                    <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                      {(ph.tasks ?? []).map((t) => (
                        <Typography key={t} component="li" variant="body2">
                          {t}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}

            {resultTab === 1 && <CampaignAvancesPanel runId={latest.id} weeks={weekBuckets} />}
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
