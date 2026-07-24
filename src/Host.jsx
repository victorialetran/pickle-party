import React, { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { listen, write, patch, erase, read, hashStr, shuffled } from './db.js'
import { PROMPTS } from './prompts.js'
import { Pickle, BridePickle, ACCESSORIES } from './pickles.jsx'

function Sparkles() {
  const items = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 29) % 100}%`,
        top: `${(i * 47) % 100}%`,
        delay: `${(i % 8) * 0.7}s`,
        char: ['✨', '💖', '🥒', '💍', '💕', '🌸'][i % 6],
      })),
    []
  )
  return (
    <div className="sparkle-layer">
      {items.map((s, i) => (
        <span key={i} className="sparkle" style={{ left: s.left, top: s.top, animationDelay: s.delay }}>
          {s.char}
        </span>
      ))}
    </div>
  )
}

function burst() {
  const colors = ['#ff3e8f', '#ff80ab', '#ffd54f', '#7cb342', '#ffffff']
  confetti({ particleCount: 120, spread: 85, origin: { y: 0.55 }, colors })
  setTimeout(() => confetti({ particleCount: 80, spread: 110, origin: { y: 0.4 }, colors }), 350)
}

function PickleCard({ pid, roundIdx, flipped, text, order }) {
  const outfit = ACCESSORIES[hashStr(`${pid}:${roundIdx}`) % ACCESSORIES.length]
  return (
    <div className={`flip-card ${flipped ? 'flipped' : ''}`} style={{ order }} data-testid={flipped ? 'card-front' : 'card-back'}>
      <div className="flip-inner">
        <div className="flip-face flip-back-face">
          <span className="card-sparkle" style={{ top: 10, left: 12 }}>✨</span>
          <span className="card-sparkle" style={{ top: 16, right: 14 }}>💖</span>
          <span className="card-sparkle" style={{ bottom: 12, left: 16 }}>💕</span>
          <span className="card-sparkle" style={{ bottom: 10, right: 12 }}>✨</span>
          <Pickle accessory={outfit} size={95} />
          <div className="in-label">This pickle is in! 🥒</div>
        </div>
        <div className="flip-face flip-front-face">
          <div className="answer-quote">"</div>
          <div className="answer-text" data-testid="answer-text">{text}</div>
          <div className="answer-quote" style={{ transform: 'rotate(180deg)' }}>"</div>
        </div>
      </div>
    </div>
  )
}

function Scoreboard({ players }) {
  const rows = Object.entries(players || {})
    .map(([pid, p]) => ({ pid, ...p }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
  const top = rows.length ? Math.max(...rows.map((r) => r.score ?? 0)) : 0
  return (
    <aside className="scoreboard" data-testid="scoreboard">
      <h2>Scores 💅</h2>
      {rows.length === 0 && <div className="status-note" style={{ textAlign: 'center' }}>No pickles yet…</div>}
      {rows.map((r) => (
        <div className="score-row" key={r.pid} data-testid={`score-${r.name}`}>
          <span className="score-name">
            {r.name} {top > 0 && (r.score ?? 0) === top && <span className="leader-crown">👑</span>}
          </span>
          <button className="score-btn" data-testid={`minus-${r.name}`} onClick={() => write(`players/${r.pid}/score`, (r.score ?? 0) - 1)}>
            −
          </button>
          <span className="score-val">{r.score ?? 0}</span>
          <button className="score-btn" data-testid={`plus-${r.name}`} onClick={() => write(`players/${r.pid}/score`, (r.score ?? 0) + 1)}>
            +
          </button>
        </div>
      ))}
    </aside>
  )
}

export default function Host() {
  const [state, setState] = useState(null)
  const [idx, setIdx] = useState(0)
  const [players, setPlayers] = useState({})
  const [round, setRound] = useState(null)
  const prevState = useRef(null)

  useEffect(() => listen('state', (v) => setState(v ?? 'lobby')), [])
  useEffect(() => listen('currentPromptIndex', (v) => setIdx(v ?? 0)), [])
  useEffect(() => listen('players', (v) => setPlayers(v || {})), [])
  useEffect(() => listen(`rounds/${idx}`, setRound), [idx])

  // confetti on reveal & finish
  useEffect(() => {
    if (prevState.current && state !== prevState.current && (state === 'revealed' || state === 'finished')) burst()
    prevState.current = state
  }, [state])

  const submissions = round?.submissions || {}
  const submittedIds = Object.keys(submissions)
  const playerCount = Object.keys(players).length
  const allIn = playerCount > 0 && submittedIds.length >= playerCount

  async function startGame() {
    await patch('', { state: 'collecting', currentPromptIndex: 0 })
  }

  async function reveal() {
    const subs = (await read(`rounds/${idx}/submissions`)) || {}
    const order = shuffled(Object.keys(subs))
    await patch('', { [`rounds/${idx}/revealOrder`]: order, state: 'revealed' })
  }

  async function nextPrompt() {
    if (idx >= PROMPTS.length - 1) {
      await write('state', 'finished')
    } else {
      await patch('', { state: 'collecting', currentPromptIndex: idx + 1 })
    }
  }

  async function resetGame() {
    if (!window.confirm('Reset the whole game? Scores and answers will be cleared. 🥒')) return
    await erase('rounds')
    const updates = { state: 'lobby', currentPromptIndex: 0 }
    for (const pid of Object.keys(players)) updates[`players/${pid}/score`] = 0
    await patch('', updates)
  }

  const playerUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

  if (state === null) {
    return (
      <div className="page">
        <Sparkles />
        <div className="host">
          <header className="host-header"><h1 className="brand">Pickle Party</h1></header>
          <main className="host-main"><div className="empty-note">Loading…</div></main>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Sparkles />
      <div className="host">
        <header className="host-header">
          <h1 className="brand">
            <BridePickle size={54} /> Pickle Party
          </h1>
          {state !== 'lobby' && state !== 'finished' && (
            <div className="round-chip" data-testid="round-chip">
              Prompt {idx + 1} of {PROMPTS.length}
            </div>
          )}
        </header>

        <main className="host-main">
          {state === 'lobby' && (
            <>
              <div className="join-hint">
                Grab your phone &amp; go to <span className="url">{playerUrl}</span> 📱💕
              </div>
              <div className="lobby-grid" data-testid="lobby-grid">
                {Object.entries(players).map(([pid, p]) => (
                  <div className="lobby-player" key={pid}>
                    <Pickle accessory={ACCESSORIES[hashStr(pid) % ACCESSORIES.length]} size={80} />
                    <span className="p-name">{p.name}</span>
                  </div>
                ))}
              </div>
              {playerCount === 0 && <div className="empty-note">Waiting for the first pickle to join… 🥒</div>}
            </>
          )}

          {(state === 'collecting' || state === 'revealed') && (
            <>
              <div className="host-prompt">
                <div className="prompt-chip">{state === 'collecting' ? 'Answers coming in…' : 'The pickles have spoken'}</div>
                <p className="prompt-text" data-testid="host-prompt">{PROMPTS[idx]}</p>
              </div>
              {state === 'collecting' && (
                <div className="submit-count" data-testid="submit-count">
                  {submittedIds.length} of {playerCount} pickles are in! {allIn ? '— everyone’s in! 🎉' : ''}
                </div>
              )}
              <div className="cards-grid" data-testid="cards-grid">
                {state === 'collecting' &&
                  submittedIds
                    .sort((a, b) => (submissions[a].submittedAt ?? 0) - (submissions[b].submittedAt ?? 0))
                    .map((pid) => <PickleCard key={`${idx}:${pid}`} pid={pid} roundIdx={idx} flipped={false} />)}
                {state === 'revealed' &&
                  (round?.revealOrder || []).map((pid, i) =>
                    submissions[pid] ? (
                      <PickleCard key={`${idx}:${pid}`} pid={pid} roundIdx={idx} flipped text={submissions[pid].text} order={i} />
                    ) : null
                  )}
              </div>
              {state === 'revealed' && submittedIds.length === 0 && (
                <div className="empty-note">No pickles this round 🥒💔</div>
              )}
            </>
          )}

          {state === 'finished' && <Winner players={players} />}
        </main>

        <div className="host-controls">
          {state === 'lobby' && (
            <button className="btn-primary" data-testid="start-btn" onClick={startGame} disabled={playerCount === 0}>
              Start the game! 🎉
            </button>
          )}
          {state === 'collecting' && (
            <button className={`btn-primary ${allIn ? 'btn-glow' : ''}`} data-testid="reveal-btn" onClick={reveal}>
              Reveal answers ✨
            </button>
          )}
          {state === 'revealed' && (
            <button className="btn-primary" data-testid="next-btn" onClick={nextPrompt}>
              {idx >= PROMPTS.length - 1 ? 'Finish the game 🏆' : 'Next prompt ➜'}
            </button>
          )}
          <button className="btn-danger" data-testid="reset-btn" onClick={resetGame}>
            reset game
          </button>
        </div>

        <Scoreboard players={players} />
      </div>
    </div>
  )
}

function Winner({ players }) {
  const rows = Object.values(players || {}).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const top = rows[0]?.score ?? 0
  const winners = rows.filter((r) => (r.score ?? 0) === top && top >= 0)
  useEffect(() => {
    const t = setInterval(burst, 2500)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="winner-stage" data-testid="winner-stage">
      <BridePickle size={150} />
      <h2>That's a wrap!</h2>
      <div className="winner-name">
        👑 {winners.map((w) => w.name).join(' & ')} {winners.length > 1 ? 'win' : 'wins'} with {top} point{top === 1 ? '' : 's'}!
      </div>
      <p className="status-note">Kind of a big dill. 🥒💕 (Scores can still be adjusted →)</p>
    </div>
  )
}
