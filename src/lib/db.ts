// Per-browser local data (IndexedDB via Dexie). No account, no sync (phase 2 may add a backend).
import Dexie, { type EntityTable, type Table } from 'dexie'

import type { AgeBand } from './content'

export type AvatarAnimal = 'cat' | 'dog' | 'bunny' | 'bear' | 'panda' | 'fox'
export type AvatarAccessory = 'none' | 'bow' | 'glasses' | 'party-hat' | 'crown'
export type AvatarConfig = { animal: AvatarAnimal; accessory: AvatarAccessory }

/**
 * `ageBand` is chosen by hand (no birthdate stored); older profiles may lack it → treated as 3-5.
 * `color` is the avatar background; `avatar` defaults to a cat without accessory.
 */
export type Profile = { id: number; name: string; color: string; createdAt: number; ageBand?: AgeBand; avatar?: AvatarConfig }

/** Progress of one child on one phrase. */
export type Progress = {
  profileId: number
  phraseId: string
  topicId: string
  parentLearned: boolean // ba mẹ đã thuộc
  childSaid: boolean // bé đã nói được
  /** when the child first said it (diary); older rows fall back to updatedAt */
  childSaidAt?: number
  /** optional parent note for the diary ("said it at the park!") */
  note?: string
  updatedAt: number
}

/** One row per profile per local day the app was actually used (streaks). */
export type Activity = { profileId: number; day: string; count: number }

export type Favorite = { profileId: number; phraseId: string; topicId: string; createdAt: number }

export const db = new Dexie('bean-english') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
  progress: Table<Progress, [number, string]>
  favorites: Table<Favorite, [number, string]>
  activity: Table<Activity, [number, string]>
}

db.version(1).stores({
  profiles: '++id, createdAt',
  progress: '[profileId+phraseId], profileId, [profileId+topicId]',
  favorites: '[profileId+phraseId], profileId, createdAt',
})
db.version(2).stores({ activity: '[profileId+day], profileId' })

export const PROFILE_COLORS = ['#7cc576', '#f2a65a', '#6aa9e9', '#e57fa8', '#a58be0', '#e0c04d']

export async function ensureDefaultProfile(defaultName: string) {
  const first = await db.profiles.orderBy('createdAt').first()
  if (first) return first.id
  return db.profiles.add({ name: defaultName, color: PROFILE_COLORS[0], createdAt: Date.now() } as Profile)
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    /* not supported */
  }
}
