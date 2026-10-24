import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { useErrorText } from '@/lib/errors'

/** T18: end the session, forget every cached response, then show the login page. */
export function useSignOut() {
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function signOut() {
    setPending(true)
    setError(undefined)
    try {
      await api('post', '/api/auth/logout')
    } catch (e) {
      // 401: the session had already ended. Anything else: it may still be open, so say so and stay (shared devices).
      if (!(e instanceof ApiError && e.status === 401)) {
        setError(errorText(e instanceof ApiError ? e.code : 'common.unexpected'))
        setPending(false)
        return
      }
    }
    queryClient.clear()
    await navigate({ to: '/login' })
  }

  return { signOut, pending, error }
}

export function SignOutButton() {
  const { t } = useTranslation()
  const { signOut, pending, error } = useSignOut()
  return (
    <>
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => void signOut()}>
        {t('auth.signOut')}
      </Button>
    </>
  )
}
