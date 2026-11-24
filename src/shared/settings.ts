// Small per-device preferences (localStorage via zustand persist).
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Lang = 'vi' | 'en'

type Settings = {
  lang: Lang
  showIpa: boolean
  /** show content of every age band, not only the active child's */
  showAllAges: boolean
  activeProfileId: number | null
  installHintDismissed: boolean
  /** last topic opened (home "continue" shortcut) */
  lastTopicId: string | null
  /** flash-cards: random order + random pick of new words */
  shuffleCards: boolean
  /** sticker ids each child has already been shown (profileId → ids) */
  stickersSeen: Record<number, string[]>
  /** daily reminder time "HH:MM" (whether it's on = the browser's push subscription) */
  reminderTime: string
  /** feature tours already shown (finished or skipped) */
  toursSeen: string[]
  set: (patch: Partial<Omit<Settings, 'set'>>) => void
}

const safeStorage = createJSONStorage(() => {
  try {
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      lang: 'vi',
      showIpa: true,
      showAllAges: false,
      activeProfileId: null,
      installHintDismissed: false,
      lastTopicId: null,
      shuffleCards: true,
      stickersSeen: {},
      reminderTime: '19:30',
      toursSeen: [],
      set: (patch) => set(patch),
    }),
    { name: 'bean-settings', storage: safeStorage, version: 1 },
  ),
)
