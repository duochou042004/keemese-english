import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// shadcn/ui Badge, restyled with the project tokens; always text, never color alone (design-system.md).
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/10 text-primary',
        muted: 'border-border bg-surface-muted text-text-muted',
        danger: 'border-danger/30 bg-danger/10 text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge }
