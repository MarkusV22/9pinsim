# 9PinSim – Classic-Kegeln (9 Kegel) mit echter Physik

Installierbare Web-App (PWA) auf Cloudflare. Spiel-Quelle ist derzeit das Claude-Artefakt „9PinSim – Prototyp“
(`source/artifact.html`); `python3 scripts/build.py` erzeugt daraus `public/` (Bibliotheken lokal, App-Symbole,
Service Worker für Offline-Betrieb, Hinweis „App installieren“).

- Veröffentlichen: Push auf `main` → GitHub Action → `wrangler deploy` (Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- Adresse: `https://9pinsim.<konto>.workers.dev` (eigene Domain später möglich)
- Online-Funktionen (Duelle, Coop-Liga, Rangliste, Freunde) folgen mit eigenem Server (Schritt 2: Workers + D1 + Durable Objects)
