import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireSession } from '@/lib/guard'

// Tutor area shell (/t/*).
export const Route = createFileRoute('/t')({
  beforeLoad: requireSession,
  component: Outlet,
})
