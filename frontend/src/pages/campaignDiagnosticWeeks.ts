export type WeekProgressItem = {
  id: string
  text: string
  phaseName: string
}

export type WeekProgressBucket = {
  index: number
  label: string
  rangeLabel: string
  startIso: string
  endIso: string
  items: WeekProgressItem[]
}

type Phase = { name: string; start: string; end: string; tasks: string[] }

type Cronograma = {
  phases?: Phase[]
  election_date?: string
  start_date?: string
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

/** Monday as first day of week (common for campaign planning). */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - offset)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function phaseOverlapsWeek(
  phaseStart: Date,
  phaseEnd: Date,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  return phaseEnd >= weekStart && phaseStart <= weekEnd
}

/**
 * Builds calendar weeks from campaign start to election, then assigns each phase's tasks
 * to overlapping weeks (round-robin) so work is spread across weeks the phase spans.
 */
export function buildWeeklyProgress(cronograma: Cronograma | undefined): WeekProgressBucket[] {
  if (!cronograma?.phases?.length) return []

  const phases = cronograma.phases
  let rangeStart: Date | null = null
  let rangeEnd: Date | null = null

  if (cronograma.start_date) {
    rangeStart = parseLocalDate(cronograma.start_date)
  }
  if (cronograma.election_date) {
    rangeEnd = parseLocalDate(cronograma.election_date)
  }

  for (const ph of phases) {
    const ps = parseLocalDate(ph.start)
    const pe = parseLocalDate(ph.end)
    if (!rangeStart || ps < rangeStart) rangeStart = ps
    if (!rangeEnd || pe > rangeEnd) rangeEnd = pe
  }

  if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return []

  const firstMonday = startOfWeekMonday(rangeStart)
  const weeks: { start: Date; end: Date }[] = []
  let cursor = new Date(firstMonday)
  while (cursor <= rangeEnd) {
    const weekStart = maxDate(cursor, rangeStart)
    const weekEndCandidate = addDays(cursor, 6)
    const weekEnd = minDate(weekEndCandidate, rangeEnd)
    if (weekStart <= weekEnd) {
      weeks.push({ start: weekStart, end: weekEnd })
    }
    cursor = addDays(cursor, 7)
  }

  if (!weeks.length) return []

  const itemsByWeek: WeekProgressItem[][] = weeks.map(() => [])

  for (const ph of phases) {
    const phaseStart = parseLocalDate(ph.start)
    const phaseEnd = parseLocalDate(ph.end)
    const tasks = ph.tasks ?? []
    const overlapIndices: number[] = []
    for (let i = 0; i < weeks.length; i++) {
      const { start: ws, end: we } = weeks[i]!
      if (phaseOverlapsWeek(phaseStart, phaseEnd, ws, we)) overlapIndices.push(i)
    }
    if (!overlapIndices.length || !tasks.length) continue

    tasks.forEach((text, ti) => {
      const wi = overlapIndices[ti % overlapIndices.length]!
      const id = `${wi}|${ph.name}|${ti}|${encodeURIComponent(text.slice(0, 120))}`
      itemsByWeek[wi]!.push({ id, text, phaseName: ph.name })
    })
  }

  return weeks.map((w, index) => ({
    index,
    label: `Semana ${index + 1}`,
    rangeLabel: `${formatShort(w.start)} – ${formatShort(w.end)}`,
    startIso: toIsoDate(w.start),
    endIso: toIsoDate(w.end),
    items: itemsByWeek[index] ?? [],
  }))
}
