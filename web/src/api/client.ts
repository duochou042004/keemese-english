/** A failed API call. `code` is a key in errors.json (ADR-0008: the API never returns prose). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly traceId?: string,
  ) {
    super(code)
    this.name = 'ApiError'
  }
}

// shortcut: no antiforgery header yet; M1 adds the XSRF token for unsafe methods (ADR-0004).
export async function apiFetch<T>(path: `/api/${string}`, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiError(0, 'common.network')
  }

  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T

  let code = 'common.unexpected'
  let traceId: string | undefined
  if (res.headers.get('content-type')?.includes('application/problem+json')) {
    const problem = (await res.json().catch(() => ({}))) as { code?: unknown; traceId?: unknown }
    if (typeof problem.code === 'string') code = problem.code
    if (typeof problem.traceId === 'string') traceId = problem.traceId
  }
  throw new ApiError(res.status, code, traceId)
}
