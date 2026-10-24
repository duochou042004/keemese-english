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

// Messages are errors.json codes.
const schema = z.object({
  userName: z.string().trim().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
  rememberMe: z.boolean(),
})

/** FR-AUTH-01: one generic message for every credential failure, its own for 429. No sign-up link (AC3). */
export function LoginForm({ onSignedIn }: { onSignedIn: (me: Me) => unknown }) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { userName: '', password: '', rememberMe: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined)
    try {
      await api('post', '/api/auth/login', { body: values })
      const me = await queryClient.fetchQuery({ ...meQuery, staleTime: 0 })
      if (me) await onSignedIn(me)
    } catch (e) {
      setFormError(errorText(e instanceof ApiError ? e.code : 'common.unexpected'))
    }
  })

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
        id="username"
        label={t('login.username')}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.userName?.message && errorText(errors.userName.message)}
        {...register('userName')}
      />
      <FormField
        id="password"
        type="password"
        label={t('login.password')}
        autoComplete="current-password"
        error={errors.password?.message && errorText(errors.password.message)}
        {...register('password')}
      />
      <label className="flex items-center gap-2 text-small pointer-coarse:min-h-11">
        <input type="checkbox" className="size-4 accent-primary" {...register('rememberMe')} />
        {t('login.rememberMe')}
      </label>
      <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
        {t('login.submit')}
      </Button>
    </form>
  )
}
