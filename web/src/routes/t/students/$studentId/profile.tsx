import { createFileRoute } from '@tanstack/react-router'
import { StudentProfile } from '@/features/students/Profile'

export const Route = createFileRoute('/t/students/$studentId/profile')({ component: Profile })

function Profile() {
  const { studentId } = Route.useParams()
  return <StudentProfile id={studentId} />
}
