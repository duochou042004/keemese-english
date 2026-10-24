import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { PageHeader } from '@/components/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import { StudentList, studentStatuses, type StudentSearch } from '@/features/students/StudentList'

export const Route = createFileRoute('/t/students/')({
  validateSearch: z.object({
    q: z.string().trim().min(1).max(200).optional().catch(undefined),
    status: z.enum(studentStatuses).optional().catch(undefined),
  }),
  component: Students,
})

function Students() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useCallback(
    (next: StudentSearch) => void navigate({ search: next, replace: true }),
    [navigate],
  )
  return (
    <>
      <PageHeader
        title={t('students.title')}
        action={
          <Link to="/t/students/new" className={buttonVariants()}>
            {t('students.add')}
          </Link>
        }
      />
      <StudentList {...search} onSearchChange={onSearchChange} />
    </>
  )
}
