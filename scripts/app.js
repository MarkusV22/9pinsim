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
  css.textContent = '#appAcc{width:min(400px,100%);margin:10px 0;background:#121821;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;font:15px Barlow,system-ui,sans-serif;color:#eef2f6}#appAcc b{color:#e8b34a}#appAcc input{width:100%;box-sizing:border-box;margin:6px 0;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0b0f14;color:#eef2f6;font:16px Barlow,system-ui,sans-serif}#appAcc .row{display:flex;gap:8px;margin-top:6px}#appAcc button{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#1a2230;color:#eef2f6;font:600 15px Barlow,system-ui,sans-serif}#appAcc button.pri{background:#e8b34a;color:#111;border-color:#e8b34a}#appAcc .msg{color:#ff6b5e;font-size:13px;min-height:1em}#appAcc small{color:#93a1b1}#appAcc .gBtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:6px;background:#fff;color:#1f1f1f;border-color:#dadce0}#appAcc .or{text-align:center;color:#93a1b1;font-size:13px;margin:10px 0 2px}';
  document.head.appendChild(css);
  let mode = 'claim';
  function render() {
    const acc = document.getElementById('account'); if (!acc) return;
    let box = document.getElementById('appAcc');
    if (!box) { box = document.createElement('div'); box.id = 'appAcc'; const st = document.getElementById('accState'); st.parentNode.insertBefore(box, st.nextSibling); }
    const me = window.__app.me();
    if (!me) { box.innerHTML = 'Keine Verbindung zum Server – Konto-Funktionen gehen gerade nicht.'; return; }
    const gBtn = `<button class="gBtn" id="aaG"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Mit Google anmelden</button>`;
    const ge = window.__app.gErr?.(); const gMsg = ge ? `<div class="msg">Google: ${ge}</div>` : '';
    if (me.login || me.google) {
      box.innerHTML = `Angemeldet als <b>${me.login || me.email || me.name}</b>${me.admin ? ' (Admin)' : ''}${me.google ? `<br><small>✓ mit Google verbunden${me.email ? ' (' + me.email + ')' : ''}</small>` : ''}<br><small>Auf einem anderen Gerät ${me.google ? 'mit Google' : 'mit diesem Namen und deinem Passwort'} anmelden – alles ist dann dort auch.</small>${gMsg}
        <div class="row">${me.google ? '' : gBtn.replace('Mit Google anmelden', 'Google verbinden')}<button id="aaOut">Abmelden</button></div>`;
      const g = box.querySelector('#aaG'); if (g) g.onclick = () => window.__app.google();
      box.querySelector('#aaOut').onclick = async () => { if (!confirm('Abmelden? Danach musst du dich auf diesem Gerät neu anmelden.')) return; await window.__app.logout(); ['liga', 'oliga', 'halls', 'halls_t', 'stats', 'prog', 'nick', 'friends', 'elo', 'evBest', 'coop', 'hallId'].forEach(k => { try { localStorage.removeItem('9pinsim_' + k); } catch (e) { } }); location.reload(); };
      return;
    }
    box.innerHTML = mode === 'claim'
      ? `<b>Konto sichern</b><br><small>Du spielst mit einem Gastkonto auf diesem Gerät. Mit Anmeldename und Passwort bleibt dein Fortschritt erhalten und du kannst dich auf anderen Geräten anmelden.</small>
        <input id="aaL" placeholder="Anmeldename (z. B. markus)" autocomplete="username" autocapitalize="off"><input id="aaP" type="password" placeholder="Passwort (mind. 6 Zeichen)" autocomplete="new-password">
        <div class="msg" id="aaM"></div><div class="row"><button class="pri" id="aaGo">Konto sichern</button><button id="aaSw">Ich habe schon ein Konto</button></div>
        <div class="or">oder</div>${gBtn}<small>Mit Google wird dein Gast-Fortschritt in dein Google-Konto übernommen.</small>${gMsg}`
      : `<b>Anmelden</b><br><small>Mit deinem Anmeldenamen und Passwort. Der Gast-Fortschritt auf diesem Gerät wird dabei durch dein Konto ersetzt.</small>
        <input id="aaL" placeholder="Anmeldename" autocomplete="username" autocapitalize="off"><input id="aaP" type="password" placeholder="Passwort" autocomplete="current-password">
        <div class="msg" id="aaM"></div><div class="row"><button class="pri" id="aaGo">Anmelden</button><button id="aaSw">Zurück</button></div>
        <div class="or">oder</div>${gBtn}${gMsg}`;
    box.querySelector('#aaSw').onclick = () => { mode = mode === 'claim' ? 'login' : 'claim'; render(); };
    box.querySelector('#aaG').onclick = () => window.__app.google();
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

// Meldung nach Rückkehr von Google (Fehler oder erfolgreich angemeldet)
setTimeout(() => {
  const e = window.__app?.peekGErr?.(), ok = sessionStorage.getItem('9pinsim_gok');
  if (!e && !ok) return; sessionStorage.removeItem('9pinsim_gok');
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:80;background:rgba(18,24,33,.97);border:1px solid ' + (e ? '#ff6b5e' : '#5fd38a') + ';border-radius:14px;padding:12px 14px;color:#eef2f6;font:15px Barlow,system-ui,sans-serif';
  d.textContent = e ? 'Google-Anmeldung: ' + e : '✓ Mit Google angemeldet'; document.body.appendChild(d); setTimeout(() => d.remove(), 5000);
}, 1500);

// Anmeldung ist Pflicht: Anmeldefenster vor dem Spiel (Google oder Anmeldename + Passwort)
(function () {
  if (!window.__app) return;
  const css = document.createElement('style');
  css.textContent = '#gate{position:fixed;inset:0;z-index:200;background:radial-gradient(120% 80% at 50% 0%,#1a2433 0%,#0b0f14 60%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom));overflow:auto;color:#eef2f6;font:15px Barlow,system-ui,sans-serif}' +
    '#gate .box{width:min(380px,100%)}#gate img{width:84px;height:84px;display:block;margin:0 auto 10px;border-radius:20px}#gate h1{font:800 34px "Barlow Condensed",Barlow,sans-serif;letter-spacing:.04em;text-align:center;margin:0}#gate .sub{text-align:center;color:#93a1b1;margin:2px 0 22px}' +
    '#gate input{width:100%;box-sizing:border-box;margin:5px 0;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#121821;color:#eef2f6;font:16px Barlow,system-ui,sans-serif}' +
    '#gate button{width:100%;padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#1a2230;color:#eef2f6;font:700 16px Barlow,system-ui,sans-serif;margin-top:8px}#gate button.pri{background:#e8b34a;color:#111;border-color:#e8b34a}' +
    '#gate .g{display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border-color:#dadce0}#gate .or{text-align:center;color:#93a1b1;font-size:13px;margin:16px 0 6px}#gate .tabs{display:flex;gap:6px;margin-bottom:6px}#gate .tabs button{margin:0;padding:9px;font-weight:600;font-size:14px}#gate .tabs .on{border-color:#e8b34a;background:rgba(232,179,74,.16)}' +
    '#gate .msg{color:#ff6b5e;font-size:14px;min-height:1.2em;margin-top:6px;text-align:center}#gate small{display:block;color:#93a1b1;text-align:center;margin-top:12px;font-size:12px}';
  document.head.appendChild(css);
  const G = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  let gate = null, tab = 'login';
  const CLEAR = ['liga', 'oliga', 'halls', 'halls_t', 'stats', 'prog', 'nick', 'friends', 'elo', 'evBest', 'coop', 'hallId'];
  function show(legacy) {
    if (!gate) { gate = document.createElement('div'); gate.id = 'gate'; document.body.appendChild(gate); }
    const off = !navigator.onLine;
    gate.innerHTML = `<div class="box"><img src="./icons/icon-192.png" alt=""><h1>9PINSIM</h1><div class="sub">Classic-Kegeln mit echter Physik</div>
      ${off ? '<div class="msg">Für die Anmeldung brauchst du Internet.</div>' : ''}
      <button class="g" id="gtG">${G}Mit Google anmelden</button>
      <div class="or">oder mit Anmeldename</div>
      ${legacy ? '<div class="sub" style="margin:0 0 8px">Sichere dein bisheriges Konto mit Anmeldename und Passwort – oder verbinde es oben mit Google.</div>' :
        `<div class="tabs"><button id="gtT1" class="${tab === 'login' ? 'on' : ''}">Anmelden</button><button id="gtT2" class="${tab === 'reg' ? 'on' : ''}">Konto erstellen</button></div>`}
      <input id="gtL" placeholder="Anmeldename" autocomplete="username" autocapitalize="off" spellcheck="false">
      <input id="gtP" type="password" placeholder="Passwort${tab === 'reg' || legacy ? ' (mind. 6 Zeichen)' : ''}" autocomplete="${tab === 'login' && !legacy ? 'current-password' : 'new-password'}">
      ${tab === 'reg' && !legacy ? '<input id="gtN" placeholder="Spielername (sehen deine Gegner)" maxlength="18">' : ''}
      <div class="msg" id="gtM"></div>
      <button class="pri" id="gtGo">${legacy ? 'Konto sichern' : tab === 'login' ? 'Anmelden' : 'Konto erstellen'}</button>
      <small>Mit der Anmeldung bleibt dein Fortschritt erhalten und ist auf all deinen Geräten gleich.</small></div>`;
    const $g = id => gate.querySelector('#' + id);
    $g('gtG').onclick = () => window.__app.google();
    if ($g('gtT1')) { $g('gtT1').onclick = () => { tab = 'login'; show(); }; $g('gtT2').onclick = () => { tab = 'reg'; show(); }; }
    const go = async () => {
      const l = $g('gtL').value.trim(), p = $g('gtP').value, m = $g('gtM'); m.textContent = '';
      if (!l || !p) { m.textContent = 'Bitte Anmeldename und Passwort eingeben'; return; }
      $g('gtGo').disabled = true;
      try {
        if (legacy) await window.__app.claim(l, p);
        else if (tab === 'login') { await window.__app.login(l, p); CLEAR.forEach(k => { try { localStorage.removeItem('9pinsim_' + k); } catch (e) { } }); }
        else { const n = ($g('gtN')?.value || '').trim() || l; await window.__app.register(l, p, n); try { localStorage.setItem('9pinsim_nick', JSON.stringify(n.slice(0, 18))); } catch (e) { } }
        location.reload();
      } catch (e) { m.textContent = e.message || 'Hat nicht geklappt'; $g('gtGo').disabled = false; }
    };
    $g('gtGo').onclick = go; $g('gtP').onkeydown = e => { if (e.key === 'Enter') go(); };
    const ge = window.__app.peekGErr?.(); if (ge) $g('gtM').textContent = 'Google: ' + window.__app.gErr();
  }
  const check = () => {
    if (window.__app.needLogin()) { const me = window.__app.me(); show(!!me && !me.login && !me.google); }
    else if (gate) { gate.remove(); gate = null; }
  };
  if (window.__app.needLogin() && !(window.__app.cached() && (window.__app.cached().login || window.__app.cached().google))) { if (document.body) show(); else addEventListener('DOMContentLoaded', () => show()); }
  window.__app.init().then(check, check);
  addEventListener('online', () => { if (gate) show(); });
})();
