// 9PinSim-Server: Konten, Dokumentspeicher (wie die Claude-Datenbank) und Echtzeit-Räume (wie die Claude-Presence).
// Die App bindet das über einen kleinen Ersatz für window.claude ein – das Spiel selbst bleibt unverändert.
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const rnd = (n = 24) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function pbkdf2(pass, salt) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, k, 256);
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
const list = v => String(v || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
const isAdmin = (env, u) => (!!u?.login && list(env.ADMIN_LOGINS).includes(u.login)) || (!!u?.email && list(env.ADMIN_EMAILS).includes(String(u.email).toLowerCase()));
const pub = (env, u) => ({ id: u.id, name: u.nick, login: u.login || null, google: !!u.google_sub, email: u.email || null, admin: isAdmin(env, u) });

async function userFrom(req, env) {
  const h = req.headers.get('authorization') || '', url = new URL(req.url);
  const tok = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('token');
  if (!tok || tok.length > 100) return null;
  const s = await env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').bind(await sha(tok)).first();
  return s || null;
}
async function newSession(env, uid) { const t = rnd(); await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created) VALUES (?, ?, ?)').bind(await sha(t), uid, Date.now()).run(); return t; }

// Zugriffsregeln wie im Prototyp: data/users/<id> privat, rank/<id> nur selbst, lanes nur Admin, err nur Admin lesen
function canRead(path, u, env) {
  const s = path.split('/');
  if (s[0] === 'data' && s[1] === 'users') return s[2] === u.id;
  if (s[0] === 'err') return isAdmin(env, u);
  return true;
}
function canWrite(path, u, env) {
  const s = path.split('/');
  if (s[0] === 'data' && s[1] === 'users') return s[2] === u.id;
  if (s[0] === 'rank') return s.length === 2 && s[1] === u.id;
  if (s[0] === 'lanes') return isAdmin(env, u);
  return true;
}
const validPath = (p, even) => typeof p === 'string' && p.length < 300 && /^[A-Za-z0-9_.\-]+(\/[A-Za-z0-9_.\-]+)*$/.test(p) && (p.split('/').length % 2 === 0) === even;

async function api(req, env, url) {
  const p = url.pathname.slice(5), body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  // --- Konto ---
  if (p === 'auth/guest') return J({ error: 'Bitte anmelden oder ein Konto erstellen' }, 410);   // Gastkonten gibt es nicht mehr (Markus, 19.11.)
  if (p === 'auth/register') {   // neues Konto mit Anmeldename + Passwort
    const login = clean(body.login, 24).toLowerCase(), pass = String(body.pass || ''), nick = clean(body.name, 18) || clean(body.login, 18);
    if (!/^[a-z0-9äöüß._\-]{3,24}$/.test(login)) return J({ error: 'Anmeldename: 3–24 Zeichen, Buchstaben/Zahlen' }, 400);
    if (pass.length < 6) return J({ error: 'Passwort: mindestens 6 Zeichen' }, 400);
    if (await env.DB.prepare('SELECT id FROM users WHERE login = ?').bind(login).first()) return J({ error: 'Anmeldename ist schon vergeben' }, 409);
    const id = 'u' + rnd(8), salt = rnd(12);
    await env.DB.prepare('INSERT INTO users (id, nick, login, pass, salt, created) VALUES (?, ?, ?, ?, ?, ?)').bind(id, nick || 'Spieler', login, await pbkdf2(pass, salt), salt, Date.now()).run();
    const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    return J({ token: await newSession(env, id), user: pub(env, u) });
  }
  if (p === 'auth/google/start') return googleStart(req, env, url);
  if (p === 'auth/google/callback') return googleCallback(req, env, url);
  if (p === 'auth/login') {
    const login = clean(body.login, 24).toLowerCase(), u = login && await env.DB.prepare('SELECT * FROM users WHERE login = ?').bind(login).first();
    if (!u || !u.pass || await pbkdf2(String(body.pass || ''), u.salt) !== u.pass) return J({ error: 'Name oder Passwort falsch' }, 401);
    return J({ token: await newSession(env, u.id), user: pub(env, u) });
  }
  const u = await userFrom(req, env);
  if (!u) return J({ error: 'nicht angemeldet' }, 401);
  if (p === 'me') {
    if (req.method === 'POST' && body.name) { const n = clean(body.name, 18); if (n) { await env.DB.prepare('UPDATE users SET nick = ? WHERE id = ?').bind(n, u.id).run(); u.nick = n; } }
    return J({ user: pub(env, u) });
  }
  if (p === 'auth/claim') {   // Gastkonto mit Name + Passwort sichern (für andere Geräte)
    const login = clean(body.login, 24).toLowerCase(), pass = String(body.pass || '');
    if (!/^[a-z0-9äöüß._\-]{3,24}$/.test(login)) return J({ error: 'Anmeldename: 3–24 Zeichen, Buchstaben/Zahlen' }, 400);
    if (pass.length < 6) return J({ error: 'Passwort: mindestens 6 Zeichen' }, 400);
    const ex = await env.DB.prepare('SELECT id FROM users WHERE login = ?').bind(login).first();
    if (ex && ex.id !== u.id) return J({ error: 'Anmeldename ist schon vergeben' }, 409);
    const salt = rnd(12);
    await env.DB.prepare('UPDATE users SET login = ?, pass = ?, salt = ? WHERE id = ?').bind(login, await pbkdf2(pass, salt), salt, u.id).run();
    u.login = login; return J({ user: pub(env, u) });
  }
  if (p === 'auth/logout') { const h = req.headers.get('authorization') || ''; await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha(h.slice(7))).run(); return J({ ok: true }); }
  if (p === 'profiles') {
    const ids = String(url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 50), out = {};
    if (ids.length) { const r = await env.DB.prepare(`SELECT id, nick FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all(); for (const x of r.results) out[x.id] = { name: x.nick }; }
    return J(out);
  }
  // --- Dokumente ---
  if (p === 'db/get') {
    const path = body.path; if (!validPath(path, true)) return J({ error: 'Pfad' }, 400);
    if (!canRead(path, u, env)) return J({ error: 'kein Zugriff' }, 403);
    const r = await env.DB.prepare('SELECT data FROM docs WHERE path = ?').bind(path).first();
    return J({ exists: !!r, data: r ? JSON.parse(r.data) : null });
  }
  if (p === 'db/set') {
    const path = body.path; if (!validPath(path, true)) return J({ error: 'Pfad' }, 400);
    if (!canWrite(path, u, env)) return J({ error: 'kein Zugriff' }, 403);
    const data = JSON.stringify(body.data ?? {}); if (data.length > 1_500_000) return J({ error: 'zu groß' }, 413);
    const seg = path.split('/');
    await env.DB.prepare('INSERT INTO docs (path, parent, id, data, by, updated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, by = excluded.by, updated = excluded.updated')
      .bind(path, seg.slice(0, -1).join('/'), seg[seg.length - 1], data, u.id, Date.now()).run();
    return J({ ok: true });
  }
  if (p === 'db/delete') {
    const path = body.path; if (!validPath(path, true)) return J({ error: 'Pfad' }, 400);
    if (!canWrite(path, u, env)) return J({ error: 'kein Zugriff' }, 403);
    await env.DB.prepare('DELETE FROM docs WHERE path = ?').bind(path).run(); return J({ ok: true });
  }
  if (p === 'db/list') {
    const path = body.path; if (!validPath(path, false)) return J({ error: 'Pfad' }, 400);
    if (!canRead(path + '/x', u, env)) return J({ error: 'kein Zugriff' }, 403);
    const r = await env.DB.prepare('SELECT id, data FROM docs WHERE parent = ? LIMIT 3000').bind(path).all();
    let rows = r.results.map(x => ({ id: x.id, data: JSON.parse(x.data) }));
    for (const [k, op, v] of (Array.isArray(body.where) ? body.where : [])) if (op === '==') rows = rows.filter(x => x.data?.[k] === v);
    if (Array.isArray(body.order)) { const [k, dir] = body.order; rows.sort((a, b) => ((a.data?.[k] ?? 0) < (b.data?.[k] ?? 0) ? -1 : (a.data?.[k] ?? 0) > (b.data?.[k] ?? 0) ? 1 : 0) * (dir === 'desc' ? -1 : 1)); }
    if (body.limit > 0) rows = rows.slice(0, body.limit);
    return J({ docs: rows });
  }
  // --- Echtzeit-Raum (WebSocket an das Durable Object) ---
  if (p.startsWith('room/')) {
    if (req.headers.get('upgrade') !== 'websocket') return J({ error: 'WebSocket erwartet' }, 426);
    const name = decodeURIComponent(p.slice(5)); if (!/^[a-z0-9_.\-\/]{1,120}$/i.test(name)) return J({ error: 'Raum' }, 400);
    const stub = env.ROOMS.get(env.ROOMS.idFromName(name));
    const h = new Headers(req.headers); h.set('x-uid', u.id);
    return stub.fetch(new Request('https://room/ws', { headers: h }));
  }
  return J({ error: 'unbekannt' }, 404);
}


// ---------- Google-Anmeldung (OAuth, Weiterleitung) ----------
// /api/auth/google/start?token=… → Google → /api/auth/google/callback → zurück in die App mit /#login=<token>
// Ist das Google-Konto schon verbunden: Anmeldung in dieses Konto. Sonst wird es mit dem aktuellen (Gast-)Konto verbunden.
async function googleStart(req, env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return J({ error: 'Google-Anmeldung ist noch nicht eingerichtet' }, 503);
  const cur = await userFrom(req, env), state = rnd(16);
  await env.DB.prepare('DELETE FROM oauth_state WHERE created < ?').bind(Date.now() - 15 * 60e3).run();
  await env.DB.prepare('INSERT INTO oauth_state (state, user_id, created) VALUES (?, ?, ?)').bind(state, cur?.id || null, Date.now()).run();
  const q = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: url.origin + '/api/auth/google/callback', response_type: 'code',
    scope: 'openid email profile', state, prompt: 'select_account' });
  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q, 302);
}
async function googleCallback(req, env, url) {
  const back = (msg) => Response.redirect(url.origin + '/#' + msg, 302);
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  if (!code || !state) return back('gerr=' + encodeURIComponent(url.searchParams.get('error') || 'abgebrochen'));
  const st = await env.DB.prepare('SELECT * FROM oauth_state WHERE state = ?').bind(state).first();
  await env.DB.prepare('DELETE FROM oauth_state WHERE state = ?').bind(state).run();
  if (!st || Date.now() - st.created > 15 * 60e3) return back('gerr=' + encodeURIComponent('Anmeldung abgelaufen – bitte nochmal'));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: url.origin + '/api/auth/google/callback', grant_type: 'authorization_code' }) });
  const tk = await r.json().catch(() => ({}));
  if (!tk.id_token) return back('gerr=' + encodeURIComponent('Google hat die Anmeldung abgelehnt'));
  // id_token kommt direkt von Google (TLS + Client-Secret) → Inhalt lesen genügt
  const pl = JSON.parse(atob(tk.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (pl.aud !== env.GOOGLE_CLIENT_ID || !pl.sub) return back('gerr=' + encodeURIComponent('ungültige Antwort von Google'));
  const email = String(pl.email || '').toLowerCase().slice(0, 120), gname = clean(pl.given_name || pl.name, 18);
  let u = await env.DB.prepare('SELECT * FROM users WHERE google_sub = ?').bind(pl.sub).first(), linked = 0;
  if (!u && st.user_id) {
    const cur = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(st.user_id).first();
    if (cur && !cur.google_sub) { await env.DB.prepare('UPDATE users SET google_sub = ?, email = ? WHERE id = ?').bind(pl.sub, email, cur.id).run(); u = cur; linked = 1; }
  }
  if (!u) {
    const id = 'u' + rnd(8);
    await env.DB.prepare('INSERT INTO users (id, nick, google_sub, email, created) VALUES (?, ?, ?, ?, ?)').bind(id, gname || 'Spieler', pl.sub, email, Date.now()).run();
    u = { id };
  }
  return back('login=' + await newSession(env, u.id) + (linked ? '&linked=1' : ''));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) { try { return await api(req, env, url); } catch (e) { return J({ error: String(e?.message || e) }, 500); } }
    return env.ASSETS.fetch(req);
  }
};

// Raum: jede Verbindung = ein Teilnehmer mit eigener Presence (wie bei Claude). Änderungen gehen an alle.
export class Room {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(req) {
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    const peer = 'p' + rnd(6);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer, by: req.headers.get('x-uid'), presence: {} });
    server.send(JSON.stringify({ t: 'hello', peer }));
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }
  peers() { return this.ctx.getWebSockets().map(w => w.deserializeAttachment()).filter(Boolean); }
  broadcast() {
    const msg = JSON.stringify({ t: 'peers', peers: this.peers() });
    for (const w of this.ctx.getWebSockets()) { try { w.send(msg); } catch (e) { } }
  }
  async webSocketMessage(ws, data) {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m?.t === 'p' && m.p && typeof m.p === 'object') {
      const a = ws.deserializeAttachment() || {}; a.presence = { ...(a.presence || {}), ...m.p };
      if (JSON.stringify(a).length > 60000) return;
      ws.serializeAttachment(a); this.broadcast();
    } else if (m?.t === 'ping') ws.send('{"t":"pong"}');
  }
  async webSocketClose(ws) { try { ws.close(); } catch (e) { } this.broadcast(); }
  async webSocketError() { this.broadcast(); }
}
