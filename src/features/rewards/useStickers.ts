import { useLiveQuery } from 'dexie-react-hooks'
import { useCardStats } from '@/features/cards/useCards'
import { useStreak } from '@/features/profile/useProfile'
import { db } from '@/shared/db'
import { useSettings } from '@/shared/settings'
import { isEarned, STICKERS, type StickerStats } from './stickers'

/** Sticker album of the active child: every sticker with earned flag, plus earned-but-unseen ones. */
export function useStickers() {
  const profileId = useSettings((s) => s.activeProfileId)
  const seenMap = useSettings((s) => s.stickersSeen)
  const cards = useCardStats()
  const streak = useStreak()
  const childSaid = useLiveQuery(
    () => (profileId == null ? 0 : db.progress.where({ profileId }).filter((p) => p.childSaid).count()),
    [profileId],
    0,
  )
  const stats: StickerStats = { studied: cards.total, learned: cards.learned, bestStreak: streak.best, childSaid }
  const seen = new Set(profileId == null ? [] : (seenMap[profileId] ?? []))
  const all = STICKERS.map((s) => ({ ...s, earned: isEarned(s, stats), value: Math.min(stats[s.kind], s.need) }))
  return { all, stats, fresh: all.filter((s) => s.earned && !seen.has(s.id)), profileId }
}

export function markStickersSeen(profileId: number, ids: string[]) {
  const { stickersSeen, set } = useSettings.getState()
  set({ stickersSeen: { ...stickersSeen, [profileId]: [...new Set([...(stickersSeen[profileId] ?? []), ...ids])] } })
}
