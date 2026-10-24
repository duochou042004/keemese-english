import { createFileRoute, Outlet } from '@tanstack/react-router'
import { StudentWorkspace } from '@/features/students/Workspace'

export const Route = createFileRoute('/t/students/$studentId')({ component: Workspace })

function Workspace() {
  const { studentId } = Route.useParams()
  return (
    <StudentWorkspace id={studentId}>
      <Outlet />
    </StudentWorkspace>
  )
}
