// npm run e2e:reset: a fresh E2E stack (new volumes, rebuilt image) under its own Compose project, so the
// development stack's data is never touched. Stop that stack first: both use ports 5432 and 8080.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (existsSync('../.env')) process.loadEnvFile('../.env')
// E2E only: trust X-Forwarded-Proto from anywhere (the ports bind to 127.0.0.1), see playwright.config.ts.
const env = { ...process.env, ForwardedHeaders__KnownNetworks: '0.0.0.0/0,::/0' }
const compose = (...args) =>
  execFileSync(
    'docker',
    ['compose', '-f', '../deploy/compose.yaml', '-p', 'keemese-e2e', '--profile', 'app', ...args],
    { stdio: 'inherit', env },
  )

compose('down', '--volumes')
compose('up', '--build', '--detach', '--wait')
