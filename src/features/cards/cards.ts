// Vocabulary flash-cards: simple spaced repetition (Leitner boxes), one schedule per child.
//
// A word enters box 0 the first time it is studied. "Nhớ rồi" moves it up one box and schedules the
// next review INTERVALS[box-1] days later; "Chưa nhớ" sends it back to box 0, due today (seen again
// later in the same session). A word counts as learned from LEARNED_BOX (survived 1 → 3 → 7 days).
import Dexie from 'dexie'
import { addDays, dayKey, recordActivity } from '@/features/profile/activity'
import type { AgeBand, Word } from '@/features/content/content'
import { db, type Card } from '@/shared/db'

export const INTERVALS = [1, 3, 7, 14, 30, 60]
export const LEARNED_BOX = 3
/** New words introduced per study session of a deck. */
export const NEW_PER_SESSION = 10
/** Max cards in one "review today" session (keeps sessions short for a small child). */
export const MAX_REVIEW = 30

export const isLearned = (c?: Pick<Card, 'box'>) => !!c && c.box >= LEARNED_BOX

export async function rateCard(profileId: number, word: Pick<Word, 'id'>, deckId: string, known: boolean) {
  const today = dayKey()
  await db.transaction('rw', db.cards, async () => {
    const prev = await db.cards.get([profileId, word.id])
    const box = known ? Math.min((prev?.box ?? 0) + 1, INTERVALS.length) : 0
    await db.cards.put({
      profileId,
      wordId: word.id,
      deckId,
      box,
      due: known ? addDays(today, INTERVALS[box - 1]) : today,
      reviews: (prev?.reviews ?? 0) + 1,
      lapses: (prev?.lapses ?? 0) + (known || !prev ? 0 : 1),
      updatedAt: Date.now(),
    })
  })
  await recordActivity(profileId)
}

/** Cards due today or earlier (oldest first), optionally for one deck. */
export async function dueCards(profileId: number, deckId?: string) {
  const rows = await db.cards
    .where('[profileId+due]')
    .between([profileId, Dexie.minKey], [profileId, dayKey()], true, true)
    .toArray()
  return deckId ? rows.filter((c) => c.deckId === deckId) : rows
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Study queue for one deck: due cards + up to NEW_PER_SESSION never-studied words that fit the
 * child's age band (`fits`). In order: due first, then new words in deck order. Shuffled: new words
 * are a random pick and everything is mixed.
 */
export function deckQueue(
  words: Word[],
  cards: Map<string, Card>,
  fits: (ages: readonly AgeBand[]) => boolean,
  due: Card[],
  random = false,
) {
  const fresh = words.filter((w) => !cards.has(w.id) && fits(w.ages))
  const picked = (random ? shuffle(fresh) : fresh).slice(0, NEW_PER_SESSION).map((w) => w.id)
  const queue = [...due.map((c) => c.wordId), ...picked]
  return random ? shuffle(queue) : queue
}

/** Where a "not yet" card comes back: at the end, or (shuffled) somewhere ≥2 cards later. */
export function retryIndex(pos: number, length: number, random: boolean) {
  const min = Math.min(pos + 3, length)
  return random ? min + Math.floor(Math.random() * (length - min + 1)) : length
}

/** wordId → deckId ("v-animals-012" → "v-animals"). */
export const deckOf = (wordId: string) => wordId.replace(/-\d{3}$/, '')
