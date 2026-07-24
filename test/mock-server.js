// Tiny local stand-in for Firebase RTDB, used only for development/testing on
// localhost. Implements the same semantics the app relies on:
// set (null deletes), multi-path update (keys may contain '/'), remove, get,
// and live subscriptions.
import { WebSocketServer } from 'ws'

const PORT = 8787
let tree = {}

const segs = (p) => String(p).split('/').filter(Boolean)

function getAt(path) {
  let node = tree
  for (const s of segs(path)) {
    if (node == null || typeof node !== 'object') return null
    node = node[s]
  }
  return node === undefined ? null : node
}

function setAt(path, value) {
  const parts = segs(path)
  if (parts.length === 0) {
    tree = value == null ? {} : value
    return
  }
  let node = tree
  for (let i = 0; i < parts.length - 1; i++) {
    const s = parts[i]
    if (node[s] == null || typeof node[s] !== 'object') node[s] = {}
    node = node[s]
  }
  const last = parts[parts.length - 1]
  if (value == null) delete node[last]
  else node[last] = value
}

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' })
const subs = new Map() // ws -> Map(subId -> path)

function notifyAll() {
  for (const [ws, m] of subs) {
    for (const [subId, path] of m) {
      try {
        ws.send(JSON.stringify({ type: 'val', subId, value: getAt(path) }))
      } catch {}
    }
  }
}

wss.on('connection', (ws) => {
  subs.set(ws, new Map())
  ws.on('close', () => subs.delete(ws))
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const { id, op, path, value } = msg
    if (op === 'sub') {
      subs.get(ws).set(id, path)
      ws.send(JSON.stringify({ type: 'val', subId: id, value: getAt(path) }))
      return
    }
    if (op === 'unsub') {
      subs.get(ws).delete(id)
      return
    }
    if (op === 'get') {
      ws.send(JSON.stringify({ type: 'ack', id, value: getAt(path) }))
      return
    }
    if (op === 'set') setAt(path, value)
    else if (op === 'remove') setAt(path, null)
    else if (op === 'update') {
      for (const [k, v] of Object.entries(value || {})) setAt(`${path}/${k}`, v)
    }
    ws.send(JSON.stringify({ type: 'ack', id }))
    notifyAll()
  })
})

console.log(`mock realtime server on ws://0.0.0.0:${PORT}`)
