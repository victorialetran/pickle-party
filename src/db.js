// Realtime database layer.
// - Deployed: talks to Victoria's Firebase Realtime Database.
// - On localhost: talks to the tiny mock realtime server in test/mock-server.js
//   (same semantics), so the game can be developed and tested end-to-end
//   without touching the real database.

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, update, remove, get } from 'firebase/database'
import { firebaseConfig } from './firebaseConfig.js'

export const GAME = 'games/pickle-party'

const isLocal =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)

let backend

if (isLocal) {
  // ── mock backend over websocket ──
  const ws = new WebSocket(`ws://${window.location.hostname}:8787`)
  const queue = []
  const subCbs = new Map() // subId -> cb
  const acks = new Map() // msgId -> resolve
  let nextId = 1

  const send = (msg) => {
    const data = JSON.stringify(msg)
    if (ws.readyState === WebSocket.OPEN) ws.send(data)
    else queue.push(data)
  }
  ws.addEventListener('open', () => {
    while (queue.length) ws.send(queue.shift())
  })
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.type === 'val') subCbs.get(msg.subId)?.(msg.value)
    else if (msg.type === 'ack') {
      acks.get(msg.id)?.(msg.value ?? null)
      acks.delete(msg.id)
    }
  })
  const request = (op, path, value) =>
    new Promise((resolve) => {
      const id = nextId++
      acks.set(id, resolve)
      send({ id, op, path, value })
    })

  backend = {
    listen(path, cb) {
      const id = nextId++
      subCbs.set(id, cb)
      send({ id, op: 'sub', path })
      return () => {
        subCbs.delete(id)
        send({ id, op: 'unsub', path })
      }
    },
    write: (path, value) => request('set', path, value),
    patch: (path, value) => request('update', path, value),
    erase: (path) => request('remove', path),
    read: (path) => request('get', path),
  }
} else {
  // ── real Firebase backend ──
  const db = getDatabase(initializeApp(firebaseConfig))

  backend = {
    listen: (path, cb) => onValue(ref(db, path), (snap) => cb(snap.val())),
    write: (path, value) => set(ref(db, path), value),
    patch: (path, value) => update(ref(db, path), value),
    erase: (path) => remove(ref(db, path)),
    read: (path) => get(ref(db, path)).then((s) => s.val()),
  }
}

const full = (path) => (path ? `${GAME}/${path}` : GAME)

export const listen = (path, cb) => backend.listen(full(path), cb)
export const write = (path, value) => backend.write(full(path), value)
export const patch = (path, value) => backend.patch(full(path), value)
export const erase = (path) => backend.erase(full(path))
export const read = (path) => backend.read(full(path))

// Small stable string hash → non-negative int. Used to pick a pickle outfit
// per (player, round) so card art is stable across refreshes but never tied
// to a player in a way the room can decode.
export function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
