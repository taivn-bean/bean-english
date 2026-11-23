// Audio pack store — immutable, append-only.
//
//   audio/packs/base-<topicId>-<hash>.bin   one per topic, written by `compact`
//   audio/packs/patch-<NNN>-<hash>.bin      one per content update: every new/changed clip, any topic
//   audio/packs.json                        ledger: clip key → { hash, pack, range } (committed)
//
// A pack file is never modified after it is written, so clients only download new patches.
// Changed/removed clips leave dead bytes behind; `compact` rebuilds clean per-topic bases.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = new URL('../..', import.meta.url).pathname
export const AUDIO_DIR = join(ROOT, 'audio')
export const PACK_DIR = join(AUDIO_DIR, 'packs')
export const STAGING_DIR = join(AUDIO_DIR, '.staging')
const LEDGER = join(AUDIO_DIR, 'packs.json')

/** Bump to force regeneration of every clip when the encoding pipeline changes. */
export const PIPELINE = 'v4-heaac24'
export const clipHash = (text, config) =>
  createHash('sha1').update(`${PIPELINE}|${JSON.stringify(config)}|${text}`).digest('hex').slice(0, 12)

const sha8 = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 8)

/** @returns {{ version: 1, nextPatch: number, packs: Record<string, {bytes:number, kind:'base'|'patch'}>, clips: Record<string, {hash:string, pack:string, range:[number,number]}> }} */
export function loadLedger() {
  return existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { version: 1, nextPatch: 1, packs: {}, clips: {} }
}

/** Save the ledger, dropping packs no clip points to any more (and deleting their files). */
export function saveLedger(ledger) {
  const used = new Set(Object.values(ledger.clips).map((c) => c.pack))
  for (const file of Object.keys(ledger.packs))
    if (!used.has(file)) {
      delete ledger.packs[file]
      rmSync(join(PACK_DIR, file), { force: true })
    }
  // stable key order → small git diffs
  const clips = Object.fromEntries(Object.entries(ledger.clips).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(LEDGER, JSON.stringify({ ...ledger, clips }, null, 1) + '\n')
}

const packCache = new Map()
/** Bytes of one clip, from staging (fresh) or from its pack. */
export function readClip(ledger, key) {
  const staged = join(STAGING_DIR, `${key}.m4a`)
  if (existsSync(staged)) return readFileSync(staged)
  const clip = ledger.clips[key]
  if (!clip) return null
  if (!packCache.has(clip.pack)) packCache.set(clip.pack, readFileSync(join(PACK_DIR, clip.pack)))
  const [off, len] = clip.range
  return packCache.get(clip.pack).subarray(off, off + len)
}

/** Write one immutable pack from [key, bytes, hash][] and point those clips at it. */
function writePack(ledger, prefix, kind, entries) {
  if (!entries.length) return null
  let off = 0
  const ranges = entries.map(([, buf]) => {
    const r = [off, buf.length]
    off += buf.length
    return r
  })
  const data = Buffer.concat(entries.map(([, buf]) => buf))
  const file = `${prefix}-${sha8(data)}.bin`
  mkdirSync(PACK_DIR, { recursive: true })
  writeFileSync(join(PACK_DIR, file), data)
  ledger.packs[file] = { bytes: data.length, kind }
  entries.forEach(([key, , hash], i) => (ledger.clips[key] = { hash, pack: file, range: ranges[i] }))
  return { file, bytes: data.length, clips: entries.length }
}

/** A patch bigger than this is split per topic, so downloading one topic offline stays small. */
export const PATCH_SPLIT_BYTES = 3 * 1024 * 1024

/**
 * Move all staged clips into new patch pack(s) for this update: one `patch-NNN` file when small,
 * or one `patch-NNN-<topicId>` file per topic when the update is large. `staged`: { key: hash }.
 */
export function writePatch(ledger, staged, topicOf) {
  const entries = Object.entries(staged).map(([key, hash]) => [key, readFileSync(join(STAGING_DIR, `${key}.m4a`)), hash])
  if (!entries.length) return []
  const seq = String(ledger.nextPatch).padStart(3, '0')
  ledger.nextPatch++
  const total = entries.reduce((n, [, buf]) => n + buf.length, 0)
  if (total <= PATCH_SPLIT_BYTES) return [writePack(ledger, `patch-${seq}`, 'patch', entries)]
  const byTopic = Map.groupBy(entries, ([key]) => topicOf(key) ?? 'misc')
  return [...byTopic].map(([topicId, list]) => writePack(ledger, `patch-${seq}-${topicId}`, 'patch', list))
}

/** Rebuild one clean base pack per topic from the current clips (staged or packed). */
export function compact(ledger, utterances) {
  const byTopic = new Map()
  for (const u of utterances) {
    const buf = readClip(ledger, u.key)
    const hash = u.stagedHash ?? ledger.clips[u.key]?.hash
    if (!buf || !hash) continue
    if (!byTopic.has(u.topicId)) byTopic.set(u.topicId, [])
    byTopic.get(u.topicId).push([u.key, Buffer.from(buf), hash])
  }
  const next = { ...ledger, packs: {}, clips: {} }
  const written = [...byTopic].map(([topicId, entries]) => writePack(next, `base-${topicId}`, 'base', entries))
  // keep files of packs we just (re)wrote; saveLedger() removes everything else
  for (const file of Object.keys(ledger.packs)) if (!next.packs[file]) rmSync(join(PACK_DIR, file), { force: true })
  Object.assign(ledger, next)
  return written
}

/** Dead-weight stats to decide when to compact. */
export function packStats(ledger) {
  const live = Object.values(ledger.clips).reduce((n, c) => n + c.range[1], 0)
  const total = Object.values(ledger.packs).reduce((n, p) => n + p.bytes, 0)
  const patches = Object.values(ledger.packs).filter((p) => p.kind === 'patch').length
  return { live, total, dead: total ? Math.max(0, 1 - live / total) : 0, patches, packs: Object.keys(ledger.packs).length }
}

export function clearStaging() {
  for (const f of existsSync(STAGING_DIR) ? readdirSync(STAGING_DIR) : []) rmSync(join(STAGING_DIR, f), { force: true })
}
