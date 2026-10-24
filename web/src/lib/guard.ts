import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { redirect, type ParsedLocation } from '@tanstack/react-router'
import { api, ApiError } from '@/api/client'
import type { components } from '@/api/schema'
import i18n, { changeLanguage } from '@/i18n'
import { languages, type Language } from '@/i18n/language'
import { roleHome, type Role } from './redirect'

export type Me = Omit<components['schemas']['MeDto'], 'role'> & { role: Role }

/** The signed-in user, or null when anonymous. Applies the saved language (FR-AUTH-08). */
export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async (): Promise<Me | null> => {
    try {
      const me = (await api('get', '/api/auth/me')) as Me
      const lang = me.language as Language
      if (languages.includes(lang) && i18n.language !== lang) await changeLanguage(lang)
      return me
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  },
  retry: false,
})

type GuardArgs = { context: { queryClient: QueryClient }; location: ParsedLocation }

async function signedIn({ context, location }: GuardArgs): Promise<Me> {
  const me = await context.queryClient.ensureQueryData(meQuery)
  if (!me) throw redirect({ to: '/login', search: { redirect: location.href } })
  return me
}

/** `/t` and `/s`: anonymous → login, a pending password change → /change-password, the other role → its home. */
export function requireRole(role: Role) {
  return async (args: GuardArgs) => {
    const me = await signedIn(args)
    if (me.mustChangePassword) throw redirect({ to: '/change-password' })
    if (me.role !== role) throw redirect({ href: roleHome(me.role) })
  }
}

/** `/change-password`: any signed-in user (forced or voluntary). */
export const requireSignedIn = signedIn

/** `/`: the role home, or login. */
export async function redirectHome(args: GuardArgs): Promise<never> {
  const me = await signedIn(args)
  throw redirect({ href: me.mustChangePassword ? '/change-password' : roleHome(me.role) })
}
