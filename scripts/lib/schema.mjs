// Source content schema (content/**). Keep in sync with .claude/docs/content-schema.md
import { z } from 'zod'

const BLANK = '___'
const id = (re) => z.string().regex(re)

export const TopicMeta = z.object({
  id: id(/^[a-z0-9-]+$/),
  order: z.number().int(),
  icon: z.string(),
  titleEn: z.string().min(1),
  titleVi: z.string().min(1),
})

// slot.ipa: optional override for the whole filled sentence
export const AGE_BANDS = ['3-5', '5-7', '7-9']
/** Age bands an item suits (one or more). Topics get the union of their phrases' bands. */
const Ages = z.array(z.enum(AGE_BANDS)).min(1)

const Slot = z.object({ en: z.string().min(1), vi: z.string().min(1), ipa: z.string().optional() })

const Phrase = z
  .object({
    id: id(/^[a-z0-9-]+-\d{3}$/),
    speaker: z.enum(['parent', 'child']),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    ages: Ages,
    en: z.string().min(1),
    vi: z.string().min(1),
    slots: z.array(Slot).min(2).max(8).optional(),
    ipa: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    const blanks = (s) => s.split(BLANK).length - 1
    if (p.slots && (blanks(p.en) !== 1 || blanks(p.vi) !== 1))
      ctx.addIssue({ code: 'custom', message: `${p.id}: slot phrases need exactly one ${BLANK} in en and vi` })
    if (!p.slots && (blanks(p.en) || blanks(p.vi)))
      ctx.addIssue({ code: 'custom', message: `${p.id}: has ${BLANK} but no slots` })
  })

const Dialogue = z.object({
  id: id(/^[a-z0-9-]+-d\d{2}$/),
  titleEn: z.string().min(1),
  titleVi: z.string().min(1),
  ages: Ages,
  lines: z
    .array(
      z.object({
        speaker: z.enum(['mom', 'dad', 'child']),
        en: z.string().min(1),
        vi: z.string().min(1),
        ipa: z.string().optional(),
      }),
    )
    .min(2),
})

export const TopicContent = z.object({
  topicId: z.string(),
  phrases: z.array(Phrase),
  dialogues: z.array(Dialogue),
})

export const fill = (template, word) => template.replace(BLANK, word)

// ── Vocabulary flash-cards: content/vocab.json (deck list) + content/vocab/<deckId>.json ──
export const DeckMeta = TopicMeta.extend({ id: id(/^v-[a-z0-9-]+$/) })

const Example = z.object({ en: z.string().min(1), vi: z.string().min(1), ipa: z.string().optional() })

const Word = z.object({
  id: id(/^v-[a-z0-9-]+-\d{3}$/), // <deckId>-NNN, never renumbered
  en: z.string().min(1).max(40), // headword as a child hears it: "dog", "ice cream", "brush your teeth" not allowed (max 3 words)
  vi: z.string().min(1),
  pos: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'number', 'phrase', 'other']),
  emoji: z.string().max(16).optional(), // only when it clearly pictures the word; else the deck icon is shown
  ages: Ages,
  ipa: z.string().optional(),
  examples: z.array(Example).length(5),
}).superRefine((w, ctx) => {
  if (w.en.split(/\s+/).length > 3) ctx.addIssue({ code: 'custom', message: `${w.id}: headword max 3 words` })
  const seen = new Set()
  for (const e of w.examples) {
    const k = e.en.toLowerCase().replace(/[^a-z ]/g, '')
    if (seen.has(k)) ctx.addIssue({ code: 'custom', message: `${w.id}: duplicate example "${e.en}"` })
    seen.add(k)
  }
})

export const DeckContent = z.object({ deckId: z.string(), words: z.array(Word).min(1) })
