import type { paths } from './schema'

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

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
// A 401 from these means "wrong credentials" or "not signed in yet", not an ended session.
const NO_SESSION_REDIRECT = ['/api/auth/login', '/api/auth/me']

let onUnauthorized: (() => void) | undefined

/** Registered once at startup: clears the query cache and goes to /login?redirect= (keeps this module framework-free). */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler
}

function xsrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))
  return cookie && decodeURIComponent(cookie.slice('XSRF-TOKEN='.length))
}

export type ApiInit = Omit<RequestInit, 'body'> & { body?: unknown }

/** `body` is sent as JSON. Unsafe methods carry the antiforgery header (ADR-0004). */
export async function apiFetch<T>(path: `/api/${string}`, init: ApiInit = {}): Promise<T> {
  const { body, ...rest } = init
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  const token = UNSAFE_METHODS.includes(method) ? xsrfToken() : undefined
  if (token) headers.set('X-XSRF-TOKEN', token)

  let res: Response
  try {
    res = await fetch(path, {
      ...rest,
      method,
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'common.network')
  }

  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T

  if (
    res.status === 401 &&
    !NO_SESSION_REDIRECT.some((p) => path === p || path.startsWith(`${p}?`))
  )
    onUnauthorized?.()

  let code = 'common.unexpected'
  let traceId: string | undefined
  if (res.headers.get('content-type')?.includes('application/problem+json')) {
    const problem = (await res.json().catch(() => ({}))) as { code?: unknown; traceId?: unknown }
    if (typeof problem.code === 'string') code = problem.code
    if (typeof problem.traceId === 'string') traceId = problem.traceId
  }
  throw new ApiError(res.status, code, traceId)
}

// Typed calls over the generated `paths` (ADR-0016): request and response types come from schema.d.ts.
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type PathWith<M extends Method> = {
  [P in keyof paths]: paths[P] extends { [K in M]: object } ? P : never
}[keyof paths]
type Operation<P extends keyof paths, M extends Method> = paths[P][M]
type JsonOf<R> = R extends { content: { 'application/json': infer B } } ? B : undefined
type Success<O> = O extends { responses: infer R } ? JsonOf<R[keyof R & (200 | 201 | 204)]> : never
type CallOptions<O> = {
  params?: O extends { parameters: { path?: infer X } } ? X : never
  query?: O extends { parameters: { query?: infer X } } ? X : never
  body?: O extends { requestBody?: { content: { 'application/json': infer B } } } ? B : never
}

export function api<M extends Method, P extends PathWith<M>>(
  method: M,
  path: P,
  options: CallOptions<Operation<P, M>> = {},
): Promise<Success<Operation<P, M>>> {
  const params = (options.params ?? {}) as Record<string, string>
  let url = path.replace(/\{(\w+)\}/g, (_, name: string) =>
    encodeURIComponent(String(params[name])),
  ) as `/api/${string}`
  const query = new URLSearchParams()
  const entries: [string, string | number | boolean | null | undefined][] = Object.entries(
    options.query ?? {},
  )
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null) query.set(key, String(value))
  }
  if (query.size) url = `${url}?${query}`
  return apiFetch(url, { method: method.toUpperCase(), body: options.body })
}
