import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/AuthLayout'
import { SignOutButton } from '@/components/SignOutButton'
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm'
import { meQuery, requireSignedIn } from '@/lib/guard'
import { roleHome } from '@/lib/redirect'

export const Route = createFileRoute('/change-password')({
  beforeLoad: requireSignedIn,
  component: ChangePassword,
})

function ChangePassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const forced = useSuspenseQuery(meQuery).data?.mustChangePassword ?? false
  return (
    <AuthLayout
      title={t(forced ? 'changePassword.forcedTitle' : 'changePassword.title')}
      subtitle={t(forced ? 'changePassword.forcedSubtitle' : 'changePassword.subtitle')}
      actions={<SignOutButton />}
    >
      <ChangePasswordForm onChanged={(me) => navigate({ href: roleHome(me.role) })} />
    </AuthLayout>
  )
}
