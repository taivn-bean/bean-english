// Sticker rewards: earned from numbers the app already tracks (no extra storage besides
// "which ones the child has already seen", so a new one can be celebrated once).

export type StickerStats = { studied: number; learned: number; bestStreak: number; childSaid: number }
export type StickerKind = keyof StickerStats

export type Sticker = { id: string; emoji: string; kind: StickerKind; need: number }

/** Ordered easy → hard inside each kind; ids never change (they're stored as "seen"). */
export const STICKERS: Sticker[] = [
  { id: 'studied-1', emoji: '🐣', kind: 'studied', need: 1 },
  { id: 'studied-10', emoji: '🐶', kind: 'studied', need: 10 },
  { id: 'studied-50', emoji: '🐱', kind: 'studied', need: 50 },
  { id: 'studied-100', emoji: '🦊', kind: 'studied', need: 100 },
  { id: 'studied-250', emoji: '🦁', kind: 'studied', need: 250 },
  { id: 'studied-500', emoji: '🐘', kind: 'studied', need: 500 },
  { id: 'studied-1000', emoji: '🦄', kind: 'studied', need: 1000 },
  { id: 'learned-10', emoji: '⭐', kind: 'learned', need: 10 },
  { id: 'learned-50', emoji: '🌟', kind: 'learned', need: 50 },
  { id: 'learned-200', emoji: '🏆', kind: 'learned', need: 200 },
  { id: 'streak-3', emoji: '🔥', kind: 'bestStreak', need: 3 },
  { id: 'streak-7', emoji: '🌈', kind: 'bestStreak', need: 7 },
  { id: 'streak-30', emoji: '🚀', kind: 'bestStreak', need: 30 },
  { id: 'said-1', emoji: '💬', kind: 'childSaid', need: 1 },
  { id: 'said-10', emoji: '🗣️', kind: 'childSaid', need: 10 },
  { id: 'said-50', emoji: '🎤', kind: 'childSaid', need: 50 },
]

export const isEarned = (s: Sticker, stats: StickerStats) => stats[s.kind] >= s.need
