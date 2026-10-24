import { queryOptions, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '@/api/client'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ErrorState, useDelayed } from './StudentList'

/** One student as the tutor sees them; under the list's key, so list invalidations refresh it too. */
export const studentQuery = (id: string) =>
  queryOptions({
    queryKey: ['students', id],
    queryFn: () => api('get', '/api/students/{id}', { params: { id } }),
    // A missing student stays missing: show not-found at once instead of after three retries.
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 3,
  })

const isNotFound = (e: Error | null) => e instanceof ApiError && e.status === 404

/** The workspace header and tabs (IA #student-workspace-tabs); `children` is the open tab. */
export function StudentWorkspace({ id, children }: { id: string; children: ReactNode }) {
  const { t } = useTranslation()
  const student = useQuery(studentQuery(id))
  const showSkeleton = useDelayed(student.isPending)
  const tabs = useRef<HTMLElement>(null)
  // The current tab scrolls into view on phones (IA "Workspace tabs on phone").
  useEffect(() =>
    tabs.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }),
  )

  if (isNotFound(student.error)) return <StudentNotFound />
  if (student.isError && !student.data)
    return <ErrorState error={student.error} onRetry={() => void student.refetch()} />
  if (!student.data)
    return showSkeleton ? (
      <div aria-busy="true" aria-label={t('students.loadingOne')} className="flex flex-col gap-3">
        <div className="h-9 w-2/3 animate-pulse rounded-control bg-surface-muted" />
        <div className="h-5 w-1/3 animate-pulse rounded-control bg-surface-muted" />
      </div>
    ) : null

  const s = student.data
  return (
    <>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-h2 font-semibold break-words">{s.fullName}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-small break-all text-text-muted">{s.userName}</span>
          <Badge variant={s.isActive ? 'default' : 'muted'}>
            {t(`students.status.${s.isActive ? 'active' : 'archived'}`)}
          </Badge>
          {s.isLockedOut && <Badge variant="danger">{t('students.locked')}</Badge>}
        </div>
      </div>
      {/* OD-09: a tab appears when its feature ships; M1 has Overview and Profile. */}
      <nav
        ref={tabs}
        aria-label={t('students.workspace.tabs')}
        className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
      >
        <ul className="flex gap-1 whitespace-nowrap">
          <Tab to="/t/students/$studentId" id={id}>
            {t('students.workspace.overview')}
          </Tab>
          <Tab to="/t/students/$studentId/profile" id={id}>
            {t('students.workspace.profile')}
          </Tab>
        </ul>
      </nav>
      {children}
    </>
  )
}

function Tab({
  to,
  id,
  children,
}: {
  to: '/t/students/$studentId' | '/t/students/$studentId/profile'
  id: string
  children: ReactNode
}) {
  return (
    <li>
      <Link
        to={to}
        params={{ studentId: id }}
        activeOptions={{ exact: true }}
        activeProps={{
          'aria-current': 'page',
          className: 'border-primary text-text',
        }}
        inactiveProps={{ className: 'border-transparent text-text-muted hover:text-text' }}
        className="-mb-px inline-flex min-h-11 items-center border-b-2 px-3 font-medium md:min-h-9"
      >
        {children}
      </Link>
    </li>
  )
}

/** FR-STU-07: what later milestones add, as empty states, never an error. */
export function StudentOverview() {
  const { t } = useTranslation()
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <EmptyState
        title={t('students.overview.nextSession')}
        icon="calendar"
        text={t('students.overview.nextSessionEmpty')}
      />
      <EmptyState
        title={t('students.overview.tasks')}
        icon="tasks"
        text={t('students.overview.tasksEmpty')}
      />
      <EmptyState
        title={t('students.overview.goals')}
        icon="progress"
        text={t('students.overview.goalsEmpty')}
      />
    </div>
  )
}

/** An unknown or deleted student: the localized not-found state inside the shell. */
function StudentNotFound() {
  const { t } = useTranslation()
  return (
    <section className="flex max-w-md flex-col gap-4">
      <h1 className="text-h2 font-semibold">{t('students.notFound.title')}</h1>
      <p className="text-text-muted">{t('students.notFound.body')}</p>
      <Link to="/t/students" className={buttonVariants({ className: 'self-start' })}>
        {t('students.notFound.back')}
      </Link>
    </section>
  )
}
