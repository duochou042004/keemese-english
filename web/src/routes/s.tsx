import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { requireRole } from '@/lib/guard'

// Student area shell (/s/*).
export const Route = createFileRoute('/s')({
  beforeLoad: requireRole('student'),
  component: () => <AppShell area="student" />,
})
