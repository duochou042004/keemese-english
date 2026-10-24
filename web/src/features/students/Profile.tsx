import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { useErrorText } from '@/lib/errors'
import { AccountActions } from './AccountActions'
import {
  applyApiErrors,
  channelsBody,
  ContactFields,
  detailsSchema,
  FormAlert,
  Group,
  ParentFields,
  parentsBody,
} from './StudentFields'
import { studentQuery } from './Workspace'

type Student = components['schemas']['TutorStudentDto']

const simpleFields = ['fullName', 'email', 'phone'] as const

const toValues = (s: Student) => ({
  fullName: s.fullName,
  email: s.email ?? '',
  phone: s.phone ?? '',
  contactChannels: s.contactChannels.map((c) => ({ type: c.type ?? '', value: c.value ?? '' })),
  parents: s.parents.map((p) => ({
    name: p.name ?? '',
    relationship: p.relationship ?? '',
    contact: p.contact ?? '',
    notes: p.notes ?? '',
  })),
})

/** Profile tab (FR-STU-02, -05): personal, contact and parents, then the account section. */
export function StudentProfile({ id }: { id: string }) {
  const { data: student } = useSuspenseQuery(studentQuery(id))
  return (
    <div className="flex max-w-xl flex-col gap-10">
      <ProfileForm student={student} />
      <AccountActions student={student} />
    </div>
  )
}

function ProfileForm({ student }: { student: Student }) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string>()
  const [conflict, setConflict] = useState(false)
  const [saved, setSaved] = useState(false)
  // The version these values came from, not the live query's: a background refetch must not hide a conflict (AC6).
  const [version, setVersion] = useState(student.version)
  const form = useForm({ resolver: zodResolver(detailsSchema), defaultValues: toValues(student) })
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = form

  const onSubmit = handleSubmit(async (v) => {
    setFormError(undefined)
    setConflict(false)
    setSaved(false)
    try {
      // PATCH: every field is sent, so "" and [] clear; `version` is the one this form was loaded with (AC6).
      const updated = await api('patch', '/api/students/{id}', {
        params: { id: student.id },
        body: {
          version,
          fullName: v.fullName,
          email: v.email,
          phone: v.phone,
          contactChannels: channelsBody(v.contactChannels),
          parents: parentsBody(v.parents),
        },
      })
      queryClient.setQueryData(studentQuery(student.id).queryKey, updated)
      void queryClient.invalidateQueries({ queryKey: ['students'], refetchType: 'none' })
      reset(toValues(updated))
      setVersion(updated.version)
      setSaved(true)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'concurrency.conflict') return setConflict(true)
      const code = applyApiErrors(e, simpleFields, setError)
      setFormError(code && errorText(code))
    }
  })

  const reload = async () => {
    const fresh = await queryClient.fetchQuery({ ...studentQuery(student.id), staleTime: 0 })
    reset(toValues(fresh))
    setVersion(fresh.version)
    setConflict(false)
  }

  return (
    <FormProvider {...form}>
      <form
        aria-labelledby="profile-title"
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => void onSubmit(e)}
      >
        <h2 id="profile-title" className="text-h3 font-semibold">
          {t('students.profile.title')}
        </h2>
        {conflict && (
          <FormAlert>
            <p>{errorText('concurrency.conflict')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => void reload().catch(() => setFormError(errorText('common.network')))}
            >
              {t('students.profile.reload')}
            </Button>
          </FormAlert>
        )}
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField
          id="full-name"
          label={t('students.fullName')}
          autoComplete="off"
          error={errors.fullName?.message && errorText(errors.fullName.message)}
          {...register('fullName')}
        />
        <Group
          title={t('students.profile.contact')}
          defaultOpen
          forceOpen={!!(errors.email || errors.phone || errors.contactChannels)}
        >
          <ContactFields />
        </Group>
        <Group title={t('students.profile.parents')} defaultOpen forceOpen={!!errors.parents}>
          <ParentFields />
        </Group>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {t('students.profile.save')}
          </Button>
          <span role="status" className="text-small text-text-muted">
            {saved && t('students.profile.saved')}
          </span>
        </div>
      </form>
    </FormProvider>
  )
}
