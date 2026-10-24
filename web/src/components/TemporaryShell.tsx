import { useQuery } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SignOutButton } from '@/components/SignOutButton'
import { meQuery } from '@/lib/guard'

// shortcut: a bare header for /t and /s until T-107 brings the AppShell and its account menu.
export function TemporaryShell() {
  const { t } = useTranslation()
  const { data: me } = useQuery(meQuery)
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
        <p className="text-small font-medium">
          <span className="text-primary">{t('app.name')}</span>
          {me && <span className="text-text-muted"> · {me.displayName}</span>}
        </p>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  )
}
