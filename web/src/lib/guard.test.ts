import { QueryClient } from '@tanstack/react-query'
import { isRedirect, type ParsedLocation } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ default: { language: 'vi' }, changeLanguage: vi.fn() }))
const { meQuery, redirectHome, requireRole, requireSignedIn } = await import('./guard')

const location = { href: '/t/students?q=an' } as ParsedLocation
function args(me: unknown) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(meQuery.queryKey, me as never)
  return { context: { queryClient }, location }
}
const user = (role: string, mustChangePassword = false) => ({
  id: 'x',
  role,
  displayName: 'Phạm Văn Nam',
  language: 'vi',
  mustChangePassword,
})

async function redirectOf(run: Promise<unknown>) {
  const thrown: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  )
  if (thrown === undefined) return undefined
  if (!isRedirect(thrown)) throw new Error('not a redirect', { cause: thrown })
  const { to, href, search } = thrown.options as { to?: string; href?: string; search?: unknown }
  return { to: to ?? href, search }
}

describe('requireRole', () => {
  it('sends an anonymous visitor to /login with the page as redirect', async () => {
    expect(await redirectOf(requireRole('tutor')(args(null)))).toEqual({
      to: '/login',
      search: { redirect: '/t/students?q=an' },
    })
  })

  it.each(['tutor', 'student'] as const)(
    'sends a pending password change (%s) there',
    async (role) => {
      expect((await redirectOf(requireRole(role)(args(user(role, true)))))?.to).toBe(
        '/change-password',
      )
    },
  )

  it.each([
    ['tutor', 'student', '/s'],
    ['student', 'tutor', '/t'],
  ] as const)('sends a %s user away from the %s area to %s', async (area, role, home) => {
    expect((await redirectOf(requireRole(area)(args(user(role)))))?.to).toBe(home)
  })

  it.each(['tutor', 'student'] as const)('lets a %s into their own area', async (role) => {
    expect(await redirectOf(requireRole(role)(args(user(role))))).toBeUndefined()
  })
})

describe('redirectHome and requireSignedIn', () => {
  it.each([
    [null, '/login'],
    [user('tutor'), '/t'],
    [user('student'), '/s'],
    [user('student', true), '/change-password'],
  ])('/ with %o → %s', async (me, to) => {
    expect((await redirectOf(redirectHome(args(me))))?.to).toBe(to)
  })

  it('lets any signed-in user open /change-password, not an anonymous one', async () => {
    expect(await redirectOf(requireSignedIn(args(user('student'))))).toBeUndefined()
    expect((await redirectOf(requireSignedIn(args(null))))?.to).toBe('/login')
  })
})
