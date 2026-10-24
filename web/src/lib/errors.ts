import { useTranslation } from 'react-i18next'

/** Turns an API or validation error code into errors.json text; unknown codes read as common.unexpected. */
export function useErrorText() {
  const { t, i18n } = useTranslation('errors')
  return (code: string) =>
    i18n.exists(code, { ns: 'errors' }) ? t(code as 'common.unexpected') : t('common.unexpected')
}
