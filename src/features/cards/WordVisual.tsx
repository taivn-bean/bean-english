import clsx from 'clsx'
import { TopicIcon } from '@/shared/ui/TopicIcon'

/** Emoji of a word, or the deck icon when the word has none (abstract words). */
export function WordVisual({ emoji, icon, size, className }: { emoji?: string; icon: string; size: number; className?: string }) {
  if (emoji)
    return (
      <span aria-hidden className={clsx('leading-none select-none', className)} style={{ fontSize: size }}>
        {emoji}
      </span>
    )
  return <TopicIcon name={icon} size={size * 0.8} aria-hidden className={clsx('text-leaf-600', className)} />
}
