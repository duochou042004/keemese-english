import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/icons'

/** A titled section with nothing in it yet: what will appear here, and the next action if one exists. */
export function EmptyState({
  title,
  icon,
  text,
  action,
}: {
  title: string
  icon: IconName
  text: string
  action?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lead font-semibold">{title}</h2>
      <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-border bg-surface px-6 py-10 text-center">
        <Icon name={icon} className="size-8 text-text-muted" />
        <p className="max-w-prose text-text-muted">{text}</p>
        {action}
      </div>
    </section>
  )
}
