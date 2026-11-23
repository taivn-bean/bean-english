#!/usr/bin/env node
// Generate public/audio/<key>.m4a with macOS `say` (AAC). Incremental: skips clips whose text+voice hash is unchanged.
// Usage: node scripts/gen-audio.mjs [--force] [--prune]
// Voice: scripts/voices.json — one voice for all clips (list installed: `say -v "?" | grep en_US`).
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { cpus, tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT = new URL('..', import.meta.url).pathname
const AUDIO = join(ROOT, 'public/audio')
const MANIFEST = join(ROOT, 'scripts/audio-manifest.json')
const PIPELINE = 'v2-afconvert-aac32k' // bump to force regeneration when the encoding changes
const force = process.argv.includes('--force')
const prune = process.argv.includes('--prune')

if (process.platform !== 'darwin') {
  console.error('gen-audio needs macOS `say`. Audio files are committed, so builds elsewhere do not need this.')
  process.exit(1)
}

const voice = JSON.parse(readFileSync(join(ROOT, 'scripts/voices.json'), 'utf8'))
const utterances = JSON.parse(readFileSync(join(ROOT, 'scripts/.generated/utterances.json'), 'utf8'))
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
mkdirSync(AUDIO, { recursive: true })

const hashOf = (u) => {
  const v = voice
  return createHash('sha1').update(`${PIPELINE}|${v.voice}|${v.rate}|${v.pitch ?? 1}|${u.text}`).digest('hex').slice(0, 12)
}

/**
 * Raise pitch (and tempo) by `factor` by relabeling the WAV sample rate — no extra tools needed.
 * Speak slower in `say` (lower rate) to compensate for the tempo increase.
 */
function pitchShiftWav(path, factor) {
  const buf = readFileSync(path)
  const fmt = buf.indexOf('fmt ', 12, 'ascii')
  const rate = buf.readUInt32LE(fmt + 12)
  const blockAlign = buf.readUInt16LE(fmt + 20)
  const newRate = Math.round(rate * factor)
  buf.writeUInt32LE(newRate, fmt + 12)
  buf.writeUInt32LE(newRate * blockAlign, fmt + 16)
  writeFileSync(path, buf)
}

const todo = utterances.filter((u) => force || manifest[u.key] !== hashOf(u) || !existsSync(join(AUDIO, `${u.key}.m4a`)))
console.log(`${utterances.length} clips, ${todo.length} to generate`)

let done = 0
async function worker(queue) {
  for (let u = queue.shift(); u; u = queue.shift()) {
    const v = voice
    const out = join(AUDIO, `${u.key}.m4a`)
    const tmp = join(tmpdir(), `bean-${u.key}.wav`)
    // say → WAV (optional pitch shift) → afconvert → compact AAC (say's own m4a output carries ~30KB of padding per file)
    await run('say', ['-v', v.voice, '-r', String(v.rate), '-o', tmp, '--file-format=WAVE', '--data-format=LEI16@22050', u.text])
    if (v.pitch && v.pitch !== 1) pitchShiftWav(tmp, v.pitch)
    await run('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '32000', '-c', '1', tmp, out])
    rmSync(tmp, { force: true })
    manifest[u.key] = hashOf(u)
    if (++done % 50 === 0) console.log(`  ${done}/${todo.length}`)
  }
}
const queue = [...todo]
await Promise.all(Array.from({ length: Math.max(2, cpus().length - 2) }, () => worker(queue)))

const keys = new Set(utterances.map((u) => u.key))
const orphans = readdirSync(AUDIO).filter((f) => f.endsWith('.m4a') && !keys.has(f.slice(0, -4)))
if (orphans.length) {
  if (prune) orphans.forEach((f) => rmSync(join(AUDIO, f)))
  console.log(`${orphans.length} orphan files ${prune ? 'deleted' : '(run with --prune to delete)'}`)
}
for (const k of Object.keys(manifest)) if (!keys.has(k)) delete manifest[k]
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1))

const bytes = readdirSync(AUDIO).reduce((n, f) => n + statSync(join(AUDIO, f)).size, 0)
console.log(`✓ generated ${done}, total audio ${(bytes / 1024 / 1024).toFixed(1)} MB`)
