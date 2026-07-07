// Absolute URL for an in-app path, honouring the deploy base path
// (e.g. https://user.github.io/yeswhen/a/xyz on a GitHub project page).
export function absUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}${path}`
}
