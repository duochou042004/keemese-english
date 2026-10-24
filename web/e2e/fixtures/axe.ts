import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** ADR-0013: call after every page visit; fails on serious or critical violations. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(blocking, `axe on ${page.url()}`).toEqual([])
}
