import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/client'
import {
  buildSlotTimes,
  formatDateKey,
  formatTimeRange,
  monthRange,
  parseDateKey,
} from '../utils/calendar'
import { MonthCalendar, type DayMeta } from './MonthCalendar'

type Slot = {
  id: number
  start_at: string
  end_at: string
  is_booked: boolean
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 h 30 min' },
]

const QUICK_TIMES = ['09:00', '11:00', '15:00', '17:00']

export function ConsultantAvailabilityCalendar() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [selectedDateKey, setSelectedDateKey] = useState(formatDateKey(now))
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(60)

  const range = monthRange(year, monthIndex)

  const slotsQuery = useQuery({
    queryKey: ['consultant-slots', range.from, range.to],
    queryFn: async () => {
      const { data } = await api.get<Slot[]>('/bookings/consultant/slots/', {
        params: { from: range.from, to: range.to },
      })
      return data
    },
  })

  const createSlot = useMutation({
    mutationFn: async (payload: { start_at: string; end_at: string }) =>
      api.post('/bookings/consultant/slots/', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['consultant-slots'] })
      void qc.invalidateQueries({ queryKey: ['consultant-portal'] })
    },
  })

  const deleteSlot = useMutation({
    mutationFn: async (id: number) => api.delete(`/bookings/consultant/slots/${id}/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['consultant-slots'] })
      void qc.invalidateQueries({ queryKey: ['consultant-portal'] })
    },
  })

  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {}
    for (const s of slotsQuery.data ?? []) {
      const key = formatDateKey(new Date(s.start_at))
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.start_at.localeCompare(b.start_at))
    }
    return map
  }, [slotsQuery.data])

  const dayMeta = useMemo(() => {
    const meta: Record<string, DayMeta> = {}
    for (const [key, list] of Object.entries(slotsByDate)) {
      meta[key] = {
        freeCount: list.filter((s) => !s.is_booked).length,
        bookedCount: list.filter((s) => s.is_booked).length,
      }
    }
    return meta
  }, [slotsByDate])

  const daySlots = slotsByDate[selectedDateKey] ?? []

  const addSlot = (timeHHmm: string, durationMin: number) => {
    const payload = buildSlotTimes(selectedDateKey, timeHHmm, durationMin)
    createSlot.mutate(payload)
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Elija un día en el calendario y agregue bloques de disponibilidad. Los candidatos verán solo los
        horarios libres al reservar un servicio.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, width: '100%' }}>
          <MonthCalendar
            year={year}
            monthIndex={monthIndex}
            selectedDateKey={selectedDateKey}
            onMonthChange={(y, m) => {
              setYear(y)
              setMonthIndex(m)
            }}
            onSelectDate={setSelectedDateKey}
            dayMeta={dayMeta}
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, flex: 1, width: '100%', minWidth: { md: 320 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {parseDateKey(selectedDateKey).toLocaleDateString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Typography>

          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Hora inicio"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                label="Duración"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                size="small"
                fullWidth
              >
                {DURATION_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => addSlot(time, duration)}
              disabled={createSlot.isPending}
            >
              Guardar disponibilidad
            </Button>
            <Typography variant="caption" color="text.secondary">
              Atajos rápidos:
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {QUICK_TIMES.map((t) => (
                <Button
                  key={t}
                  size="small"
                  variant="outlined"
                  onClick={() => addSlot(t, 60)}
                  disabled={createSlot.isPending}
                >
                  {t}
                </Button>
              ))}
            </Stack>
          </Stack>

          {createSlot.isError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              No se pudo crear el turno. Use una fecha/hora futura y duración válida.
            </Alert>
          )}

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Turnos del día
          </Typography>
          {daySlots.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Sin turnos este día. Agregue horarios arriba.
            </Typography>
          )}
          <Stack spacing={1}>
            {daySlots.map((s) => (
              <Box
                key={s.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: (t) =>
                    s.is_booked ? t.palette.action.hover : alpha(t.palette.success.main, 0.08),
                  border: 1,
                  borderColor: (t) =>
                    s.is_booked ? t.palette.warning.light : alpha(t.palette.success.main, 0.35),
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatTimeRange(s.start_at, s.end_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.is_booked ? 'Reservado por candidato' : 'Disponible'}
                  </Typography>
                </Box>
                {!s.is_booked && (
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Eliminar turno"
                    onClick={() => deleteSlot.mutate(s.id)}
                    disabled={deleteSlot.isPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  )
}
