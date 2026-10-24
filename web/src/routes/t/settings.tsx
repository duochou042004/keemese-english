import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AccountSettings } from '@/components/AccountSettings'

export const Route = createFileRoute('/t/settings')({ component: Settings })

function Settings() {
  const { t } = useTranslation()
  return <AccountSettings title={t('shell.settings')} />
}
