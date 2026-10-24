import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { buttonVariants } from '@/components/ui/button'

// Today, M1 shell (FR-DASH-01): designed empty states until sessions (M5) and the review queue (M4) exist.
export const Route = createFileRoute('/t/')({ component: Today })

function Today() {
  const { t, i18n } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(new Date())
  // shortcut: a plain string until T-108 adds the route (J2); then link to it type-checked.
  const addStudent: string = '/t/students/new'
  return (
    <>
      <PageHeader
        title={t('today.title')}
        description={date}
        action={
          <Link to={addStudent} className={buttonVariants()}>
            {t('today.addStudent')}
          </Link>
        }
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <EmptyState title={t('today.sessions')} icon="calendar" text={t('today.sessionsEmpty')} />
        <EmptyState title={t('today.review')} icon="review" text={t('today.reviewEmpty')} />
      </div>
    </>
  )
}
