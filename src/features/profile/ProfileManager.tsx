import clsx from 'clsx'
import { Check, Pencil, Trash2, UserPlus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AGE_BANDS } from '@/features/content/content'
import { db, PROFILE_COLORS, type Profile } from '@/shared/db'
import { useSettings } from '@/shared/settings'
import { Avatar } from './Avatar'
import { useProfiles } from './useProfile'

/** Children's profiles: switch, rename, delete, add + the active child's age band. Lives in Settings. */
export function ProfileManager() {
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
    await db.transaction('rw', [db.profiles, db.progress, db.favorites, db.activity, db.cards], async () => {
      await db.activity.where({ profileId: p.id }).delete()
      await db.cards.where({ profileId: p.id }).delete()
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
