import { describe, expect, it } from 'vitest'
import { resolveLanguage } from './language'

const catalogs = import.meta.glob<Record<string, unknown>>('../locales/*/*.json', {
  eager: true,
  import: 'default',
})

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

function catalogKeys(lang: string) {
  return Object.entries(catalogs)
    .filter(([path]) => path.includes(`/locales/${lang}/`))
    .flatMap(([path, json]) => keys(json, path.split('/').pop()!.replace('.json', '')))
    .sort()
}

describe('catalog parity (NFR-I18N-01)', () => {
  it('vi and en have identical key sets', () => {
    const vi = catalogKeys('vi')
    expect(vi.length).toBeGreaterThan(0)
    expect(catalogKeys('en')).toEqual(vi)
  })

  it('has no empty strings', () => {
    for (const [path, json] of Object.entries(catalogs)) {
      const empty = keys(json).filter((k) => {
        const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], json)
        return typeof v !== 'string' || v.trim() === ''
      })
      expect(empty, path).toEqual([])
    }
  })
})

describe('resolveLanguage', () => {
  it.each([
    ['en', 'vi-VN', 'en'],
    ['vi', 'en-US', 'vi'],
    [null, 'vi-VN', 'vi'],
    [null, 'en-GB', 'en'],
    [null, 'fr', 'en'],
    ['de', undefined, 'vi'],
    [null, undefined, 'vi'],
  ] as const)('saved %s, browser %s → %s', (saved, browser, expected) => {
    expect(resolveLanguage(saved, browser)).toBe(expected)
  })
})
