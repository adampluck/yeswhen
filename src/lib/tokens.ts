// localStorage helpers: remember admin links created on this device, and the
// edit token for events this person has responded to.

const ADMIN_KEY = 'yeswhen.admin'
const EDIT_KEY = 'yeswhen.edit'

function read(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}')
  } catch {
    return {}
  }
}

function write(key: string, value: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private browsing / quota — non-fatal, editing just won't persist.
  }
}

export function rememberAdminToken(adminToken: string, title: string) {
  const all = read(ADMIN_KEY)
  all[adminToken] = title
  write(ADMIN_KEY, all)
}

export function knownAdminEvents(): Array<{ token: string; title: string }> {
  return Object.entries(read(ADMIN_KEY)).map(([token, title]) => ({ token, title }))
}

export function forgetAdminToken(adminToken: string) {
  const all = read(ADMIN_KEY)
  delete all[adminToken]
  write(ADMIN_KEY, all)
}

export interface MyResponse {
  editToken: string
  participantId: string
}

export function rememberEditToken(shareToken: string, response: MyResponse) {
  const all = read(EDIT_KEY)
  all[shareToken] = JSON.stringify(response)
  write(EDIT_KEY, all)
}

export function editTokenFor(shareToken: string): MyResponse | undefined {
  const raw = read(EDIT_KEY)[shareToken]
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.editToken === 'string' && typeof parsed.participantId === 'string') {
      return parsed
    }
  } catch {
    // fall through
  }
  return undefined
}

export function forgetEditToken(shareToken: string) {
  const all = read(EDIT_KEY)
  delete all[shareToken]
  write(EDIT_KEY, all)
}
