import { createFileRoute } from '@tanstack/react-router'
import { StudentProfile } from '@/features/students/Profile'

export const Route = createFileRoute('/t/students/$studentId/profile')({ component: Profile })

function Profile() {
  const { studentId } = Route.useParams()
  // Keyed: another student's profile starts fresh (form values, a shown temporary password).
  return <StudentProfile key={studentId} id={studentId} />
}
