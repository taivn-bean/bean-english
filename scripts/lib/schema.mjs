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

const Slot = z.object({ en: z.string().min(1), vi: z.string().min(1) })

const Phrase = z
  .object({
    id: id(/^[a-z0-9-]+-\d{3}$/),
    speaker: z.enum(['parent', 'child']),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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
