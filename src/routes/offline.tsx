import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import clsx from 'clsx'
import { CircleCheck, CloudDownload, Loader, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader, ProgressBar } from '../components/Layout'
import { TopicIcon } from '../components/TopicIcon'
import { formatMB, useTopicOffline } from '../hooks/useOfflineStatus'
import { useAgeFilter } from '../hooks/useProfile'
import { AGE_BANDS, contentIndexQuery, type ContentIndex, type TopicSummary } from '../lib/content'
import { audioCacheBytes, downloadTopics, isTopicOffline, pendingBytes, removeTopics, topicBytes, useOffline } from '../lib/offline'
import { useSettings } from '../lib/settings'

export const Route = createFileRoute('/offline')({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentIndexQuery),
  component: OfflinePage,
})

function OfflinePage() {
  const { t } = useTranslation()
  const { data: index } = useSuspenseQuery(contentIndexQuery)
  const { band } = useAgeFilter()
  const cached = useOffline((s) => s.cached)
  const busy = useOffline((s) => Object.keys(s.downloading).length > 0)

  const done = index.topics.filter((tp) => isTopicOffline(tp, cached))
  const download = (topics: TopicSummary[]) => downloadTopics(topics.filter((tp) => !isTopicOffline(tp, cached))).catch(() => {})
  const bandTopics = index.topics.filter((tp) => tp.ages.includes(band))

  return (
    <>
      <PageHeader back title={t('offline.packsTitle')} subtitle={t('offline.topicsDone', { done: done.length, total: index.topics.length })} />
      <main className="space-y-5 px-4">
        <section className="space-y-3 rounded-3xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">{t('offline.pageDesc')}</p>
          <ProgressBar value={done.length} total={index.topics.length} />
          <p className="text-sm">{t('offline.used', { size: formatMB(audioCacheBytes(index)) })}</p>
          <div className="grid grid-cols-2 gap-2">
            <BulkButton disabled={busy || !navigator.onLine} onClick={() => download(bandTopics)}>
              <CloudDownload size={18} /> {t('offline.downloadBand', { band: t(`age.band.${band}`), size: formatMB(pendingBytes(bandTopics, index, cached)) })}
            </BulkButton>
            <BulkButton disabled={busy || !navigator.onLine} onClick={() => download(index.topics)}>
              <CloudDownload size={18} /> {t('offline.downloadAll', { size: formatMB(pendingBytes(index.topics, index, cached)) })}
            </BulkButton>
          </div>
          {done.length > 0 && (
            <button
              disabled={busy}
              onClick={() => confirm(t('offline.removeAllConfirm')) && removeTopics(index.topics.map((tp) => tp.id), index)}
              className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-rose disabled:opacity-50"
            >
              <Trash2 size={16} /> {t('offline.removeAll')}
            </button>
          )}
          {!navigator.onLine && <p className="text-xs text-muted">{t('offline.needOnline')}</p>}
        </section>

        {AGE_BANDS.map((b) => {
          const topics = index.topics.filter((tp) => tp.ages[0] === b)
          if (!topics.length) return null
          return (
            <section key={b} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted">{t(`age.band.${b}`)}</h2>
              <ul className="space-y-2">
                {topics.map((tp) => (
                  <PackRow key={tp.id} topic={tp} index={index} />
                ))}
              </ul>
            </section>
          )
        })}
      </main>
    </>
  )
}

function PackRow({ topic, index }: { topic: TopicSummary; index: ContentIndex }) {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const { offline, downloading, progress } = useTopicOffline(topic)
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
      <TopicIcon name={topic.icon} size={22} className="shrink-0 text-leaf-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lang === 'vi' ? topic.titleVi : topic.titleEn}</p>
        <p className="flex items-center gap-1 text-xs text-muted">
          {offline && <CircleCheck size={12} className="text-leaf-600" />}
          {formatMB(topicBytes(topic, index))} · {topic.ages.join(', ')}
        </p>
        {downloading && <ProgressBar value={progress} total={1} />}
      </div>
      {offline ? (
        <button
          onClick={() => removeTopics([topic.id], index)}
          aria-label={t('offline.remove')}
          className="grid size-11 place-items-center rounded-full text-muted active:bg-leaf-100"
        >
          <Trash2 size={18} />
        </button>
      ) : (
        <button
          disabled={downloading || !navigator.onLine}
          onClick={() => downloadTopics([topic]).catch(() => {})}
          aria-label={t('offline.download')}
          className={clsx('grid size-11 place-items-center rounded-full bg-leaf-100 text-leaf-700 disabled:opacity-50')}
        >
          {downloading ? <Loader size={18} className="animate-spin" /> : <CloudDownload size={18} />}
        </button>
      )}
    </li>
  )
}

function BulkButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-leaf-500 px-2 text-center text-xs font-semibold text-white disabled:opacity-50"
    >
      {children}
    </button>
  )
}
