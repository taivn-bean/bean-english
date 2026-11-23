import { useLiveQuery } from 'dexie-react-hooks'
import type { AgeBand } from '../lib/content'
import { computeStreak, recordActivity } from '../lib/activity'
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
    ...existing,
    parentLearned: existing?.parentLearned ?? false,
    childSaid: existing?.childSaid ?? false,
    [field]: !existing?.[field],
    // diary: remember when the child first said it
    ...(field === 'childSaid' && !existing?.childSaid ? { childSaidAt: Date.now() } : {}),
    updatedAt: Date.now(),
  })
  await recordActivity(profileId)
}

export async function toggleFavorite(profileId: number, topicId: string, phraseId: string) {
  const key: [number, string] = [profileId, phraseId]
  if (await db.favorites.get(key)) await db.favorites.delete(key)
  else await db.favorites.add({ profileId, topicId, phraseId, createdAt: Date.now() })
}

/** Active child's age band + whether to show every band. `fits(ages)` filters content. */
export function useAgeFilter() {
  const profile = useActiveProfile()
  const showAll = useSettings((s) => s.showAllAges)
  const band: AgeBand = profile?.ageBand ?? '3-5'
  return { band, showAll, fits: (ages: readonly AgeBand[]) => showAll || ages.includes(band) }
}

/** Daily-use streak of the active child. */
export function useStreak() {
  const profileId = useSettings((s) => s.activeProfileId)
  const days = useLiveQuery(
    async () => (profileId == null ? [] : (await db.activity.where({ profileId }).toArray()).map((a) => a.day)),
    [profileId],
    [] as string[],
  )
  return computeStreak(days)
}

/** "Bé nói được" moments of the active child, newest first. */
export function useDiary() {
  const profileId = useSettings((s) => s.activeProfileId)
  return useLiveQuery(
    async () => {
      if (profileId == null) return []
      const rows = await db.progress.where({ profileId }).filter((p) => p.childSaid).toArray()
      return rows.sort((a, b) => (b.childSaidAt ?? b.updatedAt) - (a.childSaidAt ?? a.updatedAt))
    },
    [profileId],
    [] as Progress[],
  )
}
