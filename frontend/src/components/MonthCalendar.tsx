import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  formatDateKey,
  formatMonthYear,
  getCalendarCells,
  isPastDateKey,
  parseDateKey,
  WEEKDAYS_ES,
} from '../utils/calendar'

export type DayMeta = {
  freeCount?: number
  bookedCount?: number
}

type Props = {
  year: number
  monthIndex: number
  selectedDateKey: string | null
  onMonthChange: (year: number, monthIndex: number) => void
  onSelectDate: (dateKey: string) => void
  dayMeta?: Record<string, DayMeta>
  disablePast?: boolean
}

export function MonthCalendar({
  year,
  monthIndex,
  selectedDateKey,
  onMonthChange,
  onSelectDate,
  dayMeta = {},
  disablePast = true,
}: Props) {
  const cells = getCalendarCells(year, monthIndex)

  const prevMonth = () => {
    if (monthIndex === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, monthIndex - 1)
  }
  const nextMonth = () => {
    if (monthIndex === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, monthIndex + 1)
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <IconButton onClick={prevMonth} aria-label="Mes anterior" size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
          {formatMonthYear(year, monthIndex)}
        </Typography>
        <IconButton onClick={nextMonth} aria-label="Mes siguiente" size="small">
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          textAlign: 'center',
        }}
      >
        {WEEKDAYS_ES.map((wd) => (
          <Typography key={wd} variant="caption" color="text.secondary" sx={{ fontWeight: 600, py: 0.5 }}>
            {wd}
          </Typography>
        ))}
        {cells.map((dateKey, idx) => {
          if (!dateKey) {
            return <Box key={`empty-${idx}`} sx={{ minHeight: 44 }} />
          }
          const past = disablePast && isPastDateKey(dateKey)
          const selected = selectedDateKey === dateKey
          const meta = dayMeta[dateKey]
          const free = meta?.freeCount ?? 0
          const booked = meta?.bookedCount ?? 0
          const dayNum = parseDateKey(dateKey).getDate()

          return (
            <Box
              key={dateKey}
              component="button"
              type="button"
              disabled={past}
              onClick={() => onSelectDate(dateKey)}
              sx={{
                minHeight: 44,
                border: 'none',
                borderRadius: 2,
                cursor: past ? 'not-allowed' : 'pointer',
                bgcolor: (t) =>
                  selected
                    ? alpha(t.palette.primary.main, 0.2)
                    : past
                      ? alpha(t.palette.action.disabled, 0.08)
                      : 'transparent',
                color: past ? 'text.disabled' : 'text.primary',
                '&:hover': past
                  ? {}
                  : {
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                    },
                p: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 500 }}>
                {dayNum}
              </Typography>
              {(free > 0 || booked > 0) && (
                <Stack direction="row" spacing={0.25} sx={{ mt: 0.25, justifyContent: 'center' }}>
                  {free > 0 && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                  )}
                  {booked > 0 && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '6px',
                        bgcolor: 'warning.main',
                      }}
                    />
                  )}
                </Stack>
              )}
            </Box>
          )
        })}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        <Chip size="small" label="Libre" sx={{ bgcolor: (t) => alpha(t.palette.success.main, 0.15) }} />
        <Chip size="small" label="Reservado" sx={{ bgcolor: (t) => alpha(t.palette.warning.main, 0.15) }} />
      </Stack>
    </Box>
  )
}

export function defaultSelectedDateKey(): string {
  return formatDateKey(new Date())
}
