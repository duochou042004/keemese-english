export const languages = ['vi', 'en'] as const
export type Language = (typeof languages)[number]

const storageKey = 'lang'

/** ADR-0008: saved choice → browser language (`vi*` → vi, otherwise en). The server preference joins in M1. */
export function resolveLanguage(saved: string | null, browser: string | undefined): Language {
  if (saved === 'vi' || saved === 'en') return saved
  if (browser === undefined) return 'vi'
  return browser.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

// Storage can throw (private mode, blocked site data); the language is only a convenience.
export function readSavedLanguage(): string | null {
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(storageKey, lang)
  } catch {
    // Not persisted; the choice still applies to this page.
  }
}
