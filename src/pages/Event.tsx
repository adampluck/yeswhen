import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DragCalendar from '../components/DragCalendar'
import ResultsList from '../components/ResultsList'
import { addResponse, type EventData, getEvent, updateResponse } from '../lib/api'
import { chime } from '../lib/sounds'
import { editTokenFor, forgetEditToken, rememberEditToken } from '../lib/tokens'

function voteCounts(event: EventData): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of event.participants) {
    for (const d of p.dates) counts[d] = (counts[d] ?? 0) + 1
  }
  return counts
}

export default function Event() {
  const { token = '' } = useParams()

  const [event, setEvent] = useState<EventData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mine, setMine] = useState(() => editTokenFor(token))

  const load = useCallback(async () => {
    try {
      const data = await getEvent(token)
      if (!data) setNotFound(true)
      else setEvent(data)
      return data
    } catch {
      setError('Could not load the event. Check your connection and try again.')
      return null
    }
  }, [token])

  // Initial load; if this device responded before, pre-fill their answer.
  useEffect(() => {
    load().then((data) => {
      if (!data || !mine) return
      const me = data.participants.find((p) => p.id === mine.participantId)
      if (me) {
        setName(me.name)
        setDates(me.dates)
        setSaved(true)
      } else {
        // Our response was removed by the organiser.
        forgetEditToken(token)
        setMine(undefined)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh results when returning to the tab.
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mine) {
        await updateResponse(mine.editToken, name.trim(), dates)
      } else {
        const { edit_token, id } = await addResponse(token, name.trim(), dates)
        const response = { editToken: edit_token, participantId: id }
        rememberEditToken(token, response)
        setMine(response)
      }
      chime()
      setSaved(true)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (mine && msg === 'Not found') {
        // Our response was deleted by the organiser; start fresh.
        forgetEditToken(token)
        setMine(undefined)
        setError('Your previous response was removed — you can submit a new one.')
      } else {
        setError(msg || 'Something went wrong — please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <Link className="brand" to="/">
          yes<span>when</span>
        </Link>
        <div className="error">
          This link doesn't match any event. Double-check the URL — it must be copied
          exactly.
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page">
        <Link className="brand" to="/">
          yes<span>when</span>
        </Link>
        {error ? <div className="error">{error}</div> : <div className="loading">Loading…</div>}
      </div>
    )
  }

  const counts = voteCounts(event)

  return (
    <div className="page">
      <Link className="brand" to="/">
        yes<span>when</span>
      </Link>
      <h1>{event.title}</h1>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Sam"
          value={name}
          maxLength={50}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
        />
      </div>

      <div className="card">
        <label>When are you free?</label>
        <DragCalendar
          selected={dates}
          onChange={(d) => {
            setDates(d)
            setSaved(false)
          }}
          candidates={event.dates}
          counts={counts}
          total={event.participants.length}
        />
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={busy || name.trim() === '' || saved}
        onClick={submit}
      >
        {busy
          ? 'Saving…'
          : saved
            ? '✓ Saved'
            : mine
              ? 'Update my availability'
              : 'Send my availability'}
      </button>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Who's free when</h2>
        <ResultsList dates={event.dates} participants={event.participants} />
      </div>
    </div>
  )
}
