import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'

/** T18: end the session, forget every cached response, then show the login page. */
export function SignOutButton() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    try {
      await api('post', '/api/auth/logout')
    } finally {
      queryClient.clear()
      await navigate({ to: '/login' })
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => void signOut()}>
      {t('auth.signOut')}
    </Button>
  )
}
