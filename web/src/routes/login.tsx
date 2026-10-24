import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { LoginForm } from '@/features/auth/LoginForm'
import { meQuery, type Me } from '@/lib/guard'
import { safeRedirect } from '@/lib/redirect'

const target = (me: Me, redirectTo: string | undefined) =>
  me.mustChangePassword ? '/change-password' : safeRedirect(redirectTo, me.role)

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: async ({ context, search }) => {
    // Already signed in: skip the form. If the API is unreachable, show the form anyway.
    const me = await context.queryClient.ensureQueryData(meQuery).catch(() => null)
    if (me) throw redirect({ href: target(me, search.redirect) })
  },
  component: Login,
})

function Login() {
  const { t } = useTranslation()
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()
  return (
    <AuthLayout title={t('login.title')} subtitle={t('login.subtitle')}>
      <LoginForm onSignedIn={(me) => navigate({ href: target(me, redirectTo) })} />
    </AuthLayout>
  )
}
