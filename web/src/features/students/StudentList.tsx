import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '@/api/client'
import { EmptyState } from '@/components/EmptyState'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useErrorText } from '@/lib/errors'

export const studentStatuses = ['active', 'archived'] as const
export type StudentStatus = (typeof studentStatuses)[number]
export type StudentSearch = { q?: string; status?: StudentStatus }

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

/** FR-STU-03: search by name and filter by status, both kept in the URL; rows open the workspace. */
export function StudentList({
  q,
  status = 'active',
  onSearchChange,
}: StudentSearch & { onSearchChange: (search: StudentSearch) => void }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState(q ?? '')
  // Active is the default, so it stays out of the URL.
  const statusParam = status === 'active' ? undefined : status

  // The URL changed from outside (nav link, back button): show its q, or the debounce would write the old one back.
  const [shownQ, setShownQ] = useState(q)
  if (q !== shownQ) {
    setShownQ(q)
    if ((text.trim() || undefined) !== q) setText(q ?? '')
  }

  useEffect(() => {
    const next = text.trim() || undefined
    if (next === q) return
    const id = setTimeout(
      () => onSearchChange({ q: next, status: statusParam }),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(id)
  }, [text, q, statusParam, onSearchChange])

  const list = useInfiniteQuery({
    queryKey: ['students', { q, status }],
    queryFn: ({ pageParam }) =>
      api('get', '/api/students', { query: { q, status, page: pageParam, pageSize: PAGE_SIZE } }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * PAGE_SIZE < Number(last.total) ? pages.length + 1 : undefined,
    placeholderData: keepPreviousData,
  })
  const showSkeleton = useDelayed(list.isPending)
  const students = list.data?.pages.flatMap((p) => p.items) ?? []
  const lastLogin = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
          <label htmlFor="student-search" className="text-small font-medium">
            {t('students.search')}
          </label>
          <Input
            id="student-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div role="group" aria-label={t('students.statusLabel')} className="flex gap-1">
          {studentStatuses.map((s) => (
            <Button
              key={s}
              variant={s === status ? 'default' : 'outline'}
              aria-pressed={s === status}
              onClick={() => onSearchChange({ q, status: s === 'active' ? undefined : s })}
            >
              {t(`students.status.${s}`)}
            </Button>
          ))}
        </div>
      </div>

      {list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.isPending ? (
        showSkeleton && <ListSkeleton label={t('students.loading')} />
      ) : students.length === 0 ? (
        <EmptyList q={q} status={status} />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-panel border border-border bg-surface">
            {students.map((s) => (
              <li key={s.id}>
                <StudentLink
                  id={s.id}
                  className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface-muted"
                >
                  <span className="font-medium break-words">{s.fullName}</span>
                  <span className="text-small break-words text-text-muted">
                    {s.userName} ·{' '}
                    {s.lastLoginAt
                      ? t('students.lastLogin', { date: lastLogin.format(new Date(s.lastLoginAt)) })
                      : t('students.neverSignedIn')}
                  </span>
                </StudentLink>
              </li>
            ))}
          </ul>
          {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
          {list.hasNextPage && (
            <Button
              variant="outline"
              className="self-center"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {t('students.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

/** The link to a student's workspace. */
export function StudentLink({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link to="/t/students/$studentId" params={{ studentId: id }} className={className}>
      {children}
    </Link>
  )
}

function EmptyList({ q, status }: StudentSearch) {
  const { t } = useTranslation()
  if (q)
    return (
      <p role="status" className="py-6 text-center text-text-muted">
        {t('students.noMatch', { q })}
      </p>
    )
  if (status === 'archived')
    return (
      <EmptyState
        title={t('students.archivedEmptyTitle')}
        icon="students"
        text={t('students.archivedEmpty')}
      />
    )
  return (
    <EmptyState
      title={t('students.emptyTitle')}
      icon="students"
      text={t('students.empty')}
      action={
        <Link to="/t/students/new" className={buttonVariants()}>
          {t('students.addFirst')}
        </Link>
      }
    />
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const apiError = error instanceof ApiError ? error : undefined
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-danger">{errorText(apiError?.code ?? 'common.unexpected')}</p>
      <Button variant="outline" onClick={onRetry}>
        {t('common.retry')}
      </Button>
      {apiError?.traceId && <p className="text-caption text-text-muted">{apiError.traceId}</p>}
    </div>
  )
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <ul aria-busy="true" aria-label={label} className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-panel bg-surface-muted" />
      ))}
    </ul>
  )
}

/** True once `on` has lasted `ms`: the skeleton appears only after 300 ms (design-system.md "Loading"). */
export function useDelayed(on: boolean, ms = 300) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!on) return
    const id = setTimeout(() => setShown(true), ms)
    return () => {
      clearTimeout(id)
      setShown(false)
    }
  }, [on, ms])
  return on && shown
}
