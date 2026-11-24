import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ChevronRight, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCardStats } from './useCards'
import { useAgeFilter } from '@/features/profile/useProfile'
import { MAX_REVIEW } from './cards'
import { contentIndexQuery, type DeckSummary } from '@/features/content/content'
import { useSettings } from '@/shared/settings'
import { ProgressBar } from '@/shared/ui/Layout'
import { OfflineTag } from '@/features/offline/OfflineStatus'
import { TopicIcon } from '@/shared/ui/TopicIcon'

/** Avatar page: today's review + decks in progress (max 4) + link to all decks. */
export function CardsSection() {
  const { t } = useTranslation()
  const { data: index } = useQuery(contentIndexQuery)
  const { fits } = useAgeFilter()
  const stats = useCardStats()
  if (!index?.decks?.length) return null
  const all = index.decks.filter((d) => fits(d.ages))
  const started = all.filter((d) => stats.byDeck.has(d.id))
  // decks with cards due first, then most studied; fresh users see the first decks of their band
  const shown = (started.length ? started.sort((a, b) => (stats.byDeck.get(b.id)!.due - stats.byDeck.get(a.id)!.due) || (stats.byDeck.get(b.id)!.studied - stats.byDeck.get(a.id)!.studied)) : all).slice(0, 4)

  return (
    <section className="space-y-3" aria-labelledby="cards-title">
      <div className="flex items-end justify-between gap-2">
        <h2 id="cards-title" className="text-lg font-bold">
          {t('cards.title')}
        </h2>
        <span className="text-xs text-muted">{t('cards.learnedTotal', { count: stats.learned })}</span>
      </div>
      <ReviewButton due={stats.due} hasCards={stats.total > 0} />
      <DeckGrid decks={shown} />
      <Link to="/cards" className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4 font-semibold text-leaf-700">
        {t('cards.allDecks', { count: all.length })} <ChevronRight size={20} />
      </Link>
    </section>
  )
}

export function ReviewButton({ due, hasCards }: { due: number; hasCards: boolean }) {
  const { t } = useTranslation()
  return due > 0 ? (
    <Link
      to="/cards/study"
      className="flex min-h-14 items-center gap-3 rounded-2xl bg-leaf-500 px-4 font-semibold text-white shadow-sm active:bg-leaf-600"
    >
      <Layers size={24} />
      <span className="flex-1">{t('cards.reviewToday')}</span>
      <span className="rounded-full bg-white/25 px-3 py-1 text-sm">{t('cards.count', { count: Math.min(due, MAX_REVIEW) })}</span>
    </Link>
  ) : (
    <p className="flex items-center gap-2 rounded-2xl bg-leaf-50 px-4 py-3 text-sm text-leaf-700">
      <CheckCircle2 size={20} className="shrink-0" /> {hasCards ? t('cards.noneDue') : t('cards.startHint')}
    </p>
  )
}

/** 2-column grid of deck tiles with learned progress, due badge and offline tag. */
export function DeckGrid({ decks }: { decks: DeckSummary[] }) {
  const lang = useSettings((s) => s.lang)
  const stats = useCardStats()
  return (
    <ul className="grid grid-cols-2 gap-2">
      {decks.map((d) => {
        const s = stats.byDeck.get(d.id)
        return (
          <li key={d.id}>
            <Link
              to="/cards/$deckId"
              params={{ deckId: d.id }}
              className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-3 active:bg-leaf-50"
            >
              <span className="flex items-start justify-between gap-1">
                <TopicIcon name={d.icon} size={26} className="text-leaf-600" />
                {!!s?.due && <span className="rounded-full bg-peach/20 px-2 text-xs font-semibold text-peach">{s.due}</span>}
              </span>
              <span className="text-sm leading-tight font-semibold">{lang === 'vi' ? d.titleVi : d.titleEn}</span>
              <span className="mt-auto space-y-1">
                <ProgressBar value={s?.learned ?? 0} total={d.wordCount} />
                <span className="flex items-center justify-between gap-1 text-[11px] text-muted">
                  {s?.learned ?? 0}/{d.wordCount}
                  <OfflineTag topic={d} className="!px-1.5" />
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

