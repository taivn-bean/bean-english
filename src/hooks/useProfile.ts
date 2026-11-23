import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Favorite, type Progress } from '../lib/db'
import { useSettings } from '../lib/settings'

export function useProfiles() {
  return useLiveQuery(() => db.profiles.orderBy('createdAt').toArray(), [], [])
}

export function useActiveProfile() {
  const id = useSettings((s) => s.activeProfileId)
  return useLiveQuery(() => (id == null ? undefined : db.profiles.get(id)), [id])
}

/** Map phraseId → progress for the active profile (optionally one topic). */
export function useProgressMap(topicId?: string) {
  const profileId = useSettings((s) => s.activeProfileId)
  return useLiveQuery(
    async () => {
      if (profileId == null) return new Map<string, Progress>()
      const rows = topicId
        ? await db.progress.where({ profileId, topicId }).toArray()
        : await db.progress.where({ profileId }).toArray()
      return new Map(rows.map((r) => [r.phraseId, r]))
    },
    [profileId, topicId],
    new Map<string, Progress>(),
  )
}

export function useFavorites() {
  const profileId = useSettings((s) => s.activeProfileId)
  return useLiveQuery(
    async () =>
      profileId == null ? [] : db.favorites.where({ profileId }).reverse().sortBy('createdAt'),
    [profileId],
    [] as Favorite[],
  )
}

export async function toggleProgress(
  profileId: number,
  topicId: string,
  phraseId: string,
  field: 'parentLearned' | 'childSaid',
) {
  const existing = await db.progress.get([profileId, phraseId])
  await db.progress.put({
    profileId,
    topicId,
    phraseId,
    parentLearned: existing?.parentLearned ?? false,
    childSaid: existing?.childSaid ?? false,
    [field]: !existing?.[field],
    updatedAt: Date.now(),
  })
}

export async function toggleFavorite(profileId: number, topicId: string, phraseId: string) {
  const key: [number, string] = [profileId, phraseId]
  if (await db.favorites.get(key)) await db.favorites.delete(key)
  else await db.favorites.add({ profileId, topicId, phraseId, createdAt: Date.now() })
}
