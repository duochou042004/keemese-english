import { Link, Outlet } from '@tanstack/react-router'
import { Dialog, Tooltip } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountMenu } from '@/components/AccountMenu'
import { Icon } from '@/components/icons'
import { visibleNav, type NavItem } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { roleHome, type Role } from '@/lib/redirect'
import { cn } from '@/lib/utils'

const linkClass =
  'flex h-10 items-center gap-3 rounded-control px-3 text-small font-medium text-text-muted hover:bg-surface-muted hover:text-text pointer-coarse:h-11 data-[status=active]:bg-surface-muted data-[status=active]:text-primary'

/**
 * IA layout shells: ≥ 1280 labelled sidebar (tutor 240 px, student 220 px), 768–1279 a 64 px icon rail with
 * tooltips, < 768 a top bar with a menu drawer (tutor) or a bottom tab bar (student).
 */
export function AppShell({ area }: { area: Role }) {
  const { t } = useTranslation()
  const items = visibleNav(area)
  return (
    <Tooltip.Provider delayDuration={300}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('shell.skipToContent')}
      </a>
      <div className="flex min-h-dvh">
        <nav
          aria-label={t('nav.label')}
          className={cn(
            'sticky top-0 hidden h-dvh w-16 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex',
            area === 'tutor' ? 'xl:w-60' : 'xl:w-55',
          )}
        >
          {items.map((item) => (
            <Tooltip.Root key={item.id}>
              <Tooltip.Trigger asChild>
                <NavLink item={item} area={area} className="max-xl:justify-center max-xl:px-0">
                  <span className="sr-only xl:not-sr-only">{t(`nav.${item.id}`)}</span>
                </NavLink>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="z-50 rounded-control bg-text px-2 py-1 text-caption text-surface xl:hidden"
                >
                  {t(`nav.${item.id}`)}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-14 items-center gap-2 border-b border-border bg-surface px-4 md:px-8">
            {area === 'tutor' && <MenuDrawer items={items} />}
            <Link to={roleHome(area)} className="font-semibold text-primary">
              {t('app.name')}
            </Link>
            <AccountMenu area={area} />
          </header>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-300 flex-1 px-4 pt-6 pb-24 outline-none md:px-8 md:pb-8"
          >
            <Outlet />
          </main>
        </div>
      </div>
      {area === 'student' && (
        <nav
          aria-label={t('nav.label')}
          className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden"
        >
          {items.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              area={area}
              className="h-auto min-h-14 flex-1 flex-col justify-center gap-1 rounded-none px-1 text-caption"
            >
              <span>{t(`nav.${item.id}`)}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </Tooltip.Provider>
  )
}

function NavLink({
  item,
  area,
  className,
  children,
  ...props
}: {
  item: NavItem
  area: Role
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  // shortcut: a plain string because unshipped targets aren't routes yet; visibleNav keeps them out of the shell.
  const to: string = item.to
  return (
    <Link
      to={to}
      // The area home is active only on itself, not on every page below it.
      activeOptions={{ exact: item.to === roleHome(area) }}
      className={cn(linkClass, className)}
      {...props}
    >
      <Icon name={item.id} />
      {children}
    </Link>
  )
}

/** Tutor, < 768 px: the nav in a drawer from the left. */
function MenuDrawer({ items }: { items: NavItem[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 md:hidden"
          aria-label={t('shell.openMenu')}
        >
          <Icon name="menu" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 bg-surface p-4 shadow-lg"
        >
          <Dialog.Title className="mb-2 px-3 font-semibold text-primary">
            {t('app.name')}
          </Dialog.Title>
          <nav aria-label={t('nav.label')} className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink key={item.id} item={item} area="tutor" onClick={() => setOpen(false)}>
                <span>{t(`nav.${item.id}`)}</span>
              </NavLink>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
