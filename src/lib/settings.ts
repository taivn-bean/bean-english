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
      set: (patch) => set(patch),
    }),
    { name: 'bean-settings', storage: safeStorage, version: 1 },
  ),
)
