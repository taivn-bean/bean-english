// Time-of-day suggestions: which topics fit "right now", and 3 daily picks.
import type { Phrase, Topic } from './content'
import type { Progress } from './db'

export type Period = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'

// [startHour, period, topicIds] — first matching block from the end wins. Unknown ids are ignored.
const SCHEDULE: [number, Period, string[]][] = [
  [0, 'night', ['bedtime', 'feelings-love']],
  [5, 'morning', ['wake-up', 'bathroom', 'getting-dressed', 'mealtime']],
  [9, 'morning', ['playtime', 'going-out', 'daily-talk', 'questions-answers']],
  [11, 'noon', ['mealtime', 'tidy-up', 'bedtime']],
  [14, 'afternoon', ['playtime', 'going-out', 'animals', 'colors-shapes']],
  [17, 'evening', ['mealtime', 'tidy-up', 'bath-time']],
  [19, 'evening', ['bath-time', 'bathroom', 'bedtime']],
  [21, 'night', ['bedtime', 'feelings-love']],
]

export function suggestNow(date = new Date()) {
  const hour = date.getHours()
  const [, period, topicIds] = [...SCHEDULE].reverse().find(([h]) => hour >= h) ?? SCHEDULE[0]
  return { period, topicIds }
}

// Small deterministic PRNG so "today's picks" stay the same all day (per time block).
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 7)

/** Pick `count` phrases from the given topics, preferring ones the parent hasn't learned yet. */
export function dailyPicks(
  topics: Topic[],
  progress: Map<string, Progress>,
  period: Period,
  fits: (p: Phrase) => boolean = () => true,
  count = 3,
  date = new Date(),
) {
  const all = topics.flatMap((t) => t.phrases.filter(fits).map((p) => ({ phrase: p, topicId: t.id })))
  const fresh = all.filter(({ phrase }) => !progress.get(phrase.id)?.parentLearned)
  const pool = fresh.length >= count ? fresh : all
  const rand = mulberry32(hash(`${date.toDateString()}|${period}|${all.length}`))
  return [...pool]
    .sort((a, b) => a.phrase.id.localeCompare(b.phrase.id)) // stable input order → same picks for the same seed
    .map((item) => ({ item, r: rand() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map(({ item }) => item)
}
