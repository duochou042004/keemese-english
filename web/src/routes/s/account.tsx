import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AccountSettings } from '@/components/AccountSettings'

export const Route = createFileRoute('/s/account')({ component: Account })

function Account() {
  const { t } = useTranslation()
  return <AccountSettings title={t('shell.account')} />
}
