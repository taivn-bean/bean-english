import { useQuery } from '@tanstack/react-query'
import { contentIndexQuery } from '@/features/content/content'
import { isTopicOffline, useOffline, type PackItem } from './offline'

const swSupported = import.meta.env.PROD && 'serviceWorker' in navigator

/** Whether the app shell + content text is stored offline (service worker installed and in control). */
export function useAppShellReady() {
  return useQuery({
    queryKey: ['app-shell-ready'],
    enabled: swSupported,
    queryFn: async () => {
      const est = await navigator.storage?.estimate?.().catch(() => undefined)
      return { ready: !!navigator.serviceWorker.controller, storageUsed: est?.usage }
    },
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.ready ? false : 1500),
  })
}

/** Offline state of one topic's audio: downloaded, downloading (0..1) or not. */
export function useTopicOffline(topic?: PackItem) {
  const cached = useOffline((s) => s.cached)
  const progress = useOffline((s) => (topic ? s.downloading[topic.id] : undefined))
  return {
    offline: !!topic && isTopicOffline(topic, cached),
    downloading: progress != null,
    progress: progress ?? 0,
  }
}

/** Index summary for a topic id (needed by pages that only have the full topic). */
export function useTopicSummary(topicId: string) {
  const { data } = useQuery(contentIndexQuery)
  return data?.topics.find((t) => t.id === topicId)
}

export const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
