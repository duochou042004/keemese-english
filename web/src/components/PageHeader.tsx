import type { ReactNode } from 'react'

/** The page title and at most one primary action; on phones the action sits in a bar at the bottom (IA layout shells). */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-h2 font-semibold break-words">{title}</h1>
        {description && <p className="mt-1 text-text-muted">{description}</p>}
      </div>
      {action && (
        <div className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-10 max-md:border-t max-md:border-border max-md:bg-surface max-md:p-4 max-md:*:w-full">
          {action}
        </div>
      )}
    </div>
  )
}
