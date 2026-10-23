import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
})

function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-h2 font-semibold">{t('notFound.title')}</h1>
      <p className="text-text-muted">{t('notFound.body')}</p>
      <Link to="/login" className={buttonVariants({ className: 'self-start' })}>
        {t('notFound.back')}
      </Link>
    </main>
  )
}
