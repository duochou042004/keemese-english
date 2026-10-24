import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, apiFetch, setUnauthorizedHandler } from './client'

const stubFetch = (impl: () => Promise<Response>) => vi.stubGlobal('fetch', vi.fn(impl))

afterEach(() => vi.unstubAllGlobals())

describe('apiFetch', () => {
  it('sends same-origin credentials and returns JSON', async () => {
    stubFetch(() => Promise.resolve(Response.json({ ok: 1 })))
    await expect(apiFetch('/api/x')).resolves.toEqual({ ok: 1 })
    expect(fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('maps ProblemDetails to its code and traceId', async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 404, code: 'common.not_found', traceId: 't-1' }), {
          status: 404,
          headers: { 'content-type': 'application/problem+json' },
        }),
      ),
    )
    await expect(apiFetch('/api/x')).rejects.toEqual(new ApiError(404, 'common.not_found', 't-1'))
  })

  it('keeps the field errors of validation.failed', async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: 'validation.failed',
            errors: { newPassword: ['password.too_short'] },
          }),
          { status: 400, headers: { 'content-type': 'application/problem+json' } },
        ),
      ),
    )
    await expect(apiFetch('/api/x')).rejects.toMatchObject({
      code: 'validation.failed',
      errors: { newPassword: ['password.too_short'] },
    })
  })

  it('falls back to common.unexpected without ProblemDetails', async () => {
    stubFetch(() => Promise.resolve(new Response('<html>', { status: 502 })))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({
      status: 502,
      code: 'common.unexpected',
    })
  })

  it('maps a network failure to common.network', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 0, code: 'common.network' })
  })
})

describe('apiFetch antiforgery, JSON and 401', () => {
  const ok = () => Promise.resolve(new Response(null, { status: 204 }))
  const sent = () => vi.mocked(fetch).mock.calls[0]![1]!
  const sentHeaders = () => new Headers(sent().headers)

  afterEach(() => setUnauthorizedHandler(undefined))

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('sends X-XSRF-TOKEN on %s', async (method) => {
    vi.stubGlobal('document', { cookie: 'other=1; XSRF-TOKEN=CfDJ8%2Ba_b; x=2' })
    stubFetch(ok)
    await apiFetch('/api/x', { method })
    expect(sentHeaders().get('X-XSRF-TOKEN')).toBe('CfDJ8+a_b')
  })

  it.each(['GET', undefined])('sends no X-XSRF-TOKEN on %s', async (method) => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=t' })
    stubFetch(ok)
    await apiFetch('/api/x', { method })
    expect(sentHeaders().has('X-XSRF-TOKEN')).toBe(false)
  })

  it('sends a JSON body with Content-Type: application/json', async () => {
    vi.stubGlobal('document', { cookie: '' })
    stubFetch(ok)
    await apiFetch('/api/x', { method: 'POST', body: { a: 'ế' } })
    expect(sent().body).toBe('{"a":"ế"}')
    expect(sentHeaders().get('Content-Type')).toBe('application/json')
  })

  it('sends no Content-Type without a body', async () => {
    stubFetch(ok)
    await apiFetch('/api/x')
    expect(sentHeaders().has('Content-Type')).toBe(false)
  })

  const unauthorized = () =>
    Promise.resolve(
      new Response(JSON.stringify({ code: 'auth.unauthenticated' }), {
        status: 401,
        headers: { 'content-type': 'application/problem+json' },
      }),
    )

  it('calls the 401 handler and still rejects', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    stubFetch(unauthorized)
    await expect(apiFetch('/api/students?q=a')).rejects.toMatchObject({
      status: 401,
      code: 'auth.unauthenticated',
    })
    expect(handler).toHaveBeenCalledOnce()
  })

  it.each(['/api/auth/login', '/api/auth/me'] as const)(
    'does not call the 401 handler for %s',
    async (path) => {
      const handler = vi.fn()
      setUnauthorizedHandler(handler)
      stubFetch(unauthorized)
      await expect(apiFetch(path)).rejects.toMatchObject({ status: 401 })
      expect(handler).not.toHaveBeenCalled()
    },
  )

  it('does not call the 401 handler for a 403', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    stubFetch(() => Promise.resolve(new Response(null, { status: 403 })))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 403 })
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('api', () => {
  it('fills path params and query from the generated types', async () => {
    stubFetch(() => Promise.resolve(Response.json({ items: [], total: 0 })))
    const page = await api('get', '/api/students', {
      query: { q: 'nguyễn', page: 2, status: undefined },
    })
    expect(page.total).toBe(0)
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/students?q=nguy%E1%BB%85n&page=2')

    stubFetch(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('document', { cookie: '' })
    await api('post', '/api/students/{id}/archive', { params: { id: 'a/b' } })
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/students/a%2Fb/archive')
  })
})
