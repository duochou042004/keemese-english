import { createFileRoute } from '@tanstack/react-router'
import { TemporaryShell } from '@/components/TemporaryShell'
import { requireRole } from '@/lib/guard'

// Tutor area shell (/t/*).
export const Route = createFileRoute('/t')({
  beforeLoad: requireRole('tutor'),
  component: TemporaryShell,
})
