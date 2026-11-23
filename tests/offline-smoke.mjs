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
await page.waitForFunction(async () => {
  const keys = await caches.keys()
  for (const k of keys) if ((await (await caches.open(k)).keys()).length > 800) return true
  return false
}, null, { timeout: 60000 })
const topicCount = await page.locator('a[href^="/topics/"]').count()
check(`home renders online (${topicCount} topics)`, topicCount >= 10)
await page.screenshot({ path: `${outDir}/home.png` })

await ctx.setOffline(true)
await page.goto(`${base}/topics/bedtime`)
check('deep link offline', await page.getByText('Bedtime').first().isVisible())
await page.screenshot({ path: `${outDir}/topic.png`, fullPage: false })

const audioOk = await page.evaluate(async () => (await fetch('/audio/safety-003.m4a')).ok)
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

await page.goto(`${base}/progress`)
await page.locator('p.text-2xl').nth(1).filter({ hasText: /^1/ }).waitFor({ timeout: 3000 }).catch(() => {})
const childStat = (await page.locator('p.text-2xl').nth(1).innerText()).replace(/\s/g, '')
check(`progress persisted (${childStat})`, childStat.startsWith('1/'))
await page.screenshot({ path: `${outDir}/progress.png` })

check(`no console errors ${errors.length ? JSON.stringify(errors) : ''}`, errors.length === 0)
await browser.close()
