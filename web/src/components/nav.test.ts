import { describe, expect, it } from 'vitest'
import en from '@/locales/en/common.json'
import vi from '@/locales/vi/common.json'
import { nav, visibleNav } from './nav'

describe('nav config (OD-09 / PD-08)', () => {
  it('lists every IA item in menu order', () => {
    expect(nav.tutor.map((i) => i.id)).toEqual([
      'today',
      'students',
      'calendar',
      'review',
      'activities',
      'questions',
      'library',
    ])
    expect(nav.student.map((i) => i.id)).toEqual([
      'home',
      'tasks',
      'lessons',
      'materials',
      'progress',
    ])
  })

  it('shows only shipped items: M1 is Today + Students for the tutor, Home for the student', () => {
    expect(visibleNav('tutor').map((i) => i.id)).toEqual(['today', 'students'])
    expect(visibleNav('student').map((i) => i.id)).toEqual(['home'])
  })

  it.each(['tutor', 'student'] as const)('hides every unshipped %s item', (role) => {
    const visible = visibleNav(role)
    for (const item of nav[role]) expect(visible.includes(item)).toBe(item.shipped)
  })

  it('keeps each role inside its own area', () => {
    for (const item of nav.tutor) expect(item.to).toMatch(/^\/t(\/|$)/)
    for (const item of nav.student) expect(item.to).toMatch(/^\/s(\/|$)/)
  })

  it('names every item in both languages', () => {
    for (const item of [...nav.tutor, ...nav.student]) {
      expect(en.nav[item.id]).toBeTruthy()
      expect(vi.nav[item.id]).toBeTruthy()
    }
  })
})
