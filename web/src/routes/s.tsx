import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireSession } from '@/lib/guard'

// Student area shell (/s/*).
export const Route = createFileRoute('/s')({
  beforeLoad: requireSession,
  component: Outlet,
})
