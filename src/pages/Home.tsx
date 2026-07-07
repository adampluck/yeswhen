import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DragCalendar from '../components/DragCalendar'
import { addResponse, createEvent } from '../lib/api'
import { chime } from '../lib/sounds'
import {
  knownAdminEvents,
  rememberAdminForShare,
  rememberAdminToken,
  rememberEditToken,
} from '../lib/tokens'

export default function Home() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const myEvents = knownAdminEvents()

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const { admin_token, share_token } = await createEvent(title.trim(), dates)
      rememberAdminToken(admin_token, title.trim())
      rememberAdminForShare(share_token, admin_token)
      // If the organiser gave their name, count them in for the dates they
      // painted — they can adjust via the invite page any time.
      if (name.trim() !== '') {
        try {
          const { edit_token, id } = await addResponse(share_token, name.trim(), dates)
          rememberEditToken(share_token, { editToken: edit_token, participantId: id })
        } catch {
          // Non-fatal: the event exists; they can add themselves later.
        }
      }
      chime()
      // Route by share token — the admin secret never sits in the address bar.
      navigate(`/admin/${share_token}`, { state: { justCreated: true } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <Link className="brand" to="/">
        yes<span>when</span>
      </Link>
      <h1>Find a date that works for everyone</h1>
      <p className="tagline">No sign-up. Pick dates, share a link, done.</p>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <label htmlFor="title">What's the occasion?</label>
        <input
          id="title"
          type="text"
          placeholder="e.g. Birthday dinner, five-a-side, book club…"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="card">
        <label>Which dates could work?</label>
        <DragCalendar selected={dates} onChange={setDates} />
        {dates.length > 0 && (
          <p className="cal-footer">
            {dates.length} date{dates.length === 1 ? '' : 's'} selected
          </p>
        )}
      </div>

      <div className="card">
        <label htmlFor="name">Your name (optional)</label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Adam"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={busy || title.trim() === '' || dates.length === 0}
        onClick={create}
      >
        {busy ? 'Creating…' : 'Create event'}
      </button>

      {myEvents.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2>Your events on this device</h2>
          {myEvents.map(({ token, title: t }) => (
            <div key={token} className="participant-row">
              <Link to={`/admin/${token}`}>{t || 'Untitled event'}</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
