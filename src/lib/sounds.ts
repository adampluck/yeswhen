// Tiny synthesized UI sounds via Web Audio — no files, a few ms each, gentle.
// All triggers happen inside user gestures, so autoplay policies are satisfied.

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq: number, opts: { to?: number; dur?: number; gain?: number; at?: number } = {}) {
  const c = audio()
  if (!c) return
  const { to = freq * 1.4, dur = 0.07, gain = 0.08, at = 0 } = opts
  try {
    const t = c.currentTime + at
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(to, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.01)
  } catch {
    // Sound is decoration; never let it break the UI.
  }
}

/** Soft rising pop when a date is painted on. `step` raises the pitch a little
 *  for each consecutive day in one drag stroke, so long strokes trill upward. */
export function popSelect(step = 0) {
  blip(440 * Math.pow(1.06, Math.min(step, 12)))
}

/** Slightly lower, falling pop when a date is painted off. */
export function popDeselect(step = 0) {
  blip(330 * Math.pow(1.04, Math.min(step, 12)), { to: 240 })
}

/** Quiet tick for small confirmations (copy, toggle). */
export function tick() {
  blip(620, { dur: 0.05, gain: 0.06 })
}

/** Gentle three-note rise for the big happy moments (created / saved). */
export function chime() {
  blip(523, { to: 523, dur: 0.09 })
  blip(659, { to: 659, dur: 0.09, at: 0.09 })
  blip(784, { to: 784, dur: 0.14, at: 0.18, gain: 0.07 })
}
