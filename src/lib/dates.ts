// Date helpers. Dates are 'YYYY-MM-DD' strings built from *local* date parts —
// never toISOString(), which shifts across timezones.

export function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

/** First day of the month containing the given date string. */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

export function currentMonth(): string {
  return monthOf(todayStr())
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

/** Days of a 'YYYY-MM' month as date strings. */
export function daysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** Column offset (0-6) of the month's first day, weeks starting Monday. */
export function firstDayOffset(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return (new Date(y, m - 1, 1).getDay() + 6) % 7
}

/** 'Mon 12 Jan' style label for result rows. */
export function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
