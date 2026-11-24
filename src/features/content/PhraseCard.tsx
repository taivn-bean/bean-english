import clsx from 'clsx'
import { Check, MessageCircleHeart, Star, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toggleFavorite, toggleProgress } from '@/features/profile/useProfile'
import { play, useAudioState } from '@/features/audio/audio'
import type { Phrase } from './content'
import type { Progress } from '@/shared/db'
import { useSettings } from '@/shared/settings'

type Props = {
  phrase: Phrase
  topicId: string
  progress?: Progress
  favorite: boolean
}

export function PhraseCard({ phrase, topicId, progress, favorite }: Props) {
  const { t } = useTranslation()
  const { showIpa, activeProfileId, showAllAges } = useSettings()
  const { current: playing, sequenceId } = useAudioState()
  const ref = useRef<HTMLElement>(null)
  const [slotIdx, setSlotIdx] = useState(0)

  const slot = phrase.slots?.[slotIdx]
  const audioKey = slot?.audio ?? phrase.audio
  const ipa = slot?.ipa ?? phrase.ipa
  const isPlaying = audioKey != null && playing === audioKey
  const isChild = phrase.speaker === 'child'

  // Hands-free playlist: keep the phrase being read on screen.
  useEffect(() => {
    if (isPlaying && sequenceId) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isPlaying, sequenceId])

  const [enBefore, enAfter] = phrase.slots ? phrase.en.split('___') : [phrase.en, '']
  const [viBefore, viAfter] = phrase.slots ? phrase.vi.split('___') : [phrase.vi, '']

  const toggle = (field: 'parentLearned' | 'childSaid') =>
    activeProfileId != null && toggleProgress(activeProfileId, topicId, phrase.id, field)

  return (
    <article ref={ref} className={clsx('rounded-3xl border bg-surface p-3 shadow-sm', isChild ? 'border-peach/50' : 'border-line')}>
      <div className="flex items-start gap-1">
        <button
          onClick={() => audioKey && play(audioKey)}
          className={clsx('flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-1 text-left', isPlaying && 'is-playing')}
          aria-label={`${t('topic.tapToHear')}: ${slot?.fullEn ?? phrase.en}`}
        >
          <span className={clsx('mt-0.5 grid size-11 shrink-0 place-items-center rounded-full text-white', isChild ? 'bg-peach' : 'bg-leaf-500')}>
            <Volume2 size={22} />
          </span>
          <span className="min-w-0 flex-1">
            {(isChild || showAllAges) && (
              <span className="mb-1 flex flex-wrap gap-1">
                {isChild && <span className="rounded-full bg-peach/20 px-2 py-0.5 text-xs font-semibold text-peach">{t('topic.childSays')}</span>}
                {showAllAges &&
                  phrase.ages.map((b) => (
                    <span key={b} className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-semibold text-leaf-700">
                      {b}
                    </span>
                  ))}
              </span>
            )}
            <span lang="en" className="block text-[1.4rem] leading-snug font-semibold">
              {enBefore}
              {slot && <span className="rounded-md bg-leaf-100 px-1 text-leaf-700">{slot.en}</span>}
              {enAfter}
            </span>
            {showIpa && ipa && <span className="block font-mono text-sm text-muted">{ipa}</span>}
            <span className="mt-1 block text-base text-muted">
              {viBefore}
              {slot && <span className="font-semibold text-ink">{slot.vi}</span>}
              {viAfter}
            </span>
          </span>
        </button>

        {/* compact actions column: parent learned · child said · favorite (legend on the topic page) */}
        <div className="flex shrink-0 flex-col gap-1">
          <IconToggle active={!!progress?.parentLearned} onClick={() => toggle('parentLearned')} label={t('phrase.parentLearned')} tone="leaf">
            <Check size={20} strokeWidth={2.5} />
          </IconToggle>
          <IconToggle active={!!progress?.childSaid} onClick={() => toggle('childSaid')} label={t('phrase.childSaid')} tone="peach">
            <MessageCircleHeart size={20} />
          </IconToggle>
          <IconToggle
            active={favorite}
            onClick={() => activeProfileId != null && toggleFavorite(activeProfileId, topicId, phrase.id)}
            label={t('phrase.favorite')}
            tone="star"
          >
            <Star size={20} className={favorite ? 'fill-current' : undefined} />
          </IconToggle>
        </div>
      </div>

      {phrase.slots && (
        <div className="mt-2 flex flex-wrap gap-2 pl-1" role="group" aria-label={t('phrase.swapWord')}>
          {phrase.slots.map((s, i) => (
            <button
              key={s.en}
              lang="en"
              onClick={() => {
                setSlotIdx(i)
                play(s.audio)
              }}
              className={clsx(
                'min-h-10 rounded-full border px-3 text-sm font-medium',
                i === slotIdx ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-line bg-leaf-50 text-ink',
              )}
            >
              {s.en}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

/** 40px round toggle; filled when active. `label` is read by screen readers and shown as a tooltip. */
function IconToggle({
  active, onClick, label, tone, children,
}: { active: boolean; onClick: () => void; label: string; tone: 'leaf' | 'peach' | 'star'; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={clsx(
        'grid size-10 place-items-center rounded-full transition-colors',
        !active && 'text-muted/70 active:bg-leaf-100',
        active && tone === 'leaf' && 'bg-leaf-500 text-white',
        active && tone === 'peach' && 'bg-peach text-white',
        active && tone === 'star' && 'text-[#f5c242]',
      )}
    >
      {children}
    </button>
  )
}
