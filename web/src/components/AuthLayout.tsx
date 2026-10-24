import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

/** The centered card of /login and /change-password. */
export function AuthLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end gap-2 p-4">
        <LanguageSwitcher />
        {actions}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 md:items-center md:pt-0">
        <div className="w-full max-w-sm rounded-panel border border-border bg-surface p-6 md:p-8">
          <p className="text-small font-medium text-primary">{t('app.name')}</p>
          <h1 className="mt-1 text-h2 font-semibold">{title}</h1>
          <p className="mt-1 text-text-muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
