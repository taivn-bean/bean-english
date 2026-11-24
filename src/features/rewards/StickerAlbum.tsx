import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useStickers } from './useStickers'

/** Avatar page: every sticker, earned ones in color, locked ones grey with progress. */
export function StickerAlbum() {
  const { t } = useTranslation()
  const { all } = useStickers()
  const earned = all.filter((s) => s.earned).length
  return (
    <section className="space-y-3" aria-labelledby="stickers-title">
      <div className="flex items-end justify-between gap-2">
        <h2 id="stickers-title" className="text-lg font-bold">
          {t('rewards.title')}
        </h2>
        <span className="text-xs text-muted">{t('rewards.count', { earned, total: all.length })}</span>
      </div>
      <ul className="grid grid-cols-4 gap-2">
        {all.map((s) => (
          <li
            key={s.id}
            className={clsx('flex flex-col items-center gap-1 rounded-2xl border p-2 text-center', s.earned ? 'border-leaf-200 bg-leaf-50' : 'border-line bg-surface')}
            aria-label={`${t(`rewards.kind.${s.kind}`, { count: s.need })}${s.earned ? '' : ` (${s.value}/${s.need})`}`}
          >
            <span aria-hidden className={clsx('text-4xl leading-none', !s.earned && 'opacity-30 grayscale')}>
              {s.emoji}
            </span>
            <span className="text-[11px] leading-tight font-medium">{t(`rewards.kind.${s.kind}`, { count: s.need })}</span>
            {!s.earned && <span className="text-[10px] text-muted">{s.value}/{s.need}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
