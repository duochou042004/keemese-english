import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/login')({
  component: Login,
})

const inputClass =
  'h-11 w-full rounded-control border border-border bg-surface px-3 text-body md:h-10'

// Static until M1 wires it to the auth API.
function Login() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end p-4">
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 md:items-center md:pt-0">
        <div className="w-full max-w-sm rounded-panel border border-border bg-surface p-6 md:p-8">
          <p className="text-small font-medium text-primary">{t('app.name')}</p>
          <h1 className="mt-1 text-h2 font-semibold">{t('login.title')}</h1>
          <p className="mt-1 text-text-muted">{t('login.subtitle')}</p>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-small font-medium">
                {t('login.username')}
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-small font-medium">
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </div>
            <Button type="submit" className="mt-2 w-full">
              {t('login.submit')}
            </Button>
            <p className="text-caption text-text-muted">{t('login.notReady')}</p>
          </form>
        </div>
      </main>
    </div>
  )
}
