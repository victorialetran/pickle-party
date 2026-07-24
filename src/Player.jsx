import React, { useEffect, useMemo, useState } from 'react'
import { listen, write, read, hashStr } from './db.js'
import { PROMPTS } from './prompts.js'
import { Pickle, ACCESSORIES } from './pickles.jsx'

const MAX_LEN = 140

function getPlayerId() {
  let id = localStorage.getItem('pp_player_id')
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem('pp_player_id', id)
  }
  return id
}

function Sparkles() {
  const items = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        delay: `${(i % 7) * 0.8}s`,
        char: ['✨', '💖', '🥒', '💍', '💕'][i % 5],
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

export default function Player() {
  const playerId = useMemo(getPlayerId, [])
  const [me, setMe] = useState(undefined) // undefined = loading, null = not joined
  const [state, setState] = useState(null)
  const [idx, setIdx] = useState(0)
  const [mySub, setMySub] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [answerDraft, setAnswerDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => listen(`players/${playerId}`, (v) => setMe(v ?? null)), [playerId])
  useEffect(() => listen('state', (v) => setState(v ?? 'lobby')), [])
  useEffect(() => listen('currentPromptIndex', (v) => setIdx(v ?? 0)), [])
  useEffect(() => listen(`rounds/${idx}/submissions/${playerId}`, setMySub), [idx, playerId])

  // New round → clear the local draft & editing flag
  useEffect(() => {
    setAnswerDraft('')
    setEditing(false)
  }, [idx])

  const myAvatar = ACCESSORIES[hashStr(playerId) % ACCESSORIES.length]

  async function join(e) {
    e.preventDefault()
    const base = nameDraft.trim().slice(0, 24)
    if (!base || busy) return
    setBusy(true)
    try {
      const players = (await read('players')) || {}
      const taken = new Set(
        Object.entries(players)
          .filter(([pid]) => pid !== playerId)
          .map(([, p]) => (p.name || '').toLowerCase())
      )
      let name = base
      let n = 2
      while (taken.has(name.toLowerCase())) name = `${base} (${n++})`
      await write(`players/${playerId}`, { name, score: 0, joinedAt: Date.now() })
    } finally {
      setBusy(false)
    }
  }

  async function submitAnswer(e) {
    e.preventDefault()
    const text = answerDraft.trim().slice(0, MAX_LEN)
    if (!text || busy) return
    setBusy(true)
    try {
      await write(`rounds/${idx}/submissions/${playerId}`, { text, submittedAt: Date.now() })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const shell = (children) => (
    <div className="page">
      <Sparkles />
      <div className="phone">
        <h1 className="brand">Pickle Party</h1>
        <div className="tagline">Miranda's Bachelorette 🥒💍</div>
        {children}
      </div>
    </div>
  )

  if (me === undefined || state === null) return shell(<div className="status-note">Loading the party…</div>)

  // ── Join screen ──
  if (me === null) {
    return shell(
      <div className="card-panel">
        <div className="bounce" style={{ marginBottom: '0.4rem' }}>
          <Pickle accessory="hearts" size={95} />
        </div>
        <p style={{ fontWeight: 700, fontSize: '1.2rem', margin: '0 0 1rem' }}>What's your name, gorgeous?</p>
        <form onSubmit={join}>
          <input
            className="name-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            autoFocus
          />
          <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={!nameDraft.trim() || busy}>
            Join the party! 🎉
          </button>
        </form>
      </div>
    )
  }

  // ── Lobby ──
  if (state === 'lobby') {
    return shell(
      <div className="card-panel">
        <div className="wiggle">
          <Pickle accessory={myAvatar} size={110} />
        </div>
        <p style={{ fontWeight: 700, fontSize: '1.3rem', margin: '0.6rem 0 0.2rem' }}>You're in, {me.name}! 🥒</p>
        <p className="status-note">Hang tight — the game starts when the host says it's pickle o'clock.</p>
      </div>
    )
  }

  // ── Finished ──
  if (state === 'finished') {
    return shell(
      <div className="card-panel">
        <div className="bounce">
          <Pickle accessory="crown" size={110} />
        </div>
        <p style={{ fontWeight: 700, fontSize: '1.3rem', margin: '0.6rem 0 0.2rem' }}>That's a wrap! 🏆</p>
        <p className="status-note">Look at the big screen for the final scores. Big dill energy all around. 💕</p>
      </div>
    )
  }

  // ── Revealed → eyes up ──
  if (state === 'revealed') {
    return shell(
      <div className="card-panel">
        <div className="bounce">
          <Pickle accessory="hearts" size={100} />
        </div>
        <p style={{ fontWeight: 700, fontSize: '1.35rem', margin: '0.6rem 0 0.2rem' }}>Eyes on the big screen! 👀</p>
        <p className="status-note">The pickles are flipping…</p>
      </div>
    )
  }

  // ── Collecting ──
  const prompt = PROMPTS[idx] || ''
  const submitted = mySub && !editing

  if (submitted) {
    return shell(
      <div className="card-panel">
        <div className="wiggle">
          <Pickle accessory={myAvatar} size={100} wink />
        </div>
        <p style={{ fontWeight: 700, fontSize: '1.3rem', margin: '0.6rem 0 0.2rem' }}>Your pickle is in! 🥒✨</p>
        <p className="status-note">Waiting on the rest of the girlies…</p>
        <button
          className="btn-ghost"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            setAnswerDraft(mySub.text)
            setEditing(true)
          }}
        >
          ✏️ Edit my answer
        </button>
      </div>
    )
  }

  return shell(
    <div className="card-panel">
      <div className="prompt-chip">Prompt {idx + 1} of {PROMPTS.length}</div>
      <p className="prompt-text">{prompt}</p>
      <form onSubmit={submitAnswer}>
        <textarea
          className="answer-input"
          value={answerDraft}
          onChange={(e) => setAnswerDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder="Type something iconic…"
          maxLength={MAX_LEN}
        />
        <div className={`char-count ${answerDraft.length >= MAX_LEN ? 'maxed' : ''}`}>
          {answerDraft.length}/{MAX_LEN}
        </div>
        <button className="btn-primary" style={{ marginTop: '0.6rem', width: '100%' }} disabled={!answerDraft.trim() || busy}>
          {mySub ? 'Update my answer 💅' : 'Submit 🥒'}
        </button>
      </form>
    </div>
  )
}
