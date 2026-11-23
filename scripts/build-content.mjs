#!/usr/bin/env node
// Validate content/**, add IPA + audio keys, write public/content/** for the app
// and scripts/.generated/utterances.json for gen-audio.
// Usage: node scripts/build-content.mjs [--strict]   (--strict: fail on missing audio / unknown IPA words)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TopicContent, TopicMeta, fill } from './lib/schema.mjs'
import { toIpa } from './lib/ipa.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'content')
const OUT = join(ROOT, 'public/content')
const GEN = join(ROOT, 'scripts/.generated')
const AUDIO = join(ROOT, 'public/audio')
const strict = process.argv.includes('--strict')

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const errors = []
const unknownWords = new Set()
const utterances = [] // { key, text } — one voice for everything (scripts/voices.json)
const seenIds = new Set()

const ipaFor = (text, override) => {
  if (override) return override
  const { ipa, unknown } = toIpa(text)
  unknown.forEach((w) => unknownWords.add(w))
  return ipa
}
const addUtt = (key, text) => {
  utterances.push({ key, text })
  return key
}
const unique = (id) => (seenIds.has(id) ? errors.push(`duplicate id ${id}`) : seenIds.add(id))

const topics = TopicMeta.array().parse(readJson(join(SRC, 'topics.json'))).sort((a, b) => a.order - b.order)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'topics'), { recursive: true })
mkdirSync(GEN, { recursive: true })

const index = []
const versionHash = createHash('sha1')
for (const meta of topics) {
  const file = join(SRC, 'topics', `${meta.id}.json`)
  if (!existsSync(file)) {
    console.warn(`⚠ skip ${meta.id}: ${file} missing`)
    continue
  }
  const parsed = TopicContent.safeParse(readJson(file))
  if (!parsed.success) {
    errors.push(`${meta.id}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
    continue
  }
  const src = parsed.data

  const phrases = src.phrases.map((p) => {
    unique(p.id)
    if (!p.slots) return { ...p, ipa: ipaFor(p.en, p.ipa), audio: addUtt(p.id, p.en) }
    return {
      ...p,
      slots: p.slots.map((s, i) => {
        const en = fill(p.en, s.en)
        return { ...s, fullEn: en, fullVi: fill(p.vi, s.vi), ipa: ipaFor(en, s.ipa), audio: addUtt(`${p.id}-s${i}`, en) }
      }),
    }
  })

  const dialogues = src.dialogues.map((d) => {
    unique(d.id)
    return {
      ...d,
      lines: d.lines.map((l, i) => {
        const id = `${d.id}-l${i + 1}`
        return { ...l, id, ipa: ipaFor(l.en, l.ipa), audio: addUtt(id, l.en) }
      }),
    }
  })

  const topicJson = JSON.stringify({ ...meta, phrases, dialogues })
  versionHash.update(topicJson)
  writeFileSync(join(OUT, 'topics', `${meta.id}.json`), topicJson)
  index.push({
    ...meta,
    phraseIds: phrases.map((p) => p.id),
    dialogueCount: dialogues.length,
  })
}

if (errors.length) {
  console.error('✗ content errors:\n  ' + errors.join('\n  '))
  process.exit(1)
}

const body = JSON.stringify(index)
const contentVersion = versionHash.update(body).digest('hex').slice(0, 10)
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ contentVersion, topics: index }))
writeFileSync(join(GEN, 'utterances.json'), JSON.stringify(utterances, null, 1))

const missingAudio = utterances.filter((u) => !existsSync(join(AUDIO, `${u.key}.m4a`)))
console.log(
  `✓ ${index.length} topics, ${index.reduce((n, t) => n + t.phraseIds.length, 0)} phrases, ` +
    `${utterances.length} audio clips (${missingAudio.length} missing) · version ${contentVersion}`,
)
if (unknownWords.size) console.warn(`⚠ IPA unknown words (add "ipa" override): ${[...unknownWords].join(', ')}`)
if (strict && missingAudio.length) {
  console.error(`✗ missing audio, run: pnpm audio`)
  process.exit(1)
}
