import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ChevronDown, CloudDownload, GraduationCap, Loader, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WordVisual } from '@/features/cards/WordVisual'
import { WordExamples } from '@/features/cards/WordExamples'
import { PageHeader, ProgressBar } from '@/shared/ui/Layout'
import { OfflineTag } from '@/features/offline/OfflineStatus'
import { useCardMap } from '@/features/cards/useCards'
import { formatMB, useTopicOffline } from '@/features/offline/useOfflineStatus'
import { useAgeFilter } from '@/features/profile/useProfile'
import { play, usePlaying } from '@/features/audio/audio'
import { isLearned } from '@/features/cards/cards'
import { contentIndexQuery, deckQuery } from '@/features/content/content'
import { downloadTopics, topicBytes } from '@/features/offline/offline'
import { useSettings } from '@/shared/settings'
import { dayKey } from '@/features/profile/activity'
import { FeatureTour } from '@/features/tour/FeatureTour'

export const Route = createFileRoute('/cards/$deckId')({
  loader: ({ context, params }) =>
    Promise.all([context.queryClient.ensureQueryData(deckQuery(params.deckId)), context.queryClient.ensureQueryData(contentIndexQuery)]),
  component: DeckPage,
})

function DeckPage() {
  const { t } = useTranslation()
  const { deckId } = Route.useParams()
  const { data: deck } = useSuspenseQuery(deckQuery(deckId))
  const { data: index } = useSuspenseQuery(contentIndexQuery)
  const summary = index.decks.find((d) => d.id === deckId)
  const lang = useSettings((s) => s.lang)
  const showIpa = useSettings((s) => s.showIpa)
  const { fits } = useAgeFilter()
  const cards = useCardMap(deckId)
  const playing = usePlaying()
  const { offline, downloading } = useTopicOffline(summary)
  const [openId, setOpenId] = useState<string | null>(null)

  const words = deck.words.filter((w) => fits(w.ages))
  const learned = words.filter((w) => isLearned(cards.get(w.id))).length
  const today = dayKey()
  const due = [...cards.values()].filter((c) => c.due <= today).length
  const fresh = words.filter((w) => !cards.has(w.id)).length

  return (
    <>
      <PageHeader back title={lang === 'vi' ? deck.titleVi : deck.titleEn} subtitle={t('cards.learnedOf', { learned, total: words.length })} />
      <main className="space-y-4 px-4">
        <section className="space-y-3 rounded-3xl border border-line bg-surface p-4">
          <ProgressBar value={learned} total={words.length} />
          <p className="text-sm text-muted">{t('cards.deckStatus', { due, fresh })}</p>
          <Link
            to="/cards/study"
            search={{ deck: deckId }}
            disabled={!due && !fresh}
            data-tour="deck-study"
            className={clsx(
              'flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-leaf-500 text-lg font-semibold text-white active:bg-leaf-600',
              !due && !fresh && 'pointer-events-none opacity-50',
            )}
          >
            <GraduationCap size={22} /> {t('cards.study')}
          </Link>
          {summary && !offline && (
            <div className="flex items-center justify-between gap-2" data-tour="deck-offline">
              <OfflineTag topic={summary} />
              <button
                disabled={downloading || !navigator.onLine}
                onClick={() => downloadTopics([summary]).catch(() => {})}
                className="flex min-h-10 items-center gap-1.5 rounded-full bg-leaf-100 px-3 text-sm font-semibold text-leaf-700 disabled:opacity-50"
              >
                {downloading ? <Loader size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                {t('offline.download')} · {formatMB(topicBytes(summary, index))}
              </button>
            </div>
          )}
        </section>

        <ul className="space-y-2">
          {words.map((w, i) => {
            const c = cards.get(w.id)
            const status = !c ? 'new' : isLearned(c) ? 'learned' : 'learning'
            const open = openId === w.id
            return (
              <li key={w.id} data-tour={i === 0 ? 'deck-word' : undefined} className={clsx('rounded-2xl border bg-surface', open ? 'border-leaf-400' : 'border-line')}>
                <button
                  onClick={() => {
                    setOpenId(open ? null : w.id)
                    if (!open) void play(w.audio)
                  }}
                  aria-expanded={open}
                  className={clsx('flex w-full items-center gap-3 rounded-2xl p-3 text-left', playing === w.audio && 'is-playing')}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-leaf-50">
                    <WordVisual emoji={w.emoji} icon={deck.icon} size={30} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span lang="en" className="block text-lg leading-tight font-semibold">
                      {w.en}
                    </span>
                    {showIpa && <span className="block font-mono text-xs text-muted">{w.ipa}</span>}
                    <span className="block text-sm text-muted">{w.vi}</span>
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      status === 'learned' && 'bg-leaf-100 text-leaf-700',
                      status === 'learning' && 'bg-peach/20 text-peach',
                      status === 'new' && 'bg-ink/5 text-muted',
                    )}
                  >
                    {t(`cards.status.${status}`)}
                  </span>
                  <ChevronDown size={18} className={clsx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="space-y-3 px-3 pb-3">
                    <button
                      onClick={() => void play(w.audio)}
                      className="flex min-h-10 items-center gap-2 rounded-full bg-leaf-500 px-4 text-sm font-semibold text-white active:bg-leaf-600"
                    >
                      <Volume2 size={18} /> {t('cards.hearWord')}
                    </button>
                    <WordExamples word={w} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </main>
      <FeatureTour id="deck" />
    </>
  )
}
