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
