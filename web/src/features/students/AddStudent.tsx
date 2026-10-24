import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { api, ApiError } from '@/api/client'
import { FormField } from '@/components/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import { useErrorText } from '@/lib/errors'
import { accountMessage, generatePassword, nextUsername, suggestUsername } from './credentials'
import { StudentLink } from './StudentList'

// Mirrors the API's limits (api.md, POST /api/students); the API still decides, and its codes land on the same fields.
const optional = (max: number, code: string) => z.string().trim().max(max, code)
const schema = z.object({
  fullName: z.string().trim().min(1, 'fullName.required').max(120, 'fullName.too_long'),
  userName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, 'userName.invalid'),
  temporaryPassword: z
    .string()
    .max(256, 'password.too_long')
    .refine((v) => v === '' || v.length >= 10, 'password.too_short'),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'email.invalid'),
  phone: optional(40, 'phone.too_long'),
  contactChannels: z.array(
    z.object({
      type: optional(40, 'contactChannels.invalid'),
      value: optional(200, 'contactChannels.invalid'),
    }),
  ),
  parents: z.array(
    z.object({
      name: z.string().trim().min(1, 'validation.required').max(120, 'parents.invalid'),
      relationship: optional(60, 'parents.invalid'),
      contact: optional(200, 'parents.invalid'),
      notes: optional(2000, 'parents.invalid'),
    }),
  ),
})

const simpleFields = ['fullName', 'userName', 'temporaryPassword', 'email', 'phone'] as const
type SimpleField = (typeof simpleFields)[number]
const isSimpleField = (field: string): field is SimpleField =>
  (simpleFields as readonly string[]).includes(field)

type Created = { id: string; fullName: string; userName: string; password: string }

/** J2 (FR-STU-01, -05): one form, then the one-time sign-in details. Leaving the page drops the password. */
export function AddStudent() {
  const [created, setCreated] = useState<Created>()
  return created ? <CreatedPanel {...created} /> : <AddStudentForm onCreated={setCreated} />
}

function AddStudentForm({ onCreated }: { onCreated: (created: Created) => void }) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string>()
  const [suggestion, setSuggestion] = useState<string>()
  const [autoUserName, setAutoUserName] = useState(true)
  const [initialPassword] = useState(generatePassword)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      userName: '',
      temporaryPassword: initialPassword,
      email: '',
      phone: '',
      contactChannels: [],
      parents: [],
    },
  })
  const channels = useFieldArray({ control, name: 'contactChannels' })
  const parents = useFieldArray({ control, name: 'parents' })

  const onSubmit = handleSubmit(async (v) => {
    setFormError(undefined)
    setSuggestion(undefined)
    const contactChannels = v.contactChannels.filter((c) => c.value)
    try {
      const res = await api('post', '/api/students', {
        body: {
          fullName: v.fullName,
          userName: v.userName,
          temporaryPassword: v.temporaryPassword || null,
          email: v.email || null,
          phone: v.phone || null,
          contactChannels: contactChannels.length ? contactChannels : null,
          parents: v.parents.length
            ? v.parents.map((p) => ({
                name: p.name,
                relationship: p.relationship || null,
                contact: p.contact || null,
                notes: p.notes || null,
              }))
            : null,
        },
      })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      onCreated({
        id: res.id,
        fullName: v.fullName,
        userName: v.userName,
        password: res.temporaryPassword,
      })
    } catch (e) {
      const fieldErrors = Object.entries((e instanceof ApiError && e.errors) || {})
      const unplaced: string[] = []
      for (const [field, [code = 'common.unexpected']] of fieldErrors) {
        if (isSimpleField(field)) setError(field, { message: code }, { shouldFocus: true })
        else unplaced.push(code)
        if (code === 'students.username_taken') setSuggestion(nextUsername(v.userName))
      }
      if (!fieldErrors.length || unplaced.length)
        setFormError(
          errorText(unplaced[0] ?? (e instanceof ApiError ? e.code : 'common.unexpected')),
        )
    }
  })

  const message = (code: string | undefined) => code && errorText(code)
  const contactHasErrors = !!(errors.email || errors.phone || errors.contactChannels)

  return (
    <form className="flex max-w-xl flex-col gap-4" noValidate onSubmit={(e) => void onSubmit(e)}>
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger px-3 py-2 text-small text-danger"
        >
          {formError}
        </p>
      )}
      <FormField
        id="full-name"
        label={t('students.fullName')}
        autoComplete="off"
        error={message(errors.fullName?.message)}
        {...register('fullName', {
          onChange: (e: ChangeEvent<HTMLInputElement>) => {
            if (autoUserName) setValue('userName', suggestUsername(e.target.value))
          },
        })}
      />
      <div className="flex flex-col gap-1.5">
        <FormField
          id="user-name"
          label={t('students.userName')}
          hint={t('students.userNameHint')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={message(errors.userName?.message)}
          {...register('userName', { onChange: () => setAutoUserName(false) })}
        />
        {suggestion && errors.userName?.message === 'students.username_taken' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              setValue('userName', suggestion, { shouldValidate: true })
              setSuggestion(undefined)
            }}
          >
            {t('students.useSuggestion', { suggestion })}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <FormField
          id="temporary-password"
          label={t('students.temporaryPassword')}
          hint={t('students.temporaryPasswordHint')}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          error={message(errors.temporaryPassword?.message)}
          {...register('temporaryPassword')}
        />
        <div className="flex gap-2">
          <CopyButton
            size="sm"
            text={() => getValues('temporaryPassword')}
            label={t('students.copyPassword')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setValue('temporaryPassword', generatePassword(), { shouldValidate: true })
            }
          >
            {t('students.regenerate')}
          </Button>
        </div>
      </div>

      <Group title={t('students.contactGroup')} forceOpen={contactHasErrors}>
        <FormField
          id="email"
          type="email"
          label={t('students.email')}
          autoComplete="off"
          error={message(errors.email?.message)}
          {...register('email')}
        />
        <FormField
          id="phone"
          type="tel"
          label={t('students.phone')}
          autoComplete="off"
          error={message(errors.phone?.message)}
          {...register('phone')}
        />
        <datalist id="channel-types">
          <option value="Zalo" />
          <option value="Facebook" />
          <option value={t('students.channelOther')} />
        </datalist>
        {channels.fields.map((field, i) => (
          <fieldset
            key={field.id}
            className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
          >
            <legend className="sr-only">{t('students.channelN', { n: i + 1 })}</legend>
            <FormField
              id={`channel-${i}-type`}
              label={t('students.channelType')}
              list="channel-types"
              autoComplete="off"
              error={message(errors.contactChannels?.[i]?.type?.message)}
              {...register(`contactChannels.${i}.type`)}
            />
            <FormField
              id={`channel-${i}-value`}
              label={t('students.channelValue')}
              autoComplete="off"
              error={message(errors.contactChannels?.[i]?.value?.message)}
              {...register(`contactChannels.${i}.value`)}
            />
            <Button type="button" variant="ghost" onClick={() => channels.remove(i)}>
              {t('students.remove')}
            </Button>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => channels.append({ type: 'Zalo', value: '' })}
        >
          {t('students.addChannel')}
        </Button>
      </Group>

      <Group title={t('students.parentsGroup')} forceOpen={!!errors.parents}>
        {parents.fields.map((field, i) => (
          <fieldset
            key={field.id}
            className="flex flex-col gap-3 rounded-panel border border-border p-4"
          >
            <legend className="px-1 text-small font-medium">
              {t('students.parentN', { n: i + 1 })}
            </legend>
            <FormField
              id={`parent-${i}-name`}
              label={t('students.parentName')}
              autoComplete="off"
              error={message(errors.parents?.[i]?.name?.message)}
              {...register(`parents.${i}.name`)}
            />
            <FormField
              id={`parent-${i}-relationship`}
              label={t('students.relationship')}
              autoComplete="off"
              error={message(errors.parents?.[i]?.relationship?.message)}
              {...register(`parents.${i}.relationship`)}
            />
            <FormField
              id={`parent-${i}-contact`}
              label={t('students.parentContact')}
              autoComplete="off"
              error={message(errors.parents?.[i]?.contact?.message)}
              {...register(`parents.${i}.contact`)}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`parent-${i}-notes`} className="text-small font-medium">
                {t('students.parentNotes')}
              </label>
              <textarea
                id={`parent-${i}-notes`}
                rows={3}
                className="w-full rounded-control border border-border bg-surface px-3 py-2 text-body"
                {...register(`parents.${i}.notes`)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => parents.remove(i)}
            >
              {t('students.remove')}
            </Button>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => parents.append({ name: '', relationship: '', contact: '', notes: '' })}
        >
          {t('students.addParent')}
        </Button>
      </Group>

      <Button type="submit" className="mt-2 self-start max-sm:w-full" disabled={isSubmitting}>
        {t('students.create')}
      </Button>
    </form>
  )
}

/** An optional group, collapsed by default (FR-STU-AC1); it opens itself when it holds an error. */
function Group({
  title,
  forceOpen,
  children,
}: {
  title: string
  forceOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <details
      open={open || forceOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-panel border border-border bg-surface"
    >
      <summary className="cursor-pointer px-4 py-3 font-medium">{title}</summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  )
}

function CreatedPanel({ id, fullName, userName, password }: Created) {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  const loginUrl = `${window.location.origin}/login`
  return (
    <section aria-labelledby="created-title" className="flex max-w-xl flex-col gap-4">
      <h2
        id="created-title"
        ref={heading}
        tabIndex={-1}
        className="text-h3 font-semibold outline-none"
      >
        {t('students.created.title')}
      </h2>
      <p className="text-text-muted">{t('students.created.text', { name: fullName })}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-panel border border-border bg-surface-muted p-4">
        <dt className="text-small text-text-muted">{t('students.userName')}</dt>
        <dd className="font-mono break-all">{userName}</dd>
        <dt className="text-small text-text-muted">{t('students.temporaryPassword')}</dt>
        <dd className="font-mono break-all">{password}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <CopyButton
          variant="default"
          text={() => accountMessage(userName, password, loginUrl)}
          label={t('students.created.copyMessage')}
        />
        <CopyButton
          text={() => `${userName}\n${password}`}
          label={t('students.created.copyLogin')}
        />
      </div>
      {/* FR-STU-AC4: only follow-ups that exist in M1 (goal M2, plan M6, first session M5 stay hidden). */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Link to="/t/students" className={buttonVariants({ variant: 'outline' })}>
          {t('students.created.done')}
        </Link>
        <StudentLink id={id} className={buttonVariants({ variant: 'outline' })}>
          {t('students.created.openWorkspace')}
        </StudentLink>
      </div>
    </section>
  )
}

/** Copies `text()` and says so in a live region; a blocked clipboard is reported, never silent. */
function CopyButton({
  text,
  label,
  variant = 'outline',
  size,
}: {
  text: () => string
  label: string
  variant?: 'default' | 'outline'
  size?: ComponentProps<typeof Button>['size']
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'copied' | 'failed'>()
  useEffect(() => {
    if (!status) return
    const id = setTimeout(() => setStatus(undefined), 3000)
    return () => clearTimeout(id)
  }, [status])
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() =>
          // Rejects too when the Clipboard API is missing (an insecure origin).
          void Promise.resolve()
            .then(() => navigator.clipboard.writeText(text()))
            .then(
              () => setStatus('copied'),
              () => setStatus('failed'),
            )
        }
      >
        {label}
      </Button>
      <span role="status" className="text-small text-text-muted">
        {status && t(`students.${status}`)}
      </span>
    </span>
  )
}
