import { redirect } from '@tanstack/react-router'

// shortcut: placeholder guard with no session at all (no fake auth); M1 checks the real session and role.
export function requireSession(): never {
  throw redirect({ to: '/login' })
}
