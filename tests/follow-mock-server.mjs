// Mock of the S2 Ground Worker for the "Follow sonde ascent" mode – HTTP + WebSocket, no
// dependencies (the WebSocket framing is implemented by hand below). It replays
// TelemetryRecords produced by the real SimGroundLink of the s2ground repo so the
// data shapes are exactly what the Durable Object sends (docs/INTERFACE.md §2/§4).
//
//   node tests/follow-mock-server.mjs [port] [speed]
//   → open index.html?s2api=http://127.0.0.1:<port>  ·  code TEST42, any Klarname
//
// Codes: TEST42 = valid · RVKDXX = revoked (403 E_CODE_REVOKED) · anything else = unknown.
// Test hooks (POST): /__test/kick (close observer sockets with 4001), /__test/ground-chat {text},
// /__test/close (ascent closed), GET /__test/state {records, chats}.

import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const SIM_LINK = process.env.S2GROUND_SIM || '/home/claude/s2ground/src/sim/sim-link.js';

export async function startMockServer({ port = 0, speed = 30, quickReplies = null } = {}) {
  const { SimGroundLink } = await import(pathToFileURL(SIM_LINK).href);
  const ascent = { id: 'mock1234-test', name: 'Aufstieg 2026-10-17 · Rümlang', owner: 'bwicki', createdAt: Date.now() - 5 * 60e3, active: 1,
    meta: { start: { name: 'Rümlang', lat: 47.4433, lon: 8.5617, alt: 432 }, plannedLaunch: Date.now(), cutAltAgl: 1600, frequencyHz: 433900000, sondeId: 123 } };
  const tokens = new Map();          // token → {user, role, observerId}
  const sockets = new Map();         // ws(conn) → meta
  const history = [];                // TelemetryRecords (as the DO keeps them)
  const chat = [];
  let closed = false;
  let nextObserverId = 7;

  // ---- simulated ascent (same SimGroundLink the ground app uses in ?sim=1 mode)
  const sim = new SimGroundLink({ speed, gpsFixS: 3, launchDelayS: 2, cutAltAgl: 1600 });
  sim.addEventListener('telemetry', (e) => {
    const rec = { ...e.detail, raw: undefined };
    history.push(rec);
    broadcast({ type: 'telemetry', rec });
  });
  sim.addEventListener('event', (e) => broadcast({ type: 'event', event: e.detail }));
  await sim.connect();
  sim.startSession({ groundAlt: 432 });
  const waitReady = setInterval(() => { if (sim.phase === 'ready') { clearInterval(waitReady); sim.release(); } }, 50);

  // ---- helpers
  const json = (res, data, status = 200, origin = '*') => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' });
    res.end(JSON.stringify(data));
  };
  const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
  const authOf = (req, url) => {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('token');
    return t && tokens.get(t) || null;
  };
  function send(conn, obj) { try { conn.socket.write(encodeFrame(Buffer.from(JSON.stringify(obj)), 1)); } catch { /* gone */ } }
  function broadcast(obj, except = null) { for (const conn of sockets.keys()) if (conn !== except) send(conn, obj); }
  function presence() { broadcast({ type: 'presence', users: [...sockets.values()].map((m) => ({ name: m.user, role: m.role, observerId: m.observerId, since: m.since })) }); }
  function pushChat(msg) { chat.push(msg); if (chat.length > 200) chat.shift(); broadcast(msg); }
  function closeConn(conn, code, reason) {
    const buf = Buffer.alloc(2 + Buffer.byteLength(reason || '')); buf.writeUInt16BE(code, 0); buf.write(reason || '', 2);
    try { conn.socket.write(encodeFrame(buf, 8)); } catch { /* ignore */ }
    setTimeout(() => { try { conn.socket.destroy(); } catch { /* ignore */ } }, 50);
    sockets.delete(conn);
  }

  // ---- HTTP API
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const origin = req.headers.origin || '*';
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }); return res.end(); }
    const p = url.pathname;
    try {
      if (p === '/api/health') return json(res, { ok: true, t: Date.now() }, 200, origin);
      if (p === '/api/observer/login' && req.method === 'POST') {
        const b = await readBody(req);
        const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const name = String(b.displayName || '').trim();
        if (name.length < 2) return json(res, { error: 'E_NAME_REQUIRED' }, 400, origin);
        if (code === 'RVKDXX') return json(res, { error: 'E_CODE_REVOKED' }, 403, origin);
        if (code !== 'TEST42') return json(res, { error: 'E_CODE_UNKNOWN' }, 403, origin);
        const token = crypto.randomBytes(24).toString('base64url');
        const observerId = nextObserverId++;
        tokens.set(token, { user: name, role: 'observer', observerId });
        return json(res, { token, role: 'observer', displayName: name, observerId, label: 'Testcode' }, 200, origin);
      }
      const auth = authOf(req, url);
      if (p === '/api/me') { if (!auth) return json(res, { error: 'unauthorized' }, 401, origin);
        const base = { user: auth.user, role: auth.role, master: false, observerId: auth.observerId, lang: null };
        return json(res, quickReplies ? { ...base, settings: { quickRepliesObserver: quickReplies } } : base, 200, origin); }
      if (p === '/api/ascents' && req.method === 'GET') { if (!auth) return json(res, { error: 'unauthorized' }, 401, origin); return json(res, closed ? [] : [ascent], 200, origin); }
      // test hooks
      if (p === '/__test/kick' && req.method === 'POST') { let n = 0; for (const [c, m] of [...sockets]) if (m.role === 'observer') { closeConn(c, 4001, 'kicked'); n++; } presence(); return json(res, { ok: true, closed: n }, 200, origin); }
      if (p === '/__test/ground-chat' && req.method === 'POST') { const b = await readBody(req); pushChat({ type: 'chat', user: 'bwicki', role: 'ground', observerId: null, text: String(b.text || 'Verstanden.'), t: Date.now() }); return json(res, { ok: true }, 200, origin); }
      if (p === '/__test/close' && req.method === 'POST') { closed = true; broadcast({ type: 'closed' }); return json(res, { ok: true }, 200, origin); }
      if (p === '/__test/state') return json(res, { records: history.length, chats: chat.length, phase: sim.phase, sockets: sockets.size }, 200, origin);
      if (p === '/__test/records') return json(res, history, 200, origin);
      return json(res, { error: 'not found' }, 404, origin);
    } catch (e) { return json(res, { error: String(e.message) }, 500, origin); }
  });

  // ---- WebSocket /live/:ascentId?token=…
  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, 'http://x');
    const auth = authOf(req, url);
    if (!url.pathname.startsWith('/live/') || !auth) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    const conn = { socket, buf: Buffer.alloc(0) };
    const meta = { user: auth.user, role: auth.role, observerId: auth.observerId, since: Date.now() };
    sockets.set(conn, meta);
    socket.on('data', (chunk) => {
      conn.buf = Buffer.concat([conn.buf, chunk]);
      let f;
      while ((f = decodeFrame(conn.buf))) {
        conn.buf = conn.buf.subarray(f.len);
        if (f.opcode === 8) { sockets.delete(conn); presence(); try { socket.end(); } catch { /* ignore */ } return; }
        if (f.opcode === 9) { socket.write(encodeFrame(f.payload, 10)); continue; }
        if (f.opcode !== 1) continue;
        let m; try { m = JSON.parse(f.payload.toString('utf8')); } catch { continue; }
        if (!m || typeof m.type !== 'string') continue;
        if (m.type === 'chat') { const text = String(m.text || '').slice(0, 500).trim(); if (text) pushChat({ type: 'chat', user: meta.user, role: meta.role, observerId: meta.observerId, text, t: Date.now() }); }
        else if (m.type === 'ping') send(conn, { type: 'pong', t: Date.now() });
        // telemetry/state/event from observers are dropped, exactly like the DO does
      }
    });
    const bye = () => { sockets.delete(conn); presence(); };
    socket.on('close', bye); socket.on('error', bye);
    send(conn, { type: 'history', records: history, chat, state: null, closed });
    presence();
    if (meta.role !== 'ground') pushChat({ type: 'chat', user: meta.user, role: 'system', text: `${meta.user} joined`, t: Date.now() });
  });

  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base, ascent, sim, history, chat,
    groundChat: (text) => pushChat({ type: 'chat', user: 'bwicki', role: 'ground', observerId: null, text, t: Date.now() }),
    kick: () => { for (const [c, m] of [...sockets]) if (m.role === 'observer') closeConn(c, 4001, 'kicked'); presence(); },
    close: async () => { sim._stop(); for (const c of [...sockets.keys()]) closeConn(c, 1001, 'bye'); await new Promise((r) => server.close(r)); },
  };
}

// ---- minimal RFC 6455 framing (text/close/ping/pong, client frames are masked) ----
function encodeFrame(payload, opcode) {
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | opcode;
  return Buffer.concat([head, payload]);
}
function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = !!(buf[1] & 0x80);
  let len = buf[1] & 0x7f, off = 2;
  if (len === 126) { if (buf.length < 4) return null; len = buf.readUInt16BE(2); off = 4; }
  else if (len === 127) { if (buf.length < 10) return null; len = Number(buf.readBigUInt64BE(2)); off = 10; }
  const maskLen = masked ? 4 : 0;
  if (buf.length < off + maskLen + len) return null;
  let payload = buf.subarray(off + maskLen, off + maskLen + len);
  if (masked) { const mask = buf.subarray(off, off + 4); const out = Buffer.alloc(len); for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3]; payload = out; }
  return { opcode, payload, len: off + maskLen + len };
}

// standalone: node tests/follow-mock-server.mjs [port] [speed]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]) || 8787;
  const speed = Number(process.argv[3]) || 5;
  const srv = await startMockServer({ port, speed });
  console.log(`S2 Ground mock on ${srv.base} (sim speed ×${speed})`);
  console.log(`→ open index.html?s2api=${srv.base}   code TEST42, beliebiger Klarname`);
  setInterval(() => { if (Math.random() < 0.15) srv.groundChat(['OK, Steigrate stabil.', 'Verstanden.', 'Wir lassen bis zum Cutdown steigen.'][Math.floor(Math.random() * 3)]); }, 20000);
}
