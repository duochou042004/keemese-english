import type { Role } from '@/lib/redirect'

/** OD-09 / PD-08 navigation, in menu order (docs/frontend/information-architecture.md). */
export const nav = {
  tutor: [
    { id: 'today', to: '/t', milestone: 'M1', shipped: true },
    { id: 'students', to: '/t/students', milestone: 'M1', shipped: true },
    { id: 'calendar', to: '/t/calendar', milestone: 'M5', shipped: false },
    { id: 'review', to: '/t/review', milestone: 'M4', shipped: false },
    { id: 'activities', to: '/t/activities', milestone: 'M4', shipped: false },
    { id: 'questions', to: '/t/questions', milestone: 'M4', shipped: false },
    { id: 'library', to: '/t/library', milestone: 'M3', shipped: false },
  ],
  student: [
    { id: 'home', to: '/s', milestone: 'M1', shipped: true },
    { id: 'tasks', to: '/s/tasks', milestone: 'M4', shipped: false },
    { id: 'lessons', to: '/s/lessons', milestone: 'M5', shipped: false },
    { id: 'materials', to: '/s/materials', milestone: 'M3', shipped: false },
    { id: 'progress', to: '/s/progress', milestone: 'M7', shipped: false },
  ],
} as const

export type NavItem = (typeof nav)[Role][number]
export type NavId = NavItem['id']

/** Items whose page hasn't shipped are hidden, not disabled (FR-STU-AC4); the packet that ships one flips `shipped`. */
export const visibleNav = (role: Role): NavItem[] => nav[role].filter((item) => item.shipped)
