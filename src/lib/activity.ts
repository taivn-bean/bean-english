// Daily-use streaks. A day counts when the parent actually uses the app with a child
// (plays a phrase or marks progress) — just opening it doesn't count.
import { db, type AvatarAccessory } from './db'

/** Local calendar day, e.g. "2026-11-23". */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n))
}

export async function recordActivity(profileId: number | null | undefined) {
  if (profileId == null) return
  const day = dayKey()
  await db.transaction('rw', db.activity, async () => {
    const row = await db.activity.get([profileId, day])
    await db.activity.put({ profileId, day, count: (row?.count ?? 0) + 1 })
  })
}

export type Streak = { current: number; best: number; activeToday: boolean; days: Set<string> }

/** Current streak counts up to today, or up to yesterday if today has no activity yet. */
export function computeStreak(dayList: string[], today = dayKey()): Streak {
  const days = new Set(dayList)
  const activeToday = days.has(today)
  let current = 0
  for (let d = activeToday ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current++

  let best = 0
  for (const d of [...days].sort()) {
    if (days.has(addDays(d, -1))) continue // not the start of a run
    let len = 0
    for (let x = d; days.has(x); x = addDays(x, 1)) len++
    best = Math.max(best, len)
  }
  return { current, best, activeToday, days }
}

/** Avatar accessories unlock with the best streak ever reached (never taken away). */
export const ACCESSORY_UNLOCKS: Record<AvatarAccessory, number> = {
  none: 0,
  bow: 3,
  glasses: 7,
  'party-hat': 14,
  crown: 30,
}

