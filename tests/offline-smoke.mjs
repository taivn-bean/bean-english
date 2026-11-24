// Offline smoke test: node tests/offline-smoke.mjs [baseUrl]  (run `pnpm build && pnpm preview` first)
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173'
const outDir = process.env.SHOTS ?? (await import('node:os')).tmpdir() // screenshots never land in the repo
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
// Feature tours would cover the page on first visit: mark them all as seen (before the app's first load).
await ctx.addInitScript(() => {
  if (localStorage.getItem('bean-settings')) return
  const toursSeen = ['home', 'topic', 'dialogue', 'cards', 'deck', 'study', 'progress', 'avatar', 'settings']
  localStorage.setItem('bean-settings', JSON.stringify({ state: { toursSeen }, version: 1 }))
})
const page = await ctx.newPage()
// The new-sticker popup can show up whenever a milestone is reached: just dismiss it.
await page.addLocatorHandler(page.locator('[aria-labelledby=sticker-title]'), (d) => d.getByRole('button').click())
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const check = (name, ok) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)

await page.goto(base)
await page.evaluate(() => navigator.serviceWorker.ready)
// wait until the SW controls the page and precache is complete
await page.reload()
await page.waitForFunction(() => !!navigator.serviceWorker.controller)
// choose offline packs: download every topic's audio, wait until all packs are cached
await page.goto(`${base}/offline`)
await page.getByRole('button', { name: /Tải tất cả/ }).click()
const packState = () =>
  page.evaluate(async () => {
    const index = await (await fetch('/content/index.json')).json()
    const keys = new Set((await (await caches.open('bean-audio-v1')).keys()).map((r) => new URL(r.url).pathname))
    const need = new Set(index.topics.flatMap((t) => t.packs))
    return { need: need.size, have: [...need].filter((u) => keys.has(u)).length }
  })
let packs = await packState()
for (let i = 0; i < 120 && packs.have < packs.need; i++) {
  await page.waitForTimeout(1000)
  packs = await packState()
}
check(`offline packs downloaded (user-selected) ${packs.have}/${packs.need}`, packs.have === packs.need && packs.need > 0)
await page.goto(base)
await page.locator('a[href^="/topics/"]').first().waitFor()
const topicCount = await page.locator('a[href^="/topics/"]').count()
check(`home renders online (${topicCount} topics)`, topicCount >= 10)
await page.screenshot({ path: `${outDir}/home.png` })

await ctx.setOffline(true)
await page.goto(`${base}/topics/bedtime`)
check('deep link offline', await page.getByText('Bedtime').first().isVisible())
await page.screenshot({ path: `${outDir}/topic.png`, fullPage: false })

const audioOk = await page.evaluate(async () => {
  const safety = await (await fetch('/content/topics/safety.json')).json()
  const hit = await (await caches.open('bean-audio-v1')).match(safety.audio.packs[0])
  return !!hit && (await hit.blob()).size > 0
})
check('unvisited topic audio offline', audioOk)

await page.locator('article button').first().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Bé nói được/ }).first().click()
await page.getByRole('tab', { name: 'Hội thoại' }).click()
await page.locator('a[href*="/dialogues/"]').first().click()
const playAll = page.getByRole('button', { name: /Phát cả đoạn/ })
await playAll.waitFor({ timeout: 5000 }).catch(() => {})
check('dialogue offline', await playAll.isVisible())
await page.screenshot({ path: `${outDir}/dialogue.png` })

await page.goto(`${base}/search?q=doi`)
await page.locator('article').first().waitFor({ timeout: 5000 }).catch(() => {})
check('search offline, accent-insensitive ("doi" → đói)', (await page.locator('article', { hasText: 'đói' }).count()) > 0)
await page.screenshot({ path: `${outDir}/search.png` })

await page.goto(`${base}/progress`)
await page.locator('p.text-2xl').nth(1).filter({ hasText: /^1/ }).waitFor({ timeout: 3000 }).catch(() => {})
const childStat = (await page.locator('p.text-2xl').nth(1).innerText()).replace(/\s/g, '')
check(`progress persisted (${childStat})`, childStat.startsWith('1/'))
await page.screenshot({ path: `${outDir}/progress.png` })

// flash-cards: deck list + a study card work offline (deck JSON is precached; audio is per-deck opt-in)
const firstDeck = await page.evaluate(async () => (await (await fetch('/content/index.json')).json()).decks?.[0]?.id)
if (firstDeck) {
  // this deck's audio isn't downloaded (opt-in), so playing a word offline fails at the network: expected
  const before = errors.length
  await page.goto(`${base}/cards/${firstDeck}`)
  await page.getByText('Học ngay').click({ timeout: 5000 }).catch(() => {})
  await page.getByRole('button', { name: 'Lật thẻ' }).last().click({ timeout: 5000 }).catch(() => {})
  check('flash-card study offline', await page.getByRole('button', { name: 'Nhớ rồi' }).isVisible())
  await page.screenshot({ path: `${outDir}/card.png` })
  errors.splice(before, Infinity, ...errors.slice(before).filter((e) => !e.includes('ERR_INTERNET_DISCONNECTED')))
}

check(`no console errors ${errors.length ? JSON.stringify(errors) : ''}`, errors.length === 0)
await browser.close()
