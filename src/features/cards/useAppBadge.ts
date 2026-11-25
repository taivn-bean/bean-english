import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { dayKey } from '@/features/profile/activity'
import { db } from '@/shared/db'

/**
 * Red badge on the home-screen icon = word cards due today, all children together
 * (public/push-sw.js counts the same way when a reminder arrives while the app is closed).
 * Needs an installed PWA + notification permission (iOS 16.4+); silently does nothing otherwise.
 */
export function useAppBadge() {
  const due = useLiveQuery(() => db.cards.filter((c) => c.due <= dayKey()).count(), [])
  useEffect(() => {
    if (due === undefined || !('setAppBadge' in navigator)) return // still counting
    const job = due > 0 ? navigator.setAppBadge(due) : navigator.clearAppBadge()
    job.catch(() => {}) // no permission / not installed
  }, [due])
}
