export type Role = 'tutor' | 'student'

const HOME: Record<Role, string> = { tutor: '/t', student: '/s' }
const BASE = 'http://keemese.invalid'

export const roleHome = (role: Role) => HOME[role]

/** The `?redirect=` target if it is a same-origin path inside the role's area (IA "Deep links"), else the role home. */
export function safeRedirect(target: string | null | undefined, role: Role): string {
  const home = roleHome(role)
  if (!target?.startsWith('/') || target.startsWith('//') || target.includes('\\')) return home
  let url: URL
  try {
    url = new URL(target, BASE)
  } catch {
    return home
  }
  // The parser drops tabs and newlines and resolves dot segments, so check what it made of the input.
  if (url.origin !== BASE) return home
  const { pathname } = url
  const allowed =
    pathname === home || pathname.startsWith(`${home}/`) || pathname === '/change-password'
  return allowed ? pathname + url.search + url.hash : home
}
