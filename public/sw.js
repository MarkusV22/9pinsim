// Service Worker: App offline verfügbar, Updates beim nächsten Start
const V = '9pinsim-a2a800042d', ASSETS = ["./", "./icons/apple-180.png", "./icons/favicon-64.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./index.html", "./manifest.webmanifest", "./vendor/addons/environments/RoomEnvironment.js", "./vendor/cannon-es.js", "./vendor/three.module.min.js"];
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
