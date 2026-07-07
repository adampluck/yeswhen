import { useMemo, useRef, useState } from 'react'
import { popDeselect, popSelect } from '../lib/sounds'
import {
  addMonths,
  currentMonth,
  daysInMonth,
  firstDayOffset,
  monthLabel,
  monthOf,
  todayStr,
  WEEKDAYS,
} from '../lib/dates'

interface Props {
  /** Currently selected dates ('YYYY-MM-DD'). */
  selected: string[]
  /** Called with the new selection after a tap or drag stroke. */
  onChange?: (dates: string[]) => void
  /** If provided, only these dates are selectable (participant mode). */
  candidates?: string[]
  /** Votes per date, for the heat tint + count badge. */
  counts?: Record<string, number>
  /** Total responders, used to scale the heat tint. */
  total?: number
  readOnly?: boolean
}

const MAX_MONTHS_AHEAD = 24

export default function DragCalendar({
  selected,
  onChange,
  candidates,
  counts,
  total = 0,
  readOnly = false,
}: Props) {
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const candidateSet = useMemo(
    () => (candidates ? new Set(candidates) : null),
    [candidates],
  )
  const today = todayStr()

  // Start on the month of the first upcoming candidate, else the current month.
  const initialMonth = useMemo(() => {
    if (candidates && candidates.length > 0) {
      const upcoming = candidates.find((d) => d >= today)
      return monthOf(upcoming ?? candidates[candidates.length - 1])
    }
    return currentMonth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [month, setMonth] = useState(initialMonth)

  // Months you can page between: from the current month (or earliest candidate,
  // so old events still render) up to two years out (or the latest candidate).
  const minMonth = useMemo(() => {
    let min = currentMonth()
    if (candidates && candidates.length > 0 && monthOf(candidates[0]) < min) {
      min = monthOf(candidates[0])
    }
    return min
  }, [candidates])
  const maxMonth = useMemo(() => {
    let max = addMonths(currentMonth(), MAX_MONTHS_AHEAD - 1)
    if (candidates && candidates.length > 0) {
      const last = monthOf(candidates[candidates.length - 1])
      if (last > max) max = last
    }
    return max
  }, [candidates])

  // Drag-to-paint state. paintValue is the inverse of the first cell touched,
  // so one stroke uniformly selects or deselects.
  const dragging = useRef(false)
  const paintValue = useRef(false)
  const stroke = useRef<Set<string>>(new Set())

  const isEnabled = (date: string) => {
    if (readOnly) return false
    if (candidateSet) return candidateSet.has(date)
    return date >= today
  }

  const applyPaint = (date: string) => {
    if (!isEnabled(date) || stroke.current.has(date)) return
    if (paintValue.current) popSelect(stroke.current.size)
    else popDeselect(stroke.current.size)
    stroke.current.add(date)
    const next = new Set(selectedSet)
    // Merge in everything painted so far this stroke (selectedSet from the
    // last render may lag the latest onChange during a fast drag).
    for (const d of stroke.current) {
      if (paintValue.current) next.add(d)
      else next.delete(d)
    }
    onChange?.(Array.from(next).sort())
  }

  const dateFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)
    const cell = el?.closest<HTMLElement>('[data-date]')
    return cell?.dataset.date ?? null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const date = (e.target as HTMLElement).closest<HTMLElement>('[data-date]')
      ?.dataset.date
    if (!date || !isEnabled(date)) return
    dragging.current = true
    paintValue.current = !selectedSet.has(date)
    stroke.current = new Set()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    applyPaint(date)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const date = dateFromPoint(e.clientX, e.clientY)
    if (date) applyPaint(date)
  }

  const endStroke = () => {
    dragging.current = false
    stroke.current = new Set()
  }

  const offset = firstDayOffset(month)
  const days = daysInMonth(month)

  const heatStep = (date: string): number => {
    const c = counts?.[date] ?? 0
    if (c === 0 || total === 0) return 0
    return Math.min(3, Math.max(1, Math.ceil((c / total) * 3)))
  }

  return (
    <div className="cal">
      <div className="cal-header">
        <button
          type="button"
          className="cal-nav"
          aria-label="Previous month"
          disabled={month <= minMonth}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          ‹
        </button>
        <span className="month">{monthLabel(month)}</span>
        <button
          type="button"
          className="cal-nav"
          aria-label="Next month"
          disabled={month >= maxMonth}
          onClick={() => setMonth(addMonths(month, 1))}
        >
          ›
        </button>
      </div>
      <div
        className={`cal-grid${readOnly ? '' : ' interactive'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      >
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`pad-${i}`} className="cal-day empty" />
        ))}
        {days.map((date) => {
          const enabled = isEnabled(date)
          const isSelected = selectedSet.has(date)
          const isCandidate = candidateSet?.has(date) ?? false
          const heat = heatStep(date)
          const count = counts?.[date] ?? 0
          const classes = ['cal-day']
          if (!enabled && !readOnly) classes.push('disabled')
          if (readOnly && !isCandidate && candidateSet) classes.push('disabled')
          if (isCandidate) classes.push('candidate')
          if (isSelected) classes.push('selected')
          if (heat > 0) classes.push(`heat-${heat}`)
          return (
            <div key={date} className={classes.join(' ')} data-date={enabled ? date : undefined}>
              {Number(date.slice(8))}
              {count > 0 && (isCandidate || !candidateSet) && (
                <span className="cal-count">{count}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
