import { useQueries } from '@tanstack/react-query'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { dayKey } from '@/features/profile/activity'
import { isLearned } from './cards'
import { deckQuery, type Deck } from '@/features/content/content'
import { db, type Card } from '@/shared/db'
import { useSettings } from '@/shared/settings'

/** wordId → card of the active child (optionally one deck). */
export function useCardMap(deckId?: string) {
  const profileId = useSettings((s) => s.activeProfileId)
  return useLiveQuery(
    async () => {
      if (profileId == null) return new Map<string, Card>()
      const rows = deckId ? await db.cards.where({ profileId, deckId }).toArray() : await db.cards.where({ profileId }).toArray()
      return new Map(rows.map((c) => [c.wordId, c]))
    },
    [profileId, deckId],
    new Map<string, Card>(),
  )
}

/** Per-deck numbers for the active child: learned words, due today, studied at all. */
export function useCardStats() {
  const cards = useCardMap()
  const today = dayKey()
  const byDeck = new Map<string, { learned: number; due: number; studied: number }>()
  let due = 0
  let learned = 0
  for (const c of cards.values()) {
    const s = byDeck.get(c.deckId) ?? { learned: 0, due: 0, studied: 0 }
    s.studied++
    if (isLearned(c)) {
      s.learned++
      learned++
    }
    if (c.due <= today) {
      s.due++
      due++
    }
    byDeck.set(c.deckId, s)
  }
  return { byDeck, due, learned, total: cards.size }
}

/** Load several decks (and register their audio). */
export function useDecks(ids: string[]) {
  const results = useQueries({ queries: ids.map((id) => deckQuery(id)) })
  const decks = new Map<string, Deck>()
  results.forEach((r) => r.data && decks.set(r.data.id, r.data))
  return { decks, isLoading: results.some((r) => r.isLoading), isError: results.some((r) => r.isError) }
}

/** Number of the active child's cards due today (cheap indexed count, for the nav badge). */
export function useDueCount() {
  const profileId = useSettings((s) => s.activeProfileId)
  return useLiveQuery(
    () =>
      profileId == null
        ? 0
        : db.cards.where('[profileId+due]').between([profileId, Dexie.minKey], [profileId, dayKey()], true, true).count(),
    [profileId],
    0,
  )
}
