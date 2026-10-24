import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { api, ApiError } from '@/api/client'
import { FormField } from '@/components/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import { useErrorText } from '@/lib/errors'
import { accountMessage, generatePassword, nextUsername, suggestUsername } from './credentials'
import {
  applyApiErrors,
  channelsBody,
  ContactFields,
  CopyButton,
  detailsSchema,
  FormAlert,
  Group,
  ParentFields,
  parentsBody,
} from './StudentFields'
import { StudentLink } from './StudentList'

// Mirrors the API's limits (api.md, POST /api/students); the API still decides, and its codes land on the same fields.
const schema = detailsSchema.extend({
  userName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, 'userName.invalid'),
  temporaryPassword: z
    .string()
    .max(256, 'password.too_long')
    .refine((v) => v === '' || v.length >= 10, 'password.too_short'),
})

const simpleFields = ['fullName', 'userName', 'temporaryPassword', 'email', 'phone'] as const

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
  const form = useForm({
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
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form

  const onSubmit = handleSubmit(async (v) => {
    setFormError(undefined)
    setSuggestion(undefined)
    const contactChannels = channelsBody(v.contactChannels)
    try {
      const res = await api('post', '/api/students', {
        body: {
          fullName: v.fullName,
          userName: v.userName,
          temporaryPassword: v.temporaryPassword || null,
          email: v.email || null,
          phone: v.phone || null,
          contactChannels: contactChannels.length ? contactChannels : null,
          parents: v.parents.length ? parentsBody(v.parents) : null,
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
      const code = applyApiErrors(e, simpleFields, setError)
      if (e instanceof ApiError && e.errors?.userName?.[0] === 'students.username_taken')
        setSuggestion(nextUsername(v.userName))
      setFormError(code && errorText(code))
    }
  })

  const message = (code: string | undefined) => code && errorText(code)
  const contactHasErrors = !!(errors.email || errors.phone || errors.contactChannels)

  return (
    <FormProvider {...form}>
      <form className="flex max-w-xl flex-col gap-4" noValidate onSubmit={(e) => void onSubmit(e)}>
        {formError && <FormAlert>{formError}</FormAlert>}
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
          <ContactFields />
        </Group>

        <Group title={t('students.parentsGroup')} forceOpen={!!errors.parents}>
          <ParentFields />
        </Group>

        <Button type="submit" className="mt-2 self-start max-sm:w-full" disabled={isSubmitting}>
          {t('students.create')}
        </Button>
      </form>
    </FormProvider>
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
