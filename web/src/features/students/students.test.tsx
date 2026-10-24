// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { AddStudent } from './AddStudent'
import { accountMessage, generatePassword, nextUsername, suggestUsername } from './credentials'
import { StudentList } from './StudentList'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, className, children }: { to: string; className?: string; children: ReactNode }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const server = setupServer()
const writeText = vi.fn<(text: string) => Promise<void>>()
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
beforeEach(() => i18n.changeLanguage('en'))
afterEach(() => {
  server.resetHandlers()
  writeText.mockReset()
  cleanup()
})
afterAll(() => server.close())

const problem = (status: number, code: string, errors?: Record<string, string[]>) =>
  HttpResponse.json(
    { status, code, errors },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
const renderWithQuery = (ui: ReactNode) =>
  render(
    // No retries: the error state would otherwise wait for three backed-off attempts.
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  )
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const input = (label: string) => screen.getByLabelText<HTMLInputElement>(label)
const create = () => fireEvent.click(screen.getByRole('button', { name: 'Create' }))

describe('credentials', () => {
  it.each([
    ['Nguyễn Minh Anh', 'nguyen.minhanh'],
    ['Trần Gia Bảo', 'tran.giabao'],
    ['  Đỗ   Đức  ', 'do.duc'],
    ['Lê', 'le'],
    ['Nguyễn Thu Hà', 'nguyen.thuha'], // NFD input
    ['!!!', ''],
  ])('suggests %s → %s', (name, userName) => expect(suggestUsername(name)).toBe(userName))

  it('keeps suggestions within 40 characters', () =>
    expect(suggestUsername('a'.repeat(30) + ' ' + 'b'.repeat(30))).toHaveLength(40))

  it.each([
    ['nguyen.minhanh', 'nguyen.minhanh2'],
    ['nguyen.minhanh2', 'nguyen.minhanh3'],
    ['e2e.9', 'e2e.10'],
    ['x'.repeat(40), 'x'.repeat(39) + '2'],
  ])('after a taken %s suggests %s', (taken, next) => expect(nextUsername(taken)).toBe(next))

  it('generates 12 characters from the server alphabet (no 0/O/o, 1/l/I/i)', () => {
    for (let i = 0; i < 50; i++)
      expect(generatePassword()).toMatch(/^[a-hjkmnp-zA-HJ-NP-Z2-9]{12}$/)
    expect(new Set(Array.from({ length: 20 }, () => generatePassword())).size).toBe(20)
  })

  it('writes the message in Vietnamese, then English, with the login URL', () => {
    const text = accountMessage('tran.giabao', 'Abc23456789x', 'https://lop.example/login')
    expect(text.split('\n\n')).toHaveLength(2)
    expect(text).toContain('Tên đăng nhập: tran.giabao')
    expect(text).toContain('Username: tran.giabao')
    expect(text.match(/Abc23456789x/g)).toHaveLength(2)
    expect(text.match(/https:\/\/lop\.example\/login/g)).toHaveLength(2)
    expect(text.indexOf('Tên đăng nhập')).toBeLessThan(text.indexOf('Username'))
  })
})

describe('AddStudent (J2)', () => {
  it('starts with a generated password and the optional groups collapsed (FR-STU-AC1)', () => {
    const { container } = renderWithQuery(<AddStudent />)
    expect(input('Temporary password').value).toMatch(/^[A-Za-z2-9]{12}$/)
    const groups = container.querySelectorAll('details')
    expect(groups).toHaveLength(2)
    for (const g of groups) expect(g.open).toBe(false)
  })

  it('requires a name and a valid username before calling the API', async () => {
    let called = false
    server.use(http.post('/api/students', () => ((called = true), HttpResponse.json({}))))
    renderWithQuery(<AddStudent />)
    create()
    expect(await screen.findByText('Enter the full name.')).toBeTruthy()
    expect(screen.getByText('Use 3–40 characters: a–z, 0–9, dot, dash or underscore.')).toBeTruthy()
    expect(document.activeElement).toBe(input('Full name'))
    expect(called).toBe(false)
  })

  it('suggests the username from the name until the tutor edits it', () => {
    renderWithQuery(<AddStudent />)
    fill('Full name', 'Nguyễn Minh Anh')
    expect(input('Username').value).toBe('nguyen.minhanh')
    fill('Username', 'minhanh')
    fill('Full name', 'Nguyễn Minh Anh Thư')
    expect(input('Username').value).toBe('minhanh')
  })

  it('regenerates and copies the temporary password', async () => {
    writeText.mockResolvedValue()
    renderWithQuery(<AddStudent />)
    const first = input('Temporary password').value
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(input('Temporary password').value).not.toBe(first)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(input('Temporary password').value))
    expect(await screen.findByText('Copied')).toBeTruthy()
  })

  it('shows students.username_taken inline with the next suggestion (STU-AC2)', async () => {
    server.use(
      http.post('/api/students', () =>
        problem(400, 'validation.failed', { userName: ['students.username_taken'] }),
      ),
    )
    renderWithQuery(<AddStudent />)
    fill('Full name', 'Nguyễn Minh Anh')
    create()
    expect(await screen.findByText('This username is already taken.')).toBeTruthy()
    expect(input('Username').getAttribute('aria-invalid')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Use nguyen.minhanh2' }))
    await waitFor(() => expect(input('Username').value).toBe('nguyen.minhanh2'))
    expect(screen.queryByText('This username is already taken.')).toBeNull()
  })

  it('opens a collapsed group when one of its fields has an API error', async () => {
    server.use(
      http.post('/api/students', () =>
        problem(400, 'validation.failed', { email: ['email.invalid'] }),
      ),
    )
    const { container } = renderWithQuery(<AddStudent />)
    fill('Full name', 'Lê Thu Hà')
    create()
    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy()
    expect(container.querySelector('details')!.open).toBe(true)
  })

  it('shows an unknown failure as a form alert and keeps the input', async () => {
    server.use(http.post('/api/students', () => problem(500, 'common.unexpected')))
    renderWithQuery(<AddStudent />)
    fill('Full name', 'Lê Thu Hà')
    create()
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Please try again.',
    )
    expect(input('Full name').value).toBe('Lê Thu Hà')
  })

  it('creates with only the required fields, then shows the one-time details and copies the message', async () => {
    let sent: unknown
    server.use(
      http.post('/api/students', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(
          { id: '0199a000-0000-7000-8000-000000000002', temporaryPassword: 'Xy34567890ab' },
          { status: 201 },
        )
      }),
    )
    writeText.mockResolvedValue()
    renderWithQuery(<AddStudent />)
    fill('Full name', '  Trần Gia Bảo ')
    fill('Temporary password', '')
    create()

    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeTruthy()
    expect(sent).toEqual({
      fullName: 'Trần Gia Bảo',
      userName: 'tran.giabao',
      temporaryPassword: null,
      email: null,
      phone: null,
      contactChannels: null,
      parents: null,
    })
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Account created' }))
    expect(screen.getByText('tran.giabao')).toBeTruthy()
    expect(screen.getByText('Xy34567890ab')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Copy message' }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        accountMessage('tran.giabao', 'Xy34567890ab', `${window.location.origin}/login`),
      ),
    )
    // FR-STU-AC4: only the M1 follow-ups.
    expect(screen.getByRole('link', { name: 'Done' }).getAttribute('href')).toBe('/t/students')
    expect(screen.getByRole('link', { name: 'Open workspace' }).getAttribute('href')).toBe(
      '/t/students/0199a000-0000-7000-8000-000000000002',
    )
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('sends contact channels and parents when given, dropping empty channel rows', async () => {
    let sent: { contactChannels?: unknown; parents?: unknown; email?: unknown } = {}
    server.use(
      http.post('/api/students', async ({ request }) => {
        sent = (await request.json()) as typeof sent
        return HttpResponse.json({ id: 'x', temporaryPassword: 'Xy34567890ab' }, { status: 201 })
      }),
    )
    renderWithQuery(<AddStudent />)
    fill('Full name', 'Lê Thu Hà')
    fill('Email', 'thuha@example.test')
    fireEvent.click(screen.getByRole('button', { name: 'Add contact channel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add contact channel' }))
    fireEvent.change(screen.getAllByLabelText('Account or number')[0]!, {
      target: { value: '0900 000 000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add parent or guardian' }))
    fill('Name', 'Lê Văn Nam')
    fill('Relationship', 'Bố')
    create()
    await screen.findByRole('heading', { name: 'Account created' })
    expect(sent.email).toBe('thuha@example.test')
    expect(sent.contactChannels).toEqual([{ type: 'Zalo', value: '0900 000 000' }])
    expect(sent.parents).toEqual([
      { name: 'Lê Văn Nam', relationship: 'Bố', contact: null, notes: null },
    ])
  })
})

describe('StudentList (FR-STU-03)', () => {
  const page = (items: { fullName: string; lastLoginAt?: string }[], total = items.length) =>
    HttpResponse.json({
      items: items.map((s, i) => ({
        id: `id-${i}`,
        fullName: s.fullName,
        userName: `user${i}`,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: s.lastLoginAt ?? null,
      })),
      total,
    })

  it('lists students as workspace links and loads more past one page', async () => {
    const pages: string[] = []
    server.use(
      http.get('/api/students', ({ request }) => {
        const url = new URL(request.url)
        pages.push(url.searchParams.toString())
        return url.searchParams.get('page') === '1'
          ? page([{ fullName: 'Nguyễn Thị Phương Thảo', lastLoginAt: '2026-10-20T08:00:00Z' }], 51)
          : page([{ fullName: 'Trần Gia Bảo' }], 51)
      }),
    )
    renderWithQuery(<StudentList onSearchChange={vi.fn()} />)
    const link = await screen.findByRole('link', { name: /Nguyễn Thị Phương Thảo/ })
    expect(link.getAttribute('href')).toBe('/t/students/id-0')
    expect(link.textContent).toContain('last signed in')
    expect(pages[0]).toBe('status=active&page=1&pageSize=50')
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect((await screen.findByRole('link', { name: /Trần Gia Bảo/ })).textContent).toContain(
      'not signed in yet',
    )
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })

  it('shows the first-student empty state with the Add action', async () => {
    server.use(http.get('/api/students', () => page([])))
    renderWithQuery(<StudentList onSearchChange={vi.fn()} />)
    expect(
      (await screen.findByRole('link', { name: 'Add your first student' })).getAttribute('href'),
    ).toBe('/t/students/new')
  })

  it('says when a search matches nobody', async () => {
    server.use(http.get('/api/students', () => page([])))
    renderWithQuery(<StudentList q="zzz" onSearchChange={vi.fn()} />)
    expect((await screen.findByRole('status')).textContent).toBe('No students match “zzz”.')
  })

  it('shows an error with Retry and the trace id', async () => {
    let fail = true
    server.use(
      http.get('/api/students', () =>
        fail
          ? HttpResponse.json(
              { status: 500, code: 'common.unexpected', traceId: '00-abc' },
              { status: 500, headers: { 'content-type': 'application/problem+json' } },
            )
          : page([{ fullName: 'Lê Thu Hà' }]),
      ),
    )
    renderWithQuery(<StudentList onSearchChange={vi.fn()} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Something went wrong. Please try again.')
    expect(alert.textContent).toContain('00-abc')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: /Lê Thu Hà/ })).toBeTruthy()
  })

  it('debounces the search into the URL and switches the status filter', () => {
    server.use(http.get('/api/students', () => page([])))
    const onSearchChange = vi.fn()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      renderWithQuery(<StudentList onSearchChange={onSearchChange} />)
      fill('Search by name', 'ng')
      fill('Search by name', 'nguyen ')
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(onSearchChange).toHaveBeenCalledTimes(1)
      expect(onSearchChange).toHaveBeenCalledWith({ q: 'nguyen', status: 'active' })
    } finally {
      vi.useRealTimers()
    }
    expect(screen.getByRole('button', { name: 'Active' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ q: undefined, status: 'archived' })
  })
})
