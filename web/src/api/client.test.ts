import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'

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
