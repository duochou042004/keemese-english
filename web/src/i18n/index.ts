import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '@/locales/en/common.json'
import enErrors from '@/locales/en/errors.json'
import viCommon from '@/locales/vi/common.json'
import viErrors from '@/locales/vi/errors.json'
import { readSavedLanguage, resolveLanguage, saveLanguage, type Language } from './language'

export const resources = {
  vi: { common: viCommon, errors: viErrors },
  en: { common: enCommon, errors: enErrors },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(readSavedLanguage(), navigator.language),
  fallbackLng: 'vi',
  ns: ['common', 'errors'],
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React escapes.
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export function changeLanguage(lang: Language) {
  saveLanguage(lang)
  return i18n.changeLanguage(lang)
}

export default i18n
