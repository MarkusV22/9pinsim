"""Baut die installierbare Web-App aus dem Spiel (source/artifact.html = Stand des Claude-Artefakts).
Aufruf: python3 scripts/build.py  →  public/index.html, public/sw.js (Version = Prüfsumme)"""
import hashlib, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'source/artifact.html').read_text(encoding='utf-8')
def rep(a, b, need=True):
    global s
    if a not in s:
        if need: raise SystemExit('Nicht gefunden: ' + a[:80])
        return
    s = s.replace(a, b)
# Bibliotheken aus dem eigenen Ordner statt CDN (funktioniert offline)
rep('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', './vendor/three.module.min.js')
rep('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js', './vendor/cannon-es.js')
rep('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', './vendor/addons/')
s = re.sub(r'<title>[^<]*</title>', '<title>9PinSim</title>', s, count=1)
rep('<meta charset="utf-8">', '''<meta charset="utf-8">
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#0b0f14">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="9PinSim">
<link rel="apple-touch-icon" href="./icons/apple-180.png">
<link rel="icon" type="image/png" href="./icons/favicon-64.png">''')
s = s.replace('width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
# Online gibt es in der App erst mit dem eigenen Server (Schritt 2)
for who in ('Gegnern', 'Mitspielern'):
    s = s.replace(f'Online ist gerade nicht verfügbar.\\nDu musst bei Claude angemeldet sein, und das Spiel muss mit deinen {who} geteilt sein (mindestens als „Mitwirkender“).',
                  'Online kommt in der App in Kürze.\\nBis dahin: Online-Spiele, Coop-Liga und Rangliste über den Claude-Link spielen.')
app = (root / 'scripts/app.js').read_text(encoding='utf-8')
rep('</body>', '<script>\n' + app + '\n</script>\n</body>')
(root / 'public/index.html').write_text(s, encoding='utf-8')
# Service Worker mit Version aus allen Dateien
h = hashlib.sha1()
files = sorted(p for p in (root / 'public').rglob('*') if p.is_file() and p.name != 'sw.js')
for p in files: h.update(p.read_bytes())
sw = (root / 'scripts/sw.template.js').read_text(encoding='utf-8')
assets = ["./"] + ['./' + str(p.relative_to(root / 'public')) for p in files if p.name not in ('_headers',)]
sw = sw.replace('__VERSION__', h.hexdigest()[:10]).replace('__ASSETS__', repr(assets).replace("'", '"'))
(root / 'public/sw.js').write_text(sw, encoding='utf-8')
print('ok', h.hexdigest()[:10], len(s))
