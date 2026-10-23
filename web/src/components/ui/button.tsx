import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// shadcn/ui Button, restyled with the project tokens (docs/frontend/design-system.md).
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control text-small font-medium whitespace-nowrap transition-colors ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-fg hover:bg-primary/90',
        outline: 'border border-border bg-surface hover:bg-surface-muted',
        ghost: 'hover:bg-surface-muted',
        danger: 'bg-danger text-white hover:bg-danger/90',
      },
      // 32 px+ for a mouse, 44 px for touch.
      size: {
        default: 'h-9 px-4 pointer-coarse:h-11',
        sm: 'h-8 px-3 pointer-coarse:h-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
