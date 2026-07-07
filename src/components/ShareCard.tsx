import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { tick } from '../lib/sounds'

interface Props {
  url: string
  /** Message wrapped around the link in email/WhatsApp/share. */
  message: string
  subject: string
}

const icon = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const IconCopy = () => (
  <svg {...icon}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IconCheck = () => (
  <svg {...icon}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconChat = () => (
  <svg {...icon}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

const IconMail = () => (
  <svg {...icon}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const IconQr = () => (
  <svg {...icon}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM21 14v1M14 21h1M18 18h3v3h-3z" />
  </svg>
)

const IconShare = () => (
  <svg {...icon}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
)

export default function ShareCard({ url, message, subject }: Props) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const text = `${message}\n${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(text)}`

  useEffect(() => {
    if (showQr && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 2 }).catch(() => {})
    }
  }, [showQr, url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Older browsers / non-secure contexts.
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    tick()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    navigator.share?.({ title: subject, text: message, url }).catch(() => {})
  }

  return (
    <>
      <span className="link-box">{url}</span>
      <div className="share-row">
        <button type="button" className="btn-share" onClick={copy}>
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a className="btn-share" href={whatsapp} target="_blank" rel="noreferrer">
          <IconChat />
          WhatsApp
        </a>
        <a className="btn-share" href={mailto}>
          <IconMail />
          Email
        </a>
        <button type="button" className="btn-share" onClick={() => setShowQr(!showQr)}>
          <IconQr />
          QR
        </button>
        {'share' in navigator && (
          <button type="button" className="btn-share" onClick={share}>
            <IconShare />
            Share
          </button>
        )}
      </div>
      {showQr && (
        <div className="qr-wrap">
          <canvas ref={canvasRef} />
        </div>
      )}
    </>
  )
}
