import i18n from '@/i18n'

const MAX_USERNAME = 40

/** "Nguyễn Minh Anh" → "nguyen.minhanh": family name, a dot, the rest joined; diacritics stripped (J2). */
export function suggestUsername(fullName: string): string {
  const words = fullName
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  const [first = '', ...rest] = words
  return (rest.length ? `${first}.${rest.join('')}` : first).slice(0, MAX_USERNAME)
}

/** The suggestion after `students.username_taken`: "nguyen.minhanh" → "nguyen.minhanh2", "…2" → "…3". */
export function nextUsername(userName: string): string {
  const [, base = userName, digits] = /^(.*?)(\d+)$/.exec(userName) ?? []
  const suffix = digits ? String(Number(digits) + 1) : '2'
  return `${base.slice(0, MAX_USERNAME - suffix.length)}${suffix}`
}

// Same alphabet and length as the server's TemporaryPassword: no 0/O/o, 1/l/I/i, since it is typed by hand.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(length = 12): string {
  const limit = 256 - (256 % ALPHABET.length) // rejection sampling: no modulo bias
  let out = ''
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && out.length < length) out += ALPHABET[byte % ALPHABET.length]
    }
  }
  return out
}

/** The text the tutor pastes into Zalo: Vietnamese first, then English, whatever the UI language. */
export function accountMessage(userName: string, password: string, loginUrl: string): string {
  return (['vi', 'en'] as const)
    .map((lng) =>
      i18n.getFixedT(lng)('students.created.message', { userName, password, url: loginUrl }),
    )
    .join('\n\n')
}
