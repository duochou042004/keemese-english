import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { DropdownMenu } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { useSignOut } from '@/components/SignOutButton'
import { meQuery } from '@/lib/guard'
import type { Role } from '@/lib/redirect'

const itemClass =
  'flex h-9 cursor-default items-center rounded-control px-3 text-small outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted pointer-coarse:h-11'

/** The avatar at the top right: Settings (tutor) or Account (student), and Log out. */
export function AccountMenu({ area }: { area: Role }) {
  const { t } = useTranslation()
  const name = useQuery(meQuery).data?.displayName ?? ''
  const { signOut, pending, error } = useSignOut()
  // Vietnamese names end with the given name.
  const initial = name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase()

  return (
    <div className="ml-auto flex items-center gap-3">
      {error && (
        <p role="alert" className="max-w-48 text-right text-caption text-danger">
          {error}
        </p>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={t('shell.accountMenu', { name })}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-small font-semibold text-primary-fg pointer-coarse:size-11"
        >
          <span aria-hidden="true">{initial}</span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-48 rounded-panel border border-border bg-surface p-1 shadow-lg"
          >
            <DropdownMenu.Label className="max-w-64 px-3 py-2 text-small font-medium break-words">
              {name}
            </DropdownMenu.Label>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item asChild className={itemClass}>
              {area === 'tutor' ? (
                <Link to="/t/settings">{t('shell.settings')}</Link>
              ) : (
                <Link to="/s/account">{t('shell.account')}</Link>
              )}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={itemClass}
              disabled={pending}
              onSelect={() => void signOut()}
            >
              {t('auth.signOut')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
