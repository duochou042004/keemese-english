import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

type Props = ComponentProps<typeof Input> & {
  id: string
  label: string
  hint?: string
  error?: string
}

/** Label, input, optional hint and the inline field error (design-system.md "Errors"). */
export function FormField({ id, label, hint, error, ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium">
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
