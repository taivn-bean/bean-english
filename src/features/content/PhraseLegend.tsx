import { Check, MessageCircleHeart, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** One-line key for the icon buttons on phrase cards. */
export function PhraseLegend() {
  const { t } = useTranslation()
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted" aria-hidden>
      <span className="flex items-center gap-1"><Check size={14} strokeWidth={2.5} className="text-leaf-600" /> {t('phrase.parentLearned')}</span>
      <span className="flex items-center gap-1"><MessageCircleHeart size={14} className="text-peach" /> {t('phrase.childSaid')}</span>
      <span className="flex items-center gap-1"><Star size={14} className="text-[#f5c242]" /> {t('phrase.favorite')}</span>
    </p>
  )
}
