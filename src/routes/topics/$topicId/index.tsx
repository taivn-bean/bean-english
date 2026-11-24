import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ChevronRight, MessagesSquare } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/shared/ui/Layout'
import { PhraseCard } from '@/features/content/PhraseCard'
import { PhraseLegend } from '@/features/content/PhraseLegend'
import { OfflineTag } from '@/features/offline/OfflineStatus'
import { PlayAllButton } from '@/features/audio/PlaylistBar'
import { useTopicOffline, useTopicSummary } from '@/features/offline/useOfflineStatus'
import { downloadTopics } from '@/features/offline/offline'
import { useAgeFilter, useFavorites, useProgressMap } from '@/features/profile/useProfile'
import { topicQuery, toPlaylist } from '@/features/content/content'
import { useSettings } from '@/shared/settings'
import { FeatureTour } from '@/features/tour/FeatureTour'

export const Route = createFileRoute('/topics/$topicId/')({
  // plain validator: keeps zod out of the startup bundle
  validateSearch: (s: Record<string, unknown>): { tab?: 'phrases' | 'dialogues' } => ({
    tab: s.tab === 'phrases' || s.tab === 'dialogues' ? s.tab : undefined,
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(topicQuery(params.topicId)),
  component: TopicPage,
})

function TopicPage() {
  const { t } = useTranslation()
  const { topicId } = Route.useParams()
  const tab = Route.useSearch().tab ?? 'phrases'
  const lang = useSettings((s) => s.lang)
  const { data: topic } = useSuspenseQuery(topicQuery(topicId))
  const progress = useProgressMap(topicId)
  const favorites = useFavorites()
  const favIds = new Set(favorites.map((f) => f.phraseId))
  const { band, fits } = useAgeFilter()
  const phrases = topic.phrases.filter((p) => fits(p.ages))
  const dialogues = topic.dialogues.filter((d) => fits(d.ages))
  const summary = useTopicSummary(topicId)
  const { offline, downloading } = useTopicOffline(summary)
  const setSettings = useSettings((s) => s.set)
  useEffect(() => setSettings({ lastTopicId: topicId }), [topicId, setSettings])

  return (
    <>
      <PageHeader
        back
        title={lang === 'vi' ? topic.titleVi : topic.titleEn}
        subtitle={lang === 'vi' ? topic.titleEn : topic.titleVi}
        right={<span data-tour="topic-play-all"><PlayAllButton id={`topic:${topicId}`} label={lang === 'vi' ? topic.titleVi : topic.titleEn} items={toPlaylist(phrases)} /></span>}
      />

      <div className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3.5rem)] z-10 bg-bg/90 px-4 pb-3 backdrop-blur">
        <div className="grid grid-cols-2 rounded-full bg-leaf-100 p-1" role="tablist" data-tour="topic-tabs">
          {(['phrases', 'dialogues'] as const).map((key) => (
            <Link
              key={key}
              to="."
              search={{ tab: key }}
              replace
              role="tab"
              aria-selected={tab === key}
              className={clsx('rounded-full py-2 text-center text-sm font-semibold', tab === key ? 'bg-surface text-leaf-700 shadow-sm' : 'text-muted')}
            >
              {t(`topic.${key}`)}
            </Link>
          ))}
        </div>
      </div>

      <main className="space-y-3 px-4">
        {summary && !offline && (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-leaf-50 px-3 py-2" data-tour="topic-offline">
            <OfflineTag topic={summary} />
            {!downloading && (
              <button onClick={() => downloadTopics([summary]).catch(() => {})} className="text-sm font-semibold text-leaf-600">
                {t('offline.downloadTopic')}
              </button>
            )}
          </div>
        )}
        {(tab === 'phrases' ? phrases : dialogues).length === 0 && (
          <p className="rounded-3xl bg-leaf-50 p-6 text-center text-muted">{t('age.empty', { band: t(`age.band.${band}`) })}</p>
        )}
        {tab === 'phrases' && phrases.length > 0 && <PhraseLegend />}
        {tab === 'phrases'
          ? phrases.map((p) => (
              <PhraseCard key={p.id} phrase={p} topicId={topicId} progress={progress.get(p.id)} favorite={favIds.has(p.id)} />
            ))
          : dialogues.map((d) => (
              <Link
                key={d.id}
                to="/topics/$topicId/dialogues/$dialogueId"
                params={{ topicId, dialogueId: d.id }}
                className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
                  <MessagesSquare size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{lang === 'vi' ? d.titleVi : d.titleEn}</span>
                  <span className="block text-sm text-muted">
                    {lang === 'vi' ? d.titleEn : d.titleVi} · {t('topic.lines', { count: d.lines.length })}
                  </span>
                </span>
                <ChevronRight className="text-muted" />
              </Link>
            ))}
      </main>
      <FeatureTour id="topic" />
    </>
  )
}
