import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { meQuery } from '@/lib/guard'

// Home, M1 shell (FR-DASH-02): the greeting, then empty states until tasks (M4) and sessions (M5) exist.
export const Route = createFileRoute('/s/')({ component: Home })

function Home() {
  const { t } = useTranslation()
  const name = useSuspenseQuery(meQuery).data?.displayName ?? ''
  return (
    <>
      <PageHeader title={t('home.greeting', { name })} />
      <div className="grid gap-8 lg:grid-cols-2">
        <EmptyState title={t('home.tasks')} icon="tasks" text={t('home.tasksEmpty')} />
        <EmptyState
          title={t('home.nextSession')}
          icon="lessons"
          text={t('home.nextSessionEmpty')}
        />
      </div>
    </>
  )
}
