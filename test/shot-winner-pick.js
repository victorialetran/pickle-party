import { chromium } from 'playwright-core'
import { WebSocket } from 'ws'

await new Promise((resolve) => {
  const ws = new WebSocket('ws://localhost:8787')
  ws.on('open', () => ws.send(JSON.stringify({ id: 1, op: 'remove', path: 'games/pickle-party' })))
  ws.on('message', () => { ws.close(); resolve() })
})

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await host.goto('http://localhost:5173/host')

const answers = ['Her camera roll', 'The group chat named "Big Dill Energy"', 'A third espresso martini', 'Whatever TikTok told her to buy']
for (let i = 0; i < 4; i++) {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  await p.goto('http://localhost:5173/')
  await p.fill('.name-input', ['Victoria', 'Jess', 'Amy', 'Priya'][i])
  await p.click('button.btn-primary')
  await p.waitForTimeout(200)
  if (i === 0) await host.waitForTimeout(300)
  if (i === 0) await host.click('[data-testid="start-btn"]').catch(() => {})
  await p.waitForTimeout(300)
  await p.fill('.answer-input', answers[i])
  await p.click('button.btn-primary')
}
await host.waitForTimeout(500)
await host.click('[data-testid="reveal-btn"]')
await host.waitForTimeout(1200)
await host.locator('[data-testid="card-front"]', { hasText: answers[1] }).click()
await host.waitForTimeout(500)
await host.screenshot({ path: new URL('./shots/9-winner-pick.png', import.meta.url).pathname })
await browser.close()
console.log('done')
