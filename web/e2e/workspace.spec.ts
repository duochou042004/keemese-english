import { expect, test, type Browser, type Page } from '@playwright/test'
import vi from '../src/locales/vi/common.json' with { type: 'json' }
import config from '../playwright.config'
import { expectAccessible } from './fixtures/axe'
import { createStudents, ensureTutor, newPassword, tutor } from './fixtures/seed'
import { changePassword, signIn } from './fixtures/ui'

// E2E-ISO, M1 form (docs/frontend/ux-journeys.md#journey--e2e-mapping), plus the workspace and account actions
// (T-109). Own client addresses, like students.spec.ts, within the 5-per-minute limit (T1): the tutor's (seed
// logins and the browser) and the students' (A and B).
const headers = { ...config.use?.extraHTTPHeaders, 'X-Forwarded-For': '203.0.113.9' }
const studentHeaders = { ...config.use?.extraHTTPHeaders, 'X-Forwarded-For': '203.0.113.10' }
test.use({ extraHTTPHeaders: headers })

test.beforeAll(() => ensureTutor('vi', headers))

const t = (text: string, name: string) => text.replace('{{name}}', name)

/** Signs a new student in from a fresh browser context and gets them past the forced password change to /s. */
async function studentPage(browser: Browser, userName: string, password: string) {
  const context = await browser.newContext({
    baseURL: config.use?.baseURL,
    extraHTTPHeaders: studentHeaders,
  })
  const page = await context.newPage()
  await page.goto('/login')
  await signIn(page, userName, password, vi)
  await changePassword(page, password, newPassword(), vi)
  await expect(page).toHaveURL(/\/s$/)
  return page
}

async function openAndCheckDialog(page: Page, trigger: string) {
  await page.getByRole('button', { name: trigger, exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expectAccessible(page)
  return dialog
}

test('a student cannot reach another student’s workspace; the tutor edits, archives, resets and deletes @smoke @students @isolation', async ({
  page,
  browser,
}) => {
  const [a, b] = await createStudents(['Nguyễn Thị Phương Thảo', 'Lê Minh Khoa'], headers)
  const workspace = `/t/students/${a!.id}`

  // A is signed in somewhere while the tutor works on the account.
  const pageA = await studentPage(browser, a!.userName, a!.temporaryPassword)

  // B: the UI sends any /t URL home to /s, and the API refuses A's data (403, tutor policy).
  const pageB = await studentPage(browser, b!.userName, b!.temporaryPassword)
  for (const url of [workspace, `${workspace}/profile`, '/t/students']) {
    await pageB.goto(url)
    await expect(pageB).toHaveURL(/\/s$/)
  }
  await expect(pageB.getByText(a!.fullName)).toHaveCount(0)
  for (const path of [`/api/students/${a!.id}`, '/api/students'])
    expect((await pageB.request.get(path)).status(), `student B GET ${path}`).toBe(403)
  await pageB.context().close()

  // Tutor: the workspace header and tabs, then Overview.
  await page.goto('/login')
  await signIn(page, tutor.userName, tutor.password, vi)
  await expect(page).toHaveURL(/\/t$/)
  await page.goto(workspace)
  await expect(page.getByRole('heading', { level: 1, name: a!.fullName })).toBeVisible()
  await expect(page.getByText(a!.userName)).toBeVisible()
  const tabs = page.getByRole('navigation', { name: vi.students.workspace.tabs })
  await expect(tabs.getByRole('link')).toHaveText([
    vi.students.workspace.overview,
    vi.students.workspace.profile,
  ])
  await expect(tabs.getByRole('link', { name: vi.students.workspace.overview })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByText(vi.students.overview.tasksEmpty)).toBeVisible()
  await expectAccessible(page)

  // Profile: edit and save (version), a parent added.
  await tabs.getByRole('link', { name: vi.students.workspace.profile }).click()
  await expect(page).toHaveURL(new RegExp(`${workspace}/profile$`))
  await expectAccessible(page)
  await page.getByLabel(vi.students.phone, { exact: true }).fill('0912 345 678')
  await page.getByRole('button', { name: vi.students.addParent }).click()
  await page.getByLabel(vi.students.parentName, { exact: true }).fill('Nguyễn Văn An')
  await page.getByRole('button', { name: vi.students.profile.save }).click()
  await expect(page.getByText(vi.students.profile.saved)).toBeVisible()
  await page.reload()
  await expect(page.getByLabel(vi.students.phone, { exact: true })).toHaveValue('0912 345 678')
  await expect(page.getByLabel(vi.students.parentName, { exact: true })).toHaveValue(
    'Nguyễn Văn An',
  )
  await expect(page.getByRole('button', { name: vi.students.account.unlock })).toHaveCount(0)

  // Archive: the dialog explains it, then a toast offers Undo; A's open session ends at the next navigation.
  const archive = await openAndCheckDialog(page, vi.students.account.archive)
  await expect(archive).toContainText(vi.students.account.archiveConfirmText)
  await archive.getByRole('button', { name: vi.students.account.archive }).click()
  await expect(page.getByText(t(vi.students.account.archived, a!.fullName))).toBeVisible()
  await expect(page.getByRole('button', { name: vi.students.account.undo })).toBeVisible()
  await expect(page.getByText(vi.students.status.archived, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: vi.students.account.restore })).toBeVisible()
  await pageA.goto('/s/account')
  await expect(pageA).toHaveURL(/\/login(\?|$)/)
  await pageA.context().close()

  // Reset password: confirm, then the new password once.
  const reset = await openAndCheckDialog(page, vi.students.account.reset)
  await reset.getByRole('button', { name: vi.students.account.reset }).click()
  await expect(page.getByText(vi.students.account.issued)).toBeVisible()
  await expect(page.getByText(/^[A-Za-z2-9]{12}$/)).toBeVisible()
  await expectAccessible(page)

  // Restore asks first too; cancel keeps the student archived.
  const restore = await openAndCheckDialog(page, vi.students.account.restore)
  await restore.getByRole('button', { name: vi.common.cancel }).click()
  await expect(restore).toBeHidden()

  // Delete: disabled until the exact name is typed; then the list with a toast, and the URL is not found.
  const remove = await openAndCheckDialog(page, vi.students.account.delete)
  const confirm = remove.getByRole('button', { name: vi.students.account.deleteConfirm })
  const typed = remove.getByLabel(t(vi.students.account.typeName, a!.fullName))
  await expect(confirm).toBeDisabled()
  await typed.fill('Nguyễn Thị Phương')
  await expect(confirm).toBeDisabled()
  await typed.fill(a!.fullName)
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page).toHaveURL(/\/t\/students$/)
  await expect(page.getByText(t(vi.students.account.deleted, a!.fullName))).toBeVisible()
  await expectAccessible(page)
  await page.goto(workspace)
  await expect(page.getByRole('heading', { name: vi.students.notFound.title })).toBeVisible()
  await expectAccessible(page)
})
