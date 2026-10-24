import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// shadcn/ui Input, restyled with the project tokens (docs/frontend/design-system.md). 44 px on phones.
function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-11 w-full rounded-control border border-border bg-surface px-3 text-body md:h-10 aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
