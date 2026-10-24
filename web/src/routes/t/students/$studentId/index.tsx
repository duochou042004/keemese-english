import { createFileRoute } from '@tanstack/react-router'
import { StudentOverview } from '@/features/students/Workspace'

export const Route = createFileRoute('/t/students/$studentId/')({ component: StudentOverview })
