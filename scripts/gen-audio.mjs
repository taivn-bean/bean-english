#!/usr/bin/env node
// Generate audio for new/changed clips and store them as ONE new immutable patch pack.
// Existing packs are never rewritten, so app users only download the new patch.
//
// Usage: node scripts/gen-audio.mjs [--compact] [--force]
//   --compact        rebuild one clean base pack per topic (drops all patches + dead bytes;
//                    users re-download everything once). Done automatically the first time.
//   --force          re-render every clip (e.g. after changing the voice), implies --compact
//   --import-legacy  one-off: take audio/*.m4a + scripts/audio-manifest.json from the old pipeline
//   --no-render      only (re)pack what is already rendered/staged
//
// Voice config: scripts/voices.json — one Kokoro voice for all clips (kokoro-js, Apache-2.0).
//   { "engine": "kokoro", "voice": "af_heart", "speed": 1 }
import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
  AUDIO_DIR, ROOT, STAGING_DIR, clearStaging, clipHash, compact, loadLedger, packStats, saveLedger, writePatch,
} from './lib/packs.mjs'

const run = promisify(execFile)
const args = new Set(process.argv.slice(2))
const force = args.has('--force')

if (process.platform !== 'darwin') {
  console.error('gen-audio needs macOS (afconvert). Packs are committed, so builds elsewhere do not need this.')
  process.exit(1)
}

// Part of every clip hash — keep the key order of voices.json stable.
const config = JSON.parse(readFileSync(join(ROOT, 'scripts/voices.json'), 'utf8'))
if (config.engine !== 'kokoro') {
  console.error(`scripts/voices.json: engine must be "kokoro" (got "${config.engine}")`)
  process.exit(1)
}
const utterances = JSON.parse(readFileSync(join(ROOT, 'scripts/.generated/utterances.json'), 'utf8'))
const ledger = loadLedger()
mkdirSync(STAGING_DIR, { recursive: true })

// Staged clips survive an interrupted run (resume).
const STAGED = join(STAGING_DIR, 'staged.json')
const staged = existsSync(STAGED) ? JSON.parse(readFileSync(STAGED, 'utf8')) : {}
const saveStaged = () => writeFileSync(STAGED, JSON.stringify(staged))

if (args.has('--import-legacy')) {
  const legacy = JSON.parse(readFileSync(join(ROOT, 'scripts/audio-manifest.json'), 'utf8'))
  let n = 0
  for (const u of utterances) {
    const hash = clipHash(u.text, config)
    const file = join(AUDIO_DIR, `${u.key}.m4a`)
    if (legacy[u.key] === hash && existsSync(file)) {
      copyFileSync(file, join(STAGING_DIR, `${u.key}.m4a`))
      staged[u.key] = hash
      n++
    }
  }
  saveStaged()
  console.log(`imported ${n} legacy clips`)
}

const changed = args.has('--no-render') ? [] : utterances.filter((u) => {
  const hash = clipHash(u.text, config)
  return staged[u.key] !== hash && (force || ledger.clips[u.key]?.hash !== hash)
})

// Content-addressed reuse: a clip with the same text + voice already exists under another key
// (slots inserted/reordered, phrase moved to another topic, same sentence elsewhere) →
// point this key at the existing bytes instead of rendering a duplicate.
const byHash = new Map(Object.values(ledger.clips).map((c) => [c.hash, c]))
let reused = 0
const todo = force
  ? changed
  : changed.filter((u) => {
      const existing = byHash.get(clipHash(u.text, config))
      if (!existing) return true
      ledger.clips[u.key] = { ...existing }
      reused++
      return false
    })
console.log(
  `${utterances.length} clips · ${todo.length} to render${reused ? ` · ${reused} reused from existing packs` : ''} · ${config.engine}:${config.voice}`,
)

/** Returns `render(text, wavPath)` backed by one Kokoro model instance. */
async function createRenderer() {
  const { KokoroTTS } = await import('kokoro-js')
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: config.dtype ?? 'q8', device: 'cpu' })
  // Serialize inference (ONNX already multi-threads); encoding runs in parallel.
  let lock = Promise.resolve()
  return (text, wav) => {
    const job = lock.then(async () => (await tts.generate(text, { voice: config.voice, speed: config.speed ?? 1 })).save(wav))
    lock = job.catch(() => {})
    return job
  }
}

const started = Date.now()
let done = 0
if (todo.length) {
  const render = await createRenderer()
  const queue = [...todo]
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      const wav = join(tmpdir(), `bean-${u.key}.wav`)
      await render(u.text, wav)
      // mono HE-AAC 24 kbps: ~half the size of AAC 32k for speech, plays natively on iOS/Safari
      await run('afconvert', ['-f', 'm4af', '-d', 'aach', '-b', '24000', '-c', '1', wav, join(STAGING_DIR, `${u.key}.m4a`)])
      rmSync(wav, { force: true })
      staged[u.key] = clipHash(u.text, config)
      if (++done % 50 === 0) {
        saveStaged()
        const left = ((Date.now() - started) / done) * (todo.length - done)
        console.log(`  ${done}/${todo.length} · ~${Math.ceil(left / 60000)} min left`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(2, Math.min(6, cpus().length - 2)) }, worker))
  saveStaged()
}

// Clips whose content was deleted: drop from the ledger (their bytes become dead weight).
const keys = new Set(utterances.map((u) => u.key))
const removed = Object.keys(ledger.clips).filter((k) => !keys.has(k))
removed.forEach((k) => delete ledger.clips[k])
for (const k of Object.keys(staged)) if (!keys.has(k)) delete staged[k]

const fresh = Object.keys(ledger.packs).length === 0
if (fresh || force || args.has('--compact')) {
  const packs = compact(ledger, utterances.map((u) => ({ ...u, stagedHash: staged[u.key] })))
  console.log(`✓ compacted into ${packs.length} base packs`)
} else if (Object.keys(staged).length) {
  const topicOf = new Map(utterances.map((u) => [u.key, u.topicId]))
  for (const p of writePatch(ledger, staged, (key) => topicOf.get(key)))
    console.log(`✓ new patch ${p.file}: ${p.clips} clips, ${(p.bytes / 1024).toFixed(0)} KB`)
} else {
  console.log('✓ audio up to date')
}
saveLedger(ledger)
clearStaging()

if (args.has('--import-legacy')) {
  for (const f of readdirSync(AUDIO_DIR)) if (f.endsWith('.m4a')) rmSync(join(AUDIO_DIR, f))
  rmSync(join(ROOT, 'scripts/audio-manifest.json'), { force: true })
  console.log('removed legacy audio/*.m4a and scripts/audio-manifest.json')
}

const s = packStats(ledger)
const missing = utterances.filter((u) => !ledger.clips[u.key]).length
console.log(
  `packs: ${s.packs} (${s.patches} patches) · ${(s.total / 1024 / 1024).toFixed(1)} MB · dead ${(s.dead * 100).toFixed(0)}%` +
    (missing ? ` · ${missing} clips missing` : '') +
    (done ? ` · rendered ${done} in ${((Date.now() - started) / 60000).toFixed(1)} min` : ''),
)
if (s.patches > 5 || s.dead > 0.25) console.log('ℹ consider `pnpm audio:compact` (users will re-download all audio once)')
