// One short tour per feature/page, shown the first time that page is opened.
// A step points at an element marked `data-tour="<target>"`; its text is i18n
// `tour.<tourId>.<target>.title|body`. Steps whose target isn't on screen are skipped
// (e.g. no swap-word phrase in this topic, reminders unsupported on this browser).
// Steps run in array order — keep it top-to-bottom on screen so "Next" only scrolls down.

export const TOURS = {
  home: ['home-avatar', 'home-search', 'home-today', 'home-suggested', 'home-topic'],
  topic: ['topic-tabs', 'topic-play-all', 'topic-offline', 'phrase-play', 'phrase-actions', 'phrase-slots'],
  dialogue: ['dialogue-line', 'dialogue-play'],
  cards: ['cards-review', 'cards-deck'],
  deck: ['deck-study', 'deck-offline', 'deck-word'],
  study: ['study-card', 'study-flip', 'study-shuffle'],
  progress: ['progress-child', 'progress-stats', 'progress-week'],
  avatar: ['avatar-streak', 'avatar-stickers', 'avatar-look'],
  settings: ['settings-profiles', 'settings-reminder', 'settings-offline', 'settings-backup', 'settings-tour'],
} as const satisfies Record<string, readonly string[]>

export type TourId = keyof typeof TOURS

/** The step's element, only if it is actually laid out (hidden/empty wrappers don't count). */
export function findTarget(target: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? el : null
}
