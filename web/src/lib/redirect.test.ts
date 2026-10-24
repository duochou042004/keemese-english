import { describe, expect, it } from 'vitest'
import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it.each([
    ['/t/students/1?tab=plan#x', 'tutor', '/t/students/1?tab=plan#x'],
    ['/t', 'tutor', '/t'],
    ['/s/tasks', 'student', '/s/tasks'],
    ['/change-password', 'student', '/change-password'],
    // hostile or out of area → the role home
    ['//evil.example', 'tutor', '/t'],
    ['/\\evil.example', 'tutor', '/t'],
    ['/\t/evil.example', 'tutor', '/t'],
    ['https://evil.example/t', 'tutor', '/t'],
    ['javascript:alert(1)', 'tutor', '/t'],
    ['t/students', 'tutor', '/t'],
    ['/s/x', 'tutor', '/t'],
    ['/t/x', 'student', '/s'],
    ['/t/../s/x', 'tutor', '/t'],
    ['/tx', 'tutor', '/t'],
    ['/login', 'tutor', '/t'],
    ['', 'student', '/s'],
    [null, 'student', '/s'],
    [undefined, 'tutor', '/t'],
  ] as const)('%j as %s → %s', (target, role, expected) => {
    expect(safeRedirect(target, role)).toBe(expected)
  })
})
