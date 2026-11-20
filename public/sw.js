// Service Worker: App offline verfügbar, Updates beim nächsten Start
const V = '9pinsim-448bf15ccb', ASSETS = ["./", "./icons/apple-180.png", "./icons/favicon-64.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./index.html", "./manifest.webmanifest", "./vendor/addons/environments/RoomEnvironment.js", "./vendor/cannon-es.js", "./vendor/three.module.min.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'fonts').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.hostname.includes('fonts.g')) {   // Schriften: einmal laden, dann aus dem Speicher
    e.respondWith(caches.open('fonts').then(c => c.match(r).then(m => m || fetch(r).then(res => { c.put(r, res.clone()); return res; }))));
    return;
  }
  if (u.origin !== location.origin) return;
  if (r.mode === 'navigate') {   // Spiel selbst: zuerst Netz (neueste Version), offline aus dem Speicher
    e.respondWith(fetch(r).then(res => { caches.open(V).then(c => c.put('./', res.clone())); return res; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r)));
});
// Push-Mitteilungen
self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (x) { m = { title: '9PinSim', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || '9PinSim', { body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag, icon: './icons/icon-192.png', badge: './icons/favicon-64.png', data: { url: m.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.location.origin));
    if (c) { c.postMessage({ open: new URL(url).hash.slice(1) }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
