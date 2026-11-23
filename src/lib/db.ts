// Per-browser local data (IndexedDB via Dexie). No account, no sync (phase 2 may add a backend).
import Dexie, { type EntityTable, type Table } from 'dexie'

export type Profile = { id: number; name: string; color: string; createdAt: number }

/** Progress of one child on one phrase. */
export type Progress = {
  profileId: number
  phraseId: string
  topicId: string
  parentLearned: boolean // ba mẹ đã thuộc
  childSaid: boolean // bé đã nói được
  updatedAt: number
}

export type Favorite = { profileId: number; phraseId: string; topicId: string; createdAt: number }

export const db = new Dexie('bean-english') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
  progress: Table<Progress, [number, string]>
  favorites: Table<Favorite, [number, string]>
}

db.version(1).stores({
  profiles: '++id, createdAt',
  progress: '[profileId+phraseId], profileId, [profileId+topicId]',
  favorites: '[profileId+phraseId], profileId, createdAt',
})

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
