import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { CircleCheck, CloudDownload, CloudOff, Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAgeFilter } from '@/features/profile/useProfile'
import { formatMB, useAppShellReady, useTopicOffline } from './useOfflineStatus'
import { contentIndexQuery } from '@/features/content/content'
import { downloadTopics, isTopicOffline, pendingBytes, useOffline, type PackItem } from './offline'

/** Small tag on topic cards/pages: "not offline" / downloading %. Nothing when downloaded. */
export function OfflineTag({ topic, className }: { topic: PackItem; className?: string }) {
  const { t } = useTranslation()
  const { offline, downloading, progress } = useTopicOffline(topic)
  if (offline) return null
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-muted', className)}>
      {downloading ? <Loader size={12} className="animate-spin" /> : <CloudOff size={12} />}
      {downloading ? `${Math.round(progress * 100)}%` : t('offline.notDownloaded')}
    </span>
  )
}

/** Home banner: offer to download the child's age band when some of it isn't offline yet. */
export function OfflineSuggestion() {
  const { t } = useTranslation()
  const { data: index } = useQuery(contentIndexQuery)
  const { band } = useAgeFilter()
  const cached = useOffline((s) => s.cached)
  const busy = useOffline((s) => Object.keys(s.downloading).length > 0)
  if (!index || typeof caches === 'undefined') return null
  const topics = index.topics.filter((tp) => tp.ages.includes(band) && !isTopicOffline(tp, cached))
  if (!topics.length) return null
  const bytes = pendingBytes(topics, index, cached)
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-leaf-200 bg-leaf-50 p-3 text-sm">
      <CloudDownload size={22} className="shrink-0 text-leaf-600" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t('offline.suggestTitle', { band: t(`age.band.${band}`) })}</span>
        <span className="block text-xs text-muted">{t('offline.suggestDesc', { count: topics.length, size: formatMB(bytes) })}</span>
      </span>
      <button
        disabled={busy}
        onClick={() => downloadTopics(topics)}
        className="min-h-10 shrink-0 rounded-full bg-leaf-500 px-4 font-semibold text-white disabled:opacity-60"
      >
        {busy ? <Loader size={16} className="animate-spin" /> : t('offline.download')}
      </button>
    </div>
  )
}

/** Settings card: app shell status + link to the offline packs page. */
export function OfflineStatus() {
  const { t } = useTranslation()
  const { data } = useAppShellReady()
  const { data: index } = useQuery(contentIndexQuery)
  const cached = useOffline((s) => s.cached)
  const done = index?.topics.filter((tp) => isTopicOffline(tp, cached)).length ?? 0
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm" role="status">
      {data && (
        <p className="flex items-center gap-2 font-medium">
          {data.ready ? <CircleCheck size={18} className="text-leaf-600" /> : <Loader size={18} className="animate-spin" />}
          {data.ready ? t('offline.shellReady') : t('settings.offlineNotReady')}
        </p>
      )}
      {index && (
        <Link to="/offline" className="flex min-h-11 items-center justify-between rounded-xl bg-leaf-50 px-3 font-semibold text-leaf-700">
          <span className="flex items-center gap-2">
            <CloudDownload size={18} /> {t('offline.packsTitle')}
          </span>
          <span className="text-xs font-medium text-muted">{t('offline.topicsDone', { done, total: index.topics.length })}</span>
        </Link>
      )}
      {data?.storageUsed != null && <p className="text-muted">{t('settings.storage', { used: formatMB(data.storageUsed) })}</p>}
    </div>
  )
}
