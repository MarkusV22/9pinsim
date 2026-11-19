# 9PinSim – Classic-Kegeln (9 Kegel) mit echter Physik

Installierbare Web-App (PWA) auf Cloudflare. Spiel-Quelle ist derzeit das Claude-Artefakt „9PinSim – Prototyp“
(`source/artifact.html`); `python3 scripts/build.py` erzeugt daraus `public/` (Bibliotheken lokal, App-Symbole,
Service Worker für Offline-Betrieb, Hinweis „App installieren“).

- Veröffentlichen: Push auf `main` → GitHub Action → `wrangler deploy` (Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- Adresse: `https://9pinsim.<konto>.workers.dev` (eigene Domain später möglich)
- Server (`src/worker.js`): Konten (Gast automatisch, sichern mit Anmeldename + Passwort), Dokumentspeicher in D1 (`/api/db/*`, Regeln wie im Prototyp), Echtzeit-Räume als Durable Object (`/api/room/<name>`, WebSocket)
- `scripts/shim.js` stellt im Browser dasselbe `window.claude.use('db'|'room'|'user')` bereit wie Claude – das Spiel läuft unverändert
- Admin (Vereinsbahnen, Fehlerprotokoll): Anmeldenamen in `ADMIN_LOGINS` (wrangler.jsonc)
- Lokal testen: `npx wrangler d1 migrations apply 9pinsim --local && npx wrangler dev`
