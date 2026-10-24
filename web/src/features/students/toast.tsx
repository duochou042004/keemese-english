import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

// shortcut: a tiny toast store for the student pages (no sonner yet: a new dependency needs approval); move it to
// components/ when another area needs toasts.
type Toast = { id: number; text: string; action?: { label: string; run: () => void } }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Shows `text` for 3 s, or 5 s with an action such as Undo (design-system.md "Destructive"). */
export function toast(text: string, action?: Toast['action']) {
  toasts = [...toasts, { id: nextId++, text, action }]
  emit()
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** The live region the toasts appear in; rendered once around the student pages so a toast survives navigation. */
export function Toaster() {
  const list = useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => toasts,
  )
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 md:right-4 md:bottom-4 md:left-auto md:items-end"
    >
      {list.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  )
}

function ToastItem({ id, text, action }: Toast) {
  const { t } = useTranslation()
  // Paused while hovered or focused, so the Undo button doesn't vanish under the pointer or keyboard.
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => dismiss(id), action ? 5000 : 3000)
    return () => clearTimeout(timer)
  }, [id, action, paused])
  return (
    <div
      className="flex max-w-md items-center gap-3 rounded-panel border border-border bg-surface px-4 py-3 shadow-lg"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="min-w-0 flex-1 break-words">{text}</p>
      {action && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            dismiss(id)
            action.run()
          }}
        >
          {action.label}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        aria-label={t('common.dismiss')}
        onClick={() => dismiss(id)}
      >
        <span aria-hidden="true">×</span>
      </Button>
    </div>
  )
}
