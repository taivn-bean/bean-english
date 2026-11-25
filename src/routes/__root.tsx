import { type QueryClient, useQuery } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BottomNav, ErrorState } from '@/shared/ui/Layout'
import { PlaylistBar } from '@/features/audio/PlaylistBar'
import { UpdateBanner } from '@/features/pwa/PwaPrompts'
import { recordActivity } from '@/features/profile/activity'
import { contentIndexQuery } from '@/features/content/content'
import { syncOffline } from '@/features/offline/offline'
import { useAudioState } from '@/features/audio/audio'
import { db, ensureDefaultProfile, requestPersistentStorage } from '@/shared/db'
import { useSettings } from '@/shared/settings'
import { useDueCount } from '@/features/cards/useCards'
import { useAppBadge } from '@/features/cards/useAppBadge'
import { NewStickerPopup } from '@/features/rewards/NewStickerPopup'

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

  // Offline audio: pull new patches for downloaded topics, drop packs no longer needed.
  const { data: index } = useQuery(contentIndexQuery)
  useEffect(() => {
    if (index) syncOffline(index)
  }, [index])

  const dueCards = useDueCount()
  useAppBadge()

  // Streaks: a day counts once something is actually played with the child.
  const playing = useAudioState().current
  useEffect(() => {
    if (playing) recordActivity(activeProfileId)
  }, [playing, activeProfileId])

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-24">
      <Outlet />
      <PlaylistBar />
      <UpdateBanner />
      <NewStickerPopup />
      <BottomNav badges={{ '/cards': dueCards }} />
    </div>
  )
}
