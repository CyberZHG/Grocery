"""Decor, renovation styles, holiday decorations, cats, gifts and spills."""
import math
import random
from pix import Canvas, hexc, tone, mix, fake_text

T = 32
WHITE = hexc('f4f2ee')
DARK = hexc('3a3440')
RED = hexc('c84848')
WOOD = hexc('b8875a')


def W(c, k):
    return tone(c, k)


# ---------- renovation: floors ----------

FLOOR_STYLES = ['cream', 'wood', 'blue', 'terrazzo', 'mint', 'checker', 'parquet', 'lino', 'concrete']


def _floor_new(style, v):
    """Floors added for the branches' own looks."""
    cv = Canvas(T, T)
    rnd = random.Random(v * 7 + len(style) * 13)
    if style == 'checker':
        # market tiles: soft sage and cream squares
        a, b = hexc('c4d6b4'), hexc('efe9d8')
        for y in range(0, T, 16):
            for x in range(0, T, 16):
                c = a if ((x + y) // 16 + v) % 2 == 0 else b
                cv.rect(x, y, x + 15, y + 15, c)
                cv.hline(x, x + 15, y, W(c, 1))
                cv.vline(x + 15, y, y + 15, W(c, -1))
        return cv
    if style == 'parquet':
        # basket-weave parquet in warm honey oak: pairs of short planks turning each 8px, quiet seams
        base = hexc('caa476') if v == 0 else hexc('c69f72')
        cv.rect(0, 0, T - 1, T - 1, base)
        for j in range(4):
            for i in range(4):
                x0, y0 = i * 8, j * 8
                tone_ = base if (i + j) % 2 else mix(base, W(base, -1), 0.5)
                cv.rect(x0, y0, x0 + 7, y0 + 7, tone_)
                # a faint line between the two planks and an even fainter seam round the block
                mid = mix(tone_, W(tone_, -1), 0.6)
                if (i + j + v) % 2:
                    cv.hline(x0, x0 + 7, y0 + 3, mid)
                else:
                    cv.vline(x0 + 3, y0, y0 + 7, mid)
                cv.hline(x0, x0 + 7, y0 + 7, W(base, -1))
                cv.vline(x0 + 7, y0, y0 + 7, W(base, -1))
        return cv
    if style == 'lino':
        # school lino: pale with coloured flecks
        base = hexc('f0e6c0') if v == 0 else hexc('e8dcb4')
        cv.rect(0, 0, T - 1, T - 1, base)
        cols = [hexc('e07a7a'), hexc('5a9ad0'), hexc('6ab06a'), hexc('f0b040')]
        for _ in range(16):
            cv.px(rnd.randint(1, 30), rnd.randint(1, 30), rnd.choice(cols))
        cv.hline(0, T - 1, T - 1, W(base, -2))
        cv.vline(T - 1, 0, T - 1, W(base, -2))
        return cv
    # concrete: smooth grey slab with seams and a few marks
    base = hexc('a8a8ac') if v == 0 else hexc('a0a0a6')
    cv.rect(0, 0, T - 1, T - 1, base)
    for _ in range(20):
        cv.px(rnd.randint(1, 30), rnd.randint(1, 30), W(base, rnd.choice((-1, 1))))
    cv.hline(0, T - 1, T - 1, W(base, -3))
    cv.vline(T - 1, 0, T - 1, W(base, -3))
    return cv


def floor_style(style, v):
    if style in ('checker', 'parquet', 'lino', 'concrete'):
        return _floor_new(style, v)
    cv = Canvas(T, T)
    if style == 'cream':
        base = hexc('ece4d4') if v == 0 else hexc('e2d8c6')
    elif style == 'wood':
        base = hexc('c89a6a') if v == 0 else hexc('bf9060')
    elif style == 'blue':
        base = hexc('e8eef4') if v == 0 else hexc('9cc0dc')
    elif style == 'terrazzo':
        base = hexc('ddd6cc')
    else:
        base = hexc('d8eee2') if v == 0 else hexc('c4e2d2')
    cv.rect(0, 0, T - 1, T - 1, base)
    rnd = random.Random(v + 3 + FLOOR_STYLES.index(style) * 17)
    if style == 'wood':
        for y in range(0, T, 8):
            cv.hline(0, T - 1, y, W(base, -2))
            off = (y // 8 * 11 + v * 5) % T
            cv.vline(off, y + 1, y + 7, W(base, -2))
            for _ in range(5):
                x = rnd.randint(0, T - 6)
                cv.hline(x, x + rnd.randint(2, 5), y + rnd.randint(2, 6), W(base, rnd.choice((-1, 1))))
        return cv
    if style == 'terrazzo':
        cols = [hexc('b8a890'), hexc('8a8a94'), hexc('f4f2ee'), hexc('c88a6a')]
        for _ in range(26):
            x, y = rnd.randint(1, 30), rnd.randint(1, 30)
            c = rnd.choice(cols)
            cv.px(x, y, c)
            if rnd.random() < 0.4:
                cv.px(x + 1, y, c)
    else:
        for _ in range(18):
            cv.px(rnd.randint(1, 30), rnd.randint(1, 30), W(base, rnd.choice((-1, 1))))
    cv.hline(0, T - 1, 0, W(base, 1))
    cv.vline(0, 0, T - 1, W(base, 1))
    cv.hline(0, T - 1, T - 1, W(base, -1))
    cv.vline(T - 1, 0, T - 1, W(base, -1))
    return cv


# ---------- renovation: walls ----------

WALL_STYLES = ['beige', 'mint', 'brick', 'navy', 'tile', 'green', 'plaster', 'pastel', 'metal']
SEASONS = ['spring', 'summer', 'autumn', 'winter']


def _poster(cv, season):
    cv.rect(7, 16, 24, 38, WHITE)
    if season is None:
        cv.rect(7, 16, 24, 22, RED)
        fake_text(cv, 9, 19, 22, WHITE, 1)
        cv.ellipse(15.5, 30, 5, 4, hexc('f0c040'))
    elif season == 'spring':
        cv.rect(7, 16, 24, 22, hexc('e87aa0'))
        for (x, y, c) in ((11, 29, 'f0a0c0'), (16, 27, 'f8d050'), (20, 30, 'f0a0c0')):
            cv.ellipse(x, y, 2.5, 2.5, hexc(c))
            cv.px(x - 0.5, y - 0.5, hexc('f8f0a0'))
        cv.vline(16, 30, 34, hexc('5aa050'))
    elif season == 'summer':
        cv.rect(7, 16, 24, 22, hexc('40a0e0'))
        cv.poly([(12, 28), (19, 28), (15.5, 36)], hexc('d8a060'))
        cv.ellipse(15.5, 27, 4, 3.5, hexc('f8b0c8'))
        cv.px(14, 26, WHITE)
    elif season == 'autumn':
        cv.rect(7, 16, 24, 22, hexc('d07030'))
        cv.poly([(15.5, 24), (20, 29), (15.5, 35), (11, 29)], hexc('e08a30'))
        cv.vline(15, 26, 35, hexc('8a4a20'))
    else:
        cv.rect(7, 16, 24, 22, hexc('5a7ab8'))
        c = hexc('8ac0e8')
        cv.line(15, 25, 15, 35, c)
        cv.line(11, 27, 20, 33, c)
        cv.line(11, 33, 20, 27, c)
    fake_text(cv, 9, 19, 22, WHITE, 1)
    fake_text(cv, 9, 36, 22, DARK, 2)
    cv.shade_box(7, 16, 24, 38, 0.5)


def wall_style(style, kind=0, season=None):
    cv = Canvas(T, 64)
    base = {'beige': hexc('d8c8a8'), 'mint': hexc('c8e4d4'), 'brick': hexc('b86a50'), 'navy': hexc('4a5a7a'),
            'tile': hexc('eef0f2'), 'green': hexc('8aa880'), 'plaster': hexc('ece2cc'), 'pastel': hexc('f4e2a8'), 'metal': hexc('9aa2ac')}[style]
    trim = hexc('6a5a58') if style not in ('navy', 'tile', 'metal') else hexc('2a3248') if style == 'navy' else hexc('4a5058')
    cv.rect(0, 0, 31, 63, base)
    cv.rect(0, 0, 31, 7, trim)
    cv.hline(0, 31, 7, W(trim, -2))
    if style == 'tile':
        # white subway tiles with dark grout, like a station passage
        for i, y in enumerate(range(8, 54, 4)):
            cv.hline(0, 31, y, hexc('9aa0a8'))
            for x in range((i % 2) * 4, 32, 8):
                cv.vline(x, y + 1, y + 3, hexc('9aa0a8'))
    elif style == 'green':
        # painted plank boards of a greengrocer
        for x in range(0, 32, 6):
            cv.vline(x, 8, 53, W(base, -2))
            cv.vline(x + 1, 8, 53, W(base, 1))
    elif style == 'plaster':
        # old-town plaster between dark timber beams
        beam = hexc('5a3a28')
        cv.rect(0, 8, 2, 53, beam)
        cv.rect(29, 8, 31, 53, beam)
        cv.rect(0, 30, 31, 32, beam)
        rnd = random.Random(kind * 3 + 1)
        for _ in range(14):
            cv.px(rnd.randint(4, 27), rnd.randint(10, 52), W(base, -1))
    elif style == 'pastel':
        # school stripes in soft yellow and sky blue
        for y in range(8, 54, 8):
            cv.rect(0, y, 31, y + 3, hexc('bcdcf0'))
    elif style == 'metal':
        # corrugated steel siding
        for x in range(0, 32, 4):
            cv.vline(x, 8, 53, W(base, 2))
            cv.vline(x + 2, 8, 53, W(base, -2))
    elif style == 'brick':
        for i, y in enumerate(range(9, 54, 5)):
            cv.hline(0, 31, y, W(base, -2))
            for x in range((i % 2) * 8, 32, 16):
                cv.vline(x, y + 1, y + 4, W(base, -2))
    elif style == 'mint':
        for x in range(2, 32, 6):
            cv.rect(x, 8, x + 1, 53, W(base, 1))
    else:
        for y in range(12, 54, 6):
            cv.hline(0, 31, y, W(base, -1) if y % 12 == 0 else W(base, 0))
    skirt = {'navy': hexc('2a3248'), 'tile': hexc('4a5058'), 'metal': hexc('4a5058'), 'green': hexc('5a6a4e')}.get(style, hexc('7a6a5a'))
    cv.rect(0, 54, 31, 63, skirt)
    cv.hline(0, 31, 54, W(skirt, 2))
    if kind == 1:
        cv.rect(4, 14, 27, 44, hexc('5a6a7a'))
        cv.rect(6, 16, 25, 42, hexc('8ec4e0'))
        cv.shade_vgrad(6, 16, 25, 42, 1.2, -1.0)
        cv.line(9, 40, 22, 18, W(hexc('8ec4e0'), 3))
        cv.vline(15, 16, 42, hexc('5a6a7a'))
        cv.hline(6, 25, 29, hexc('5a6a7a'))
        cv.rect(3, 44, 28, 46, W(base, 2))
    elif kind == 2:
        _poster(cv, season)
    elif kind == 3:
        cv.rect(3, 18, 28, 21, WOOD)
        cv.rect(3, 22, 28, 22, W(WOOD, -2))
        cv.ellipse(15.5, 33, 7, 7, WHITE)
        cv.ellipse(15.5, 33, 5.5, 5.5, hexc('f8f6f0'))
        cv.line(15, 33, 15, 29, DARK)
        cv.line(15, 33, 18, 33, DARK)
    return cv


# ---------- renovation: signs ----------

SIGN_STYLES = ['wood', 'metal', 'chalk', 'neon', 'awning', 'red', 'crayon']


def sign_style(style):
    cv = Canvas(64, 20)
    frame, face = {
        'wood': (hexc('5a3a28'), hexc('2a2430')), 'metal': (hexc('a8acb8'), hexc('3a3e48')),
        'chalk': (hexc('8a6a4a'), hexc('2e4a3a')), 'neon': (hexc('e05a9a'), hexc('1a1424')),
        'awning': (hexc('3a7a4a'), hexc('2a4a30')), 'red': (hexc('c8a040'), hexc('8a2a24')), 'crayon': (hexc('e07a7a'), hexc('2a3a5a')),
    }[style]
    cv.rrect(0, 0, 63, 19, frame, 2)
    cv.rrect(2, 2, 61, 17, face, 1)
    if style == 'neon':
        for x in range(2, 62, 3):
            cv.px(x, 1, W(frame, 3))
    if style == 'metal':
        for (x, y) in ((3, 3), (60, 3), (3, 16), (60, 16)):
            cv.px(x, y, W(frame, 2))
    if style == 'awning':
        # green and white stripes along the top edge
        for x in range(0, 64, 6):
            cv.rect(x, 0, x + 2, 1, WHITE)
    if style == 'crayon':
        # a frame in four crayon colours
        for i, c in enumerate(('e07a7a', 'f0c040', '6ab06a', '5a9ad0')):
            cv.rect(i * 16, 0, i * 16 + 15, 1, hexc(c))
            cv.rect(i * 16, 18, i * 16 + 15, 19, hexc(c))
    cv.outline(0.5)
    return cv


# ---------- decor items (1x1 placeable) ----------

DECOR = ['plant_small', 'flowers', 'bench', 'cactus', 'cat_tower', 'lamp', 'gumball', 'magazine', 'aquarium']


def decor(kind):
    if kind == 'lamp':
        cv = Canvas(T, 48)
        cv.vline(15, 14, 44, DARK)
        cv.vline(16, 14, 44, hexc('5a5060'))
        cv.ellipse(15.5, 45, 6, 2, DARK)
        shade = hexc('f0d8a0')
        cv.poly([(9, 14), (22, 14), (19, 3), (12, 3)], shade)
        cv.hline(9, 22, 14, hexc('d8b070'))
        cv.shade_cyl(9, 3, 22, 14, 0.5)
        cv.px(15, 15, hexc('fff4c0')); cv.px(16, 15, hexc('fff4c0'))
        cv.outline(0.5)
        return cv
    if kind == 'gumball':
        cv = Canvas(T, 44)
        red = hexc('d84848')
        cv.rect(11, 24, 20, 40, red)
        cv.rect(9, 40, 22, 42, W(red, -2))
        cv.rect(13, 30, 18, 34, hexc('c8ccd4'))
        cv.px(15, 32, DARK); cv.px(16, 32, DARK)
        cv.ellipse(15.5, 14, 9, 9, (220, 236, 244, 230))
        rnd = random.Random(6)
        for _ in range(26):
            x, y = rnd.randint(9, 22), rnd.randint(9, 22)
            if (x - 15.5) ** 2 + (y - 15) ** 2 < 50:
                cv.px(x, y, hexc(rnd.choice(['e84848', 'f0d040', '5ab0e0', '7ad070', 'f088c0'])))
        cv.rect(12, 4, 19, 6, red)
        cv.px(12, 10, WHITE); cv.px(11, 11, WHITE)
        cv.shade_cyl(11, 24, 20, 40, 0.6)
        cv.outline(0.5)
        return cv
    if kind == 'aquarium':
        cv = Canvas(T, 44)
        wood = hexc('8a5a3a')
        cv.rect(2, 28, 29, 43, wood)
        cv.rect(4, 31, 27, 41, W(wood, -1))
        cv.rect(2, 6, 29, 27, hexc('5ab0d8'))
        cv.shade_vgrad(2, 6, 29, 27, 0.6, -0.5)
        cv.rect(2, 4, 29, 6, hexc('3a3440'))
        cv.rect(3, 24, 28, 26, hexc('e8d8a8'))
        for x in (6, 9, 24):
            cv.line(x, 24, x + 1, 15 + x % 4, hexc('4a9a50'), 1)
        for (x, y, c) in ((12, 12, 'f08030'), (20, 18, 'f0d040'), (17, 10, 'e84848')):
            cv.ellipse(x, y, 2, 1.2, hexc(c))
            cv.px(x - 3, y, hexc(c))
        for (x, y) in ((22, 8), (23, 11), (22, 14)):
            cv.px(x, y, (255, 255, 255, 180))
        cv.line(4, 25, 10, 8, (255, 255, 255, 90))
        cv.outline(0.5)
        return cv
    if kind == 'magazine':
        cv = Canvas(T, 40)
        frame = hexc('6a6e7a')
        cv.rect(4, 6, 27, 38, frame)
        for i, y in enumerate((8, 18, 28)):
            for k, c in enumerate(('e86a8a', '5ab0e0', 'f0d040', '7ad070')):
                x = 6 + k * 5
                cv.rect(x, y, x + 4, y + 8, hexc(c))
                cv.hline(x, x + 4, y + 2, WHITE)
                cv.px(x + 1, y + 5, DARK)
            cv.hline(4, 27, y + 9, W(frame, 2))
        cv.outline(0.5)
        return cv
    if kind == 'cat_tower':
        cv = Canvas(T, 48)
        post = hexc('d8c8a0')
        cv.rect(13, 14, 18, 44, post)
        for y in range(16, 44, 3):
            cv.hline(13, 18, y, W(post, -1))
        cv.rrect(4, 10, 27, 15, hexc('8a6aa0'), 2)
        cv.rrect(6, 26, 25, 30, hexc('8a6aa0'), 2)
        cv.rrect(3, 42, 28, 46, hexc('6a4a80'), 2)
        cv.shade_cyl(13, 14, 18, 44)
        cv.outline(0.5)
        return cv
    cv = Canvas(T, T)
    if kind == 'plant_small':
        pot = hexc('d8d0c0')
        cv.poly([(10, 20), (22, 20), (20, 30), (12, 30)], pot)
        cv.shade_cyl(10, 20, 22, 30)
        g = hexc('5aa050')
        for (x, y, rx, ry) in ((16, 12, 5, 7), (11, 16, 4, 4), (21, 16, 4, 4)):
            cv.ellipse(x, y, rx, ry, g)
        cv.shade_ball(16, 14, 9, 8, 0.7)
    elif kind == 'flowers':
        box = hexc('a86a40')
        cv.rect(3, 20, 28, 29, box)
        cv.shade_box(3, 20, 28, 29, 0.6)
        for i, c in enumerate(('e86a8a', 'f0d040', 'f8f8f8', 'e86a8a', 'a080e0')):
            x = 6 + i * 5
            cv.vline(x, 13, 20, hexc('4a8a40'))
            cv.ellipse(x, 12, 2.4, 2.4, hexc(c))
            cv.px(x, 12, hexc('f8e070'))
    elif kind == 'bench':
        w = hexc('a8703a')
        cv.rect(2, 14, 29, 18, w)
        cv.rect(2, 8, 29, 11, w)
        cv.rect(4, 19, 5, 28, DARK)
        cv.rect(26, 19, 27, 28, DARK)
        cv.shade_box(2, 8, 29, 18, 0.6)
    elif kind == 'cactus':
        pot = hexc('c86a40')
        cv.poly([(10, 22), (22, 22), (20, 30), (12, 30)], pot)
        g = hexc('4a9a5a')
        cv.rrect(13, 6, 19, 23, g, 3)
        cv.rrect(7, 11, 11, 18, g, 2)
        cv.rrect(21, 9, 25, 16, g, 2)
        cv.shade_cyl(7, 6, 25, 23, 0.7)
        cv.ellipse(16, 5, 2, 1.5, hexc('f080a0'))
    cv.outline(0.5)
    return cv


# ---------- holiday decorations ----------

def pumpkin():
    cv = Canvas(20, 16)
    o = hexc('e8802a')
    for x in (6, 10, 14):
        cv.ellipse(x, 10, 4.5, 5, o)
    cv.shade_ball(10, 10, 9, 5.5, 0.8)
    cv.rect(9, 2, 10, 5, hexc('5a7a30'))
    cv.vline(7, 6, 14, W(o, -2)); cv.vline(13, 6, 14, W(o, -2))
    cv.outline(0.5)
    return cv


def jack_o_lantern():
    cv = pumpkin()
    c = hexc('3a2010')
    cv.poly([(6, 8), (8, 8), (7, 6)], c)
    cv.poly([(12, 8), (14, 8), (13, 6)], c)
    cv.hline(6, 14, 11, c)
    cv.px(8, 12, c); cv.px(11, 12, c)
    return cv


def xmas_tree():
    cv = Canvas(T, 48)
    g = hexc('2e7a44')
    for i, (y, w) in enumerate(((6, 6), (14, 10), (22, 13), (30, 15))):
        cv.poly([(16 - w, y + 10), (16 + w, y + 10), (16, y - 2)], W(g, i % 2))
    cv.rect(14, 40, 17, 45, hexc('7a4a30'))
    cv.shade_ball(16, 24, 15, 20, 0.6)
    cv.poly([(16, 0), (18, 4), (14, 4)], hexc('f0d040'))
    rnd = random.Random(4)
    for _ in range(14):
        x, y = rnd.randint(5, 26), rnd.randint(8, 38)
        if cv.get(x, y) is not None:
            cv.px(x, y, hexc(rnd.choice(['e04040', 'f0d040', '40a0e0', 'f8f8f8'])))
    cv.outline(0.5)
    return cv


def gift_box():
    cv = Canvas(14, 12)
    cv.rect(1, 3, 12, 11, hexc('d84848'))
    cv.vline(6, 3, 11, hexc('f0d040'))
    cv.vline(7, 3, 11, hexc('f0d040'))
    cv.rect(0, 2, 13, 4, hexc('e86060'))
    cv.px(5, 1, hexc('f0d040')); cv.px(8, 1, hexc('f0d040'))
    cv.outline(0.5)
    return cv


def bunting(colors):
    cv = Canvas(T, 12)
    cv.line(0, 1, 31, 1, hexc('8a7a6a'))
    for i in range(4):
        c = hexc(colors[i % len(colors)])
        x = i * 8
        cv.poly([(x + 1, 2), (x + 7, 2), (x + 4, 10)], c)
    return cv


def hearts():
    cv = Canvas(T, 12)
    cv.line(0, 1, 31, 1, hexc('c89aa8'))
    for i, c in enumerate(('e05070', 'f0a0b8', 'e05070', 'f0a0b8')):
        x = i * 8 + 4
        cv.ellipse(x - 1.5, 5, 1.8, 1.8, hexc(c))
        cv.ellipse(x + 1.5, 5, 1.8, 1.8, hexc(c))
        cv.poly([(x - 3, 5.5), (x + 3, 5.5), (x, 9)], hexc(c))
    return cv


def balloons():
    cv = Canvas(20, 32)
    for (x, y, c) in ((6, 7, 'e04060'), (13, 5, 'f0d040'), (10, 12, '40a0e0')):
        cv.line(x, y + 5, 10, 30, hexc('8a8a94'))
        cv.ellipse(x, y, 4, 5, hexc(c))
        cv.px(x - 2, y - 2, WHITE)
    cv.outline(0.5)
    return cv


def wreath():
    cv = Canvas(20, 20)
    for a in range(0, 360, 20):
        t = math.radians(a)
        c = hexc(['d07030', 'e0a030', 'a05a20'][a // 20 % 3])
        cv.ellipse(10 + 6 * math.cos(t), 10 + 6 * math.sin(t), 2.4, 2.4, c)
    cv.rect(8, 15, 11, 18, hexc('c84848'))
    cv.outline(0.5)
    return cv


def football():
    cv = Canvas(16, 12)
    cv.ellipse(8, 6, 7, 4.5, hexc('8a4a2a'))
    cv.hline(5, 11, 6, WHITE)
    for x in (6, 8, 10):
        cv.px(x, 5, WHITE); cv.px(x, 7, WHITE)
    cv.shade_ball(8, 6, 7, 4.5, 0.6)
    cv.outline(0.5)
    return cv


# ---------- gifts from regulars ----------

GIFTS = ['postcard', 'sticker', 'craft', 'photo']


def gift_icon(kind):
    cv = Canvas(16, 16)
    if kind == 'postcard':
        cv.rect(1, 3, 14, 12, hexc('f4ecd8'))
        cv.rect(10, 4, 13, 7, hexc('e06a5a'))
        for y in (8, 10):
            cv.hline(3, 9, y, hexc('a8a090'))
    elif kind == 'sticker':
        cv.ellipse(8, 8, 6.5, 6.5, hexc('f0d040'))
        cv.ellipse(8, 8, 5, 5, hexc('f8e070'))
        cv.px(6, 7, DARK); cv.px(10, 7, DARK)
        cv.hline(6, 10, 10, DARK)
    elif kind == 'craft':
        cv.rrect(2, 5, 13, 14, hexc('a87ad0'), 2)
        cv.rect(7, 5, 8, 14, hexc('f0a0c0'))
        cv.ellipse(5, 4, 2.5, 2, hexc('f0a0c0'))
        cv.ellipse(10, 4, 2.5, 2, hexc('f0a0c0'))
    else:
        cv.rect(1, 2, 14, 13, WHITE)
        cv.rect(2, 3, 13, 10, hexc('8ac0e8'))
        cv.poly([(2, 10), (6, 6), (9, 9), (11, 7), (13, 10)], hexc('5aa050'))
        cv.ellipse(11, 5, 1.5, 1.5, hexc('f0d040'))
    cv.outline(0.5)
    return cv


# ---------- spills ----------

def spill(kind):
    cv = Canvas(20, 12)
    if kind == 'puddle':
        c = (150, 200, 235, 170)
        cv.ellipse(10, 6, 9, 4.5, c)
        cv.ellipse(15, 8, 3, 2, c)
        cv.px(6, 4, (240, 250, 255, 220)); cv.px(7, 4, (240, 250, 255, 220))
    else:
        rnd = random.Random(5)
        for _ in range(16):
            x, y = rnd.randint(2, 17), rnd.randint(2, 9)
            cv.px(x, y, hexc(rnd.choice(['c8a060', 'a87a40', 'e8d8a0'])))
            if rnd.random() < 0.4:
                cv.px(x + 1, y, hexc('b08850'))
    return cv


# ---------- cats ----------

CAT_COATS = {
    'orange': ('e89040', 'c86a28', 'f8e0c0', 'tabby'),
    'black': ('3a3440', '2a2430', '4a4450', 'solid'),
    'white': ('f4f2ee', 'd8d6d4', 'ffffff', 'solid'),
    'calico': ('f4f0e8', 'e08a40', '3a3440', 'calico'),
    'gray': ('9aa0ac', '6a7080', 'd0d4dc', 'tabby'),
    'tuxedo': ('2e2a34', '2e2a34', 'f4f2ee', 'tuxedo'),
    'shorthair': ('c8ccd4', '50545f', 'eceef2', 'swirl'),
    'siamese': ('efe4d0', '5a4034', 'f8f0e4', 'points'),
}
CAT_POSES = ['sit', 'walk1', 'walk2', 'sleep', 'groom', 'stretch', 'loaf',
             'beg', 'bat1', 'bat2', 'pounce', 'leap', 'run1', 'run2', 'scratch1', 'scratch2', 'roll1', 'roll2', 'hiss', 'rub', 'sniff', 'peek']

# Hand-placed 24x18 templates, facing right. Tags: B body, D underside, L chest/belly, H head, E ear, e inner ear,
# T tail, P near paw, Q far paw, O eye, C closed eye, N nose, M muzzle, K open mouth.
_SIDE = [
    '........................',
    '........................',
    '................E...E...',
    '...............EeE.EeE..',
    '..TT...........HHHHHHH..',
    '.TT...........HHHHHHHHH.',
    '.T............HHHHHOHHH.',
    '.T............HHHHHHMMN.',
    '.TT.....BBBBBBBHHHHMMMM.',
    '..TTBBBBBBBBBBBBHHHHHH..',
    '...BBBBBBBBBBBBBBLLL....',
    '...BBBBBBBBBBBBBBLLL....',
    '...BBBBBBBBBBBBBBLL.....',
    '....DDDDDDDDDDDDDD......',
]
_LEGS = {
    'walk1': [
        '....PPQQ......QQPP......',
        '...PP..QQ....QQ..PP.....',
        '...PP...QQ..QQ....PP....',
    ],
    'walk2': [
        '.....QQPP.....QQPP......',
        '.....QQPP.....QQPP......',
        '.....QQPP.....QQPP......',
    ],
}
_TEMPLATES = {
    'sit': [
        '........................',
        '.......E.....E..........',
        '......EeE...EeE.........',
        '......EHHHHHHHE.........',
        '.....HHHHHHHHHHH........',
        '.....HHOHHHHHOHH........',
        '.....HHOHHHHHOHH........',
        '.....HHHHMNMHHHH........',
        '......HHMMMMMHH.........',
        '.......BLLLLLB..........',
        '......BBLLLLLBB.........',
        '.....BBBLLLLLBBB........',
        '.....BBBLLLLLBBBB.......',
        '.....BBBLLLLLBBBB..TT...',
        '.....DBBLLLLLBBBD...TT..',
        '.....DDPPPDPPPDDDTTTTT..',
        '.....DDPPPDPPPDDTTTT....',
        '........................',
    ],
    'groom': [
        '........................',
        '.......E.....E..........',
        '......EeE...EeE.........',
        '......EHHHHHHHE.........',
        '.....HHHHHHHHHHH........',
        '.....HHHHHHHHHHH........',
        '.....HHCCHHHCCHH........',
        '.....HHHHMNMHHHH........',
        '......HHMMPPMHH.........',
        '.......BLLPPLB..........',
        '......BBLLPLLBB.........',
        '.....BBBLLLLLBBB........',
        '.....BBBLLLLLBBBB.......',
        '.....BBBLLLLLBBBB..TT...',
        '.....DBBLLLLLBBBD...TT..',
        '.....DDPPPDDDDDDDTTTTT..',
        '.....DDPPPDDDDDDTTTT....',
        '........................',
    ],
    'loaf': [
        '........................',
        '........................',
        '........................',
        '................E...E...',
        '...............EeE.EeE..',
        '...............HHHHHHH..',
        '..............HHHHHHHHH.',
        '..............HHOHHHOHH.',
        '..............HHHHMNMHH.',
        '.......BBBBBBBHHHMMMMH..',
        '.....BBBBBBBBBBBHHHHH...',
        '....BBBBBBBBBBBBBLLLL...',
        '...BBBBBBBBBBBBBBLLLL...',
        '...BBBBBBBBBBBBBBBLLL...',
        '..TBBBBBBBBBBBBBBBBL....',
        '..TDDDDDDDDDDDDDDPPPP...',
        '...TTTTTTTTTTT..........',
        '........................',
    ],
    'sleep': [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '........BBBBB...........',
        '......BBBBBBBBB.........',
        '.....BBBBBBBBBBE....E...',
        '....BBBBBBBBBBEeE..EeE..',
        '....BBBBBBBBBBHHHHHHHH..',
        '...BBBBBBBBBBHHHHHHHHHH.',
        '...BBBBBBBBBBHHCCHHCCHH.',
        '..TBBBBBBBBBBHHHHMNMHHH.',
        '..TBBBBBBBBBBBHHMMMMMH..',
        '..TTDDDDDDDDPPPPPHHHH...',
    ],
    'stretch': [
        '',
        '',
        '.TT.....................',
        '..TT....................',
        '...TT...................',
        '....TBBBB...............',
        '...BBBBBBBB.............',
        '...BBBBBBBBBBB..........',
        '...BBBBBBBBBBBBB..E..E..',
        '...DBBBBBBBBBBBBBEeEEeE..',
        '...DDBBBBBBBBBBBBHHHHHH.',
        '...QQDDDDDBBBBBHHHHHHHH.',
        '...QQ.....DDDDHHHHHOHH..',
        '...QQ..........HHHHMMMN.',
        '...PP..........LLHMMMM..',
        '...PP.......QQQQQQQQQ...',
        '..PPP......PPPPPPPPPPP..',
    ],
}


_TEMPLATES.update({
    # sitting up on its haunches, front paws held up at the chest
    'beg': [
        '........................',
        '..............E...E.....',
        '.............EeE.EeE....',
        '.............HHHHHHH....',
        '............HHHHHHHHH...',
        '............HHHHHOHHH...',
        '............HHHHHHMMN...',
        '.............HHHMMMMM...',
        '..............BLLLPP....',
        '.............BBLLLPP....',
        '............BBBLLL......',
        '............BBBLLL......',
        '...........BBBBLLL......',
        '...........BBBBBLL......',
        '..TT.......BBBBBBL......',
        '...TTTTTTTTDDBBBB.......',
        '...........DQQPPP.......',
    ],
    # up on the hind legs, one paw stretched high
    'bat1': [
        '.....................PP.',
        '..............E...E.PP..',
        '.............EeE.EeEP...',
        '.............HHHHHHHP...',
        '............HHHHHHHHP...',
        '............HHHHHOHHH...',
        '............HHHHHHMMN...',
        '.............HHHMMMM....',
        '..............BLLLLQ....',
        '.............BBLLLLQ....',
        '............BBBLLL......',
        '...........BBBBLLL......',
        '...........BBBBBLL......',
        '..TT.......BBBBBBL......',
        '...TT......BBBBBB.......',
        '....TTTTTTTDDBBBB.......',
        '...........DQQPPP.......',
    ],
    # the same, swiping forward at chest height
    'bat2': [
        '........................',
        '..............E...E.....',
        '.............EeE.EeE....',
        '.............HHHHHHH....',
        '............HHHHHHHHH...',
        '............HHHHHOHHH...',
        '............HHHHHHMMN...',
        '.............HHHMMMM....',
        '..............BLLLLPPPP.',
        '.............BBLLLL..PP.',
        '............BBBLLLQ.....',
        '...........BBBBLLLQ.....',
        '...........BBBBBLL......',
        '..TT.......BBBBBBL......',
        '...TT......BBBBBB.......',
        '....TTTTTTTDDBBBB.......',
        '...........DQQPPP.......',
    ],
    # rear up, chest down, tail twitching: about to spring
    'pounce': [
        '........................',
        '........................',
        '....T...................',
        '....T...................',
        '....TT..................',
        '.....TBB................',
        '.....BBBBBB.............',
        '.....BBBBBBBBB..........',
        '.....DBBBBBBBBBB..E...E.',
        '.....DDBBBBBBBBBBEeE.EeE',
        '.....QQ.DDDDBBBBHHHHHHH.',
        '.....PP.....DDBHHHHHHHHH',
        '.....PP........HHHHHOHHH',
        '...............HHHHHMMMN',
        '..............QQHHHMMMM.',
        '.............QQPPPPP....',
    ],
    # stretched out in mid-air
    'leap': [
        '........................',
        '........................',
        '........................',
        '..................E..E..',
        '.................EeEEeE.',
        '.................HHHHHH.',
        '................HHHHHHHH',
        'TT......BBBBBBBBHHHHOHHH',
        '.TTTBBBBBBBBBBBBBHHHMMMN',
        '...BBBBBBBBBBBBBBLLMMMM.',
        '...DDDDDDDDDDDDDDLL.PPPP',
        'QQQ..............QQ..PP.',
        'PP......................',
    ],
    # galloping: legs out, then gathered under
    'run1': [
        '',
        '',
        '',
        '',
        '................E...E...',
        '...............EeE.EeE..',
        '...............HHHHHHH..',
        '.TT...........HHHHHHHHH.',
        '..TT..BBBBBBBBHHHHHOHHH.',
        '...TTBBBBBBBBBBHHHHHMMMN',
        '.....BBBBBBBBBBBBLLMMMM.',
        '.....DDDDDDDDDDDDLL.....',
        '...QQ............QQ.PP..',
        '..PP...............PP...',
        '.PP.....................',
    ],
    'run2': [
        '',
        '',
        '',
        '',
        '................E...E...',
        '...............EeE.EeE..',
        '...............HHHHHHH..',
        '..............HHHHHHHHH.',
        '.TT....BBBBBBBHHHHHOHHH.',
        '..TTTBBBBBBBBBBHHHHHMMMN',
        '....BBBBBBBBBBBBBLMMMM..',
        '.....DDDDDDDDDDDLL......',
        '........QQPP.QQPP.......',
        '.........PP...PP........',
    ],
    # standing tall against a post, paws working up and down
    'scratch1': [
        '.....................PP.',
        '................E..E.PP.',
        '...............EeEEeEQQ.',
        '...............HHHHHHQQ.',
        '..............HHHHHHHQ..',
        '..............HHHHHOHQ..',
        '..............HHHHHMMN..',
        '...............HHHMMM...',
        '...............BBLLL....',
        '..............BBBLLL....',
        '..............BBBBLL....',
        '.............BBBBBLL....',
        '.............BBBBBB.....',
        '.............BBBBBB.....',
        '..TTT........BBBBBB.....',
        '....TTTTTTTTTDDBBBD.....',
        '.............DQQPPP.....',
    ],
    'scratch2': [
        '.....................QQ.',
        '................E..E.QQ.',
        '...............EeEEeEPP.',
        '...............HHHHHHPP.',
        '..............HHHHHHHP..',
        '..............HHHHHCHP..',
        '..............HHHHHMMN..',
        '...............HHHMMM...',
        '...............BBLLL....',
        '..............BBBLLL....',
        '..............BBBBLL....',
        '.............BBBBBLL....',
        '.............BBBBBB.....',
        '.............BBBBBB.....',
        '..TTT........BBBBBB.....',
        '....TTTTTTTTTDDBBBD.....',
        '.............DQQPPP.....',
    ],
    # flat on its back, paws in the air
    'roll1': [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '...P....Q...............',
        '...PP..QQ...P....Q......',
        '....PP.QQ..PP...QQ......',
        '....LLLLLLLLLLLLLLL.E..E',
        '...DLLLLLLLLLLLLLLLBEeEe',
        '..TBBBBBBBBBBBBBBBBHHHHH',
        '.TTBBBBBBBBBBBBBBBHHCHHH',
        'TT..............HHHMMMNH',
    ],
    'roll2': [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '.....P.Q................',
        '....PP.QQ.....P..Q......',
        '...PP...QQ...PP..QQ.....',
        '....LLLLLLLLLLLLLLL.E..E',
        '...DLLLLLLLLLLLLLLLBEeEe',
        '..TBBBBBBBBBBBBBBBBHHHHH',
        'TTTBBBBBBBBBBBBBBBHHCHHH',
        '................HHHMMMNH',
    ],
    # back arched high, tail up, mouth open
    'hiss': [
        '',
        '.......BBBBBB...........',
        '.....BBBBBBBBBB.........',
        '...TBBBBBBBBBBBB........',
        '..TTBBBBBBBBBBBBB..E..E.',
        '..TTDBBBBBBBBBBBBBEeEEeE',
        '.TT.DDBBBBBBBBBBBHHHHHHH',
        '.TT..QDDDDDDDDBBHHHHHOHH',
        '.T...Q.......DDHHHHHMKKN',
        '.....Q........LHHHMMKK..',
        '.....P........LL.PP.....',
        '.....P........QQ.PP.....',
        '....PP.......QQ..PP.....',
        '....PP.......PP..PP.....',
    ],
    # tail straight up, eyes shut, leaning in
    'rub': [
        '..T.....................',
        '..TT....................',
        '...T............E...E...',
        '...T...........EeE.EeE..',
        '...T...........HHHHHHH..',
        '...TT.........HHHHHHHHH.',
        '....T.........HHHHHCHHH.',
        '....T.........HHHHHHMMN.',
        '....T...BBBBBBBHHHHMMMM.',
        '....TBBBBBBBBBBBHHHHHH..',
        '...BBBBBBBBBBBBBBLLL....',
        '...BBBBBBBBBBBBBBLLL....',
        '...BBBBBBBBBBBBBBLL.....',
        '....DDDDDDDDDDDDDD......',
        '.....QQPP.....QQPP......',
        '.....QQPP.....QQPP......',
        '.....QQPP.....QQPP......',
    ],
    # head down at something on the floor
    'sniff': [
        '',
        '',
        '',
        '',
        '',
        '',
        '....TT..................',
        '...TT...BBBBBBBB........',
        '...T..BBBBBBBBBBBB......',
        '......BBBBBBBBBBBBBE..E.',
        '......BBBBBBBBBBBBEeEEeE',
        '.......DDDDDDDDDBBHHHHHH',
        '.......QQPP...QQHHHHHOHH',
        '.......QQPP...QQHHHHHMMN',
        '.......QQPP...QQPPHHMMM.',
        '.......QQPP...QQPP......',
    ],
    # only the head and paws showing over an edge
    'peek': [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '........E.....E.........',
        '.......EeE...EeE........',
        '.......EHHHHHHHE........',
        '......HHHHHHHHHHH.......',
        '......HHOHHHHHOHH.......',
        '......HHHHMNMHHHH.......',
        '......PPHHMMMHHPP.......',
        '......PP.........PP.....',
    ],
})


def _cat_template(pose):
    rows = _TEMPLATES.get(pose) or (_SIDE + _LEGS[pose])
    return [r.ljust(24, '.') for r in rows] + ['.' * 24] * (18 - len(rows))


def cat_sprite(coat, pose):
    base, stripe, belly, pattern = CAT_COATS[coat]
    base, stripe, belly = hexc(base), hexc(stripe), hexc(belly)
    rows = _cat_template(pose)
    cells = {(x, y): ch for y, r in enumerate(rows) for x, ch in enumerate(r) if ch != '.'}
    # a peeking cat shows only its head, so fall back to that
    body = [(x, y) for (x, y), ch in cells.items() if ch in 'BD'] or [(x, y) for (x, y), ch in cells.items() if ch in 'HM']
    cx = sum(x for x, _ in body) / len(body)
    cy = sum(y for _, y in body) / len(body)
    heads = [(x, y) for (x, y), ch in cells.items() if ch in 'HM']
    hx = sum(x for x, _ in heads) / len(heads)
    hy = min(y for _, y in heads)
    furred = 'BDHTE'
    eye = {'black': '8ac050', 'tuxedo': '8ac050', 'white': '5aa0d0', 'siamese': '4a80d0'}.get(coat, '2a2030')
    cv = Canvas(24, 18)
    for (x, y), ch in cells.items():
        c = base
        if ch == 'D':
            c = tone(base, -1) if pattern != 'tuxedo' else base
        elif ch in 'LM':
            c = base if pattern == 'calico' else belly if pattern != 'solid' or coat == 'white' else tone(base, 1)
        elif ch == 'e':
            c = hexc('e89a9a') if coat != 'black' else hexc('7a5a6a')
        elif ch == 'N':
            c = hexc('e07a80') if coat not in ('black', 'tuxedo') else hexc('6a4a5a')
        elif ch == 'O':
            c = hexc(eye)
        elif ch == 'C':
            c = tone(base, -3) if coat not in ('black', 'tuxedo') else tone(base, 3)
        elif ch == 'Q':
            c = tone(base, -1)
        elif ch == 'K':
            c = hexc('8a3a4a')
        if ch in furred:
            if pattern == 'tabby':
                if ch in 'BD' and x % 3 == 0 and y < cy + 2:
                    c = stripe
                elif ch == 'H' and y <= hy + 1 and x % 2 == 1:
                    c = stripe
                elif ch == 'T' and (x + y) % 3 == 0:
                    c = stripe
            elif pattern == 'swirl':
                wave = x + round(1.4 * math.sin(y * 1.1 + x * 0.3))
                if ch in 'BD' and wave % 4 == 0 and y < cy + 2:
                    c = stripe
                elif ch == 'B' and (x, y - 1) not in cells and x % 2 == 0:
                    c = stripe
                elif ch == 'H' and y <= hy + 1 and abs(x - hx) <= 2.5 and x % 2 == 0:
                    c = stripe
                elif ch == 'T' and x % 3 == 0:
                    c = stripe
            elif pattern == 'calico':
                n = (x * 7 + y * 13 + (x // 3) * 5) % 11
                patch = (x // 4 + (y // 3) * 2) % 5
                if patch == 1 or (ch in 'HE' and x < hx):
                    c = stripe
                elif patch == 3 and n > 3:
                    c = belly
            elif pattern == 'points':
                if ch in 'TE' or (ch == 'H' and y > hy + 1 and abs(x - hx) < 3):
                    c = stripe
                elif ch in 'BD' and y < cy - 1:
                    c = mix(base, stripe, 0.25)
        if pattern == 'points' and ch in 'PQM':
            c = stripe if ch != 'M' else mix(base, stripe, 0.6)
        if pattern == 'tuxedo' and ch in 'PLM':
            c = belly
        if pattern == 'tuxedo' and ch == 'Q':
            c = tone(belly, -1)
        if ch in 'BHT' and (x, y - 1) not in cells and c == base:
            c = tone(base, 1)
        if ch in 'BD' and any(cells.get((x + dx, y + dy), '') in ('H', 'M') for dx, dy in ((1, 0), (-1, 0), (0, -1))):
            c = tone(c, -1)
        cv.px(x, y, c)
    cv.outline(0.5)
    return cv


# ---------- cat accessories (overlays drawn on the cat sprite) ----------

CAT_ACCS = ['bell', 'bandana', 'bow', 'scarf', 'crown']


def cat_acc(acc, pose):
    rows = _cat_template(pose)
    cells = {(x, y): ch for y, r in enumerate(rows) for x, ch in enumerate(r) if ch != '.'}
    head = [(x, y) for (x, y), ch in cells.items() if ch in 'HM']
    top = min(y for _, y in head)
    bottom = max(y for _, y in head)
    neck = sorted(x for x, y in head if y == bottom)
    cx = (neck[0] + neck[-1]) / 2
    xs = sorted(x for x, y in head if y == top)
    cv = Canvas(24, 18)
    if acc in ('bell', 'bandana', 'scarf'):
        band = {'bell': hexc('d84848'), 'bandana': hexc('4a8ac0'), 'scarf': hexc('6aa060')}[acc]
        for x in neck:
            cv.px(x, bottom, band)
            if acc == 'scarf':
                cv.px(x, bottom + 1, W(band, -1)) if (x, bottom + 1) in cells else None
        if acc == 'bell':
            cv.px(round(cx), bottom + 1, hexc('f0c040'))
        elif acc == 'bandana':
            c = round(cx)
            cv.hline(c - 1, c + 1, bottom + 1, band)
            cv.px(c, bottom + 2, band)
            cv.px(c - 1, bottom, WHITE)
        else:
            cv.vline(neck[0], bottom + 1, bottom + 3, band)
            cv.px(neck[0], bottom + 3, W(band, 2))
    elif acc == 'bow':
        x = xs[0] + 1
        pink = hexc('f088b0')
        cv.px(x - 1, top - 1, pink); cv.px(x - 1, top, pink)
        cv.px(x, top, hexc('d85890'))
        cv.px(x + 1, top - 1, pink); cv.px(x + 1, top, pink)
    elif acc == 'crown':
        g = hexc('f0c040')
        c = round((xs[0] + xs[-1]) / 2)
        cv.hline(c - 2, c + 2, top - 1, g)
        for dx in (-2, 0, 2):
            cv.px(c + dx, top - 2, g)
        cv.px(c, top - 1, hexc('e84848'))
    if acc == 'crown':
        cv.outline(0.4)
    return cv
