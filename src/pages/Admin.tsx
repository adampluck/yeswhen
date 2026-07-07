import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import DragCalendar from '../components/DragCalendar'
import ResultsList from '../components/ResultsList'
import ShareCard from '../components/ShareCard'
import {
  type AdminEventData,
  deleteResponse,
  getEvent,
  getEventAdmin,
  updateEvent,
} from '../lib/api'
import {
  adminTokenForShare,
  editTokenFor,
  forgetAdminForShare,
  forgetAdminToken,
  rememberAdminForShare,
  rememberAdminToken,
} from '../lib/tokens'
import { absUrl } from '../lib/urls'

function voteCounts(event: AdminEventData): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of event.participants) {
    for (const d of p.dates) counts[d] = (counts[d] ?? 0) + 1
  }
  return counts
}

export default function Admin() {
  // The URL param is the *share* token for devices that own the event (kept in
  // the address bar so accidentally sharing it only ever invites people), or an
  // admin token when arriving via a saved organiser link on a new device.
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const justCreated = Boolean(location.state?.justCreated)

  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [event, setEvent] = useState<AdminEventData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDates, setEditDates] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [showOrganiserLink, setShowOrganiserLink] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      try {
        // 1. Share token that this device has admin rights for?
        const known = adminTokenForShare(token)
        if (known) {
          const data = await getEventAdmin(known)
          if (cancelled) return
          if (data) {
            setAdminToken(known)
            setEvent(data)
            rememberAdminToken(known, data.title)
            return
          }
          forgetAdminForShare(token)
        }
        // 2. An organiser link (saved via email/WhatsApp) on a fresh device?
        const asAdmin = await getEventAdmin(token)
        if (cancelled) return
        if (asAdmin) {
          rememberAdminForShare(asAdmin.share_token, token)
          rememberAdminToken(token, asAdmin.title)
          setAdminToken(token)
          setEvent(asAdmin)
          // Swap the secret out of the address bar.
          navigate(`/admin/${asAdmin.share_token}`, { replace: true, state: location.state })
          return
        }
        forgetAdminToken(token)
        // 3. Someone without admin rights following a copied address-bar URL —
        //    treat it as the invite it looks like.
        const asShare = await getEvent(token)
        if (cancelled) return
        if (asShare) {
          navigate(`/${token}`, { replace: true })
          return
        }
        setNotFound(true)
      } catch {
        if (!cancelled) {
          setError('Could not load the event. Check your connection and try again.')
        }
      }
    }
    resolve()
    return () => {
      cancelled = true
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!adminToken) return
    try {
      const data = await getEventAdmin(adminToken)
      if (data) setEvent(data)
    } catch {
      // Keep showing the last good state; refetch happens again on focus.
    }
  }, [adminToken])

  // Pick up new responses when the organiser returns to the tab.
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
          This link doesn't match any event. Double-check the URL — it must be copied
          exactly.
        </div>
        <Link to="/">← Create a new event</Link>
      </div>
    )
  }

  if (!event || !adminToken) {
    return (
      <div className="page">
        <Link className="brand" to="/">
          yes<span>when</span>
        </Link>
        {error ? <div className="error">{error}</div> : <div className="loading">Loading…</div>}
      </div>
    )
  }

  const adminUrl = absUrl(`/admin/${adminToken}`)
  const shareUrl = absUrl(`/${event.share_token}`)
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
      await updateEvent(adminToken, editTitle.trim(), editDates)
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
      await deleteResponse(adminToken, id)
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
      <div className="admin-top">
        <p className="tagline">
          Organiser view · {event.participants.length}{' '}
          {event.participants.length === 1 ? 'response' : 'responses'}
        </p>
        <button
          type="button"
          className={`btn-secondary organiser-toggle${justCreated && !showOrganiserLink ? ' attention' : ''}`}
          onClick={() => setShowOrganiserLink(!showOrganiserLink)}
        >
          🔑 Organiser link
        </button>
      </div>

      {showOrganiserLink && (
        <div className="card organiser">
          <p className="hint">
            The only way back to this page — send it to yourself and keep it private.
          </p>
          <ShareCard
            url={adminUrl}
            subject={`Organiser link — ${event.title}`}
            message={`My organiser link for “${event.title}” (keep this private):`}
          />
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card invite g-left">
        <h2>📣 Invite your people</h2>
        <ShareCard
          url={shareUrl}
          subject={`When works for you? — ${event.title}`}
          message={`When could you make “${event.title}”? Tap the dates that work for you:`}
        />
      </div>

      <div className="card g-right">
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
              <Link className="btn-secondary" to={`/${event.share_token}`}>
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
        <div className="card g-left">
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
