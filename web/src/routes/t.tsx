import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { requireRole } from '@/lib/guard'

// Tutor area shell (/t/*).
export const Route = createFileRoute('/t')({
  beforeLoad: requireRole('tutor'),
  component: () => <AppShell area="tutor" />,
})
