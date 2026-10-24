import { expect, test, type Locator } from '@playwright/test'
import vi from '../src/locales/vi/common.json' with { type: 'json' }
import viErrors from '../src/locales/vi/errors.json' with { type: 'json' }
import config from '../playwright.config'
import { expectAccessible } from './fixtures/axe'
import { ensureTutor, newPassword, tutor } from './fixtures/seed'
import { changePassword, openFromAccountMenu, signIn } from './fixtures/ui'

// E2E-J2 (docs/frontend/ux-journeys.md#j2). The login limit is 5 per minute per client address (T1) and
// E2E-AUTH spends 4 from the default one, so this file signs in from its own address (the E2E stack trusts
// forwarded headers, see playwright.config.ts). Three logins here: the API seed, the tutor, the new student.
const headers = { ...config.use?.extraHTTPHeaders, 'X-Forwarded-For': '203.0.113.8' }
test.use({ extraHTTPHeaders: headers })

test.beforeAll(() => ensureTutor('vi', headers))

test('tutor adds a student in 2 interactions; the student signs in with the copied password; a duplicate username gets a suggestion @smoke @students', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  // J2 budget: "interaction" = one click or submit; typing inside a field doesn't count.
  let interactions = 0
  const interact = async (target: Locator) => {
    interactions++
    await target.click()
  }

  await page.goto('/login')
  await signIn(page, tutor.userName, tutor.password)
  await expect(page).toHaveURL(/\/t$/)

  await page.goto('/t/students')
  await expect(page.getByRole('heading', { level: 1, name: vi.students.title })).toBeVisible()
  await expectAccessible(page)

  await interact(page.getByRole('link', { name: vi.students.add, exact: true }))
  await expect(page).toHaveURL(/\/t\/students\/new$/)
  for (const group of [vi.students.contactGroup, vi.students.parentsGroup])
    await expect(page.locator('details', { hasText: group })).not.toHaveAttribute('open')
  await expectAccessible(page)

  await page.getByLabel(vi.students.fullName, { exact: true }).fill('Trần Gia Bảo')
  await expect(page.getByLabel(vi.students.userName, { exact: true })).toHaveValue('tran.giabao')
  await interact(page.getByRole('button', { name: vi.students.create }))

  await expect(page.getByRole('heading', { name: vi.students.created.title })).toBeFocused()
  expect(interactions, 'J2 interactions from the list to a usable account').toBe(2)
  // FR-STU-AC4 at M1: only Done and Open workspace; no goal, plan or session follow-ups.
  const main = page.getByRole('main')
  await expect(main.getByRole('link')).toHaveText([
    vi.students.created.done,
    vi.students.created.openWorkspace,
  ])
  await expectAccessible(page)

  await page.getByRole('button', { name: vi.students.created.copyMessage }).click()
  await expect(page.getByText(vi.students.copied)).toBeVisible()
  const message = await page.evaluate(() => navigator.clipboard.readText())
  expect(message).toContain('Tên đăng nhập: tran.giabao')
  expect(message).toContain('Username: tran.giabao')
  expect(message).toContain(new URL('/login', page.url()).href)
  const password = /Mật khẩu tạm thời: (\S+)/.exec(message)?.[1]
  expect(password).toMatch(/^[A-Za-z2-9]{12}$/)
  // The password lives only on this panel.
  await expect(page.getByText(password!)).toBeVisible()

  await page.getByRole('link', { name: vi.students.created.done }).click()
  await expect(page).toHaveURL(/\/t\/students$/)
  await page.getByLabel(vi.students.search).fill('tran gia bao') // STU-AC3: no diacritics needed
  await expect(page).toHaveURL(/q=tran\+gia\+bao/)
  // E2E-AUTH adds another Trần Gia Bảo; this one is told apart by its username.
  await expect(page.getByRole('link', { name: /^Trần Gia Bảo.*tran\.giabao / })).toHaveCount(1)
  await expect(page.getByText(password!)).toHaveCount(0)
  await expectAccessible(page)

  // STU-AC2: the same name again → the suggested username is taken → inline error with the next one.
  await page.getByRole('link', { name: vi.students.add, exact: true }).click()
  await page.getByLabel(vi.students.fullName, { exact: true }).fill('Trần Gia Bảo')
  await page.getByRole('button', { name: vi.students.create }).click()
  const userName = page.getByLabel(vi.students.userName, { exact: true })
  await expect(page.getByText(viErrors.students.username_taken)).toBeVisible()
  await expect(userName).toHaveAttribute('aria-invalid', 'true')
  await expectAccessible(page)
  await page
    .getByRole('button', {
      name: vi.students.useSuggestion.replace('{{suggestion}}', 'tran.giabao2'),
    })
    .click()
  await expect(userName).toHaveValue('tran.giabao2')

  await openFromAccountMenu(page, vi, vi.auth.signOut)
  await expect(page).toHaveURL(/\/login$/)
  await signIn(page, 'tran.giabao', password!, vi)
  await expect(page).toHaveURL(/\/change-password$/)
  await changePassword(page, password!, newPassword(), vi)
  await expect(page).toHaveURL(/\/s$/)
})
