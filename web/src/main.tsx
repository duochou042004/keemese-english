import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setUnauthorizedHandler } from './api/client'
import './i18n'
import { routeTree } from './routeTree.gen'
import './styles/index.css'

const queryClient = new QueryClient()
const router = createRouter({ routeTree, context: { queryClient } })

// The session ended (expired, archived, password reset): forget its data and sign in again, then come back here.
setUnauthorizedHandler(() => {
  queryClient.clear()
  const { pathname, href } = router.state.location
  if (pathname !== '/login')
    void router.navigate({ href: `/login?redirect=${encodeURIComponent(href)}` })
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
