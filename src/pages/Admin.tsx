import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import DragCalendar from '../components/DragCalendar'
import ResultsList from '../components/ResultsList'
import ShareCard from '../components/ShareCard'
import {
  type AdminEventData,
  deleteResponse,
  getEventAdmin,
  updateEvent,
} from '../lib/api'
import { editTokenFor, forgetAdminToken, rememberAdminToken } from '../lib/tokens'
import { absUrl } from '../lib/urls'

function voteCounts(event: AdminEventData): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of event.participants) {
    for (const d of p.dates) counts[d] = (counts[d] ?? 0) + 1
  }
  return counts
}

export default function Admin() {
  const { token = '' } = useParams()
  const justCreated = Boolean(useLocation().state?.justCreated)

  const [event, setEvent] = useState<AdminEventData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDates, setEditDates] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [showAdminLink, setShowAdminLink] = useState(justCreated)

  const load = useCallback(async () => {
    try {
      const data = await getEventAdmin(token)
      if (!data) {
        setNotFound(true)
        forgetAdminToken(token)
      } else {
        setEvent(data)
        rememberAdminToken(token, data.title)
      }
    } catch {
      setError('Could not load the event. Check your connection and try again.')
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  // Pick up new responses when the admin returns to the tab.
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  if (notFound) {
    return (
      <div className="page">
        <Link className="brand" to="/">
          yes<span>when</span>
        </Link>
        <div className="error">
          This admin link doesn't match any event. Double-check the URL — it must be
          copied exactly.
        </div>
        <Link to="/">← Create a new event</Link>
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

  const adminUrl = absUrl(`/a/${token}`)
  const shareUrl = absUrl(`/e/${event.share_token}`)
  const counts = voteCounts(event)

  const startEditing = () => {
    setEditTitle(event.title)
    setEditDates(event.dates)
    setEditing(true)
  }

  const saveEdits = async () => {
    setBusy(true)
    setError(null)
    try {
      await updateEvent(token, editTitle.trim(), editDates)
      setEditing(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  const removeParticipant = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name}'s response?`)) return
    try {
      await deleteResponse(token, id)
      await load()
    } catch {
      setError('Could not remove that response.')
    }
  }

  return (
    <div className="page">
      <Link className="brand" to="/">
        yes<span>when</span>
      </Link>
      <h1>{event.title}</h1>
      <p className="tagline">
        Organiser view · {event.participants.length}{' '}
        {event.participants.length === 1 ? 'response' : 'responses'}
      </p>

      {error && <div className="error">{error}</div>}

      <div className="card invite">
        <h2>📣 Invite your people</h2>
        <ShareCard
          url={shareUrl}
          subject={`When works for you? — ${event.title}`}
          message={`When could you make “${event.title}”? Tap the dates that work for you:`}
        />
      </div>

      {showAdminLink ? (
        <div className={`card organiser${justCreated ? ' fresh' : ''}`}>
          <h2>🔑 Your organiser link</h2>
          <p className="hint">
            The only way back to this page — send it to yourself and keep it private.
          </p>
          <ShareCard
            url={adminUrl}
            subject={`Organiser link — ${event.title}`}
            message={`My organiser link for “${event.title}” (keep this private):`}
          />
          {!justCreated && (
            <button
              type="button"
              className="btn-ghost organiser-toggle"
              onClick={() => setShowAdminLink(false)}
            >
              Hide
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="btn-ghost organiser-toggle"
          onClick={() => setShowAdminLink(true)}
        >
          🔑 Save your organiser link
        </button>
      )}

      <div className="card">
        <h2>Availability so far</h2>
        {editing ? (
          <>
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              maxLength={200}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <p className="hint" style={{ marginTop: 12 }}>
              Removing a date removes its votes.
            </p>
            <DragCalendar selected={editDates} onChange={setEditDates} />
            <div className="share-row">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || editTitle.trim() === '' || editDates.length === 0}
                onClick={saveEdits}
              >
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <DragCalendar
              selected={[]}
              candidates={event.dates}
              counts={counts}
              total={event.participants.length}
              readOnly
            />
            <div style={{ marginTop: 16 }}>
              <ResultsList dates={event.dates} participants={event.participants} />
            </div>
            <div className="share-row">
              <Link className="btn-secondary" to={`/e/${event.share_token}`}>
                {editTokenFor(event.share_token)
                  ? 'Edit your availability'
                  : 'Add your availability'}
              </Link>
              <button type="button" className="btn-secondary" onClick={startEditing}>
                Edit title or dates
              </button>
            </div>
          </>
        )}
      </div>

      {event.participants.length > 0 && !editing && (
        <div className="card">
          <h2>Responses</h2>
          {event.participants.map((p) => (
            <div key={p.id} className="participant-row">
              <span className="name">{p.name}</span>
              <span className="meta">
                {p.dates.length} date{p.dates.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className="btn-ghost danger"
                onClick={() => removeParticipant(p.id, p.name)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
