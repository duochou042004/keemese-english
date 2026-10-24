import { expect, request, type APIRequestContext } from '@playwright/test'
import config from '../../playwright.config'

function env(name: string) {
  const value = process.env[name]
  if (!value)
    throw new Error(`${name} is not set (the E2E stack's bootstrap tutor, see e2e/reset.mjs)`)
  return value
}

const bootstrapPassword = env('BOOTSTRAP_TUTOR_PASSWORD')

/**
 * The E2E-only bootstrap tutor the stack was started with (FR-AUTH-03). `password` is what E2E-AUTH changes it
 * to; derived from the throwaway bootstrap value so every spec file knows it without sharing state.
 */
export const tutor = {
  userName: env('BOOTSTRAP_TUTOR_USERNAME'),
  bootstrapPassword,
  password: `${bootstrapPassword} after e2e`,
}

/** A fresh password that passes the policy; generated, so no credential-like literal sits in the repository. */
export const newPassword = () => `e2e ${crypto.randomUUID()}`

type Headers = Record<string, string> | undefined

/** Signs in through the real API; unsafe calls on the result must send `xsrfHeader(context)`. */
async function signIn(
  userName: string,
  password: string,
  headers: Headers = config.use?.extraHTTPHeaders,
): Promise<APIRequestContext | undefined> {
  const context = await request.newContext({
    baseURL: config.use?.baseURL,
    extraHTTPHeaders: headers,
  })
  const res = await context.post('/api/auth/login', { data: { userName, password } })
  if (res.status() === 204) return context
  expect(res.status(), 'seed login').toBe(401)
  await context.dispose()
}

async function xsrfHeader(context: APIRequestContext) {
  const { cookies } = await context.storageState()
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value
  return { 'X-XSRF-TOKEN': decodeURIComponent(token ?? '') }
}

async function tutorContext(headers?: Headers) {
  const context = await signIn(tutor.userName, tutor.password, headers)
  expect(context, 'tutor login (run E2E-AUTH first or call ensureTutor)').toBeDefined()
  return context!
}

/**
 * For spec files that may run without E2E-AUTH before them: moves the bootstrap tutor to `tutor.password` if
 * that has not happened yet, and sets the account language, so the file starts from a known state.
 */
export async function ensureTutor(language: 'vi' | 'en', headers?: Headers) {
  let context = await signIn(tutor.userName, tutor.password, headers)
  if (!context) {
    const bootstrap = await signIn(tutor.userName, tutor.bootstrapPassword, headers)
    expect(bootstrap, 'bootstrap tutor login').toBeDefined()
    const res = await bootstrap!.post('/api/auth/change-password', {
      data: { currentPassword: tutor.bootstrapPassword, newPassword: tutor.password },
      headers: await xsrfHeader(bootstrap!),
    })
    expect(res.status(), 'tutor change-password').toBe(204)
    context = bootstrap!
  }
  const res = await context.put('/api/auth/preferences', {
    data: { language },
    headers: await xsrfHeader(context),
  })
  expect(res.status(), 'tutor preferences').toBe(204)
  await context.dispose()
}

/** Creates students with only the required fields (J2) in one tutor login; returns what the tutor would hand over. */
export async function createStudents(fullNames: string[], headers?: Headers) {
  const context = await tutorContext(headers)
  const created = []
  for (const [i, fullName] of fullNames.entries()) {
    const userName = `e2e.${Date.now()}.${i}`
    const res = await context.post('/api/students', {
      data: { fullName, userName },
      headers: await xsrfHeader(context),
    })
    expect(res.status(), 'create student').toBe(201)
    const { id, temporaryPassword } = (await res.json()) as {
      id: string
      temporaryPassword: string
    }
    created.push({ id, fullName, userName, temporaryPassword })
  }
  await context.dispose()
  return created
}

export async function createStudent(fullName: string, headers?: Headers) {
  const [student] = await createStudents([fullName], headers)
  return student!
}
