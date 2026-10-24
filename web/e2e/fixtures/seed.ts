import { expect, request, type APIRequestContext } from '@playwright/test'
import config from '../../playwright.config'

function env(name: string) {
  const value = process.env[name]
  if (!value)
    throw new Error(`${name} is not set (the E2E stack's bootstrap tutor, see e2e/reset.mjs)`)
  return value
}

/** The E2E-only bootstrap tutor the stack was started with (FR-AUTH-03). */
export const tutor = {
  userName: env('BOOTSTRAP_TUTOR_USERNAME'),
  bootstrapPassword: env('BOOTSTRAP_TUTOR_PASSWORD'),
}

/** A fresh password that passes the policy; generated, so no credential-like literal sits in the repository. */
export const newPassword = () => `e2e ${crypto.randomUUID()}`

/** Signs in through the real API; unsafe calls on the result must send `xsrfHeader(context)`. */
async function signIn(userName: string, password: string): Promise<APIRequestContext> {
  const context = await request.newContext({
    baseURL: config.use?.baseURL,
    extraHTTPHeaders: config.use?.extraHTTPHeaders,
  })
  const res = await context.post('/api/auth/login', { data: { userName, password } })
  expect(res.status(), 'seed login').toBe(204)
  return context
}

async function xsrfHeader(context: APIRequestContext) {
  const { cookies } = await context.storageState()
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value
  return { 'X-XSRF-TOKEN': decodeURIComponent(token ?? '') }
}

/** Creates a student with only the required fields (J2); returns the login the tutor would hand over. */
export async function createStudent(tutorPassword: string, fullName: string) {
  const context = await signIn(tutor.userName, tutorPassword)
  const userName = `e2e.${Date.now()}`
  const res = await context.post('/api/students', {
    data: { fullName, userName },
    headers: await xsrfHeader(context),
  })
  expect(res.status(), 'create student').toBe(201)
  const { temporaryPassword } = (await res.json()) as { temporaryPassword: string }
  await context.dispose()
  return { userName, temporaryPassword }
}
