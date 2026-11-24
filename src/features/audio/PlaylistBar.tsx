import clsx from 'clsx'
import { Headphones, Repeat, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { playSequence, setLoop, stop, useAudioState, type PlaylistItem } from './audio'

/** Floating "now playing" bar for hands-free playlists; stays visible across pages. */
export function PlaylistBar() {
  const { t } = useTranslation()
  const { sequenceId, label, loop } = useAudioState()
  if (!sequenceId) return null
  return (
    <div className="above-nav animate-slide-up fixed inset-x-3 z-30 mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-leaf-800 p-2 pl-4 text-white shadow-lg">
      <Headphones size={20} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs opacity-80">{t('playlist.nowPlaying')}</span>
        <span className="block truncate text-sm font-semibold">{label}</span>
      </span>
      <button
        onClick={() => setLoop(!loop)}
        aria-pressed={loop}
        aria-label={t('playlist.loop')}
        className={clsx('grid size-11 place-items-center rounded-full', loop ? 'bg-white text-leaf-700' : 'bg-white/15')}
      >
        <Repeat size={20} />
      </button>
      <button onClick={stop} aria-label={t('playlist.stop')} className="grid size-11 place-items-center rounded-full bg-white/15">
        <Square size={18} />
      </button>
    </div>
  )
}

/** Header button: play a list of phrases hands-free (toggles to stop when this list is playing). */
export function PlayAllButton({ id, label, items }: { id: string; label: string; items: PlaylistItem[] }) {
  const { t } = useTranslation()
  const { sequenceId } = useAudioState()
  const active = sequenceId === id
  if (!items.length) return null
  return (
    <button
      onClick={() => (active ? stop() : playSequence(id, items, { label }))}
      className={clsx(
        'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold',
        active ? 'bg-leaf-800 text-white' : 'bg-leaf-100 text-leaf-700',
      )}
    >
      {active ? <Square size={16} /> : <Headphones size={18} />}
      {active ? t('playlist.stop') : t('playlist.playAll')}
    </button>
  )
}
