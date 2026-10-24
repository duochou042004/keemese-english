import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { PageHeader } from '@/components/PageHeader'
import { buttonVariants } from '@/components/ui/button'

/** `/t/settings` and `/s/account`: language and the password change. */
export function AccountSettings({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={title} />
      <div className="flex max-w-xl flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-lead font-semibold">{t('language.label')}</h2>
          <p className="text-text-muted">{t('settings.languageHint')}</p>
          <LanguageSwitcher />
        </section>
        <section className="flex flex-col items-start gap-3">
          <h2 className="text-lead font-semibold">{t('login.password')}</h2>
          <p className="text-text-muted">{t('settings.passwordHint')}</p>
          <Link to="/change-password" className={buttonVariants({ variant: 'outline' })}>
            {t('changePassword.title')}
          </Link>
        </section>
      </div>
    </>
  )
}
