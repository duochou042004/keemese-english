import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/lib/guard'

// Placeholder: M1 sends a signed-in tutor to /t and a student to /s.
export const Route = createFileRoute('/')({
  beforeLoad: requireSession,
})
