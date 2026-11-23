import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Clock, Flame, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../components/Avatar'
import { ProgressBar } from '../components/Layout'
import { OfflineSuggestion, OfflineTag } from '../components/OfflineStatus'
import { PhraseCard } from '../components/PhraseCard'
import { InstallHint } from '../components/PwaPrompts'
import { TopicIcon } from '../components/TopicIcon'
import { useTopics } from '../hooks/useContent'
import { useActiveProfile, useAgeFilter, useFavorites, useProgressMap, useStreak } from '../hooks/useProfile'
import { contentIndexQuery, type TopicSummary } from '../lib/content'
import { useSettings } from '../lib/settings'
import { dailyPicks, suggestNow } from '../lib/suggestions'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentIndexQuery),
  component: Home,
})

function Home() {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const { data } = useSuspenseQuery(contentIndexQuery)
  const profile = useActiveProfile()
  const progress = useProgressMap()
  const favIds = new Set(useFavorites().map((f) => f.phraseId))
  const { band, showAll, fits } = useAgeFilter()
  const streak = useStreak()
  const topics = data.topics.filter((tp) => fits(tp.ages))
  const idsFor = (tp: TopicSummary) => (showAll ? tp.phraseIds : tp.phrasesByAge[band])

  const { period, topicIds } = useMemo(() => suggestNow(), [])
  const suggested = topicIds.flatMap((id) => topics.find((tp) => tp.id === id) ?? [])
  const { topics: suggestedTopics } = useTopics(suggested.map((tp) => tp.id))
  const ready = suggestedTopics.length === suggested.length
  const picks = useMemo(
    () => (ready ? dailyPicks(suggestedTopics, progress, period, (p) => fits(p.ages)) : []),
    // Computed once when topics are loaded: marking a pick as learned shouldn't make it jump away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, period, band, showAll],
  )

  return (
    <>
      <header className="pt-safe space-y-3 px-4 pb-2">
        <div className="flex items-center gap-3">
          <Link to="/avatar" aria-label={t('avatar.title')} className="shrink-0">
            <Avatar avatar={profile?.avatar} color={profile?.color} size={56} title={profile?.name} />
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-muted">{t('app.name')}</p>
            <h1 className="text-xl leading-tight font-bold">{t('home.greeting', { name: profile?.name ?? t('common.defaultChild') })}</h1>
            <span className="mt-1 flex flex-wrap gap-1.5">
              <Link to="/progress" className="rounded-full bg-leaf-100 px-2.5 py-0.5 text-xs font-semibold text-leaf-700">
                {showAll ? t('age.showAll') : t(`age.band.${band}`)}
              </Link>
              <Link to="/avatar" className="flex items-center gap-1 rounded-full bg-peach/15 px-2.5 py-0.5 text-xs font-semibold text-peach">
                <Flame size={14} /> {t('streak.chip', { count: streak.current })}
              </Link>
            </span>
          </div>
        </div>
        <Link to="/search" className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-3 text-muted">
          <Search size={20} />
          <span className="truncate">{t('home.searchPlaceholder')}</span>
        </Link>
      </header>

      <main className="space-y-5 px-4 pt-2">
        <InstallHint />
        <OfflineSuggestion />

        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted">
            <Clock size={16} /> {t('home.suggested')}
          </h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {suggested.map((topic) => (
              <li key={topic.id} className="shrink-0">
                <Link
                  to="/topics/$topicId"
                  params={{ topicId: topic.id }}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-leaf-200 bg-leaf-50 px-4 font-semibold text-leaf-700"
                >
                  <TopicIcon name={topic.icon} size={18} />
                  {lang === 'vi' ? topic.titleVi : topic.titleEn}
                </Link>
              </li>
            ))}
          </ul>
          {picks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold">{t('home.todayPicks', { period: t(`home.period.${period}`) })}</h3>
              {picks.map(({ phrase, topicId }) => (
                <PhraseCard key={phrase.id} phrase={phrase} topicId={topicId} progress={progress.get(phrase.id)} favorite={favIds.has(phrase.id)} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">{t('home.allTopics')}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {topics.map((topic) => {
              const ids = idsFor(topic)
              return <TopicCard key={topic.id} topic={topic} total={ids.length} learned={ids.filter((id) => progress.get(id)?.parentLearned).length} />
            })}
          </ul>
        </section>
      </main>
    </>
  )
}

function TopicCard({ topic, learned, total }: { topic: TopicSummary; learned: number; total: number }) {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  return (
    <li>
      <Link
        to="/topics/$topicId"
        params={{ topicId: topic.id }}
        className="flex h-full flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-sm active:scale-[0.98]"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
          <TopicIcon name={topic.icon} size={26} />
        </span>
        <span className="text-base leading-tight font-bold">{lang === 'vi' ? topic.titleVi : topic.titleEn}</span>
        <span lang={lang === 'vi' ? 'en' : 'vi'} className="-mt-1 text-xs text-muted">
          {lang === 'vi' ? topic.titleEn : topic.titleVi}
        </span>
        <OfflineTag topic={topic} className="self-start" />
        <span className="mt-auto space-y-1">
          <ProgressBar value={learned} total={total} />
          <span className="block text-xs text-muted">{t('home.learned', { count: learned, total })}</span>
        </span>
      </Link>
    </li>
  )
}
