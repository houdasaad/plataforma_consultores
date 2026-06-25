const WEEKDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function monthRange(year: number, monthIndex: number): { from: string; to: string } {
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

export function buildSlotTimes(
  dateKey: string,
  timeHHmm: string,
  durationMinutes: number,
): { start_at: string; end_at: string } {
  const [h, m] = timeHHmm.split(':').map(Number)
  const start = parseDateKey(dateKey)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return { start_at: start.toISOString(), end_at: end.toISOString() }
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

export function getCalendarCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatDateKey(new Date(year, monthIndex, d)))
  }
  return cells
}

export function isPastDateKey(dateKey: string): boolean {
  const today = formatDateKey(new Date())
  return dateKey < today
}

export { WEEKDAYS_ES }
