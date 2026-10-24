import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Local runs read the repository .env (the BOOTSTRAP_TUTOR_* the stack was started with); CI sets the variables.
if (existsSync('../.env')) process.loadEnvFile('../.env')

export default defineConfig({
  testDir: 'e2e',
  // The scenarios share one fresh stack and change its state (the bootstrap password), so one worker, no retries.
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'en-US',
    trace: 'retain-on-failure',
    // The app runs as in Production (__Host- Secure cookies) behind a pretend TLS proxy: the E2E stack trusts
    // X-Forwarded-Proto from any address (e2e/reset.mjs), and Chromium keeps Secure cookies on http://localhost.
    extraHTTPHeaders: { 'X-Forwarded-Proto': 'https' },
  },
  // Chromium in PRs (ADR-0013); Firefox and WebKit join in the release workflow.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
