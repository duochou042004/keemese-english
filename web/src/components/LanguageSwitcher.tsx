import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { changeLanguage } from '@/i18n'
import { languages, type Language } from '@/i18n/language'
import { meQuery } from '@/lib/guard'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  async function select(lang: Language) {
    await changeLanguage(lang)
    // Signed in: save it on the account (FR-AUTH-08). The API refuses it until a pending password change is done.
    const me = queryClient.getQueryData(meQuery.queryKey)
    if (!me || me.mustChangePassword) return
    await api('put', '/api/auth/preferences', { body: { language: lang } })
    queryClient.setQueryData(meQuery.queryKey, (old) => old && { ...old, language: lang })
  }

  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-1">
      {languages.map((lang) => (
        <Button
          key={lang}
          size="sm"
          variant={i18n.language === lang ? 'outline' : 'ghost'}
          aria-pressed={i18n.language === lang}
          lang={lang}
          // The language still applies locally if saving it fails.
          onClick={() => void select(lang).catch(() => undefined)}
        >
          {t(`language.${lang}`)}
        </Button>
      ))}
    </div>
  )
}
