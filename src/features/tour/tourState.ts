import { create } from 'zustand'
import { useSettings } from '@/shared/settings'
import type { TourId } from './tours'

/** Whether a tour overlay is on screen (other popups wait until it closes). */
export const useTourActive = create<{ active: boolean }>(() => ({ active: false }))

export function markTourSeen(id: TourId) {
  const { toursSeen, set } = useSettings.getState()
  if (!toursSeen.includes(id)) set({ toursSeen: [...toursSeen, id] })
}
