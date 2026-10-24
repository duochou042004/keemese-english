import { createFileRoute } from '@tanstack/react-router'
import { redirectHome } from '@/lib/guard'

// A signed-in tutor goes to /t, a student to /s, anyone else to /login.
export const Route = createFileRoute('/')({
  beforeLoad: redirectHome,
})
