# Erzeugt die App-Symbole (Kegelraute, Bahn, Kugel)
from PIL import Image, ImageDraw
def icon(S, maskable, path):
    pad = 0 if maskable else int(S * .06); r = 0 if maskable else int(S * .22)
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)
    for y in range(S):
        t = y / S; d.line([(0, y), (S, y)], fill=(int(16 + 20 * t), int(22 + 14 * t), int(32 + 10 * t), 255))
    sc = .74 if maskable else .9; cx = S / 2
    P = lambda x, y: (cx + (x - .5) * S * sc, S / 2 + (y - .5) * S * sc)
    d.polygon([P(.39, 1.02), P(.61, 1.02), P(.545, .55), P(.455, .55)], fill=(232, 179, 74, 255))
    rr = S * sc * .036
    for i in range(3):
        for j in range(3):
            X, Y = P(.5 + (i - j) * .1, .2 + (i + j) * .08); d.ellipse([X - rr, Y - rr, X + rr, Y + rr], fill=(246, 241, 231, 255))
    X, Y = P(.5, .82); R = S * sc * .09
    d.ellipse([X - R, Y - R, X + R, Y + R], fill=(29, 63, 158, 255), outline=(255, 255, 255, 255), width=max(2, int(S * .008)))
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([pad, pad, S - pad, S - pad], r, fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(im, (0, 0), m); out.save(path)
for S, mk, n in [(512, 0, 'icon-512'), (192, 0, 'icon-192'), (512, 1, 'maskable-512'), (180, 1, 'apple-180'), (64, 0, 'favicon-64')]:
    icon(S, mk, f'public/icons/{n}.png')
