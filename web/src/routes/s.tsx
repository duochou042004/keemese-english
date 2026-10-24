import { createFileRoute } from '@tanstack/react-router'
import { TemporaryShell } from '@/components/TemporaryShell'
import { requireRole } from '@/lib/guard'

// Student area shell (/s/*).
export const Route = createFileRoute('/s')({
  beforeLoad: requireRole('student'),
  component: TemporaryShell,
})
