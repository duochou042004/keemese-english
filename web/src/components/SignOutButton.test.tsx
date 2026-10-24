// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { SignOutButton } from './SignOutButton'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => i18n.changeLanguage('en'))
afterEach(() => {
  server.resetHandlers()
  navigate.mockReset()
  cleanup()
})
afterAll(() => server.close())

function renderSignedIn() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['me'], { displayName: 'Lê Thu Hà' })
  render(
    <QueryClientProvider client={queryClient}>
      <SignOutButton />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  return queryClient
}

const problem = (status: number) =>
  HttpResponse.json(
    { status, code: 'common.unexpected' },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )

describe('sign out (T18)', () => {
  it.each([204, 401])('clears the cache and goes to /login on %i', async (status) => {
    server.use(
      http.post('/api/auth/logout', () =>
        status === 204 ? new HttpResponse(null, { status }) : problem(status),
      ),
    )
    const queryClient = renderSignedIn()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }))
    expect(queryClient.getQueryData(['me'])).toBeUndefined()
  })

  it('stays on the page with an error and keeps the cache when the session may still be open', async () => {
    server.use(http.post('/api/auth/logout', () => problem(500)))
    const queryClient = renderSignedIn()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(['me'])).toEqual({ displayName: 'Lê Thu Hà' })
    expect(screen.getByRole('button', { name: 'Sign out' })).toHaveProperty('disabled', false)
  })
})
