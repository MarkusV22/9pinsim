// Web-Push ohne Fremdbibliothek: VAPID-Anmeldung (ES256) und Verschlüsselung aes128gcm (RFC 8291) mit WebCrypto.
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const cat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
// Schlüsselpaar des Servers: beim ersten Mal erzeugen und in D1 ablegen
export async function vapidKeys(env) {
  const r = await env.DB.prepare("SELECT data FROM server_keys WHERE id = 'vapid'").first();
  if (r) return JSON.parse(r.data);
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', k.privateKey), pub = b64u(await crypto.subtle.exportKey('raw', k.publicKey));
  const data = { jwk: { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y }, pub };
  await env.DB.prepare("INSERT OR IGNORE INTO server_keys (id, data) VALUES ('vapid', ?)").bind(JSON.stringify(data)).run();
  return JSON.parse((await env.DB.prepare("SELECT data FROM server_keys WHERE id = 'vapid'").first()).data);
}
async function vapidAuth(keys, endpoint, contact) {
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1000);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))), body = b64u(enc.encode(JSON.stringify({ aud, exp: now + 12 * 3600, sub: contact })));
  const key = await crypto.subtle.importKey('jwk', { ...keys.jwk, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${keys.pub}`;
}
export async function encryptPayload(p256dh, authSecret, payload) {
  const ua = unb64u(p256dh), auth = unb64u(authSecret);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   // Datensatzgröße 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
// an alle Geräte der Nutzer senden; abgelaufene Abos löschen
export async function pushTo(env, userIds, msg) {
  if (!userIds.length) return 0;
  const keys = await vapidKeys(env);
  const subs = (await env.DB.prepare(`SELECT * FROM push_subs WHERE user_id IN (${userIds.map(() => '?').join(',')})`).bind(...userIds).all()).results;
  const payload = JSON.stringify(msg).slice(0, 3000);
  let sent = 0;
  await Promise.all(subs.map(async s => {
    try {
      const body = await encryptPayload(s.p256dh, s.auth, payload);
      const r = await fetch(s.endpoint, { method: 'POST', body, headers: { authorization: await vapidAuth(keys, s.endpoint, 'mailto:' + (env.PUSH_CONTACT || 'admin@9pinsim')),
        'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '86400', urgency: 'normal', ...(msg.tag ? { topic: String(msg.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}) } });
      if (r.status === 404 || r.status === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(s.endpoint).run();
      else if (r.ok) sent++;
    } catch (e) { }
  }));
  return sent;
}
