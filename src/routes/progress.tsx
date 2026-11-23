import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { BookHeart, Check, Flame, Pencil, Trash2, UserPlus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../components/Avatar'
import { PageHeader, ProgressBar } from '../components/Layout'
import { TopicIcon } from '../components/TopicIcon'
import { useAgeFilter, useProfiles, useProgressMap } from '../hooks/useProfile'
import { AGE_BANDS, contentIndexQuery, type TopicSummary } from '../lib/content'
import { db, PROFILE_COLORS, type Profile } from '../lib/db'
import { useSettings } from '../lib/settings'

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
        <ProfileManager />

        <nav className="grid grid-cols-2 gap-3">
          <Link to="/avatar" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold text-leaf-700">
            <Flame size={18} className="text-peach" /> {t('avatar.title')}
          </Link>
          <Link to="/diary" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold text-leaf-700">
            <BookHeart size={18} /> {t('diary.title')}
          </Link>
        </nav>

        <section className="grid grid-cols-2 gap-3">
          <Stat label={t('progress.parentLearned')} value={parentTotal} total={total} color="bg-leaf-400" />
          <Stat label={t('progress.childSaid')} value={childTotal} total={total} color="bg-peach" />
        </section>

        <ul className="space-y-2">
          {topics.map((topic) => {
            const ids = idsFor(topic)
            const rows = ids.map((id) => progress.get(id))
            const parent = rows.filter((r) => r?.parentLearned).length
            const child = rows.filter((r) => r?.childSaid).length
            return (
              <li key={topic.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <TopicIcon name={topic.icon} size={22} className="shrink-0 text-leaf-600" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-semibold">{lang === 'vi' ? topic.titleVi : topic.titleEn}</p>
                  <ProgressBar value={parent} total={ids.length} />
                  <ProgressBar value={child} total={ids.length} color="bg-peach" />
                </div>
                <span className="w-12 text-right text-xs text-muted">
                  {parent}/{child}
                </span>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}

function Stat({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="space-y-2 rounded-3xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="text-base font-normal text-muted">/{total}</span>
      </p>
      <ProgressBar value={value} total={total} color={color} />
    </div>
  )
}

function ProfileManager() {
  const { t } = useTranslation()
  const profiles = useProfiles()
  const { activeProfileId, set } = useSettings()
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [name, setName] = useState('')
  const active = profiles.find((p) => p.id === activeProfileId)

  const startEdit = (p?: Profile) => {
    setEditing(p?.id ?? 'new')
    setName(p?.name ?? '')
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (editing === 'new') {
      const id = await db.profiles.add({
        name: trimmed,
        color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
        createdAt: Date.now(),
        ageBand: '3-5',
      } as Profile)
      set({ activeProfileId: id })
    } else if (editing != null) {
      await db.profiles.update(editing, { name: trimmed })
    }
    setEditing(null)
  }

  const remove = async (p: Profile) => {
    if (!confirm(t('progress.deleteConfirm', { name: p.name }))) return
    await db.transaction('rw', [db.profiles, db.progress, db.favorites, db.activity], async () => {
      await db.activity.where({ profileId: p.id }).delete()
      await db.progress.where({ profileId: p.id }).delete()
      await db.favorites.where({ profileId: p.id }).delete()
      await db.profiles.delete(p.id)
    })
    if (activeProfileId === p.id) set({ activeProfileId: null }) // root layout picks/creates another
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted">{t('progress.profiles')}</h2>
      <ul className="space-y-2">
        {profiles.map((p) => (
          <li key={p.id} className={clsx('flex items-center gap-2 rounded-2xl border p-2', p.id === activeProfileId ? 'border-leaf-400 bg-leaf-50' : 'border-line bg-surface')}>
            {editing === p.id ? (
              <NameForm name={name} setName={setName} onSubmit={save} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <button onClick={() => set({ activeProfileId: p.id })} className="flex min-h-11 flex-1 items-center gap-3 text-left">
                  <Avatar avatar={p.avatar} color={p.color} size={40} title={p.name} />
                  <span className="font-semibold">{p.name}</span>
                  {p.id === activeProfileId && <Check size={18} className="text-leaf-600" aria-label={t('progress.active')} />}
                </button>
                <button onClick={() => startEdit(p)} aria-label={t('progress.rename')} className="grid size-10 place-items-center text-muted">
                  <Pencil size={18} />
                </button>
                {profiles.length > 1 && (
                  <button onClick={() => remove(p)} aria-label={t('progress.delete')} className="grid size-10 place-items-center text-muted">
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            )}
          </li>
        ))}
        {active && <AgeBandPicker profile={active} />}
        <li className="flex rounded-2xl border border-dashed border-leaf-200 p-2">
          {editing === 'new' ? (
            <NameForm name={name} setName={setName} onSubmit={save} onCancel={() => setEditing(null)} />
          ) : (
            <button onClick={() => startEdit()} className="flex min-h-11 flex-1 items-center gap-2 px-2 font-semibold text-leaf-600">
              <UserPlus size={20} /> {t('progress.addProfile')}
            </button>
          )}
        </li>
      </ul>
    </section>
  )
}

/** Manual age band for the selected child (drives which phrases/topics are shown). */
function AgeBandPicker({ profile }: { profile: Profile }) {
  const { t } = useTranslation()
  const current = profile.ageBand ?? '3-5'
  return (
    <li className="space-y-2 rounded-2xl border border-line bg-surface p-3">
      <p className="text-sm font-semibold">
        {t('age.label')}: {profile.name}
      </p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('age.label')}>
        {AGE_BANDS.map((b) => (
          <button
            key={b}
            role="radio"
            aria-checked={current === b}
            onClick={() => db.profiles.update(profile.id, { ageBand: b })}
            className={clsx(
              'min-h-11 rounded-xl border text-sm font-semibold',
              current === b ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-line bg-leaf-50 text-ink',
            )}
          >
            {t(`age.band.${b}`)}
          </button>
        ))}
      </div>
    </li>
  )
}

function NameForm({ name, setName, onSubmit, onCancel }: { name: string; setName: (v: string) => void; onSubmit: (e: FormEvent) => void; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <form onSubmit={onSubmit} className="flex flex-1 gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('progress.namePlaceholder')}
        maxLength={30}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base"
      />
      <button type="submit" className="rounded-xl bg-leaf-500 px-3 font-semibold text-white">{t('progress.save')}</button>
      <button type="button" onClick={onCancel} className="px-2 text-muted">{t('progress.cancel')}</button>
    </form>
  )
}
