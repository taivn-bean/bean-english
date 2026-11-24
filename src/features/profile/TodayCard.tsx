import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { BookOpen, CircleCheck, Flame, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCardStats } from '@/features/cards/useCards'
import { MAX_REVIEW } from '@/features/cards/cards'
import type { TopicSummary } from '@/features/content/content'
import { useSettings } from '@/shared/settings'
import { TopicIcon } from '@/shared/ui/TopicIcon'
import { useActiveProfile, useStreak } from './useProfile'

/**
 * Home: the child's day at a glance — streak, today's word-card review, and "continue" the last
 * topic (or the first suggestion for this time of day).
 */
export function TodayCard({ topics, fallback }: { topics: TopicSummary[]; fallback?: TopicSummary }) {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const lastTopicId = useSettings((s) => s.lastTopicId)
  const profile = useActiveProfile()
  const streak = useStreak()
  const cards = useCardStats()
  const last = topics.find((tp) => tp.id === lastTopicId)
  const next = last ?? fallback
  const title = (tp: TopicSummary) => (lang === 'vi' ? tp.titleVi : tp.titleEn)

  return (
    <section className="space-y-3 rounded-3xl border border-leaf-200 bg-leaf-50 p-4" aria-labelledby="today-title" data-tour="home-today">
      <div className="flex items-center justify-between gap-2">
        <h2 id="today-title" className="font-bold">
          {t('today.title', { name: profile?.name ?? t('common.defaultChild') })}
        </h2>
        <Link
          to="/avatar"
          className={clsx(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            streak.activeToday ? 'bg-peach text-white' : 'bg-peach/15 text-peach',
          )}
        >
          <Flame size={14} /> {t('streak.chip', { count: streak.current })}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cards.due > 0 ? (
          <Link to="/cards/study" className={tileClass(true)}>
            <Tile icon={<Layers size={22} />} label={t('today.review')} value={t('cards.count', { count: Math.min(cards.due, MAX_REVIEW) })} strong />
          </Link>
        ) : (
          <Link to="/cards" className={tileClass()}>
            <Tile
              icon={cards.total ? <CircleCheck size={22} /> : <Layers size={22} />}
              label={t('cards.title')}
              value={cards.total ? t('today.reviewDone') : t('today.startCards')}
            />
          </Link>
        )}
        {next && (
          <Link to="/topics/$topicId" params={{ topicId: next.id }} className={tileClass()}>
            <Tile
              icon={last ? <TopicIcon name={next.icon} size={22} /> : <BookOpen size={22} />}
              label={last ? t('today.continue') : t('today.start')}
              value={title(next)}
            />
          </Link>
        )}
      </div>
    </section>
  )
}

const tileClass = (strong = false) =>
  clsx(
    'flex min-h-20 flex-col justify-between gap-1 rounded-2xl p-3 active:scale-[0.98]',
    strong ? 'bg-leaf-500 text-white shadow-sm' : 'bg-surface text-leaf-700',
  )

function Tile({ icon, label, value, strong }: { icon: React.ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <>
      {icon}
      <span className="min-w-0">
        <span className={clsx('block text-xs', strong ? 'text-white/85' : 'text-muted')}>{label}</span>
        <span className="line-clamp-2 block leading-tight font-bold">{value}</span>
      </span>
    </>
  )
}
