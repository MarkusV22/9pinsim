// Ersatz für window.claude (Prototyp lief in Claude): db, room und user gegen den eigenen 9PinSim-Server.
// Beim ersten Start wird automatisch ein Gastkonto angelegt; mit Name + Passwort lässt es sich sichern und auf
// anderen Geräten anmelden (Konto-Bildschirm).
(function () {
  if (window.claude) return;
  const API = location.origin + '/api/', TK = '9pinsim_token';
  let token = null, me = null, ready = null, gErr = '';
  try { token = localStorage.getItem(TK); } catch (e) { }
  // Rückkehr von der Google-Anmeldung: /#login=<token>[&linked=1] oder /#gerr=<Meldung>
  try {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('login')) {
      if (!h.get('linked')) Object.keys(localStorage).forEach(k => { if (k.startsWith('9pinsim_') && !['9pinsim_quality', '9pinsim_tut', '9pinsim_welcome', '9pinsim_instX'].includes(k)) localStorage.removeItem(k); });   // anderes Konto: lokaler Stand weicht dem Konto
      token = h.get('login'); localStorage.setItem(TK, token); localStorage.setItem('9pinsim_welcome', 'true');
      sessionStorage.setItem('9pinsim_gok', '1'); history.replaceState(null, '', location.pathname);
    } else if (h.get('gerr')) { gErr = h.get('gerr'); history.replaceState(null, '', location.pathname); }
  } catch (e) { }
  const nick = () => { try { return JSON.parse(localStorage.getItem('9pinsim_nick') || '""') || ''; } catch (e) { return ''; } };
  async function call(path, body, method = 'POST') {
    const r = await fetch(API + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: method === 'POST' ? JSON.stringify(body || {}) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
    return j;
  }
  async function guest() { const j = await call('auth/guest', { name: nick() }); token = j.token; me = j.user; try { localStorage.setItem(TK, token); } catch (e) { } }
  function init() {
    if (ready) return ready;
    ready = (async () => {
      if (!navigator.onLine && !token) throw new Error('offline');
      if (token) { try { me = (await call('me', { name: nick() || undefined })).user; } catch (e) { if (e.status === 401) await guest(); else throw e; } }
      else await guest();
      return me;
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }
  // ---------- Datenbank ----------
  const snapDoc = (path, j) => ({ exists: !!j.exists, id: path.split('/').pop(), data: () => j.data });
  function doc(path) {
    return {
      get: async () => snapDoc(path, await call('db/get', { path })),
      set: async data => { await call('db/set', { path, data }); },
      delete: async () => { await call('db/delete', { path }); }
    };
  }
  function col(path, q = {}) {
    return {
      where: (k, op, v) => col(path, { ...q, where: [...(q.where || []), [k, op, v]] }),
      orderBy: (k, dir = 'asc') => col(path, { ...q, order: [k, dir] }),
      limit: n => col(path, { ...q, limit: n }),
      doc: id => doc(path + '/' + id),
      get: async () => { const j = await call('db/list', { path, ...q }); const docs = j.docs.map(d => ({ id: d.id, data: () => d.data })); return { docs, forEach: f => docs.forEach(f), size: docs.length, empty: !docs.length }; }
    };
  }
  const db = { doc, collection: col };
  // ---------- Echtzeit-Räume ----------
  function room(name) {
    let ws = null, myPeer = null, peers = [], pres = {}, left = false, openRes, openP = new Promise(r => openRes = r), retry = 0, pingT = 0;
    const subs = new Set(), errs = new Set();
    const emit = () => subs.forEach(f => { try { f(); } catch (e) { } });
    function connect() {
      if (left) return;
      ws = new WebSocket(API.replace(/^http/, 'ws') + 'room/' + encodeURIComponent(name) + '?token=' + encodeURIComponent(token));
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'hello') { myPeer = m.peer; retry = 0; if (Object.keys(pres).length) ws.send(JSON.stringify({ t: 'p', p: pres })); openRes(); }
        else if (m.t === 'peers') { peers = m.peers || []; emit(); }
      };
      ws.onclose = () => { clearInterval(pingT); if (left) return; peers = []; emit(); setTimeout(connect, Math.min(8000, 800 * ++retry)); if (retry === 4) errs.forEach(f => { try { f(); } catch (e) { } }); };
      ws.onopen = () => { clearInterval(pingT); pingT = setInterval(() => { try { ws.send('{"t":"ping"}'); } catch (e) { } }, 25000); };
    }
    connect();
    const api = {
      presence: async o => { pres = { ...pres, ...o }; if (ws && ws.readyState === 1 && myPeer) ws.send(JSON.stringify({ t: 'p', p: o })); emit(); },
      peers: () => [{ peer: myPeer || 'me', sameTab: true, presence: pres, kind: 'viewer', by: me?.id }, ...peers.filter(p => p.peer !== myPeer).map(p => ({ peer: p.peer, presence: p.presence || {}, kind: 'viewer', by: p.by }))],
      onPeers: (f, onErr) => { subs.add(f); if (onErr) errs.add(onErr); return () => { subs.delete(f); if (onErr) errs.delete(onErr); }; },
      join: async sub => { const r = room(name + '/' + sub); await Promise.race([r._open, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]); return r; },
      leave: async () => { left = true; clearInterval(pingT); try { ws.close(); } catch (e) { } },
      _open: openP
    };
    return api;
  }
  // ---------- Konto ----------
  const user = {
    id: async () => (await init()).id,
    me: async () => ({ id: (await init()).id, name: me.name }),
    profiles: async ids => { try { return await call('profiles?ids=' + encodeURIComponent((ids || []).join(',')), null, 'GET'); } catch (e) { return {}; } },
    isOwner: () => !!me?.admin, canEdit: () => !!me?.admin, can: () => true
  };
  let mainRoom = null;
  window.claude = {
    use: async n => {
      try { await init(); } catch (e) { return null; }
      if (n === 'db') return db;
      if (n === 'user') return user;
      if (n === 'room') { if (!mainRoom) { mainRoom = room('main'); await Promise.race([mainRoom._open, new Promise(r => setTimeout(r, 1500))]); } return mainRoom; }
      return null;
    }
  };
  // für den Konto-Bildschirm der App
  window.__app = {
    me: () => me, init,
    claim: async (login, pass) => { const j = await call('auth/claim', { login, pass }); me = j.user; return me; },
    login: async (login, pass) => { const j = await call('auth/login', { login, pass }); token = j.token; me = j.user; try { localStorage.setItem(TK, token); } catch (e) { } return me; },
    logout: async () => { try { await call('auth/logout', {}); } catch (e) { } try { localStorage.removeItem(TK); } catch (e) { } token = null; me = null; },
    setName: async n => { try { me = (await call('me', { name: n })).user; } catch (e) { } },
    google: () => { location.href = API + 'auth/google/start' + (token ? '?token=' + encodeURIComponent(token) : ''); },
    gErr: () => { const e = gErr; gErr = ''; return e; },
    peekGErr: () => gErr
  };
})();
