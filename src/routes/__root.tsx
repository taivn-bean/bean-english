import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BottomNav, ErrorState } from '../components/Layout'
import { PlaylistBar } from '../components/PlaylistBar'
import { UpdateBanner } from '../components/PwaPrompts'
import { db, ensureDefaultProfile, requestPersistentStorage } from '../lib/db'
import { useSettings } from '../lib/settings'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => <ErrorState message={error instanceof Error ? error.message : String(error)} onRetry={reset} />,
})

function RootLayout() {
  const { t } = useTranslation()
  const { activeProfileId, set } = useSettings()

  // Make sure there is always an active child profile.
  useEffect(() => {
    ;(async () => {
      if (activeProfileId != null && (await db.profiles.get(activeProfileId))) return
      set({ activeProfileId: await ensureDefaultProfile(t('common.defaultChild')) })
    })()
  }, [activeProfileId, set, t])

  useEffect(() => {
    requestPersistentStorage()
  }, [])

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-24">
      <Outlet />
      <PlaylistBar />
      <UpdateBanner />
      <BottomNav />
    </div>
  )
}
