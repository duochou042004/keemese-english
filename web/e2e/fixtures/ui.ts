import { expect, type Page } from '@playwright/test'
import en from '../../src/locales/en/common.json' with { type: 'json' }

export type Ui = typeof en

export async function signIn(page: Page, userName: string, password: string, ui: Ui = en) {
  await page.getByLabel(ui.login.username, { exact: true }).fill(userName)
  await page.getByLabel(ui.login.password, { exact: true }).fill(password)
  await page.getByRole('button', { name: ui.login.submit }).click()
}

export async function changePassword(page: Page, current: string, next: string, ui: Ui) {
  await page.getByLabel(ui.changePassword.current, { exact: true }).fill(current)
  await page.getByLabel(ui.changePassword.new, { exact: true }).fill(next)
  await page.getByLabel(ui.changePassword.confirm, { exact: true }).fill(next)
  await page.getByRole('button', { name: ui.changePassword.submit }).click()
}

// The avatar button is named "<prefix>: <display name>"; Playwright matches the prefix as a substring.
const accountMenu = (page: Page, ui: Ui) =>
  page.getByRole('button', { name: ui.shell.accountMenu.split('{{')[0] })

export async function openFromAccountMenu(page: Page, ui: Ui, item: string) {
  await accountMenu(page, ui).click()
  await page.getByRole('menuitem', { name: item }).click()
}

/** OD-09: only shipped items are in the nav, and the current one is marked. */
export async function expectNav(
  page: Page,
  ui: Ui,
  shown: string[],
  hidden: string[],
  current: string,
) {
  const nav = page.getByRole('navigation', { name: ui.nav.label })
  for (const name of shown) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
  for (const name of hidden)
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: current, exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
}
