#!/usr/bin/env node
// Validate vocab decks: schema, unknown IPA words, duplicate headwords/examples across decks.
// Usage: node scripts/check-vocab.mjs [deckId ...]   (no args = all decks present)
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DeckContent, DeckMeta } from './lib/schema.mjs'
import { toIpa } from './lib/ipa.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const decks = DeckMeta.array().parse(JSON.parse(readFileSync(join(ROOT, 'content/vocab.json'), 'utf8')))
const only = process.argv.slice(2)
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
const words = new Map() // headword → [ids]
const examples = new Map()
let problems = 0
let total = 0
for (const d of decks) {
  const file = join(ROOT, 'content/vocab', `${d.id}.json`)
  if (!existsSync(file)) continue
  const parsed = DeckContent.safeParse(JSON.parse(readFileSync(file, 'utf8')))
  if (!parsed.success) {
    problems++
    console.log(`✗ ${d.id}: ${parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')} ${i.message}`).join('\n    ')}`)
    continue
  }
  const unknown = new Set()
  for (const w of parsed.data.words) {
    total++
    if (!w.id.startsWith(d.id + '-')) {
      problems++
      console.log(`✗ ${w.id} not in ${d.id}`)
    }
    words.set(norm(w.en), [...(words.get(norm(w.en)) ?? []), w.id])
    if (!w.ipa) toIpa(w.en).unknown.forEach((x) => unknown.add(x))
    for (const e of w.examples) {
      examples.set(norm(e.en), [...(examples.get(norm(e.en)) ?? []), w.id])
      if (!e.ipa) toIpa(e.en).unknown.forEach((x) => unknown.add(x))
    }
  }
  if ((!only.length || only.includes(d.id)) && unknown.size) console.log(`⚠ ${d.id} IPA unknown (add "ipa" or reword): ${[...unknown].join(', ')}`)
  if (!only.length || only.includes(d.id)) console.log(`✓ ${d.id}: ${parsed.data.words.length} words`)
}
const relevant = (ids) => !only.length || ids.some((id) => only.some((o) => id.startsWith(o + '-')))
for (const [w, ids] of words)
  if (ids.length > 1 && relevant(ids)) {
    problems++
    console.log(`✗ duplicate word "${w}": ${ids.join(', ')}`)
  }
for (const [e, ids] of examples) if (ids.length > 1 && relevant(ids)) console.log(`⚠ duplicate example "${e}": ${ids.join(', ')}`)
console.log(`${total} words total · ${problems} problems`)
process.exit(problems ? 1 : 0)
