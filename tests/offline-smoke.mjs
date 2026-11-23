// Offline smoke test: node tests/offline-smoke.mjs [baseUrl]  (run `pnpm build && pnpm preview` first)
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173'
const outDir = process.env.SHOTS ?? '.'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
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

check(`no console errors ${errors.length ? JSON.stringify(errors) : ''}`, errors.length === 0)
await browser.close()
