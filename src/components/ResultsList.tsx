import type { Participant } from '../lib/api'
import { shortDate } from '../lib/dates'

interface Props {
  dates: string[]
  participants: Participant[]
}

export default function ResultsList({ dates, participants }: Props) {
  if (participants.length === 0) {
    return <p className="hint">No responses yet — share the link! 🎈</p>
  }

  const rows = dates.map((date) => ({
    date,
    names: participants.filter((p) => p.dates.includes(date)).map((p) => p.name),
  }))
  const best = Math.max(...rows.map((r) => r.names.length))

  return (
    <div>
      {rows.map(({ date, names }) => (
        <div
          key={date}
          className={`result-row${names.length === best && best > 0 ? ' best' : ''}`}
        >
          <span className="result-date">{shortDate(date)}</span>
          <span className="result-names">{names.join(', ') || '—'}</span>
          <span className="result-count">
            {names.length}/{participants.length}
          </span>
        </div>
      ))}
    </div>
  )
}
