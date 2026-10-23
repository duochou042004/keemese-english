import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { changeLanguage } from '@/i18n'
import { languages } from '@/i18n/language'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-1">
      {languages.map((lang) => (
        <Button
          key={lang}
          size="sm"
          variant={i18n.language === lang ? 'outline' : 'ghost'}
          aria-pressed={i18n.language === lang}
          lang={lang}
          onClick={() => void changeLanguage(lang)}
        >
          {t(`language.${lang}`)}
        </Button>
      ))}
    </div>
  )
}
