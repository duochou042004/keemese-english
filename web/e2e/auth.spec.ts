import { expect, test, type Page } from '@playwright/test'
import en from '../src/locales/en/common.json' with { type: 'json' }
import enErrors from '../src/locales/en/errors.json' with { type: 'json' }
import vi from '../src/locales/vi/common.json' with { type: 'json' }
import { expectAccessible } from './fixtures/axe'
import { createStudent, newPassword, tutor } from './fixtures/seed'

// E2E-AUTH (docs/frontend/ux-journeys.md#journey--e2e-mapping). Serial: the student is created by the tutor
// whose password the first test changes. Four logins in total, under the 5-per-minute-per-IP limit (T1).
test.describe.configure({ mode: 'serial' })

type Ui = typeof en
let tutorPassword = tutor.bootstrapPassword

async function signIn(page: Page, userName: string, password: string, ui: Ui = en) {
  await page.getByLabel(ui.login.username, { exact: true }).fill(userName)
  await page.getByLabel(ui.login.password, { exact: true }).fill(password)
  await page.getByRole('button', { name: ui.login.submit }).click()
}

async function changePassword(page: Page, current: string, next: string, ui: Ui) {
  await page.getByLabel(ui.changePassword.current, { exact: true }).fill(current)
  await page.getByLabel(ui.changePassword.new, { exact: true }).fill(next)
  await page.getByLabel(ui.changePassword.confirm, { exact: true }).fill(next)
  await page.getByRole('button', { name: ui.changePassword.submit }).click()
}

test('tutor: bootstrap login, forced change, /t, language saved, logout, back stays out @smoke', async ({
  page,
}) => {
  await page.goto('/t')
  await expect(page).toHaveURL(/\/login\?redirect=%2Ft$/)
  await expect(page.getByRole('link')).toHaveCount(0) // no sign-up link (FR-AUTH-AC3)
  await expectAccessible(page)

  await signIn(page, tutor.userName, tutor.bootstrapPassword)
  await expect(page).toHaveURL(/\/change-password$/)
  // The account's language (vi by default) replaces the browser's en (FR-AUTH-08).
  await expect(page.getByRole('heading', { name: vi.changePassword.forcedTitle })).toBeVisible()
  await expectAccessible(page)

  const next = newPassword()
  await changePassword(page, tutor.bootstrapPassword, next, vi)
  await expect(page).toHaveURL(/\/t$/)
  tutorPassword = next
  await expectAccessible(page)

  const saved = page.waitForResponse((r) => r.url().endsWith('/api/auth/preferences'))
  await page.getByRole('button', { name: en.language.en }).click()
  expect((await saved).status()).toBe(204)

  // T18: after logout the back button must not show the tutor area again.
  await page.getByRole('button', { name: en.auth.signOut }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/login\?redirect=%2Ft$/)
  await expect(page.getByRole('button', { name: en.login.submit })).toBeVisible()
})

test('student: created via the API, login, forced change, /s, kept out of /t @smoke', async ({
  page,
}) => {
  const student = await createStudent(tutorPassword, 'Trần Gia Bảo')
  await page.goto('/login')
  await signIn(page, student.userName, student.temporaryPassword)
  await expect(page).toHaveURL(/\/change-password$/)
  await changePassword(page, student.temporaryPassword, newPassword(), vi)
  await expect(page).toHaveURL(/\/s$/)
  await expect(page.getByText('Trần Gia Bảo')).toBeVisible()
  await expectAccessible(page)

  await page.goto('/t')
  await expect(page).toHaveURL(/\/s$/)
})

test('a wrong password shows the generic error @smoke', async ({ page }) => {
  await page.goto('/login')
  await signIn(page, tutor.userName, 'not the right one')
  await expect(page.getByRole('alert')).toHaveText(enErrors.auth.invalid_credentials)
  await expect(page).toHaveURL(/\/login$/)
  await expectAccessible(page)
})
