import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertDialog } from 'radix-ui'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useErrorText } from '@/lib/errors'
import { accountMessage } from './credentials'
import { CopyButton } from './StudentFields'
import { toast } from './toast'
import { studentQuery } from './Workspace'

type Student = components['schemas']['TutorStudentDto']

// The API trims and Unicode-normalizes confirmName the same way (api.md, DELETE /api/students/{id}).
export const namesMatch = (typed: string, fullName: string) =>
  typed.trim().normalize('NFC') === fullName.trim().normalize('NFC')

/** Profile → Account: reset password, unlock, archive or restore, delete (FR-AUTH-06, -07, FR-STU-06). */
export function AccountActions({ student }: { student: Student }) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [issued, setIssued] = useState<string>()
  const { id, fullName, userName } = student
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['students'] })

  const archive = async () => {
    await api('post', '/api/students/{id}/archive', { params: { id } })
    void refresh()
    toast(t('students.account.archived', { name: fullName }), {
      label: t('students.account.undo'),
      run: () =>
        void api('post', '/api/students/{id}/restore', { params: { id } }).then(
          () => (void refresh(), toast(t('students.account.restored', { name: fullName }))),
          (e: unknown) => toast(errorText(e instanceof ApiError ? e.code : 'common.unexpected')),
        ),
    })
  }
  const restore = async () => {
    await api('post', '/api/students/{id}/restore', { params: { id } })
    void refresh()
    toast(t('students.account.restored', { name: fullName }))
  }
  const unlock = async () => {
    await api('post', '/api/students/{id}/unlock', { params: { id } })
    void refresh()
    toast(t('students.account.unlocked', { name: fullName }))
  }
  const resetPassword = async () => {
    const res = await api('post', '/api/students/{id}/reset-password', { params: { id } })
    setIssued(res.temporaryPassword)
    void refresh()
  }
  const remove = async (confirmName: string) => {
    await api('delete', '/api/students/{id}', { params: { id }, body: { confirmName } })
    await navigate({ to: '/t/students' })
    queryClient.removeQueries({ queryKey: studentQuery(id).queryKey })
    void refresh()
    toast(t('students.account.deleted', { name: fullName }))
  }

  return (
    <section aria-labelledby="account-title" className="flex flex-col gap-6">
      <h2 id="account-title" className="text-h3 font-semibold">
        {t('students.account.title')}
      </h2>

      <Action title={t('students.account.reset')} text={t('students.account.resetText')}>
        {issued ? (
          <IssuedPassword userName={userName} password={issued} />
        ) : (
          <ConfirmDialog
            trigger={t('students.account.reset')}
            title={t('students.account.resetConfirmTitle', { name: fullName })}
            text={t('students.account.resetConfirmText')}
            confirm={t('students.account.reset')}
            onConfirm={resetPassword}
          />
        )}
      </Action>

      {student.isLockedOut && (
        <Action title={t('students.account.unlock')} text={t('students.account.unlockText')}>
          <AsyncButton onClick={unlock}>{t('students.account.unlock')}</AsyncButton>
        </Action>
      )}

      {student.isActive ? (
        <Action title={t('students.account.archive')} text={t('students.account.archiveText')}>
          <ConfirmDialog
            trigger={t('students.account.archive')}
            title={t('students.account.archiveConfirmTitle', { name: fullName })}
            text={t('students.account.archiveConfirmText')}
            confirm={t('students.account.archive')}
            onConfirm={archive}
          />
        </Action>
      ) : (
        <Action title={t('students.account.restore')} text={t('students.account.restoreText')}>
          <ConfirmDialog
            trigger={t('students.account.restore')}
            title={t('students.account.restoreConfirmTitle', { name: fullName })}
            text={t('students.account.restoreConfirmText')}
            confirm={t('students.account.restore')}
            onConfirm={restore}
          />
        </Action>
      )}

      <Action title={t('students.account.delete')} text={t('students.account.deleteText')} danger>
        <DeleteDialog fullName={fullName} onConfirm={remove} />
      </Action>
    </section>
  )
}

function Action({
  title,
  text,
  danger,
  children,
}: {
  title: string
  text: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-panel border p-4 ${danger ? 'border-danger/40' : 'border-border'}`}
    >
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-small text-text-muted">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

/** The new temporary password, shown once (AUTH-AC7): it lives only in this component's state. */
function IssuedPassword({ userName, password }: { userName: string; password: string }) {
  const { t } = useTranslation()
  const heading = useRef<HTMLParagraphElement>(null)
  useEffect(() => heading.current?.focus(), [])
  const loginUrl = `${window.location.origin}/login`
  return (
    <div className="flex w-full flex-col gap-3">
      <p ref={heading} tabIndex={-1} className="font-medium outline-none">
        {t('students.account.issued')}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-panel border border-border bg-surface-muted p-4">
        <dt className="text-small text-text-muted">{t('students.userName')}</dt>
        <dd className="font-mono break-all">{userName}</dd>
        <dt className="text-small text-text-muted">{t('students.temporaryPassword')}</dt>
        <dd className="font-mono break-all">{password}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={() => password} label={t('students.copyPassword')} />
        <CopyButton
          text={() => accountMessage(userName, password, loginUrl)}
          label={t('students.created.copyMessage')}
        />
      </div>
    </div>
  )
}

/** A button whose action runs once at a time; a failure is shown next to it. */
function AsyncButton({
  onClick,
  children,
}: {
  onClick: () => Promise<unknown>
  children: ReactNode
}) {
  const errorText = useErrorText()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          setPending(true)
          setError(undefined)
          onClick()
            .catch((e: unknown) =>
              setError(errorText(e instanceof ApiError ? e.code : 'common.unexpected')),
            )
            .finally(() => setPending(false))
        }}
      >
        {children}
      </Button>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </>
  )
}

/** ConfirmDestructive (design-system.md): an AlertDialog that stays open with the error if the call fails. */
function ConfirmDialog({
  trigger,
  title,
  text,
  confirm,
  danger,
  canConfirm = true,
  onOpenChange,
  onConfirm,
  children,
}: {
  trigger: string
  title: string
  text: string
  confirm: string
  danger?: boolean
  canConfirm?: boolean
  onOpenChange?: (open: boolean) => void
  onConfirm: () => Promise<unknown>
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const change = (next: boolean) => {
    setOpen(next)
    setError(undefined)
    onOpenChange?.(next)
  }
  const run = async () => {
    setPending(true)
    setError(undefined)
    try {
      await onConfirm()
      change(false)
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'common.unexpected'))
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog.Root open={open} onOpenChange={change}>
      <AlertDialog.Trigger asChild>
        <Button variant={danger ? 'danger' : 'outline'}>{trigger}</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-text/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-panel bg-surface p-6 shadow-lg">
          <AlertDialog.Title className="text-h3 font-semibold break-words">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-text-muted">{text}</AlertDialog.Description>
          {children}
          {error && (
            <p role="alert" className="text-small text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </AlertDialog.Cancel>
            <Button
              variant={danger ? 'danger' : 'default'}
              disabled={!canConfirm || pending}
              onClick={() => void run()}
            >
              {confirm}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

/** Permanent delete (FR-STU-06): the button stays disabled until the full name is typed exactly. */
export function DeleteDialog({
  fullName,
  onConfirm,
}: {
  fullName: string
  onConfirm: (confirmName: string) => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState('')
  return (
    <ConfirmDialog
      trigger={t('students.account.delete')}
      title={t('students.account.deleteConfirmTitle', { name: fullName })}
      text={t('students.account.deleteConfirmText')}
      confirm={t('students.account.deleteConfirm')}
      danger
      canConfirm={namesMatch(typed, fullName)}
      onOpenChange={() => setTyped('')}
      onConfirm={() => onConfirm(typed)}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-name" className="text-small font-medium">
          {t('students.account.typeName', { name: fullName })}
        </label>
        <Input
          id="confirm-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </ConfirmDialog>
  )
}
