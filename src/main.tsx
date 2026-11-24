import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18nReady } from '@/i18n'
import { routeTree } from './routeTree.gen'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Content is static & precached: serve from cache/SW first, never refetch in the background.
      networkMode: 'offlineFirst',
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Fade out the inline splash from index.html once the first route has rendered (or after 8s at worst).
const hideSplash = () => {
  const el = document.getElementById('splash')
  if (!el || el.classList.contains('out')) return
  el.classList.add('out')
  setTimeout(() => el.remove(), 250)
}
const unsubscribe = router.subscribe('onRendered', () => {
  hideSplash()
  unsubscribe()
})
setTimeout(hideSplash, 8000)

void i18nReady.then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  ),
)
