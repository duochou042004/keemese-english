// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { ChangePasswordForm } from './ChangePasswordForm'
import { LoginForm } from './LoginForm'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => i18n.changeLanguage('en'))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())

const problem = (status: number, code: string, errors?: Record<string, string[]>) =>
  HttpResponse.json(
    { status, code, errors },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
const me = {
  id: '0199a000-0000-7000-8000-000000000001',
  role: 'tutor',
  displayName: 'Lê Thu Hà',
  language: 'en',
  mustChangePassword: true,
}
const meHandler = http.get('/api/auth/me', () => HttpResponse.json(me))

const renderWithQuery = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('LoginForm', () => {
  it('requires both fields before calling the API and focuses the first', async () => {
    renderWithQuery(<LoginForm onSignedIn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findAllByText('This field is required.')).toHaveLength(2)
    expect(document.activeElement).toBe(screen.getByLabelText('Username'))
    expect(screen.getByLabelText('Username').getAttribute('aria-invalid')).toBe('true')
  })

  it('has no sign-up link (FR-AUTH-AC3)', () => {
    renderWithQuery(<LoginForm onSignedIn={vi.fn()} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it.each([
    [401, 'auth.invalid_credentials', 'Incorrect username or password.'],
    [429, 'auth.rate_limited', 'Too many sign-in attempts. Wait a minute, then try again.'],
    [500, 'something.unknown', 'Something went wrong. Please try again.'],
  ])('shows %i %s as a form alert', async (status, code, text) => {
    server.use(http.post('/api/auth/login', () => problem(status, code)))
    const onSignedIn = vi.fn()
    renderWithQuery(<LoginForm onSignedIn={onSignedIn} />)
    fill('Username', 'tutor')
    fill('Password', 'some words here')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect((await screen.findByRole('alert')).textContent).toBe(text)
    expect(onSignedIn).not.toHaveBeenCalled()
    expect(screen.getByLabelText<HTMLInputElement>('Username').value).toBe('tutor')
  })

  it('posts the trimmed username and remember-me, then hands over the profile', async () => {
    let sent: unknown
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        sent = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
      meHandler,
    )
    const onSignedIn = vi.fn()
    renderWithQuery(<LoginForm onSignedIn={onSignedIn} />)
    fill('Username', '  tutor ')
    fill('Password', 'some words here')
    fireEvent.click(screen.getByLabelText('Keep me signed in on this device'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(me))
    expect(sent).toEqual({ userName: 'tutor', password: 'some words here', rememberMe: true })
  })
})

describe('ChangePasswordForm', () => {
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))
  const fillAll = (next: string, confirm = next) => {
    fill('Current password', 'temporary one')
    fill('New password', next)
    fill('Confirm new password', confirm)
  }

  it('shows the policy and checks length and confirmation before calling the API', async () => {
    renderWithQuery(<ChangePasswordForm onChanged={vi.fn()} />)
    expect(screen.getByText('At least 10 characters. Avoid common passwords.')).toBeTruthy()
    fillAll('short', 'other')
    submit()
    expect(await screen.findByText('Use at least 10 characters.')).toBeTruthy()
    expect(screen.getByText('The passwords do not match.')).toBeTruthy()
  })

  it.each([
    ['password.too_short', 'Use at least 10 characters.'],
    ['password.too_common', 'This password is too common. Choose another one.'],
  ])('puts the API code %s under the new password', async (code, text) => {
    server.use(
      http.post('/api/auth/change-password', () =>
        problem(400, 'validation.failed', { newPassword: [code] }),
      ),
    )
    renderWithQuery(<ChangePasswordForm onChanged={vi.fn()} />)
    fillAll('long enough words')
    submit()
    expect(await screen.findByText(text)).toBeTruthy()
    const input = screen.getByLabelText('New password')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toContain('new-password-error')
  })

  it('puts auth.invalid_current_password under the current password', async () => {
    server.use(
      http.post('/api/auth/change-password', () => problem(400, 'auth.invalid_current_password')),
    )
    renderWithQuery(<ChangePasswordForm onChanged={vi.fn()} />)
    fillAll('long enough words')
    submit()
    expect(await screen.findByText('The current password is incorrect.')).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Current password')),
    )
  })

  it('sends current and new password only, then hands over the fresh profile', async () => {
    let sent: unknown
    server.use(
      http.post('/api/auth/change-password', async ({ request }) => {
        sent = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('/api/auth/me', () => HttpResponse.json({ ...me, mustChangePassword: false })),
    )
    const onChanged = vi.fn()
    renderWithQuery(<ChangePasswordForm onChanged={onChanged} />)
    fillAll('long enough words')
    submit()
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith({ ...me, mustChangePassword: false }),
    )
    expect(sent).toEqual({ currentPassword: 'temporary one', newPassword: 'long enough words' })
  })
})
