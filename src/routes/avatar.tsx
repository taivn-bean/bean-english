import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { BookHeart, Flame, Lock, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CardsSection } from '@/features/cards/CardsSection'
import { StickerAlbum } from '@/features/rewards/StickerAlbum'
import { Avatar, AVATAR_ACCESSORIES, AVATAR_ANIMALS, AVATAR_COLORS, DEFAULT_AVATAR } from '@/features/profile/Avatar'
import { PageHeader } from '@/shared/ui/Layout'
import { useActiveProfile, useStreak } from '@/features/profile/useProfile'
import { ACCESSORY_UNLOCKS, addDays, dayKey } from '@/features/profile/activity'
import { db, type AvatarConfig } from '@/shared/db'

export const Route = createFileRoute('/avatar')({ component: AvatarPage })

function AvatarPage() {
  const { t } = useTranslation()
  const profile = useActiveProfile()
  const streak = useStreak()
  if (!profile) return null

  const avatar = profile.avatar ?? DEFAULT_AVATAR
  const save = (patch: Partial<AvatarConfig>) => db.profiles.update(profile.id, { avatar: { ...avatar, ...patch } })

  // last 4 weeks, oldest first
  const today = dayKey()
  const last28 = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27))

  return (
    <>
      <PageHeader back title={t('avatar.title')} subtitle={profile.name} />
      <main className="space-y-5 px-4">
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-5">
          <Avatar avatar={avatar} color={profile.color} size={128} title={profile.name} />
          <div className="grid w-full grid-cols-2 gap-3">
            <StatCard icon={<Flame className="text-peach" />} value={streak.current} label={t('streak.current')} />
            <StatCard icon={<Trophy className="text-[#e0b020]" />} value={streak.best} label={t('streak.best')} />
          </div>
          <p className="text-center text-sm text-muted">{streak.activeToday ? t('streak.doneToday') : t('streak.notYet')}</p>
          <div className="grid grid-cols-7 gap-1.5" aria-label={t('streak.calendar')}>
            {last28.map((d) => (
              <span
                key={d}
                title={d}
                className={clsx('size-6 rounded-md', streak.days.has(d) ? 'bg-leaf-500' : 'bg-leaf-100', d === today && 'ring-2 ring-leaf-700')}
              />
            ))}
          </div>
        </section>

        <CardsSection />

        <StickerAlbum />

        <Link to="/diary" className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 font-semibold text-leaf-700">
          <BookHeart size={22} /> {t('diary.title')}
        </Link>

        <Picker label={t('avatar.animal')}>
          {AVATAR_ANIMALS.map((a) => (
            <Choice key={a} active={avatar.animal === a} onClick={() => save({ animal: a })} label={t(`avatar.animals.${a}`)}>
              <Avatar avatar={{ animal: a, accessory: 'none' }} color={profile.color} size={56} />
            </Choice>
          ))}
        </Picker>

        <Picker label={t('avatar.color')}>
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => db.profiles.update(profile.id, { color: c })}
              aria-label={c}
              aria-pressed={profile.color === c}
              className={clsx('size-11 rounded-full', profile.color === c && 'ring-4 ring-leaf-700 ring-offset-2 ring-offset-bg')}
              style={{ background: c }}
            />
          ))}
        </Picker>

        <Picker label={t('avatar.accessory')}>
          {AVATAR_ACCESSORIES.map((acc) => {
            const need = ACCESSORY_UNLOCKS[acc]
            const locked = streak.best < need
            return (
              <Choice
                key={acc}
                active={avatar.accessory === acc}
                disabled={locked}
                onClick={() => save({ accessory: acc })}
                label={locked ? t('avatar.unlockAt', { days: need }) : t(`avatar.accessories.${acc}`)}
              >
                <span className="relative">
                  <Avatar avatar={{ animal: avatar.animal, accessory: acc }} color={profile.color} size={56} className={clsx(locked && 'opacity-40 grayscale')} />
                  {locked && <Lock size={18} className="absolute inset-0 m-auto text-ink" />}
                </span>
              </Choice>
            )
          })}
        </Picker>
      </main>
    </>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-leaf-50 p-3">
      {icon}
      <div>
        <p className="text-2xl leading-none font-bold">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  )
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted">{label}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Choice({ active, disabled, onClick, label, children }: { active: boolean; disabled?: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={clsx(
        'flex w-[4.75rem] flex-col items-center gap-1 rounded-2xl border p-2 text-xs',
        active ? 'border-leaf-500 bg-leaf-50 font-semibold' : 'border-line bg-surface',
        disabled && 'cursor-not-allowed text-muted',
      )}
    >
      {children}
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
}
