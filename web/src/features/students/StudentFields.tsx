import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { useFieldArray, useFormContext, type ErrorOption } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { useErrorText } from '@/lib/errors'

// Mirrors the API's limits (api.md, POST and PATCH /api/students); the API still decides, and its codes land on the same fields.
const optional = (max: number, code: string) => z.string().trim().max(max, code)
/** The fields Add student and the Profile tab share (FR-STU-02, -05). */
export const detailsSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName.required').max(120, 'fullName.too_long'),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'email.invalid'),
  phone: optional(40, 'phone.too_long'),
  // A value needs a channel type, or the API rejects the whole list (contactChannels.invalid).
  contactChannels: z.array(
    z
      .object({
        type: optional(40, 'contactChannels.invalid'),
        value: optional(200, 'contactChannels.invalid'),
      })
      .refine((c) => !c.value || c.type, { path: ['type'], message: 'validation.required' }),
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
type Details = z.output<typeof detailsSchema>

/** Channels without a value are dropped; empty parent fields go as null. */
export const channelsBody = (channels: Details['contactChannels']) =>
  channels.filter((c) => c.value)
export const parentsBody = (parents: Details['parents']) =>
  parents.map((p) => ({
    name: p.name,
    relationship: p.relationship || null,
    contact: p.contact || null,
    notes: p.notes || null,
  }))

/**
 * Puts the API's field codes on `fields`; returns the code for the form-level alert when some error has no field
 * (or there were no field errors at all).
 */
export function applyApiErrors<F extends string>(
  e: unknown,
  fields: readonly F[],
  setError: (field: F, error: ErrorOption, options: { shouldFocus: boolean }) => void,
): string | undefined {
  const fieldErrors = Object.entries((e instanceof ApiError && e.errors) || {})
  const unplaced: string[] = []
  for (const [field, [code = 'common.unexpected']] of fieldErrors) {
    if ((fields as readonly string[]).includes(field))
      setError(field as F, { message: code }, { shouldFocus: true })
    else unplaced.push(code)
  }
  if (!fieldErrors.length || unplaced.length)
    return unplaced[0] ?? (e instanceof ApiError ? e.code : 'common.unexpected')
}

/** A form-level error at the top of a form (design-system.md "Errors"). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-control border border-danger px-3 py-2 text-small text-danger"
    >
      {children}
    </div>
  )
}

/** Email, phone and contact channels; needs a surrounding FormProvider with `detailsSchema` fields. */
export function ContactFields() {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<z.input<typeof detailsSchema>>()
  const channels = useFieldArray({ control, name: 'contactChannels' })
  const message = (code: string | undefined) => code && errorText(code)
  return (
    <>
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
        <fieldset key={field.id} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
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
    </>
  )
}

/** Parent or guardian records (FR-STU-05, no accounts); needs a FormProvider like ContactFields. */
export function ParentFields() {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<z.input<typeof detailsSchema>>()
  const parents = useFieldArray({ control, name: 'parents' })
  const message = (code: string | undefined) => code && errorText(code)
  return (
    <>
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
    </>
  )
}

/** A group of fields; collapsed by default unless `defaultOpen` (FR-STU-AC1), and it opens itself when it holds an error. */
export function Group({
  title,
  forceOpen,
  defaultOpen = false,
  children,
}: {
  title: string
  forceOpen: boolean
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
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

/** Copies `text()` and says so in a live region; a blocked clipboard is reported, never silent. */
export function CopyButton({
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
