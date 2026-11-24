import clsx from 'clsx'
import { Volume2 } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { play, playSequence, usePlaying } from '@/features/audio/audio'
import type { Word } from '@/features/content/content'

/** The 5 example sentences of a word, each tappable, plus "play all". */
export function WordExamples({ word, guard = (fn) => () => fn() }: { word: Word; guard?: (fn: () => void) => (e: MouseEvent) => void }) {
  const { t } = useTranslation()
  const playing = usePlaying()
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted">{t('cards.examples')}</h3>
        <button
          onClick={guard(() => void playSequence(`card-${word.id}`, word.examples.map((e) => ({ key: e.audio, title: e.en })), { gapMs: 900, label: word.en }))}
          className="min-h-9 rounded-full bg-leaf-100 px-3 text-xs font-semibold text-leaf-700"
        >
          {t('cards.playAll')}
        </button>
      </div>
      <ul className="space-y-2">
        {word.examples.map((e) => (
          <li key={e.audio}>
            <button
              onClick={guard(() => void play(e.audio))}
              className={clsx('flex w-full items-start gap-2 rounded-xl bg-leaf-50 p-2.5 text-left', playing === e.audio && 'is-playing')}
            >
              <Volume2 size={18} className="mt-0.5 shrink-0 text-leaf-600" />
              <span className="min-w-0">
                <span lang="en" className="block font-semibold">
                  {e.en}
                </span>
                <span className="block text-sm text-muted">{e.vi}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
