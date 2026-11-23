// Small per-device preferences (localStorage via zustand persist).
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ParentVoice } from './content'

export type Lang = 'vi' | 'en'

type Settings = {
  lang: Lang
  parentVoice: ParentVoice
  showIpa: boolean
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
      parentVoice: 'mom',
      showIpa: true,
      activeProfileId: null,
      installHintDismissed: false,
      set: (patch) => set(patch),
    }),
    { name: 'bean-settings', storage: safeStorage, version: 1 },
  ),
)
