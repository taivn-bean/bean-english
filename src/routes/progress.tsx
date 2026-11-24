import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { BookHeart, Flame, Layers, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCardStats } from '@/features/cards/useCards'
import { contentIndexQuery, type TopicSummary } from '@/features/content/content'
import { dayKey } from '@/features/profile/activity'
import { Avatar } from '@/features/profile/Avatar'
import { useActiveProfile, useAgeFilter, useProfiles, useProgressMap, useStreak, useWeekActivity } from '@/features/profile/useProfile'
import { useSettings } from '@/shared/settings'
import { PageHeader, ProgressBar } from '@/shared/ui/Layout'
import { TopicIcon } from '@/shared/ui/TopicIcon'

export const Route = createFileRoute('/progress')({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentIndexQuery),
  component: ProgressPage,
})

function ProgressPage() {
  const { t } = useTranslation()
  const { lang } = useSettings()
  const { data } = useSuspenseQuery(contentIndexQuery)
  const progress = useProgressMap()
  const { band, showAll, fits } = useAgeFilter()
  const streak = useStreak()
  const cards = useCardStats()

  // Stats count only phrases of the child's age band (or everything with "show all ages").
  const topics = data.topics.filter((tp) => fits(tp.ages))
  const idsFor = (tp: TopicSummary) => (showAll ? tp.phraseIds : tp.phrasesByAge[band])
  const allIds = topics.flatMap(idsFor)
  const total = allIds.length
  const parentTotal = allIds.filter((id) => progress.get(id)?.parentLearned).length
  const childTotal = allIds.filter((id) => progress.get(id)?.childSaid).length

  return (
    <>
      <PageHeader title={t('progress.title')} />
      <main className="space-y-5 px-4">
        <ChildHeader />

        <section className="grid grid-cols-2 gap-3">
          <Stat label={t('progress.parentLearned')} value={parentTotal} total={total} color="bg-leaf-400" />
          <Stat label={t('progress.childSaid')} value={childTotal} total={total} color="bg-peach" />
          <Stat label={t('progress.wordsLearned')} value={cards.learned} icon={<Layers size={18} className="text-leaf-600" />} to="/cards" />
          <Stat label={t('streak.current')} value={streak.current} icon={<Flame size={18} className="text-peach" />} to="/avatar" />
        </section>

        <WeekChart />

        <nav className="grid grid-cols-2 gap-3">
          <Link to="/avatar" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold text-leaf-700">
            <Flame size={18} className="text-peach" /> {t('avatar.title')}
          </Link>
          <Link to="/diary" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold text-leaf-700">
            <BookHeart size={18} /> {t('diary.title')}
          </Link>
        </nav>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">{t('progress.byTopic')}</h2>
          <ul className="space-y-2">
            {topics.map((topic) => {
              const ids = idsFor(topic)
              const rows = ids.map((id) => progress.get(id))
              const parent = rows.filter((r) => r?.parentLearned).length
              const child = rows.filter((r) => r?.childSaid).length
              return (
                <li key={topic.id}>
                  <Link to="/topics/$topicId" params={{ topicId: topic.id }} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                    <TopicIcon name={topic.icon} size={22} className="shrink-0 text-leaf-600" />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block truncate text-sm font-semibold">{lang === 'vi' ? topic.titleVi : topic.titleEn}</span>
                      <ProgressBar value={parent} total={ids.length} />
                      <ProgressBar value={child} total={ids.length} color="bg-peach" />
                    </span>
                    <span className="w-12 text-right text-xs text-muted">
                      {parent}/{child}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </>
  )
}

/** Active child + quick switch between children; managing profiles lives in Settings. */
function ChildHeader() {
  const { t } = useTranslation()
  const profile = useActiveProfile()
  const profiles = useProfiles()
  const { activeProfileId, set } = useSettings()
  const { band, showAll } = useAgeFilter()
  if (!profile) return null
  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Link to="/avatar" aria-label={t('avatar.title')}>
          <Avatar avatar={profile.avatar} color={profile.color} size={56} title={profile.name} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{profile.name}</p>
          <span className="rounded-full bg-leaf-100 px-2.5 py-0.5 text-xs font-semibold text-leaf-700">{showAll ? t('age.showAll') : t(`age.band.${band}`)}</span>
        </div>
        <Link to="/settings" hash="profiles" aria-label={t('progress.manageProfiles')} className="grid size-11 place-items-center rounded-full text-muted active:bg-leaf-100">
          <Settings2 size={22} />
        </Link>
      </div>
      {profiles.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]" role="radiogroup" aria-label={t('progress.switchChild')}>
          {profiles.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === activeProfileId}
              onClick={() => set({ activeProfileId: p.id })}
              className={clsx(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-semibold',
                p.id === activeProfileId ? 'border-leaf-500 bg-leaf-50 text-leaf-700' : 'border-line text-muted',
              )}
            >
              <Avatar avatar={p.avatar} color={p.color} size={32} />
              {p.name}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/** Bars of the last 7 days' activity (plays, marks, card reviews). */
function WeekChart() {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const week = useWeekActivity()
  const max = Math.max(1, ...week.map((d) => d.count))
  const today = dayKey()
  const fmt = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' })
  const totalWeek = week.reduce((n, d) => n + d.count, 0)
  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-4" aria-labelledby="week-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="week-title" className="font-bold">
          {t('progress.week')}
        </h2>
        <span className="text-xs text-muted">{t('progress.weekTotal', { count: totalWeek })}</span>
      </div>
      <ol className="flex h-28 items-end gap-2">
        {week.map(({ day, count }) => {
          const [y, m, d] = day.split('-').map(Number)
          return (
            <li key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={`${day}: ${count}`}>
              {count > 0 && <span className="text-[10px] text-muted">{count}</span>}
              <span
                className={clsx('w-full max-w-8 rounded-t-lg', count ? (day === today ? 'bg-leaf-500' : 'bg-leaf-300') : 'bg-leaf-100')}
                style={{ height: `${count ? Math.max(8, (count / max) * 80) : 4}%` }}
              />
              <span className={clsx('text-[11px]', day === today ? 'font-bold text-leaf-700' : 'text-muted')}>{fmt.format(new Date(y, m - 1, d))}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Stat({ label, value, total, color, icon, to }: { label: string; value: number; total?: number; color?: string; icon?: React.ReactNode; to?: '/cards' | '/avatar' }) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-sm text-muted">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-bold">
        {value}
        {total != null && <span className="text-base font-normal text-muted">/{total}</span>}
      </p>
      {total != null && <ProgressBar value={value} total={total} color={color} />}
    </>
  )
  const cls = 'block space-y-2 rounded-3xl border border-line bg-surface p-4'
  return to ? (
    <Link to={to} className={clsx(cls, 'active:bg-leaf-50')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
