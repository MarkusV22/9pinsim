// App-Hülle: Service Worker, „App installieren“-Hinweis
(function () {
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  if (standalone) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let prompt = null;
  const css = document.createElement('style');
  css.textContent = '#inst{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top));z-index:70;display:none;gap:8px;align-items:center;background:rgba(18,24,33,.95);border:1px solid #e8b34a;border-radius:999px;padding:7px 8px 7px 14px;color:#eef2f6;font:600 14px Barlow,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)}#inst button{border:0;border-radius:999px;padding:6px 12px;font:inherit;background:#e8b34a;color:#111}#inst .x{background:transparent;color:#93a1b1;padding:6px 8px}' +
    '#instIos{position:fixed;inset:auto 12px calc(16px + env(safe-area-inset-bottom));z-index:71;display:none;background:rgba(18,24,33,.97);border:1px solid #e8b34a;border-radius:16px;padding:14px 16px;color:#eef2f6;font:15px/1.45 Barlow,system-ui,sans-serif}#instIos b{color:#e8b34a}';
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'inst';
  bar.innerHTML = '📲 9PinSim als App<button id="instGo">Installieren</button><button class="x" id="instX">✕</button>';
  const tip = document.createElement('div'); tip.id = 'instIos';
  tip.innerHTML = '<b>So kommt 9PinSim auf den Home-Bildschirm:</b><br>1. Unten auf <b>Teilen</b> tippen (Quadrat mit Pfeil)<br>2. <b>„Zum Home-Bildschirm“</b> wählen<br>3. <b>Hinzufügen</b> – fertig, startet im Vollbild.<br><small>(Antippen zum Schließen)</small>';
  document.body.append(bar, tip);
  const seen = () => { try { return localStorage.getItem('9pinsim_instX') === '1'; } catch (e) { return false; } };
  const show = () => { if (!seen()) bar.style.display = 'flex'; };
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; show(); });
  if (ios) setTimeout(show, 4000);
  bar.querySelector('#instGo').onclick = async () => {
    if (prompt) { prompt.prompt(); try { await prompt.userChoice; } catch (e) { } prompt = null; bar.style.display = 'none'; }
    else if (ios) tip.style.display = 'block';
  };
  bar.querySelector('#instX').onclick = () => { bar.style.display = 'none'; try { localStorage.setItem('9pinsim_instX', '1'); } catch (e) { } };
  tip.onclick = () => { tip.style.display = 'none'; bar.style.display = 'none'; };
  addEventListener('appinstalled', () => { bar.style.display = 'none'; });
})();

// App-Konto im Konto-Bildschirm: Gastkonto sichern (Anmeldename + Passwort), auf anderem Gerät anmelden, abmelden
(function () {
  if (!window.__app) return;
  const css = document.createElement('style');
  css.textContent = '#appAcc{width:min(400px,100%);margin:10px 0;background:#121821;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;font:15px Barlow,system-ui,sans-serif;color:#eef2f6}#appAcc b{color:#e8b34a}#appAcc input{width:100%;box-sizing:border-box;margin:6px 0;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0b0f14;color:#eef2f6;font:16px Barlow,system-ui,sans-serif}#appAcc .row{display:flex;gap:8px;margin-top:6px}#appAcc button{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#1a2230;color:#eef2f6;font:600 15px Barlow,system-ui,sans-serif}#appAcc button.pri{background:#e8b34a;color:#111;border-color:#e8b34a}#appAcc .msg{color:#ff6b5e;font-size:13px;min-height:1em}#appAcc small{color:#93a1b1}';
  document.head.appendChild(css);
  let mode = 'claim';
  function render() {
    const acc = document.getElementById('account'); if (!acc) return;
    let box = document.getElementById('appAcc');
    if (!box) { box = document.createElement('div'); box.id = 'appAcc'; const st = document.getElementById('accState'); st.parentNode.insertBefore(box, st.nextSibling); }
    const me = window.__app.me();
    if (!me) { box.innerHTML = 'Keine Verbindung zum Server – Konto-Funktionen gehen gerade nicht.'; return; }
    if (me.login) {
      box.innerHTML = `Angemeldet als <b>${me.login}</b>${me.admin ? ' (Admin)' : ''}.<br><small>Auf einem anderen Gerät mit diesem Namen und deinem Passwort anmelden – alles ist dann dort auch.</small><div class="row"><button id="aaOut">Abmelden</button></div>`;
      box.querySelector('#aaOut').onclick = async () => { if (!confirm('Abmelden? Auf diesem Gerät startet dann ein neues Gastkonto.')) return; await window.__app.logout(); location.reload(); };
      return;
    }
    box.innerHTML = mode === 'claim'
      ? `<b>Konto sichern</b><br><small>Du spielst mit einem Gastkonto auf diesem Gerät. Mit Anmeldename und Passwort bleibt dein Fortschritt erhalten und du kannst dich auf anderen Geräten anmelden.</small>
        <input id="aaL" placeholder="Anmeldename (z. B. markus)" autocomplete="username" autocapitalize="off"><input id="aaP" type="password" placeholder="Passwort (mind. 6 Zeichen)" autocomplete="new-password">
        <div class="msg" id="aaM"></div><div class="row"><button class="pri" id="aaGo">Konto sichern</button><button id="aaSw">Ich habe schon ein Konto</button></div>`
      : `<b>Anmelden</b><br><small>Mit deinem Anmeldenamen und Passwort. Der Gast-Fortschritt auf diesem Gerät wird dabei durch dein Konto ersetzt.</small>
        <input id="aaL" placeholder="Anmeldename" autocomplete="username" autocapitalize="off"><input id="aaP" type="password" placeholder="Passwort" autocomplete="current-password">
        <div class="msg" id="aaM"></div><div class="row"><button class="pri" id="aaGo">Anmelden</button><button id="aaSw">Zurück</button></div>`;
    box.querySelector('#aaSw').onclick = () => { mode = mode === 'claim' ? 'login' : 'claim'; render(); };
    box.querySelector('#aaGo').onclick = async () => {
      const l = box.querySelector('#aaL').value.trim(), p = box.querySelector('#aaP').value, m = box.querySelector('#aaM'); m.textContent = '';
      try {
        if (mode === 'claim') { await window.__app.claim(l, p); render(); }
        else { await window.__app.login(l, p); ['liga', 'oliga', 'halls', 'halls_t', 'stats', 'prog', 'nick', 'friends', 'elo', 'evBest', 'coop'].forEach(k => { try { localStorage.removeItem('9pinsim_' + k); } catch (e) { } }); location.reload(); }
      } catch (e) { m.textContent = e.message || 'Hat nicht geklappt'; }
    };
  }
  const watch = () => { const acc = document.getElementById('account'); if (!acc) return setTimeout(watch, 500);
    new MutationObserver(() => { if (!acc.classList.contains('hidden')) { window.__app.init().then(render, render); } }).observe(acc, { attributes: true, attributeFilter: ['class'] }); };
  watch();
  // Spielername an den Server melden, wenn er sich ändert
  let last = null;
  setInterval(() => { let n = ''; try { n = JSON.parse(localStorage.getItem('9pinsim_nick') || '""'); } catch (e) { } if (n && n !== last && window.__app.me()) { last = n; window.__app.setName(n); } }, 5000);
})();
