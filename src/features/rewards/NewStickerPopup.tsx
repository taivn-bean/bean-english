import { useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Confetti } from '@/features/cards/Celebration'
import { useTourActive } from '@/features/tour/tourState'
import { markStickersSeen, useStickers } from './useStickers'

/** Celebrates stickers the child just earned (once each). Waits while a card session is running. */
export function NewStickerPopup() {
  const { t } = useTranslation()
  const { fresh, profileId } = useStickers()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const touring = useTourActive((s) => s.active)
  if (!fresh.length || profileId == null || path === '/cards/study' || touring) return null
  const close = () => markStickersSeen(profileId, fresh.map((s) => s.id))
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-labelledby="sticker-title">
      <Confetti />
      <div className="animate-bounce-in w-full max-w-xs space-y-4 rounded-3xl bg-surface p-6 text-center shadow-xl">
        <p id="sticker-title" className="text-lg font-bold">
          {t('rewards.newTitle', { count: fresh.length })}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {fresh.slice(0, 6).map((s) => (
            <span key={s.id} className="flex w-24 flex-col items-center gap-1">
              <span aria-hidden className="text-6xl leading-none">
                {s.emoji}
              </span>
              <span className="text-xs font-semibold">{t(`rewards.kind.${s.kind}`, { count: s.need })}</span>
            </span>
          ))}
        </div>
        <button autoFocus onClick={close} className="min-h-12 w-full rounded-2xl bg-leaf-500 font-bold text-white">
          {t('rewards.ok')}
        </button>
      </div>
    </div>
  )
}
