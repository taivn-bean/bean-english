// Offline audio packs chosen by the user, per topic.
//
// The service worker precaches only the app shell + content JSON (small). Audio packs live in a
// separate Cache Storage bucket managed here, so the user decides which topics to keep offline.
// A topic is "offline" when every pack it references (its base pack + any patch packs) is cached.
// Packs are immutable (content-hashed names), so a cached pack never goes stale.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ContentIndex } from '@/features/content/content'

/** Anything with downloadable audio packs: a topic or a flash-card deck. */
export type PackItem = { id: string; packs: string[] }
/** Topics + flash-card decks: everything the user can keep offline. */
export const packItems = (index: ContentIndex): PackItem[] => [...index.topics, ...(index.decks ?? [])]

const AUDIO_CACHE = 'bean-audio-v1'
const hasCaches = () => typeof caches !== 'undefined'

/** Topics the user chose to keep offline + downloads in flight. */
type OfflineState = {
  selected: string[]
  downloading: Record<string, number> // topicId → 0..1
  cached: Set<string> // pack URLs currently in the cache (refreshed by refreshCached)
}

export const useOffline = create<OfflineState>()(
  persist(() => ({ selected: [] as string[], downloading: {}, cached: new Set<string>() }), {
    name: 'bean-offline',
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ selected: s.selected }),
  }),
)

export async function refreshCached() {
  if (!hasCaches()) return
  const keys = await (await caches.open(AUDIO_CACHE)).keys()
  useOffline.setState({ cached: new Set(keys.map((r) => new URL(r.url).pathname)) })
}

export const isTopicOffline = (topic: Pick<PackItem, 'packs'>, cached: Set<string>) =>
  topic.packs.length > 0 && topic.packs.every((u) => cached.has(u))

/** Bytes still to download for these topics (shared packs counted once). */
export function pendingBytes(topics: PackItem[], index: ContentIndex, cached: Set<string>) {
  const sizes = new Map(index.audioPacks.map((p) => [p.url, p.bytes]))
  const urls = new Set(topics.flatMap((t) => t.packs).filter((u) => !cached.has(u)))
  return [...urls].reduce((n, u) => n + (sizes.get(u) ?? 0), 0)
}

export const topicBytes = (topic: PackItem, index: ContentIndex) => {
  const sizes = new Map(index.audioPacks.map((p) => [p.url, p.bytes]))
  return topic.packs.reduce((n, u) => n + (sizes.get(u) ?? 0), 0)
}

/** Download the packs of these topics and mark them selected. Resolves when done. */
export async function downloadTopics(topics: PackItem[]) {
  if (!hasCaches()) return
  const cache = await caches.open(AUDIO_CACHE)
  useOffline.setState((s) => ({
    selected: [...new Set([...s.selected, ...topics.map((t) => t.id)])],
    downloading: { ...s.downloading, ...Object.fromEntries(topics.map((t) => [t.id, 0])) },
  }))
  try {
    for (const topic of topics) {
      const missing = topic.packs.filter((u) => !useOffline.getState().cached.has(u))
      for (const [i, url] of missing.entries()) {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`${url}: ${res.status}`)
        await cache.put(url, res)
        useOffline.setState((s) => ({
          cached: new Set([...s.cached, url]),
          downloading: { ...s.downloading, [topic.id]: (i + 1) / missing.length },
        }))
      }
      useOffline.setState((s) => {
        const { [topic.id]: _done, ...rest } = s.downloading
        return { downloading: rest }
      })
    }
  } finally {
    // clear progress of anything that failed (e.g. went offline mid-way)
    useOffline.setState((s) => ({
      downloading: Object.fromEntries(Object.entries(s.downloading).filter(([id]) => !topics.some((t) => t.id === id))),
    }))
    await refreshCached()
  }
}

/** Unselect topics and delete packs no other selected topic needs. */
export async function removeTopics(topicIds: string[], index: ContentIndex) {
  useOffline.setState((s) => ({ selected: s.selected.filter((id) => !topicIds.includes(id)) }))
  await collectGarbage(index)
}

/** Keep exactly the packs the selected topics need (e.g. after a content update replaced a pack). */
export async function collectGarbage(index: ContentIndex) {
  if (!hasCaches()) return
  const { selected } = useOffline.getState()
  const keep = new Set(packItems(index).filter((t) => selected.includes(t.id)).flatMap((t) => t.packs))
  const cache = await caches.open(AUDIO_CACHE)
  for (const req of await cache.keys()) if (!keep.has(new URL(req.url).pathname)) await cache.delete(req)
  await refreshCached()
}

/** On start-up: fetch new patches for selected topics (if online) and drop packs nobody needs. */
export async function syncOffline(index: ContentIndex) {
  await refreshCached()
  const { selected, cached } = useOffline.getState()
  const stale = packItems(index).filter((t) => selected.includes(t.id) && !isTopicOffline(t, cached))
  if (stale.length && navigator.onLine) await downloadTopics(stale).catch(() => {})
  await collectGarbage(index)
}

/** Pack bytes for playback: from the offline cache if downloaded, otherwise from the network. */
export async function readPack(url: string): Promise<Blob> {
  if (hasCaches()) {
    const hit = await (await caches.open(AUDIO_CACHE)).match(url)
    if (hit) return hit.blob()
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.blob()
}

export function audioCacheBytes(index: ContentIndex) {
  const sizes = new Map(index.audioPacks.map((p) => [p.url, p.bytes]))
  return [...useOffline.getState().cached].reduce((n, u) => n + (sizes.get(u) ?? 0), 0)
}
