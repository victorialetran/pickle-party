// End-to-end test: 1 host screen + 6 phones through the full game.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import { PROMPTS } from '../src/prompts.js'

const BASE = 'http://localhost:5173'
const SHOTS = new URL('./shots/', import.meta.url).pathname
fs.mkdirSync(SHOTS, { recursive: true })

const NAMES = ['Victoria', 'Jess', 'Amy', 'Miranda', 'Priya', 'Sam']
const ANSWERS = [
  'Her 47 tabs open at all times',
  'Never forgets a birthday',
  'Falling off the mechanical bull',
  'Say Yes to the Zest',
  'Her ex, obviously',
  'Complaining about 101 traffic',
]

// wipe any leftover state from previous runs
import { WebSocket } from 'ws'
await new Promise((resolve, reject) => {
  const ws = new WebSocket('ws://localhost:8787')
  ws.on('open', () => ws.send(JSON.stringify({ id: 1, op: 'remove', path: 'games/pickle-party' })))
  ws.on('message', () => { ws.close(); resolve() })
  ws.on('error', reject)
})

let failures = 0
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`)
  if (!cond) failures++
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

// Host on a laptop-sized screen
const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const host = await hostCtx.newPage()
host.on('pageerror', (e) => console.log('HOST PAGE ERROR:', e.message))
host.on('console', (m) => m.type() === 'error' && console.log('HOST CONSOLE:', m.text()))
await host.goto(`${BASE}/host`)
await host.waitForTimeout(1200)

// 6 phones, separate contexts so each has its own localStorage identity
const phones = []
for (const name of NAMES) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`${name} PAGE ERROR:`, e.message))
  await page.goto(BASE)
  await page.fill('.name-input', name)
  await page.click('button.btn-primary')
  await page.waitForTimeout(250)
  phones.push({ name, page, ctx })
}

// duplicate-name check: 7th phone joins as "Jess" → should become "Jess (2)"
const dupCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const dupPage = await dupCtx.newPage()
await dupPage.goto(BASE)
await dupPage.fill('.name-input', 'Jess')
await dupPage.click('button.btn-primary')
await dupPage.waitForTimeout(400)

await host.waitForTimeout(600)
const lobbyCount = await host.locator('.lobby-player').count()
check('lobby shows 7 joined players', lobbyCount === 7)
check('duplicate name became Jess (2)', (await host.locator('.lobby-player .p-name', { hasText: 'Jess (2)' }).count()) === 1)
check('exactly one veil pickle in lobby (the bride)', (await host.locator('.lobby-player svg[data-accessory="veil"]').count()) === 1)
const mirandaPhone = phones.find((p) => p.name === 'Miranda').page
check('Miranda phone shows veil pickle', (await mirandaPhone.locator('svg[data-accessory="veil"]').count()) === 1)
check('Victoria phone has no veil pickle', (await phones[0].page.locator('svg[data-accessory="veil"]').count()) === 0)
await host.screenshot({ path: `${SHOTS}1-lobby.png` })
await phones[0].page.screenshot({ path: `${SHOTS}0-phone-joined.png` })

// remove the dup player from the game to keep counts clean (simulates them leaving)
await dupPage.evaluate(() => {
  // no-op; the dup player just never submits
})

// ── start game ──
await host.click('[data-testid="start-btn"]')
await host.waitForTimeout(600)
const seenPrompts = new Set()
const prompt1 = (await host.locator('[data-testid="host-prompt"]').innerText()).trim()
seenPrompts.add(prompt1)
check('host shows a valid prompt from the list', PROMPTS.includes(prompt1))
check('phone shows the same prompt as host', (await phones[0].page.locator('.prompt-text').innerText()).trim() === prompt1)
await phones[0].page.screenshot({ path: `${SHOTS}2-phone-prompt.png` })

// ── round 1: submissions arrive one by one ──
for (let i = 0; i < phones.length; i++) {
  const { page } = phones[i]
  await page.fill('.answer-input', ANSWERS[i])
  await page.click('button.btn-primary')
  await page.waitForTimeout(200)
}
await host.waitForTimeout(700)
check('host shows 6 face-down cards', (await host.locator('[data-testid="card-back"]').count()) === 6)
check('no veil pickle on anonymous cards', (await host.locator('[data-testid="card-back"] svg[data-accessory="veil"]').count()) === 0)
check('submit counter says 6 of 7', (await host.locator('[data-testid="submit-count"]').innerText()).includes('6 of 7'))
check('no answer text visible before reveal', !(await host.content()).includes(ANSWERS[0]))
await host.screenshot({ path: `${SHOTS}3-collecting.png` })
await phones[1].page.screenshot({ path: `${SHOTS}4-phone-waiting.png` })

// edit answer flow
await phones[2].page.click('button.btn-ghost')
await phones[2].page.fill('.answer-input', 'Falling off the mechanical bull TWICE')
await phones[2].page.click('button.btn-primary')
await phones[2].page.waitForTimeout(300)

// ── reveal ──
await host.click('[data-testid="reveal-btn"]')
await host.waitForTimeout(1400)
const fronts = await host.locator('[data-testid="card-front"]').count()
check('6 cards flipped on reveal', fronts === 6)
const revealedTexts = await host.locator('[data-testid="answer-text"]').allInnerTexts()
check('edited answer shown', revealedTexts.some((t) => t.includes('TWICE')))
check('all answers present', ANSWERS.filter((_, i) => i !== 2).every((a) => revealedTexts.includes(a)))
const hostHtml = await host.content()
check('no player names on cards', !NAMES.some((n) => hostHtml.includes(`>${n}</div>`)))
check('phone shows eyes-up screen', (await phones[0].page.content()).includes('Eyes on the big screen'))
await host.screenshot({ path: `${SHOTS}5-revealed.png` })
await phones[0].page.screenshot({ path: `${SHOTS}6-phone-eyes-up.png` })

// ── manual scoring ──
await host.click('[data-testid="plus-Victoria"]')
await host.click('[data-testid="plus-Victoria"]')
await host.click('[data-testid="plus-Amy"]')
await host.click('[data-testid="minus-Sam"]')
await host.waitForTimeout(400)
const vicRow = await host.locator('[data-testid="score-Victoria"] .score-val').innerText()
const samRow = await host.locator('[data-testid="score-Sam"] .score-val').innerText()
check('Victoria score is 2', vicRow.trim() === '2')
check('Sam score is -1', samRow.trim() === '-1')

// ── next prompt ──
await host.click('[data-testid="next-btn"]')
await host.waitForTimeout(600)
const prompt2 = (await host.locator('[data-testid="host-prompt"]').innerText()).trim()
seenPrompts.add(prompt2)
check('prompt 2 is a different valid prompt', PROMPTS.includes(prompt2) && prompt2 !== prompt1)
check('round chip says 2 of 20', (await host.locator('[data-testid="round-chip"]').innerText()).includes('2 of 20'))
check('phone shows prompt 2 with empty box', (await phones[0].page.locator('.answer-input').inputValue()) === '')

// ── host refresh mid-round keeps state ──
await phones[0].page.fill('.answer-input', 'Round two answer!')
await phones[0].page.click('button.btn-primary')
await host.reload()
await host.waitForTimeout(1000)
check('after host refresh, still prompt 2 with 1 card', (await host.locator('[data-testid="card-back"]').count()) === 1)

// ── fast-forward through remaining rounds (2 players answer each) ──
for (let r = 1; r < 20; r++) {
  if (r > 1) {
    for (const { page } of phones.slice(0, 2)) {
      await page.fill('.answer-input', `Answer for round ${r + 1}`)
      await page.click('button.btn-primary')
    }
  }
  await host.waitForTimeout(150)
  seenPrompts.add((await host.locator('[data-testid="host-prompt"]').innerText()).trim())
  await host.click('[data-testid="reveal-btn"]')
  await host.waitForTimeout(250)
  await host.click('[data-testid="next-btn"]')
  await host.waitForTimeout(250)
}
await host.waitForTimeout(800)
check('all 20 prompts appeared exactly once (shuffled)', seenPrompts.size === 20)
check('winner stage shown after 20 rounds', (await host.locator('[data-testid="winner-stage"]').count()) === 1)
check('winner is Victoria', (await host.locator('.winner-name').innerText()).includes('Victoria'))
check('phone shows game over', (await phones[0].page.content()).includes("That's a wrap"))
await host.screenshot({ path: `${SHOTS}7-winner.png` })
await phones[0].page.screenshot({ path: `${SHOTS}8-phone-done.png` })

// ── reset ──
host.on('dialog', (d) => d.accept())
await host.click('[data-testid="reset-btn"]')
await host.waitForTimeout(800)
check('reset returns to lobby', (await host.locator('[data-testid="start-btn"]').count()) === 1)
check('reset clears all players', (await host.locator('.lobby-player').count()) === 0)
await phones[0].page.waitForTimeout(600)
check('phone kicked back to join screen', (await phones[0].page.locator('.name-input').count()) === 1)

await browser.close()
console.log(failures === 0 ? '\nALL TESTS PASSED 🥒' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
