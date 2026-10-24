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

// The avatar button is named "<prefix>: <display name>"; Playwright matches the prefix as a substring.
const accountMenu = (page: Page, ui: Ui) =>
  page.getByRole('button', { name: ui.shell.accountMenu.split('{{')[0] })

async function openFromAccountMenu(page: Page, ui: Ui, item: string) {
  await accountMenu(page, ui).click()
  await page.getByRole('menuitem', { name: item }).click()
}

/** OD-09: only shipped items are in the nav, and the current one is marked. */
async function expectNav(page: Page, ui: Ui, shown: string[], hidden: string[], current: string) {
  const nav = page.getByRole('navigation', { name: ui.nav.label })
  for (const name of shown) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
  for (const name of hidden)
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: current, exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
}

async function changePassword(page: Page, current: string, next: string, ui: Ui) {
  await page.getByLabel(ui.changePassword.current, { exact: true }).fill(current)
  await page.getByLabel(ui.changePassword.new, { exact: true }).fill(next)
  await page.getByLabel(ui.changePassword.confirm, { exact: true }).fill(next)
  await page.getByRole('button', { name: ui.changePassword.submit }).click()
}

test('tutor: bootstrap login, forced change, Today shell, language saved in settings, logout, back stays out @smoke', async ({
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
  await expect(page.getByRole('heading', { level: 1, name: vi.today.title })).toBeVisible()
  await expect(page.getByRole('link', { name: vi.today.addStudent })).toBeVisible()
  await expect(page.getByText(vi.today.sessionsEmpty)).toBeVisible()
  await expect(page.getByText(vi.today.reviewEmpty)).toBeVisible()
  await expectNav(
    page,
    vi,
    [vi.nav.today, vi.nav.students],
    [vi.nav.calendar, vi.nav.review, vi.nav.activities, vi.nav.questions, vi.nav.library],
    vi.nav.today,
  )
  await expectAccessible(page)

  await openFromAccountMenu(page, vi, vi.shell.settings)
  await expect(page).toHaveURL(/\/t\/settings$/)
  await expect(page.getByRole('link', { name: vi.changePassword.title })).toBeVisible()
  await expectAccessible(page)

  const saved = page.waitForResponse((r) => r.url().endsWith('/api/auth/preferences'))
  await page.getByRole('button', { name: en.language.en }).click()
  expect((await saved).status()).toBe(204)
  await expect(page.getByRole('heading', { level: 1, name: en.shell.settings })).toBeVisible()

  // T18: after logout the back button must not show the tutor area again.
  await openFromAccountMenu(page, en, en.auth.signOut)
  await expect(page).toHaveURL(/\/login$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/login\?redirect=%2Ft%2Fsettings$/)
  await expect(page.getByRole('button', { name: en.login.submit })).toBeVisible()
})

test('student: created via the API, login, forced change, Home shell, account page, kept out of /t @smoke', async ({
  page,
}) => {
  const student = await createStudent(tutorPassword, 'Trần Gia Bảo')
  await page.goto('/login')
  await expectAccessible(page)
  await signIn(page, student.userName, student.temporaryPassword)
  await expect(page).toHaveURL(/\/change-password$/)
  await expectAccessible(page)
  await changePassword(page, student.temporaryPassword, newPassword(), vi)
  await expect(page).toHaveURL(/\/s$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: vi.home.greeting.replace('{{name}}', 'Trần Gia Bảo'),
    }),
  ).toBeVisible()
  await expect(page.getByText(vi.home.tasksEmpty)).toBeVisible()
  await expect(page.getByText(vi.home.nextSessionEmpty)).toBeVisible()
  await expectNav(
    page,
    vi,
    [vi.nav.home],
    [vi.nav.tasks, vi.nav.lessons, vi.nav.materials, vi.nav.progress],
    vi.nav.home,
  )
  await expectAccessible(page)

  await openFromAccountMenu(page, vi, vi.shell.account)
  await expect(page).toHaveURL(/\/s\/account$/)
  await expect(page.getByRole('heading', { level: 1, name: vi.shell.account })).toBeVisible()
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
