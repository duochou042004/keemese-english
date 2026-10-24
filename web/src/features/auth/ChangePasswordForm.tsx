import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { api, ApiError } from '@/api/client'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { useErrorText } from '@/lib/errors'
import { meQuery, type Me } from '@/lib/guard'

// Mirrors PasswordPolicy (≥ 10, ≤ 256); the API still decides, and its codes land on the same fields.
const schema = z
  .object({
    currentPassword: z.string().min(1, 'validation.required'),
    newPassword: z.string().min(10, 'password.too_short').max(256, 'password.too_long'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.confirmPassword === v.newPassword, {
    path: ['confirmPassword'],
    message: 'password.mismatch',
  })

/** FR-AUTH-04 / -05: forced after a temporary password, or voluntary. */
export function ChangePasswordForm({ onChanged }: { onChanged: (me: Me) => unknown }) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string>()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(undefined)
    try {
      await api('post', '/api/auth/change-password', { body: { currentPassword, newPassword } })
      const me = await queryClient.fetchQuery({ ...meQuery, staleTime: 0 })
      if (me) await onChanged(me)
    } catch (e) {
      const newPasswordCode = e instanceof ApiError ? e.errors?.newPassword?.[0] : undefined
      if (e instanceof ApiError && e.code === 'auth.invalid_current_password')
        setError('currentPassword', { message: e.code }, { shouldFocus: true })
      else if (newPasswordCode)
        setError('newPassword', { message: newPasswordCode }, { shouldFocus: true })
      else setFormError(errorText(e instanceof ApiError ? e.code : 'common.unexpected'))
    }
  })

  const message = (code: string | undefined) => code && errorText(code)

  return (
    <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={(e) => void onSubmit(e)}>
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger px-3 py-2 text-small text-danger"
        >
          {formError}
        </p>
      )}
      <FormField
        id="current-password"
        type="password"
        label={t('changePassword.current')}
        autoComplete="current-password"
        error={message(errors.currentPassword?.message)}
        {...register('currentPassword')}
      />
      <FormField
        id="new-password"
        type="password"
        label={t('changePassword.new')}
        hint={t('changePassword.policy')}
        autoComplete="new-password"
        error={message(errors.newPassword?.message)}
        {...register('newPassword')}
      />
      <FormField
        id="confirm-password"
        type="password"
        label={t('changePassword.confirm')}
        autoComplete="new-password"
        error={message(errors.confirmPassword?.message)}
        {...register('confirmPassword')}
      />
      <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
        {t('changePassword.submit')}
      </Button>
    </form>
  )
}
