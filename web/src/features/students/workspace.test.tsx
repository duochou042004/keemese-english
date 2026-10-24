// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { components } from '@/api/schema'
import i18n from '@/i18n'
import { namesMatch } from './AccountActions'
import { generatePassword } from './credentials'
import { StudentProfile } from './Profile'
import { Toaster } from './toast'
import { StudentOverview, StudentWorkspace } from './Workspace'

const navigate = vi.fn<(to: unknown) => Promise<void>>()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => navigate,
}))

const server = setupServer()
const writeText = vi.fn<(text: string) => Promise<void>>()
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
beforeEach(async () => {
  navigate.mockResolvedValue()
  await i18n.changeLanguage('en')
})
afterEach(() => {
  server.resetHandlers()
  writeText.mockReset()
  navigate.mockReset()
  cleanup()
})
afterAll(() => server.close())

type Student = components['schemas']['TutorStudentDto']
const ID = '0199a000-0000-7000-8000-000000000001'
const NAME = 'Nguyễn Thị Phương Thảo'
const student = (overrides: Partial<Student> = {}): Student => ({
  id: ID,
  fullName: NAME,
  userName: 'nguyen.thiphuongthao',
  email: 'thao@example.test',
  phone: null,
  contactChannels: [{ type: 'Zalo', value: '0900000000' }],
  parents: [{ name: 'Nguyễn Văn An', relationship: 'Father', contact: null, notes: null }],
  isActive: true,
  mustChangePassword: false,
  isLockedOut: false,
  lastLoginAt: null,
  createdAt: '2026-10-20T08:00:00Z',
  version: 7,
  ...overrides,
})
const problem = (status: number, code: string, errors?: Record<string, string[]>) =>
  HttpResponse.json(
    { status, code, errors },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
const noContent = () => new HttpResponse(null, { status: 204 })

/** Renders with the student already cached, as the workspace layout leaves it for its tabs. */
function renderProfile(s: Student = student()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['students', s.id], s)
  return render(
    <QueryClientProvider client={client}>
      <StudentProfile id={s.id} />
      <Toaster />
    </QueryClientProvider>,
  )
}
const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label)
const button = (name: string) => screen.getByRole('button', { name })
const openDialog = async (trigger: string) => {
  fireEvent.click(button(trigger))
  return screen.findByRole('alertdialog')
}

describe('StudentWorkspace', () => {
  const renderWorkspace = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentWorkspace id={ID}>
          <StudentOverview />
        </StudentWorkspace>
      </QueryClientProvider>,
    )

  it('shows the header, only the shipped tabs and the Overview empty states (FR-STU-07)', async () => {
    server.use(
      http.get(`/api/students/${ID}`, () => HttpResponse.json(student({ isLockedOut: true }))),
    )
    renderWorkspace()
    expect(await screen.findByRole('heading', { level: 1, name: NAME })).toBeTruthy()
    expect(screen.getByText('nguyen.thiphuongthao')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Locked')).toBeTruthy()
    const tabs = within(screen.getByRole('navigation', { name: 'Student workspace' }))
    expect(tabs.getAllByRole('link').map((l) => l.textContent)).toEqual(['Overview', 'Profile'])
    for (const title of ['Next session', 'Open tasks', 'Goals'])
      expect(screen.getByRole('heading', { name: title })).toBeTruthy()
  })

  it('an unknown or deleted student shows the localized not-found state without retrying', async () => {
    let calls = 0
    server.use(http.get(`/api/students/${ID}`, () => (calls++, problem(404, 'common.not_found'))))
    renderWorkspace()
    expect(await screen.findByRole('heading', { name: 'Student not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to students' }).getAttribute('href')).toBe(
      '/t/students',
    )
    expect(calls).toBe(1)
  })

  it('survives re-renders where scrollIntoView returns a Promise (Chromium)', async () => {
    const scroll = vi.fn(() => Promise.resolve())
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scroll,
      configurable: true,
    })
    server.use(http.get(`/api/students/${ID}`, () => HttpResponse.json(student())))
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <StudentWorkspace id={ID}>
          <StudentOverview />
        </StudentWorkspace>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { level: 1, name: NAME })
    act(() => {
      client.setQueryData(['students', ID], student({ fullName: 'Lê Thu Hà' }))
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Lê Thu Hà' })).toBeTruthy()
    expect(scroll).toHaveBeenCalled()
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  })

  it('an archived student carries the Archived badge', async () => {
    server.use(
      http.get(`/api/students/${ID}`, () => HttpResponse.json(student({ isActive: false }))),
    )
    renderWorkspace()
    expect(await screen.findByText('Archived')).toBeTruthy()
    expect(screen.queryByText('Locked')).toBeNull()
  })
})

describe('Profile form', () => {
  it('saves every field with the loaded version; "" clears a field', async () => {
    let body: unknown
    server.use(
      http.patch(`/api/students/${ID}`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          student({ fullName: 'Nguyễn Phương Thảo', email: null, version: 8 }),
        )
      }),
    )
    renderProfile()
    expect(field('Full name').value).toBe(NAME)
    expect(field('Email').value).toBe('thao@example.test')
    fireEvent.change(field('Full name'), { target: { value: 'Nguyễn Phương Thảo' } })
    fireEvent.change(field('Email'), { target: { value: '' } })
    fireEvent.click(button('Save changes'))
    expect(await screen.findByText('Saved')).toBeTruthy()
    expect(body).toEqual({
      version: 7,
      fullName: 'Nguyễn Phương Thảo',
      email: '',
      phone: '',
      contactChannels: [{ type: 'Zalo', value: '0900000000' }],
      parents: [{ name: 'Nguyễn Văn An', relationship: 'Father', contact: null, notes: null }],
    })
  })

  it('a stale version gets 409 concurrency.conflict and a Reload that loads the latest version (AC6)', async () => {
    const versions: unknown[] = []
    server.use(
      http.patch(`/api/students/${ID}`, async ({ request }) => {
        const { version } = (await request.json()) as { version: number }
        versions.push(version)
        return version === 7
          ? problem(409, 'concurrency.conflict')
          : HttpResponse.json(student({ fullName: 'Thảo', version: 9 }))
      }),
      http.get(`/api/students/${ID}`, () =>
        HttpResponse.json(student({ fullName: 'Nguyễn Thị Thảo', version: 8 })),
      ),
    )
    renderProfile()
    fireEvent.change(field('Full name'), { target: { value: 'Thảo' } })
    fireEvent.click(button('Save changes'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('This profile was changed somewhere else')
    fireEvent.click(within(alert).getByRole('button', { name: 'Reload' }))
    await waitFor(() => expect(field('Full name').value).toBe('Nguyễn Thị Thảo'))
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(field('Full name'), { target: { value: 'Thảo' } })
    fireEvent.click(button('Save changes'))
    expect(await screen.findByText('Saved')).toBeTruthy()
    expect(versions).toEqual([7, 8])
  })

  it('keeps the loaded version when the student is refetched in the background (AC6)', async () => {
    let version: unknown
    server.use(
      http.patch(`/api/students/${ID}`, async ({ request }) => {
        version = ((await request.json()) as { version: unknown }).version
        return problem(409, 'concurrency.conflict')
      }),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['students', ID], student())
    render(
      <QueryClientProvider client={client}>
        <StudentProfile id={ID} />
      </QueryClientProvider>,
    )
    fireEvent.change(field('Full name'), { target: { value: 'Thảo' } })
    // Another tab saved; a window-focus refetch brings its version into the cache.
    act(() => {
      client.setQueryData(['students', ID], student({ version: 8 }))
    })
    fireEvent.click(button('Save changes'))
    expect((await screen.findByRole('alert')).textContent).toContain('changed somewhere else')
    expect(version).toBe(7)
  })

  it('puts API field codes under their fields', async () => {
    server.use(
      http.patch(`/api/students/${ID}`, () =>
        problem(400, 'validation.failed', { email: ['email.invalid'] }),
      ),
    )
    renderProfile()
    fireEvent.click(button('Save changes'))
    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy()
    expect(field('Email').getAttribute('aria-invalid')).toBe('true')
  })

  it('removes and adds parents (FR-STU-05)', async () => {
    let parents: unknown
    server.use(
      http.patch(`/api/students/${ID}`, async ({ request }) => {
        parents = ((await request.json()) as { parents: unknown }).parents
        return HttpResponse.json(student({ version: 8 }))
      }),
    )
    renderProfile()
    const parent = screen.getByRole('group', { name: 'Parent or guardian 1' })
    fireEvent.click(within(parent).getByRole('button', { name: 'Remove' }))
    fireEvent.click(button('Add parent or guardian'))
    fireEvent.change(field('Name'), { target: { value: 'Trần Thị Bình' } })
    fireEvent.click(button('Save changes'))
    await screen.findByText('Saved')
    expect(parents).toEqual([
      { name: 'Trần Thị Bình', relationship: null, contact: null, notes: null },
    ])
  })
})

describe('Account actions', () => {
  it('matches the typed name after trimming and Unicode normalization only', () => {
    expect(namesMatch(`  ${NAME} `, NAME)).toBe(true)
    expect(namesMatch(NAME.normalize('NFD'), NAME)).toBe(true)
    expect(namesMatch(NAME.toLowerCase(), NAME)).toBe(false)
    expect(namesMatch('Nguyen Thi Phuong Thao', NAME)).toBe(false)
    expect(namesMatch('', NAME)).toBe(false)
  })

  it('delete stays disabled until the full name is typed exactly, then deletes and goes to the list', async () => {
    let confirmName: unknown
    server.use(
      http.delete(`/api/students/${ID}`, async ({ request }) => {
        confirmName = ((await request.json()) as { confirmName: unknown }).confirmName
        return noContent()
      }),
    )
    renderProfile()
    const dialog = await openDialog('Delete permanently')
    const confirm = within(dialog).getByRole('button', { name: 'Delete permanently' })
    const name = within(dialog).getByLabelText(`Type ${NAME} to confirm`)
    expect(confirm).toHaveProperty('disabled', true)
    fireEvent.change(name, { target: { value: 'Nguyễn Thị Phương' } })
    expect(confirm).toHaveProperty('disabled', true)
    fireEvent.change(name, { target: { value: NAME } })
    expect(confirm).toHaveProperty('disabled', false)
    fireEvent.click(confirm)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/t/students' }))
    expect(confirmName).toBe(NAME)
    expect(await screen.findByText(`${NAME} was deleted.`)).toBeTruthy()
  })

  it('a rejected delete keeps the dialog open with the error', async () => {
    server.use(
      http.delete(`/api/students/${ID}`, () => problem(400, 'students.confirm_name_mismatch')),
    )
    renderProfile()
    const dialog = await openDialog('Delete permanently')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: NAME } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'The name does not match. Type the full name exactly.',
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('reset password asks first, then shows the new password once with Copy and Copy message (AC7)', async () => {
    // Generated: a password-like literal next to a *Password key trips gitleaks.
    const issued = generatePassword()
    writeText.mockResolvedValue()
    server.use(
      http.post(`/api/students/${ID}/reset-password`, () =>
        HttpResponse.json({ temporaryPassword: issued }),
      ),
      http.get(`/api/students/${ID}`, () =>
        HttpResponse.json(student({ mustChangePassword: true })),
      ),
    )
    renderProfile()
    expect(screen.queryByText(issued)).toBeNull()
    const dialog = await openDialog('Reset password')
    expect(dialog.textContent).toContain('signed out everywhere')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByText(issued)).toBeTruthy()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    fireEvent.click(button('Copy'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(issued))
    fireEvent.click(button('Copy message'))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    const message = writeText.mock.calls[1]![0]
    expect(message).toContain('Username: nguyen.thiphuongthao')
    expect(message.split(issued)).toHaveLength(3)
  })

  it('offers Unlock only for a locked account (AUTH-AC9)', async () => {
    let unlocked = false
    server.use(
      http.post(`/api/students/${ID}/unlock`, () => ((unlocked = true), noContent())),
      http.get(`/api/students/${ID}`, () => HttpResponse.json(student())),
    )
    renderProfile()
    expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull()
    cleanup()
    renderProfile(student({ isLockedOut: true }))
    fireEvent.click(button('Unlock'))
    expect(await screen.findByText(`${NAME} was unlocked.`)).toBeTruthy()
    expect(unlocked).toBe(true)
  })

  it('archive explains the effect, then offers Undo, which restores (FR-AUTH-07)', async () => {
    const calls: string[] = []
    server.use(
      http.post(`/api/students/${ID}/:action`, ({ params }) => {
        calls.push(String(params.action))
        return noContent()
      }),
      http.get(`/api/students/${ID}`, () => HttpResponse.json(student({ isActive: false }))),
    )
    renderProfile()
    const dialog = await openDialog('Archive')
    expect(dialog.textContent).toContain('cannot sign in')
    expect(dialog.textContent).toContain('are kept')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))
    expect(await screen.findByText(`${NAME} was archived.`)).toBeTruthy()
    fireEvent.click(button('Undo'))
    expect(await screen.findByText(`${NAME} was restored.`)).toBeTruthy()
    expect(calls).toEqual(['archive', 'restore'])
  })

  it('an archived student gets Restore instead of Archive', () => {
    renderProfile(student({ isActive: false }))
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
    expect(button('Restore')).toBeTruthy()
  })
})
