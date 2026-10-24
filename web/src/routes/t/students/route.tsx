import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/features/students/toast'

// The student pages share one toast region, so a toast survives the move from a workspace back to the list.
export const Route = createFileRoute('/t/students')({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
})
