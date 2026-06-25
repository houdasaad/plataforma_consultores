import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { formatDateKey, formatTimeRange, parseDateKey } from '../utils/calendar'
import { MonthCalendar, type DayMeta } from './MonthCalendar'

type Slot = {
  id: number
  start_at: string
  end_at: string
  is_booked: boolean
}

type Props = {
  consultantId: string
  onBook: (slotId: number) => void
  bookingPending?: boolean
  canBook: boolean
}

export function CandidateBookingCalendar({
  consultantId,
  onBook,
  bookingPending,
  canBook,
}: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(formatDateKey(now))

  const slotsQuery = useQuery({
    queryKey: ['slots', consultantId],
    queryFn: async () => {
      const { data } = await api.get<Slot[]>('/bookings/slots/', {
        params: { consultant: consultantId },
      })
      return data
    },
    enabled: Boolean(consultantId),
  })

  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {}
    for (const s of slotsQuery.data ?? []) {
      if (s.is_booked) continue
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
      meta[key] = { freeCount: list.length }
    }
    return meta
  }, [slotsByDate])

  const availableDates = Object.keys(slotsByDate).sort()
  const effectiveDate =
    selectedDateKey && slotsByDate[selectedDateKey]?.length
      ? selectedDateKey
      : availableDates[0] ?? null

  const daySlots = effectiveDate ? (slotsByDate[effectiveDate] ?? []) : []

  return (
    <Stack spacing={2}>
      {!canBook && (
        <Alert severity="info">
          Inicie sesión como candidato para reservar un horario del calendario.
        </Alert>
      )}

      {slotsQuery.isLoading && (
        <Typography variant="body2" color="text.secondary">
          Cargando disponibilidad…
        </Typography>
      )}

      {!slotsQuery.isLoading && availableDates.length === 0 && (
        <Alert severity="warning">
          Este consultor aún no tiene horarios publicados. Vuelva más tarde o elija otro consultor.
        </Alert>
      )}

      {availableDates.length > 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Calendario de disponibilidad
            </Typography>
            <MonthCalendar
              year={year}
              monthIndex={monthIndex}
              selectedDateKey={effectiveDate}
              onMonthChange={(y, m) => {
                setYear(y)
                setMonthIndex(m)
              }}
              onSelectDate={(key) => {
                if (slotsByDate[key]?.length) setSelectedDateKey(key)
              }}
              dayMeta={dayMeta}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: { md: 280 } }}>
            {effectiveDate ? (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  {parseDateKey(effectiveDate).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Elija un horario libre:
                </Typography>
                <Stack spacing={1}>
                  {daySlots.map((s) => (
                    <Button
                      key={s.id}
                      variant="outlined"
                      fullWidth
                      disabled={!canBook || bookingPending}
                      onClick={() => onBook(s.id)}
                      sx={{
                        justifyContent: 'flex-start',
                        py: 1.25,
                        borderColor: (t) => alpha(t.palette.primary.main, 0.4),
                      }}
                    >
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatTimeRange(s.start_at, s.end_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reservar este bloque
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Seleccione un día con punto verde en el calendario.
              </Typography>
            )}
          </Paper>
        </Stack>
      )}
    </Stack>
  )
}
