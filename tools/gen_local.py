"""Art for local holidays and regional decorations (Chinese, Japanese, Korean)."""
import math
from pix import Canvas, hexc, tone, mix

T = 32
WHITE = hexc('f4f2ee')
DARK = hexc('2a2430')
RED = hexc('d8302a')
GOLD = hexc('f0c040')


def W(c, k):
    return tone(c, k)


# ---------- holiday decorations ----------

def lanterns():
    """A string of round red paper lanterns with gold caps and tassels, tiles across the wall."""
    cv = Canvas(T, 16)
    cv.line(0, 1, 31, 1, hexc('8a6a4a'))
    for x in (8, 24):
        cv.vline(x, 2, 3, hexc('8a6a4a'))
        cv.rect(x - 2, 3, x + 1, 4, GOLD)
        cv.ellipse(x - 0.5, 8, 4.5, 3.6, RED)
        cv.shade_ball(x - 0.5, 8, 4.5, 3.6, 0.6, dither=False)
        for dx in (-2, 1):
            cv.vline(x + dx, 6, 10, W(RED, -2))
        cv.rect(x - 2, 11, x + 1, 12, GOLD)
        cv.vline(x - 1, 13, 15, GOLD)
        cv.vline(x, 13, 15, W(GOLD, -2))
    return cv


def chochin():
    """White paper lanterns with red bands, for Obon."""
    cv = Canvas(T, 16)
    cv.line(0, 1, 31, 1, hexc('6a5a4a'))
    for x in (8, 24):
        cv.vline(x, 2, 2, hexc('6a5a4a'))
        cv.rect(x - 2, 3, x + 1, 3, DARK)
        cv.rrect(x - 4, 4, x + 3, 12, hexc('f4ecd8'), 2)
        for y in (6, 8, 10):
            cv.hline(x - 4, x + 3, y, hexc('d8ccb0'))
        cv.hline(x - 3, x + 2, 8, RED)
        cv.rect(x - 2, 13, x + 1, 13, DARK)
    return cv


def fu():
    """Upside-down good-luck diamond: red paper with a gold mark."""
    cv = Canvas(16, 16)
    cv.poly([(8, 0), (15, 7), (8, 14), (1, 7)], RED)
    cv.poly([(8, 2), (13, 7), (8, 12), (3, 7)], W(RED, 1))
    g = GOLD
    cv.hline(5, 11, 5, g); cv.hline(6, 10, 8, g); cv.hline(5, 11, 10, g)
    cv.vline(6, 5, 10, g); cv.vline(10, 5, 10, g); cv.vline(8, 4, 11, g)
    cv.outline(0.5)
    return cv


def kadomatsu():
    """New Year pine-and-bamboo arrangement by the door."""
    cv = Canvas(16, 30)
    bamboo = hexc('6aa84a')
    for x, top in ((5, 4), (8, 1), (11, 6)):
        cv.rect(x - 1, top, x + 1, 22, bamboo)
        cv.poly([(x - 1, top), (x + 1, top), (x + 1, top + 3)], W(bamboo, 2))
        cv.hline(x - 1, x + 1, 14, W(bamboo, -2))
    for (x, y) in ((2, 15), (13, 14), (4, 12), (12, 18), (7, 16)):
        cv.ellipse(x, y, 2.6, 1.8, hexc('2e6a3a'))
    cv.rect(2, 21, 13, 28, hexc('c89a5a'))
    for y in (22, 25, 27):
        cv.hline(2, 13, y, hexc('8a6a3a'))
    cv.hline(2, 13, 24, RED)
    cv.outline(0.5)
    return cv


def koinobori():
    """Carp streamers on a pole for Children's Day."""
    cv = Canvas(30, 40)
    cv.vline(3, 1, 39, hexc('8a7a6a'))
    cv.ellipse(3, 1, 1.5, 1.5, GOLD)
    for i, (y, c) in enumerate(((5, '2a2a3a'), (13, 'd84848'), (21, '3a7ad8'))):
        body = hexc(c)
        L = 24 - i * 3
        cv.poly([(4, y), (4 + L, y + 2), (4 + L - 3, y + 4), (4 + L, y + 6), (4, y + 6)], body)
        for x in range(8, 4 + L - 3, 3):
            cv.px(x, y + 3, W(body, 3))
        cv.ellipse(7, y + 3, 1.5, 1.5, WHITE)
        cv.px(7, y + 3, DARK)
    cv.outline(0.5)
    return cv


def rabbit_lantern():
    """A white rabbit lantern on a stick, for the Mid-Autumn festival."""
    cv = Canvas(20, 24)
    cv.line(17, 1, 11, 9, hexc('8a6a4a'))
    cv.ellipse(9, 15, 7, 5, hexc('f8f4f0'))
    cv.ellipse(14, 11, 3, 3, hexc('f8f4f0'))
    cv.poly([(13, 8), (15, 2), (16, 8)], hexc('f8f4f0'))
    cv.px(15, 4, hexc('f0a0b0'))
    cv.px(15, 11, RED)
    cv.hline(4, 13, 15, hexc('f0a0b0'))
    cv.ellipse(4, 20, 2, 2, hexc('d8d0c8'))
    cv.ellipse(13, 20, 2, 2, hexc('d8d0c8'))
    cv.shade_ball(9, 14, 8, 6, 0.4, dither=False)
    cv.outline(0.5)
    return cv


def bokjori():
    """A pair of lucky rice strainers tied with red thread, hung for the lunar New Year."""
    cv = Canvas(16, 22)
    straw = hexc('d8b070')
    cv.line(8, 0, 8, 4, RED)
    for x in (5, 11):
        cv.poly([(x - 4, 6), (x + 4, 6), (x + 1, 20), (x - 1, 20)], straw)
        for y in range(8, 20, 2):
            cv.hline(x - 3 + (y - 6) // 5, x + 3 - (y - 6) // 5, y, W(straw, -2))
        cv.hline(x - 4, x + 4, 6, W(straw, -3))
    cv.hline(3, 13, 5, RED)
    cv.outline(0.5)
    return cv


# ---------- regional decorations (floor items, one tile) ----------

def maneki(k=0):
    """Beckoning cat: k is the raised paw's frame (0 up, 1 halfway, 2 down)."""
    cv = Canvas(T, T)
    body = hexc('f8f4ec')
    cv.rect(9, 26, 22, 29, RED)
    cv.ellipse(15.5, 21, 7, 6, body)
    cv.ellipse(15.5, 13, 6.5, 5.5, body)
    cv.poly([(10, 10), (11, 5), (14, 9)], body)
    cv.poly([(17, 9), (20, 5), (21, 10)], body)
    cv.px(11, 7, hexc('f0a0b0')); cv.px(20, 7, hexc('f0a0b0'))
    cv.px(13, 13, DARK); cv.px(18, 13, DARK)
    cv.px(15, 15, hexc('f0a0b0')); cv.px(16, 15, hexc('f0a0b0'))
    cv.hline(10, 21, 17, RED)
    cv.ellipse(15.5, 19, 1.8, 1.8, GOLD)
    cv.ellipse(15.5, 23, 3.5, 2.5, GOLD)
    cv.hline(13, 18, 23, W(GOLD, -2))
    # the beckoning paw: from raised by the ear to down by the cheek
    py = (6, 9, 12)[k]
    cv.rect(21, py, 24, py + 6, body)
    cv.ellipse(22.5, py, 2, 2, body)
    cv.px(22, py - 1, hexc('f0a0b0'))
    cv.ellipse(10, 22, 2.5, 3, body)
    cv.shade_ball(15.5, 17, 9, 12, 0.5, dither=False)
    cv.outline(0.5)
    return cv


def lantern_stand():
    """A big red lantern on a wooden stand."""
    cv = Canvas(T, 40)
    wood = hexc('7a4a2a')
    cv.vline(15, 4, 37, wood); cv.vline(16, 4, 37, W(wood, 1))
    cv.hline(15, 24, 4, wood)
    cv.vline(23, 5, 7, wood)
    cv.ellipse(23, 15, 7, 6.5, RED)
    cv.shade_ball(23, 15, 7, 6.5, 0.6, dither=False)
    for dx in (-4, 0, 4):
        cv.vline(23 + dx, 10, 20, W(RED, -2))
    cv.rect(20, 8, 26, 9, GOLD)
    cv.rect(20, 21, 26, 22, GOLD)
    cv.vline(23, 23, 27, GOLD)
    cv.rect(10, 37, 21, 39, W(wood, -1))
    cv.outline(0.5)
    return cv


def lucky_bamboo():
    """Lucky bamboo stalks in a glass vase."""
    cv = Canvas(T, T)
    g = hexc('6ab04a')
    for x, top in ((12, 6), (15, 3), (18, 7), (21, 10)):
        cv.vline(x, top, 26, g)
        for y in range(top + 5, 26, 6):
            cv.px(x, y, W(g, -3))
        cv.poly([(x, top + 1), (x - 4, top - 1), (x - 1, top + 3)], hexc('4a9a3a'))
        cv.poly([(x, top + 3), (x + 4, top + 1), (x + 1, top + 5)], hexc('4a9a3a'))
    cv.rrect(10, 20, 23, 29, (200, 230, 240, 160), 2)
    cv.hline(11, 22, 25, hexc('8ac0d8'))
    cv.hline(13, 20, 22, RED)
    cv.outline(0.5)
    return cv


def daruma():
    """A red daruma doll on a little cushion."""
    cv = Canvas(T, T)
    cv.rect(8, 26, 23, 29, hexc('6a3a8a'))
    cv.ellipse(15.5, 17, 8, 9.5, RED)
    cv.shade_ball(15.5, 17, 8, 9.5, 0.7, dither=False)
    cv.ellipse(15.5, 14, 5, 4.2, hexc('f8f0e4'))
    cv.ellipse(13.5, 14, 1.4, 1.4, DARK)
    cv.ellipse(17.5, 14, 1.4, 1.4, hexc('f8f0e4'))
    cv.hline(16, 19, 12, DARK)
    cv.hline(12, 15, 12, DARK)
    cv.hline(14, 17, 16, DARK)
    cv.hline(11, 20, 21, GOLD)
    cv.hline(12, 19, 23, GOLD)
    cv.outline(0.5)
    return cv


def bonsai():
    """A small pine bonsai in a shallow tray."""
    cv = Canvas(T, T)
    cv.rect(6, 25, 25, 28, hexc('4a5a6a'))
    cv.hline(5, 26, 24, hexc('6a7a8a'))
    trunk = hexc('7a5a3a')
    cv.line(15, 24, 13, 18, trunk, 2)
    cv.line(13, 18, 18, 13, trunk, 2)
    cv.line(16, 15, 9, 12, trunk, 1)
    for (x, y, rx) in ((9, 11, 5), (19, 11, 6), (14, 7, 4.5)):
        cv.ellipse(x, y, rx, 2.6, hexc('3a7a4a'))
        cv.hline(int(x - rx + 1), int(x + rx - 1), y - 2, hexc('5a9a5a'))
    cv.outline(0.5)
    return cv


def onggi():
    """Earthenware kimchi jars with lids, the big one in front."""
    cv = Canvas(T, T)
    clay = hexc('6a3a24')
    for (cx, cy, rx, ry) in ((22, 17, 6, 6.5), (13, 19, 9, 9)):
        cv.ellipse(cx, cy, rx, ry, clay)
        cv.shade_ball(cx, cy, rx, ry, 0.7, dither=False)
        cv.ellipse(cx, cy - ry + 1, rx * 0.65, 1.8, W(clay, -2))
        cv.ellipse(cx, cy - ry, rx * 0.5, 1.2, W(clay, 1))
        cv.hline(int(cx - rx + 2), int(cx + rx - 2), int(cy), W(clay, 2))
    cv.outline(0.5)
    return cv


def hanji_lamp():
    """A standing lamp of mulberry paper on a wooden frame, softly lit."""
    cv = Canvas(T, 40)
    wood = hexc('5a3a24')
    paper = hexc('f4e4c0')
    cv.rect(10, 8, 21, 33, paper)
    for y in range(9, 33):
        for x in range(11, 21):
            if (x * 7 + y * 3) % 13 == 0:
                cv.px(x, y, hexc('ead4a8'))
    cv.vline(10, 6, 37, wood); cv.vline(21, 6, 37, wood)
    cv.hline(10, 21, 7, wood); cv.hline(10, 21, 20, wood); cv.hline(10, 21, 34, wood)
    cv.ellipse(15.5, 18, 3, 4, hexc('f8d888'))
    cv.outline(0.5)
    return cv


# ---------- Chinese breakfast dim sum, standing in for the oden counter ----------
# Same ten slots as oden, in order: egg, daikon, konjac, chikuwa, fishball, tofu, kelp, tendon, mochi, sausage.
DIMSUM = ['tea_egg', 'mantou', 'huajuan', 'youtiao', 'shaomai', 'doushabao', 'chunjuan', 'hargow', 'xiaolongbao', 'roubao']
BUN = hexc('f6f0e2')
BAMBOO = hexc('d8b070')


def _bun_pleats(cv, cx, top, r, c):
    for i in range(-2, 3):
        cv.line(cx + i * r * 0.35, top + 1, cx + i * r * 0.15, top + r * 0.55, W(c, -2))
    cv.ellipse(cx, top + 1, 1.5, 1, W(c, -2))


def dimsum_item(kind):
    cv = Canvas(28, 28)
    if kind == 'tea_egg':
        shell = hexc('8a5a34')
        cv.ellipse(14, 15, 8, 10, shell)
        cv.shade_ball(14, 15, 8, 10, 0.7)
        for (x0, y0, x1, y1) in ((8, 10, 13, 14), (13, 14, 18, 11), (10, 19, 15, 16), (15, 16, 20, 20), (12, 7, 14, 10)):
            cv.line(x0, y0, x1, y1, hexc('3a2414'))
        cv.px(11, 9, hexc('c8925a'))
    elif kind in ('mantou', 'doushabao'):
        cv.ellipse(14, 17, 10, 8, BUN)
        cv.shade_ball(14, 16, 10, 8, 0.5, dither=False)
        cv.hline(5, 23, 23, W(BUN, -2))
        if kind == 'doushabao':
            cv.ellipse(14, 12, 1.6, 1.6, hexc('c83a3a'))
    elif kind == 'huajuan':
        for i, x in enumerate((9, 14, 19)):
            cv.ellipse(x, 16 - (i == 1) * 2, 5, 6, BUN)
        cv.shade_ball(14, 15, 10, 7, 0.5, dither=False)
        for x in (11, 17):
            cv.line(x, 10, x - 1, 21, W(BUN, -3))
        for (x, y) in ((8, 14), (15, 12), (20, 17), (12, 19)):
            cv.px(x, y, hexc('5aa04a'))
    elif kind == 'youtiao':
        gold = hexc('d8983a')
        cv.line(4, 21, 23, 6, gold, 4)
        cv.line(6, 23, 25, 8, W(gold, -1), 4)
        cv.line(5, 20, 22, 7, W(gold, 2))
        for k in range(6):
            cv.px(7 + k * 3, 19 - k * 2.4, W(gold, -3))
    elif kind == 'shaomai':
        wrap = hexc('f0e0a0')
        cv.poly([(7, 11), (21, 11), (19, 24), (9, 24)], wrap)
        for x in range(8, 21, 3):
            cv.vline(x, 12, 23, W(wrap, -2))
        cv.ellipse(14, 11, 7, 3, hexc('d89a7a'))
        cv.ellipse(14, 10, 2.2, 1.4, hexc('f08030'))
        cv.shade_cyl(7, 11, 21, 24, 0.5)
    elif kind == 'chunjuan':
        gold = hexc('d89a40')
        for y in (10, 18):
            cv.rrect(4, y, 23, y + 5, gold, 2)
            cv.hline(5, 22, y, W(gold, 2))
            cv.ellipse(23, y + 2.5, 1.6, 2.5, W(gold, -2))
            for x in range(7, 22, 4):
                cv.px(x, y + 2, W(gold, -2))
    elif kind == 'hargow':
        skin = (236, 232, 222, 235)
        cv.ellipse(14, 16, 10, 7, hexc('f0a080'))
        cv.ellipse(14, 16, 10, 7, skin)
        cv.ellipse(14, 17, 5, 3, hexc('f4b8a0'))
        for i in range(-3, 4):
            cv.line(14 + i * 2.5, 9, 14 + i * 2, 13, W(BUN, -2))
        cv.shade_ball(14, 15, 10, 7, 0.4, dither=False)
    elif kind == 'xiaolongbao':
        skin = hexc('f2ecdc')
        cv.ellipse(14, 17, 10, 7, skin)
        cv.poly([(9, 13), (19, 13), (14, 6)], skin)
        for a in range(0, 360, 40):
            t = math.radians(a)
            cv.line(14, 7, 14 + 6 * math.cos(t), 12 + 3 * math.sin(t), W(skin, -2))
        cv.shade_ball(14, 15, 10, 8, 0.4, dither=False)
        cv.hline(5, 23, 23, W(skin, -2))
    elif kind == 'roubao':
        cv.ellipse(14, 16, 11, 9, BUN)
        cv.shade_ball(14, 15, 11, 9, 0.5, dither=False)
        _bun_pleats(cv, 14, 8, 10, BUN)
        cv.hline(4, 24, 24, W(BUN, -2))
    cv.outline(0.5)
    return cv


def steamer_grid():
    """Ten round bamboo steamers on the counter, seen from above; same 240x120 cells as the oden pot."""
    w, h = 240, 120
    cv = Canvas(w, h)
    cv.rrect(0, 0, w - 1, h - 1, hexc('6a4a30'), 7)
    cv.rrect(2, 2, w - 3, h - 3, hexc('7a5638'), 6)
    for r in range(2):
        for c in range(5):
            x0 = 4 + c * 46
            y0 = 4 + r * 56
            cx, cy = x0 + 22.5, y0 + 27
            cv.ellipse(cx, cy, 22, 26, W(BAMBOO, -2))
            cv.ellipse(cx, cy, 20, 24, BAMBOO)
            cv.ellipse(cx, cy, 17.5, 21.5, hexc('f2e8cc'))
            for k in range(-15, 16, 5):
                for j in range(-18, 19, 5):
                    if ((k / 17) ** 2 + (j / 21) ** 2) < 0.8:
                        cv.px(cx + k, cy + j, hexc('ddcfa8'))
            for a in range(0, 360, 15):
                t = math.radians(a)
                cv.px(cx + 21 * math.cos(t), cy + 25 * math.sin(t), W(BAMBOO, -4))
    return cv


def _to_bamboo(src):
    """Recolors the oden takeaway bowl into a bamboo steamer basket, keeping its shading."""
    cv = Canvas(src.w, src.h)
    dark, light = hexc('8a6a3a'), hexc('e8c888')
    for y in range(src.h):
        for x in range(src.w):
            c = src.p[y][x]
            if c is None:
                continue
            lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255
            out = mix(dark, light, min(1, max(0, (lum - 0.25) / 0.7)))
            cv.px(x, y, (out[0], out[1], out[2], c[3]))
    return cv


def steamer_basket_back(src, cy, rx, ry):
    cv = _to_bamboo(src)
    cx = src.w / 2 - 0.5
    cv.ellipse(cx, cy + 4, rx - 6, ry - 6, hexc('f2e8cc'))
    for k in range(-40, 41, 6):
        for j in (-3, 1, 5):
            if (k / (rx - 8)) ** 2 + (j / (ry - 7)) ** 2 < 1:
                cv.px(cx + k, cy + 4 + j, hexc('ddcfa8'))
    return cv


def steamer_basket_front(src):
    cv = _to_bamboo(src)
    for y in range(cv.h):
        if y % 6 == 3:
            for x in range(cv.w):
                if cv.get(x, y) is not None:
                    cv.px(x, y, W(cv.get(x, y), -1))
    return cv


def dimsum_counter(counter_base, upgraded=None):
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('d8d0c0'), front=hexc('8a3a3a'))
    for x0, n in ((6, 3), (24, 2), (42, 3)):
        for k in range(n):
            y = 20 - k * 5
            cv.rect(x0, y - 4, x0 + 15, y, BAMBOO)
            cv.hline(x0, x0 + 15, y - 4, W(BAMBOO, 2))
            cv.hline(x0, x0 + 15, y, W(BAMBOO, -3))
            for x in range(x0 + 2, x0 + 15, 4):
                cv.px(x, y - 2, W(BAMBOO, -2))
        top = 20 - n * 5
        cv.ellipse(x0 + 7.5, top + 1, 8, 2, W(BAMBOO, 1))
        cv.rect(x0 + 6, top - 2, x0 + 9, top, W(BAMBOO, -2))
    cv.rect(4, 25, 59, 30, hexc('f4ece0'))
    for x in range(4, 60, 14):
        cv.vline(x, 25, 31, W(hexc('f4ece0'), -2))
    cv.hline(4, 59, 31, hexc('c8b8a0'))
    cv.rect(22, 35, 41, 48, hexc('f0e0c0'))
    cv.rect(23, 36, 40, 47, hexc('f8ecd4'))
    cv.ellipse(31.5, 42, 5, 4, BUN)
    cv.ellipse(31.5, 39, 1.2, 0.8, W(BUN, -3))
    cv.outline(0.5)
    return cv


def dimsum_steam(k):
    """Steam leaking from under the steamer lids, in four puffs that cycle."""
    cv = Canvas(64, 24)
    for i, x in enumerate((13, 31, 49)):
        ph = (k + i) % 4
        for j in range(3):
            y = 8 - ph * 2 - j * 2
            if 0 <= y:
                a = 170 - ph * 35 - j * 30
                if a > 0:
                    cv.px(x + (j + ph) % 2 - 1, y, (255, 255, 255, a))
                    cv.px(x + (j + ph) % 2, y, (255, 255, 255, a // 2))
    return cv


def ic_bun(cv):
    cv.ellipse(11.5, 11, 8, 6, BUN)
    cv.ellipse(11.5, 10, 6.5, 4.5, W(BUN, 1))
    for i in range(-2, 3):
        cv.line(11.5 + i * 2.4, 6, 11.5 + i, 9, W(BUN, -3))
    cv.hline(4, 19, 16, BAMBOO)
    cv.hline(4, 19, 17, W(BAMBOO, -2))


def with_qr_sign(base):
    """The card counter's sign, showing a scan-to-pay code instead of a card."""
    cv = Canvas(64, base.h + 16)
    sign = Canvas(64, base.h + 16)
    sign.rect(45, 12, 46, 24, hexc('8a8e98'))
    sign.rrect(32, 0, 60, 13, hexc('3a9a5a'), 1)
    sign.rect(34, 2, 58, 11, WHITE)
    code = [
        '111111101', '100000101', '101110100', '101110111', '100000100', '111111101', '000100010', '101011011', '011101110',
    ]
    for y, row in enumerate(code):
        for x, b in enumerate(row):
            if b == '1':
                sign.px(36 + x, 2 + y, DARK)
    sign.rrect(49, 3, 56, 10, hexc('2a2a30'), 1)
    sign.rect(50, 4, 55, 8, hexc('7ae07a'))
    sign.outline(0.5)
    cv.blit(sign, 0, 0)
    cv.blit(base, 0, 16)
    return cv


# ---------- street: local buildings (48x48, front view like tools/gen_street.py) ----------

def _street():
    import gen_street as GS
    return GS


def bld_plaza():
    GS = _street()
    cv = Canvas(48, 48)
    cv.rect(0, 22, 47, 47, hexc('d8ccb8'))
    for y in range(24, 48, 6):
        cv.hline(0, 47, y, hexc('c8bca6'))
    GS.tree(cv, 6, 20, 6)
    GS.tree(cv, 42, 19, 6)
    # a little pavilion and people stretching in a row
    cv.rect(17, 14, 31, 15, RED)
    cv.poly([(14, 14), (34, 14), (24, 8)], hexc('3a6a5a'))
    cv.vline(18, 16, 26, RED); cv.vline(30, 16, 26, RED)
    for i, x in enumerate((10, 17, 24, 31, 38)):
        c = hexc(('e07a7a', '5a9ad0', 'f0c040', '6ab06a', 'b07ad0')[i])
        cv.ellipse(x, 31, 1.5, 1.5, hexc('f0d0b0'))
        cv.rect(x - 1, 33, x + 1, 37, c)
        cv.vline(x - 1, 38, 40, DARK); cv.vline(x + 1, 38, 40, DARK)
        arm = (i % 2) * 2
        cv.line(x - 2, 33, x - 4, 31 - arm, c); cv.line(x + 2, 33, x + 4, 31 - arm, c)
    cv.outline(0.5)
    return cv


def bld_market():
    GS = _street()
    cv = Canvas(48, 48)
    GS.ground(cv, hexc('a8a8b0'))
    cv.rect(2, 12, 45, 40, hexc('c8ccd4'))
    cv.poly([(0, 14), (48, 14), (44, 6), (4, 6)], hexc('5a8a6a'))
    for x in range(4, 45, 8):
        cv.vline(x, 14, 40, hexc('8a8e98'))
    # stalls of greens, fruit and fish
    for x0, cols in ((4, ('5aa04a', '7ac05a')), (19, ('e05a3a', 'f0b040')), (34, ('9ab8d0', 'd8dce4'))):
        cv.rect(x0, 30, x0 + 10, 34, hexc('a87848'))
        for k in range(5):
            cv.ellipse(x0 + 1 + k * 2, 28.5, 1.4, 1.4, hexc(cols[k % 2]))
    cv.rect(10, 16, 37, 21, RED)
    cv.rect(12, 18, 35, 19, GOLD)
    cv.outline(0.5)
    return cv


def bld_bathhouse():
    GS = _street()
    cv = Canvas(48, 48)
    GS.ground(cv, hexc('a8a8b0'))
    cv.rect(6, 16, 41, 40, hexc('e8e0d0'))
    cv.poly([(2, 18), (46, 18), (40, 8), (8, 8)], hexc('4a5a6a'))
    cv.hline(2, 46, 18, hexc('2a3a4a'))
    # tall chimney with a wisp of steam, and a cloth curtain over the door
    cv.rect(38, 0, 42, 16, hexc('8a6a5a'))
    for k in range(3):
        cv.px(40 - k, 0 - k + 2, (255, 255, 255, 160 - k * 40))
    cv.rect(17, 24, 30, 30, hexc('2a4a7a'))
    cv.vline(23, 26, 30, hexc('1a2a4a')); cv.vline(24, 26, 30, hexc('1a2a4a'))
    cv.ellipse(23.5, 27, 2.5, 1.6, WHITE)
    cv.rect(18, 30, 29, 40, hexc('6a4a34'))
    cv.rect(8, 24, 14, 30, hexc('9ad0e8')); cv.rect(33, 24, 39, 30, hexc('9ad0e8'))
    cv.outline(0.5)
    return cv


def bld_netcafe():
    GS = _street()
    cv = Canvas(48, 48)
    GS.ground(cv, hexc('a8a8b0'))
    cv.rect(4, 6, 43, 40, hexc('5a6a7a'))
    GS.windows(cv, 7, 10, 4, 2, 9, 7, 6, 4, hexc('8ad0f0'))
    # glowing sign with a little screen and keyboard
    cv.rect(8, 26, 39, 33, hexc('1a1a2a'))
    cv.rect(10, 27, 17, 31, hexc('5ae0f0'))
    cv.hline(19, 37, 28, hexc('f05ad0'))
    cv.hline(19, 33, 31, hexc('f0e05a'))
    cv.rect(20, 34, 27, 40, hexc('2a3a4a'))
    cv.vline(23, 34, 40, hexc('8ad0f0'))
    cv.outline(0.5)
    return cv


def bus_stop(lang):
    """Bus stops as they look on everyday streets: a shelter with a route board, a round sign, a slim blue pole."""
    GS = _street()
    cv = Canvas(48, 48)
    GS.ground(cv, hexc('a8a8b0'))
    if lang == 'zh':
        cv.rect(4, 14, 40, 16, hexc('2a7a5a'))
        cv.rect(6, 17, 9, 39, hexc('8a8e98'))
        cv.rect(10, 17, 30, 32, hexc('f4f0e8'))
        for y in range(19, 31, 3):
            cv.hline(12, 28, y, hexc('2a7a5a'))
        cv.rect(31, 17, 38, 32, hexc('c8e4f0'))
        cv.rect(12, 34, 36, 35, hexc('8a8e98'))
    elif lang == 'ja':
        cv.rect(8, 22, 34, 24, hexc('8a8e98'))
        cv.rect(10, 31, 32, 33, hexc('a87848'))
        cv.vline(11, 25, 40, hexc('6a6a74')); cv.vline(31, 25, 40, hexc('6a6a74'))
        cv.vline(40, 10, 40, hexc('6a6a74'))
        cv.ellipse(40, 10, 5.5, 5.5, WHITE)
        cv.ellipse(40, 10, 4.5, 4.5, hexc('d84848'))
        cv.ellipse(40, 10, 3, 3, WHITE)
        cv.rect(37, 17, 43, 26, WHITE)
        for y in (19, 21, 23):
            cv.hline(38, 42, y, hexc('5a5a64'))
        cv.rect(37, 38, 43, 40, hexc('8a8e98'))
    else:
        cv.rect(4, 16, 36, 18, hexc('3a6ad8'))
        cv.rect(6, 19, 34, 33, (200, 228, 240, 200))
        cv.vline(6, 19, 39, hexc('6a6a74')); cv.vline(34, 19, 39, hexc('6a6a74'))
        cv.rect(8, 31, 32, 33, hexc('8a8e98'))
        cv.rect(22, 21, 32, 27, hexc('2a2a3a'))
        cv.hline(23, 30, 23, hexc('f0a040'))
        cv.hline(23, 28, 25, hexc('7ae07a'))
        cv.vline(41, 8, 40, hexc('3a6ad8'))
        cv.rect(38, 8, 44, 14, hexc('3a6ad8'))
        cv.rect(39, 10, 43, 12, WHITE)
    cv.outline(0.5)
    return cv


def apartments(lang):
    """Housing as it's commonly seen: a tower block with air-con units, a low walk-up with outside stairs, a numbered high-rise."""
    GS = _street()
    cv = Canvas(48, 48)
    GS.ground(cv)
    if lang == 'zh':
        body = hexc('e8dcc8')
        cv.rect(8, 0, 39, 40, body)
        for y in range(3, 38, 6):
            for x in (11, 20, 29):
                cv.rect(x, y, x + 6, y + 3, hexc('9ad0e8'))
                cv.rect(x + 7, y + 2, x + 8, y + 3, hexc('f4f2ee'))
            cv.hline(9, 38, y + 4, hexc('c8b8a0'))
        cv.rect(20, 34, 27, 40, hexc('6a5a4a'))
    elif lang == 'ja':
        body = hexc('e0d4c0')
        cv.rect(4, 14, 43, 40, body)
        cv.poly([(2, 15), (45, 15), (42, 10), (5, 10)], hexc('7a5a4a'))
        cv.rect(4, 26, 43, 27, hexc('8a8e98'))
        for x in range(7, 36, 9):
            cv.rect(x, 18, x + 5, 25, hexc('6a5a4a'))
            cv.rect(x, 30, x + 5, 39, hexc('6a5a4a'))
        cv.line(38, 40, 46, 28, hexc('8a8e98'), 2)
        cv.line(38, 28, 46, 16, hexc('8a8e98'), 2)
    else:
        body = hexc('eeeae4')
        cv.rect(9, 0, 38, 40, body)
        for y in range(4, 38, 5):
            cv.rect(11, y, 36, y + 2, hexc('b8d8e8'))
            cv.hline(10, 37, y + 3, hexc('c8c4bc'))
        cv.rect(9, 6, 15, 22, hexc('5a8ac0'))
        cv.rect(10, 8, 14, 9, WHITE); cv.rect(13, 9, 14, 12, WHITE); cv.rect(10, 12, 14, 13, WHITE)
        cv.rect(10, 15, 11, 20, WHITE)
        cv.rect(20, 34, 27, 40, hexc('6a5a4a'))
    cv.outline(0.5)
    return cv


# ---------- winter street-food stalls on the sidewalk ----------

def cart(kind):
    cv = Canvas(40, 34)
    wood = hexc('8a5a3a')
    cv.ellipse(9, 30, 3.5, 3.5, DARK); cv.ellipse(31, 30, 3.5, 3.5, DARK)
    cv.ellipse(9, 30, 1.5, 1.5, hexc('8a8e98')); cv.ellipse(31, 30, 1.5, 1.5, hexc('8a8e98'))
    cv.rect(2, 18, 37, 27, wood)
    cv.hline(2, 37, 18, W(wood, 2))
    cv.vline(4, 4, 18, W(wood, -1)); cv.vline(35, 4, 18, W(wood, -1))
    if kind == 'sweet_potato':
        # an iron drum oven with roasted potatoes on top
        cv.rect(10, 8, 29, 18, hexc('3a3a44'))
        cv.ellipse(19.5, 8, 10, 2.5, hexc('5a5a64'))
        for x in (13, 19, 25):
            cv.ellipse(x, 7, 3, 1.6, hexc('8a3a5a'))
            cv.px(x - 1, 6, hexc('e8a860'))
        cv.rect(6, 1, 33, 4, hexc('e8c890'))
    elif kind == 'tanghulu':
        # candied skewers standing upright in a row behind a little glass front
        for i, x in enumerate(range(8, 33, 4)):
            top = 6 + (i % 2) * 2
            cv.vline(x, top + 6, 18, hexc('c8a060'))
            for k in range(3):
                cv.ellipse(x, top + k * 2.4, 1.6, 1.4, RED)
                cv.px(x - 1, top + k * 2.4 - 1, hexc('f8a0a0'))
        cv.rect(6, 14, 34, 18, (220, 236, 244, 150))
        cv.hline(6, 34, 14, hexc('e8f0f4'))
        cv.rect(4, 2, 7, 3, RED)
    else:
        # a griddle of fish-shaped cakes under a little awning
        cv.rect(4, 0, 35, 4, hexc('d84848'))
        for x in range(4, 36, 6):
            cv.rect(x, 0, x + 2, 4, WHITE)
        cv.rect(8, 12, 31, 17, hexc('4a4a54'))
        for x in (11, 17, 23, 29):
            cv.ellipse(x, 11, 2.6, 1.6, hexc('d8983a'))
            cv.px(x + 2, 11, hexc('b87828'))
    cv.outline(0.5)
    return cv


# ---------- deli counter: local cuts, a roast-meat board, butcher counters ----------
# Same five slots as the deli: turkey, ham, roastbeef, salami, swiss.
DELI_LOCAL = {
    # roast goose, char siu, braised beef, cured sausage, white-cut chicken
    'zh': {'turkey': ('goose', 'a8501e', 'd8843a'), 'ham': ('charsiu', 'c8302a', 'e88a6a'), 'roastbeef': ('block', '6a3a24', '9a6040'),
           'salami': ('links', 'a8302a', 'e8b8a0'), 'swiss': ('chicken', 'f0e0b8', 'f8f0d8')},
    # pork belly, loin ham, sukiyaki beef, shabu pork, roast beef
    'ja': {'turkey': ('layers', 'e8a8a0', 'f8ece4'), 'ham': ('round', 'f0a8b0', 'f8d0d4'), 'roastbeef': ('marbled', 'c84a4a', 'f4dcd4'),
           'salami': ('fatedge', 'f0b0a8', 'f8f0e8'), 'swiss': ('crust', '6a3a2a', 'd86a6a')},
    # pork belly, pork neck, thin brisket, bulgogi beef, rib meat
    'ko': {'turkey': ('layers', 'e8a0a0', 'f8ece4'), 'ham': ('marbled', 'e08888', 'f8e0dc'), 'roastbeef': ('marbled', 'c85050', 'f8f0ec'),
           'salami': ('block', 'a8402a', 'd87a50'), 'swiss': ('marbled', 'b84444', 'f0d0c8')},
}


def local_log(style, a, b):
    """The piece on the board or slicer, 64x40 like the deli logs."""
    A, B = hexc(a), hexc(b)
    cv = Canvas(64, 40)
    if style == 'goose':
        # a whole roast goose lying on its side, glazed and glossy
        cv.ellipse(30, 24, 23, 12, A)
        cv.ellipse(26, 20, 15, 7, W(A, 1))
        cv.line(48, 18, 56, 8, A, 3)
        cv.ellipse(57, 7, 3.5, 3, A)
        cv.px(59, 7, hexc('3a1a10'))
        cv.line(10, 32, 4, 37, W(A, -2), 2)
        cv.line(18, 34, 14, 38, W(A, -2), 2)
        cv.shade_ball(30, 22, 23, 12, 0.9, dither=False)
        for k in range(14):
            cv.px(14 + k * 2, 15 + (k % 3), B)
        cv.px(22, 16, hexc('f8c070')); cv.px(23, 16, hexc('f8c070'))
    elif style == 'charsiu':
        for y in (9, 22):
            cv.rrect(4, y, 58, y + 10, A, 3)
            cv.hline(5, 57, y + 2, B)
            cv.hline(6, 56, y + 3, W(B, 1))
            cv.rect(4, y, 7, y + 10, hexc('4a1810'))
            cv.rect(55, y, 58, y + 10, hexc('4a1810'))
            for x in range(12, 52, 7):
                cv.px(x, y + 7, hexc('4a1810'))
            cv.ellipse(58, y + 5, 2, 4.5, hexc('e8b0a0'))
    elif style == 'links':
        for i, x in enumerate(range(4, 56, 13)):
            cv.rrect(x, 12, x + 11, 26, A, 4)
            cv.px(x + 3, 16, B); cv.px(x + 7, 20, B)
        cv.shade_cyl(4, 12, 56, 26, 0.6)
    elif style == 'chicken':
        cv.ellipse(30, 22, 22, 12, A)
        cv.ellipse(12, 26, 6, 5, A)
        cv.ellipse(48, 26, 6, 5, A)
        cv.shade_ball(30, 20, 22, 12, 0.5)
        cv.hline(16, 44, 20, B)
    else:
        cv.rrect(2, 6, 54, 34, A, 6 if style == 'block' else 10)
        cv.ellipse(54, 20, 8, 14, B if style != 'block' else W(A, 1))
        cv.ellipse(54, 20, 6, 11, A)
        if style == 'layers':
            for y in (13, 20, 27):
                cv.hline(4, 60, y, B)
        elif style == 'marbled':
            for (x, y) in ((50, 14), (56, 18), (52, 24), (57, 26), (49, 20), (54, 29)):
                cv.px(x, y, B); cv.px(x + 1, y, B)
        elif style == 'fatedge':
            cv.rect(2, 6, 54, 9, B)
            cv.ellipse(54, 8, 6, 3, B)
        elif style == 'round':
            cv.ellipse(54, 20, 4, 8, B)
        elif style == 'crust':
            cv.ellipse(54, 20, 5, 9, B)
        cv.shade_cyl(2, 6, 61, 34, 0.5)
    cv.outline(0.5)
    return cv


def local_slice(style, a, b):
    """What lands on the scale: chopped pieces at a roast-meat counter, thin wide slices elsewhere."""
    A, B = hexc(a), hexc(b)
    cv = Canvas(30, 12)
    if style in ('goose', 'charsiu', 'chicken'):
        # three chopped pieces showing skin or glaze on top and meat on the cut face
        skin = {'goose': hexc('9a4418'), 'charsiu': hexc('b8281e'), 'chicken': hexc('f0d890')}[style]
        meat = {'goose': hexc('e8b090'), 'charsiu': hexc('e88a7a'), 'chicken': hexc('f8f0e4')}[style]
        for k, x in enumerate((2, 11, 20)):
            y = 3 + (k % 2)
            cv.rect(x, y + 2, x + 7, y + 6, meat)
            cv.rect(x, y, x + 7, y + 1, skin)
            cv.px(x + 1, y, W(skin, 3))
            if style == 'charsiu':
                cv.px(x, y + 2, hexc('4a1810')); cv.px(x + 7, y + 5, hexc('4a1810'))
            cv.vline(x + 7, y, y + 6, W(meat, -2))
    elif style == 'links':
        # cured sausage cut into coins: red with white flecks of fat
        for x in (5, 14, 23):
            cv.ellipse(x, 6, 4, 3.5, A)
            for (dx, dy) in ((-1, -1), (1, 0), (0, 1)):
                cv.px(x + dx, 6 + dy, B)
    elif style == 'block':
        # braised beef in thin dark slices with lighter grain
        for k, x in enumerate((2, 10, 18)):
            cv.rect(x, 3 + k % 2, x + 9, 8 + k % 2, A)
            for yy in range(4 + k % 2, 8 + k % 2, 2):
                cv.hline(x + 1, x + 8, yy, B)
    else:
        cv.ellipse(15, 6, 14, 4, A)
        if style in ('layers', 'fatedge'):
            cv.hline(3, 27, 5, B)
            cv.hline(4, 26, 8, B)
        elif style == 'marbled':
            for x in range(5, 26, 4):
                cv.px(x, 5 + x % 3, B)
        else:
            cv.hline(3, 26, 9, B)
    cv.outline(0.5)
    return cv


def _roast_duck(cv, cx, top, size=1.0):
    """A glossy roast duck hanging head-up from a hook: neck, plump body, folded legs."""
    skin, dark, glaze = hexc('9a4418'), hexc('5a2410'), hexc('e0903a')
    cv.line(cx, top, cx + 1, top + 8 * size, dark, 2)
    cv.ellipse(cx + 1, top + 9 * size, 2.5 * size, 2.2 * size, skin)
    bw, bh = 9 * size, 15 * size
    by = top + 12 * size + bh
    cv.ellipse(cx, by, bw, bh, skin)
    cv.ellipse(cx - bw * 0.25, by - bh * 0.2, bw * 0.55, bh * 0.6, W(skin, 1))
    cv.shade_ball(cx, by, bw, bh, 0.9, dither=False)
    # glaze highlights catching the light
    for k in range(int(5 * size)):
        cv.px(cx - bw * 0.45 + k * 0.3, by - bh * 0.55 + k * 2.2, glaze)
    cv.px(cx - bw * 0.2, by - bh * 0.7, hexc('f8c070'))
    for sx in (-1, 1):
        cv.line(cx + sx * bw * 0.6, by + bh * 0.6, cx + sx * bw * 0.9, by + bh * 1.05, dark, 2)
    cv.ellipse(cx, by + bh * 0.9, bw * 0.4, 2, W(skin, -2))


def _char_siu(cv, x, top, length=26):
    """A strip of char siu on its hook: lacquer-red glaze, charred ends, honey shine."""
    red, char, honey = hexc('b8281e'), hexc('4a1810'), hexc('f07850')
    cv.vline(x, top, top + 4, hexc('8a8e98'))
    cv.rrect(x - 3, top + 4, x + 3, top + 4 + length, red, 2)
    cv.rect(x - 3, top + 4, x + 3, top + 6, char)
    cv.rect(x - 3, top + length + 1, x + 3, top + length + 4, char)
    cv.vline(x - 1, top + 8, top + length - 2, honey)
    for y in range(top + 9, top + length, 5):
        cv.px(x + 2, y, char)


def _crispy_pork(cv, x, top):
    """A slab of crispy roast pork: blistered crackling over pink and white layers."""
    cv.vline(x + 9, top, top + 4, hexc('8a8e98'))
    cv.rect(x, top + 4, x + 18, top + 7, hexc('e8b860'))
    for k in range(0, 19, 2):
        cv.px(x + k, top + 4, hexc('f8e0a0'))
    cv.rect(x, top + 8, x + 18, top + 10, hexc('f4ece0'))
    cv.rect(x, top + 11, x + 18, top + 14, hexc('e89a8a'))
    cv.rect(x, top + 15, x + 18, top + 16, hexc('f4ece0'))
    cv.rect(x, top + 17, x + 18, top + 20, hexc('d87a6a'))


def roast_window():
    """Backdrop for the chopping mini-game: the lit display case of a roast-meat counter."""
    w, h = 280, 120
    cv = Canvas(w, h)
    frame, gold = hexc('8a1a14'), hexc('d8a840')
    cv.rect(0, 0, w - 1, h - 1, frame)
    cv.rect(3, 3, w - 4, h - 4, gold)
    inner = (6, 6, w - 7, h - 7)
    for y in range(inner[1], inner[3] + 1):
        k = (y - inner[1]) / (inner[3] - inner[1])
        cv.hline(inner[0], inner[2], y, mix(hexc('f8d890'), hexc('c87838'), k))
    # tiled back wall and a steel rail with S-hooks
    for x in range(inner[0], inner[2], 14):
        cv.vline(x, inner[1], inner[3] - 12, (255, 255, 255, 40))
    cv.rect(10, 12, w - 11, 13, hexc('a8acb8'))
    cv.hline(10, w - 11, 12, hexc('e8ecf0'))
    _roast_duck(cv, 34, 14, 1.15)
    _roast_duck(cv, 78, 14, 1.0)
    for i, x in enumerate((118, 130, 142, 154)):
        _char_siu(cv, x, 14, 30 + (i % 2) * 6)
    _crispy_pork(cv, 172, 14)
    _roast_duck(cv, 222, 14, 1.1)
    _roast_duck(cv, 256, 14, 0.9)
    # drip tray and the glass catching the light
    cv.rect(8, h - 18, w - 9, h - 10, hexc('c8ccd4'))
    cv.hline(8, w - 9, h - 18, WHITE)
    cv.outline(0.5)
    # the glass catches the light: soft bands laid over everything, after the outline
    for x0, wid in ((96, 10), (112, 4)):
        for y in range(6, h - 20):
            k = (y - 6) / (h - 26)
            for x in range(round(x0 - 30 * k), round(x0 + wid - 30 * k)):
                c = cv.get(x, y)
                if c is not None:
                    cv.p[y][x] = mix(c, WHITE, 0.18)
    return cv


def chopping_board():
    """Stands in for the slicer in the mini-game: a thick end-grain board on the counter."""
    w, h = 140, 100
    cv = Canvas(w, h)
    body = hexc('c8ccd4')
    cv.rrect(0, 70, w - 1, h - 1, body, 4)
    cv.hline(2, w - 3, 70, W(body, 2))
    cv.rect(0, 92, w - 1, h - 1, W(body, -2))
    bark, side, top = hexc('6a4428'), hexc('a87a48'), hexc('d8b07a')
    cx, cy, rx, ry = 100, 50, 38, 12
    cv.ellipse(cx, cy + 14, rx, ry, W(side, -3))
    cv.rect(cx - rx, cy, cx + rx, cy + 14, side)
    for x in range(cx - rx, cx + rx + 1, 5):
        cv.vline(x, cy + 2, cy + 13, W(side, -1))
    cv.ellipse(cx, cy, rx, ry, bark)
    cv.ellipse(cx, cy, rx - 2, ry - 1.5, top)
    for r in (30, 22, 14, 6):
        for a in range(0, 360, 6):
            t = math.radians(a)
            cv.px(cx + r * math.cos(t), cy + r * (ry / rx) * math.sin(t), W(top, -1))
    for (x, y, l) in ((82, 47, 6), (108, 52, 5), (96, 44, 4), (116, 47, 4)):
        cv.hline(x, x + l, y, W(top, -2))
    cv.outline(0.5)
    return cv


def cleaver():
    """A heavy cleaver: polished blade with a bright edge and a hanging hole, riveted wooden handle."""
    cv = Canvas(52, 34)
    steel, spine, edge = hexc('c8ccd4'), hexc('7a808c'), hexc('f8fafc')
    cv.poly([(2, 4), (30, 4), (31, 28), (2, 30)], steel)
    for y in range(4, 30):
        k = (y - 4) / 26
        cv.hline(3, 30, y, mix(hexc('9aa0ac'), hexc('e8ecf0'), k))
    cv.hline(2, 30, 4, spine)
    cv.hline(2, 30, 5, spine)
    cv.line(2, 30, 31, 28, edge)
    cv.line(2, 29, 31, 27, hexc('d8dce4'))
    cv.ellipse(8, 10, 2.2, 2.2, hexc('4a4e58'))
    cv.ellipse(8, 10, 1.2, 1.2, None)
    cv.hline(6, 26, 8, hexc('f0f2f6'))
    cv.rect(31, 8, 34, 14, hexc('a8acb8'))
    cv.rrect(34, 7, 50, 15, hexc('6a3a20'), 2)
    cv.hline(35, 49, 8, hexc('8a5a34'))
    for x in (38, 45):
        cv.ellipse(x, 11, 1.3, 1.3, hexc('d8dce4'))
    cv.outline(0.5)
    return cv


def cleaver_frame(k):
    """The world-view overlay where the slicer blade would be: the cleaver rising and coming down on the board."""
    cv = Canvas(20, 20)
    y = (1, 5, 10, 5)[k]
    steel = hexc('c8ccd4')
    cv.rect(3, y, 11, y + 7, steel)
    cv.hline(3, 11, y, hexc('8a8e98'))
    cv.hline(3, 11, y + 7, WHITE)
    cv.px(5, y + 2, hexc('4a4e58'))
    cv.px(8, y + 3, (255, 255, 255, 200))
    cv.rect(12, y + 2, 13, y + 3, hexc('a8acb8'))
    cv.rect(14, y + 1, 18, y + 4, hexc('6a3a20'))
    cv.px(16, y + 2, hexc('d8dce4'))
    if k == 2:
        # a chip of meat jumps as the blade lands
        cv.px(1, 15, hexc('c8302a')); cv.px(16, 14, hexc('c8302a'))
    cv.outline(0.4)
    return cv


def deli_counter_local(lang, counter_base):
    cv = Canvas(64, 56)
    if lang == 'zh':
        counter_base(cv, top=hexc('e8dcc8'), front=hexc('8a2a24'))
        # a small glass case with roast ducks and char siu on hooks, and a chopping board beside it
        cv.rect(2, 0, 33, 22, hexc('f0c880'))
        cv.rect(2, 0, 33, 1, RED)
        cv.vline(2, 0, 22, RED); cv.vline(33, 0, 22, RED)
        cv.hline(3, 32, 3, hexc('a8acb8'))
        for x in (8, 17):
            cv.vline(x, 3, 5, hexc('6a6e78'))
            cv.ellipse(x, 12, 4, 6.5, hexc('9a4418'))
            cv.px(x - 2, 9, hexc('e0903a')); cv.px(x - 1, 8, hexc('f8c070'))
        for x in (25, 29):
            cv.vline(x, 3, 5, hexc('6a6e78'))
            cv.rect(x - 1, 6, x + 1, 18, hexc('b8281e'))
            cv.px(x, 7, hexc('f07850'))
        for k in range(10):
            cv.px(5 + k, 20 - k * 2, (255, 255, 255, 110))
        wood = hexc('c8a070')
        cv.ellipse(46, 19, 13, 3.5, hexc('8a6440'))
        cv.ellipse(46, 18, 13, 3.5, wood)
        cv.rect(41, 16, 47, 18, hexc('b8281e'))
        cv.rect(4, 26, 30, 32, hexc('d8a840'))
        cv.rect(36, 26, 60, 46, hexc('f0d050'))
        cv.rect(38, 28, 58, 34, RED)
    elif lang == 'ja':
        counter_base(cv, top=hexc('e8ecf0'), front=hexc('4a5a6a'))
        cv.rect(36, 13, 60, 22, hexc('8c92a0'))
        cv.ellipse(44, 9, 8, 8, hexc('c8ccd4'))
        cv.ellipse(44, 9, 7, 7, hexc('e8ecf0'))
        cv.ellipse(44, 9, 2, 2, hexc('6a6e78'))
        # thin slices fanned out on trays
        cv.rect(2, 26, 61, 47, hexc('b8dce8'))
        for x0 in (4, 24, 44):
            cv.rect(x0, 34, x0 + 15, 44, hexc('2a2a30'))
            for k in range(4):
                cv.ellipse(x0 + 4 + k * 2.5, 39, 3.5, 3, hexc(('e8a0a0', 'c84a4a', 'f0b0a8')[x0 // 20 % 3]))
                cv.hline(x0 + 2 + k * 2, x0 + 6 + k * 2, 38, hexc('f8ece4'))
        cv.hline(2, 61, 30, hexc('e8f0f4'))
    else:
        counter_base(cv, top=hexc('e8ecf0'), front=hexc('5a5a64'))
        cv.rect(36, 13, 60, 22, hexc('8c92a0'))
        cv.ellipse(44, 9, 8, 8, hexc('c8ccd4'))
        cv.ellipse(44, 9, 7, 7, hexc('e8ecf0'))
        cv.ellipse(44, 9, 2, 2, hexc('6a6e78'))
        # meat under a warm red lamp
        cv.rect(2, 26, 61, 47, hexc('e8a0a0'))
        cv.rect(2, 26, 61, 28, hexc('f05050'))
        for i, x in enumerate((4, 19, 34, 49)):
            cv.rrect(x, 32, x + 11, 42, hexc(('e8a0a0', 'c84a4a', 'b84444', 'a8402a')[i]), 2)
            for y in (35, 38):
                cv.hline(x + 1, x + 10, y, hexc('f8ece4'))
        cv.rect(4, 2, 16, 6, hexc('f05050'))
        cv.vline(10, 0, 2, hexc('3a3a44'))
    cv.rect(2, 48, 61, 51, hexc('7a7e88'))
    cv.outline(0.5)
    return cv


# "老吴" in 12px pixels (rendered once from a CJK font and kept here so the art doesn't depend on installed fonts)
LAOWU = [
    '....#.................',
    '....#...##...########.',
    '.#######.....#......#.',
    '....#.##.....########.',
    '##########............',
    '.....#.......########.',
    '...##..#........#.....',
    '..##.####...##########',
    '##.##...........##....',
    '...#....##....##..###.',
    '...######...##......##',
]


def bubble_laowu():
    """Speech bubble a cat sometimes yells at another cat, in Chinese only."""
    w, h = 30, 20
    cv = Canvas(w, h)
    cv.rrect(0, 0, w - 1, 15, WHITE, 4)
    cv.poly([(9, 15), (15, 15), (11, 19)], WHITE)
    for y, row in enumerate(LAOWU):
        for x, c in enumerate(row):
            if c == '#':
                cv.px(4 + x, 2 + y, DARK)
    cv.outline(0.5)
    return cv


# ---------- passers-by on the sidewalk ----------

DOG_COATS = [('d8a060', 'f4ecdc'), ('f4f0e8', 'e8dcc8'), ('3a3440', 'f4ecdc'), ('e0b860', 'f0d8a0'), ('8a5a3a', 'c89a6a')]


def dog(coat, k):
    """A small dog walking right (k 0-3), or k 4 with its nose to the ground."""
    body, belly = (hexc(c) for c in DOG_COATS[coat])
    cv = Canvas(24, 18)
    sniff = k == 4
    bob = (0, -1, 0, 1, 0)[k]
    legs = [(5, 8, 13, 16), (6, 7, 14, 15), (5, 8, 13, 16), (4, 9, 12, 17), (5, 8, 13, 16)][k]
    for i, x in enumerate(legs):
        cv.rect(x, 12 + bob, x, 16, W(body, -1 if i % 2 else 0))
        cv.px(x, 16, W(body, -3))
    # body and a curled tail
    cv.rrect(3, 7 + bob, 16, 13 + bob, body, 3)
    cv.hline(5, 14, 12 + bob, belly)
    cv.ellipse(3, 5 + bob, 2.2, 2.2, body)
    cv.px(3, 5 + bob, belly)
    # head: round, with a snout, nose, eye and a pointed ear; lowered when sniffing
    hx, hy = (18, 11) if sniff else (18, 5)
    hy += bob
    cv.ellipse(hx, hy, 4.2, 3.8, body)
    cv.rect(hx + 2, hy, hx + 5, hy + 2, belly)
    cv.px(hx + 5, hy, DARK)
    cv.px(hx + 1, hy - 1, DARK)
    cv.poly([(hx - 3, hy - 2), (hx - 1, hy - 6), (hx + 1, hy - 3)], W(body, -1))
    # collar on the neck
    cv.vline(15, 7 + bob, 10 + bob, RED) if not sniff else cv.vline(15, 9 + bob, 12 + bob, RED)
    cv.vline(16, 7 + bob, 10 + bob, RED) if not sniff else cv.vline(16, 9 + bob, 12 + bob, RED)
    cv.outline(0.5)
    return cv


def sparrow(k):
    """A sparrow: standing, hopping, pecking, then two wing frames as it flies off."""
    cv = Canvas(12, 10)
    brown, cream, dark = hexc('8a5a3a'), hexc('e8d8c0'), hexc('4a3020')
    if k >= 3:
        y = 3
        cv.ellipse(6, y + 2, 3.5, 2, brown)
        cv.ellipse(6, y + 3, 2.5, 1.2, cream)
        if k == 3:
            cv.poly([(4, y + 1), (8, y + 1), (6, y - 3)], dark)
        else:
            cv.poly([(4, y + 3), (8, y + 3), (6, y + 6)], dark)
        cv.px(9, y + 1, hexc('f0a040'))
        return cv
    y = 3 + (-2 if k == 1 else 0)
    cv.ellipse(5, y + 3, 3.5, 2.5, brown)
    cv.ellipse(5, y + 4, 2.5, 1.5, cream)
    hx, hy = (8, y + (3 if k == 2 else 1))
    cv.ellipse(hx, hy, 2, 2, brown)
    cv.px(hx + 1, hy - 1, DARK)
    cv.px(hx + 2, hy + 1, hexc('f0a040'))
    cv.line(1, y + 2, 0, y + 1, dark)
    if k != 1:
        cv.vline(4, y + 6, y + 7, hexc('c8783a')); cv.vline(6, y + 6, y + 7, hexc('c8783a'))
    cv.outline(0.4)
    return cv


def pigeon(k):
    """A pigeon facing right: k 0-1 walking (head forward, back), 2 pecking, 3-4 flapping as it flies off."""
    cv = Canvas(16, 14)
    grey, dark, neck = hexc('9aa0b0'), hexc('5a6070'), hexc('6a8a8a')
    if k >= 3:
        cv.ellipse(8, 8, 5, 2.5, grey)
        cv.ellipse(12, 6, 2, 2, grey)
        cv.px(14, 6, hexc('f0a040'))
        cv.poly([(3, 8), (0, 6), (0, 10)], dark)
        if k == 3:
            cv.poly([(5, 7), (11, 7), (7, 0)], W(grey, 1))
            cv.hline(6, 9, 2, dark)
        else:
            cv.poly([(5, 9), (11, 9), (7, 14)], W(grey, -1))
        cv.outline(0.4)
        return cv
    if k == 2:
        cv.ellipse(7, 8, 5.5, 3.5, grey)
        cv.poly([(2, 7), (0, 5), (2, 9)], dark)
        cv.ellipse(12, 9, 2, 2, neck)
        cv.ellipse(13, 11, 2, 1.8, grey)
        cv.px(15, 12, hexc('f0a040'))
        cv.vline(6, 11, 12, hexc('d87a7a')); cv.vline(8, 11, 12, hexc('d87a7a'))
        cv.outline(0.4)
        return cv
    cv.ellipse(7, 8, 5.5, 3.5, grey)
    cv.poly([(2, 7), (0, 5), (2, 9)], dark)
    for x in (5, 8):
        cv.px(x, 10, dark)
    hx = 12 if k == 0 else 10
    cv.ellipse(hx - 1, 5, 2, 2.5, neck)
    cv.ellipse(hx, 3, 2, 2, grey)
    cv.px(hx + 1, 2, hexc('f0a040'))
    cv.px(hx + 2, 3, hexc('d8a0a0'))
    cv.vline(6, 11, 12, hexc('d87a7a')); cv.vline(8, 11, 12 - k, hexc('d87a7a'))
    cv.outline(0.4)
    return cv


def butterfly(k):
    cv = Canvas(10, 8)
    wing, spot = hexc('f8f0c0'), hexc('3a3440')
    if k == 0:
        cv.ellipse(2.5, 3, 2.5, 2.5, wing); cv.ellipse(7.5, 3, 2.5, 2.5, wing)
        cv.ellipse(3, 6, 1.5, 1.5, wing); cv.ellipse(7, 6, 1.5, 1.5, wing)
        cv.px(2, 2, spot); cv.px(7, 2, spot)
    else:
        cv.ellipse(3.5, 2.5, 1.5, 2.5, wing); cv.ellipse(6.5, 2.5, 1.5, 2.5, wing)
    cv.vline(5, 1, 7, spot)
    return cv


SQUIRREL_FRAMES = 8


def squirrel(k):
    """A squirrel facing right.
    k 0-3: a bounding run (reach, gather, bunch, push off); 4: sitting with a nut at its chest;
    5: nibbling it; 6: sitting up tall on the alert; 7: flicking its tail."""
    cv = Canvas(18, 16)
    fur, belly, dark = hexc('b8683a'), hexc('f0d8b0'), hexc('6a3a1e')
    eye = DARK
    if k < 4:
        # body centre, head offset, tail shape and leg positions through the bound
        body = [(9, 10, 5.5, 2.3), (9, 9.5, 4.5, 2.8), (9, 9, 3.6, 3.2), (9, 9.5, 4.8, 2.6)][k]
        head = [(15, 8.5), (14, 7.5), (13, 7.5), (14.5, 7)][k]
        tail = [((3, 9), (1, 5), (2, 2)), ((4, 8), (2, 4), (3, 1)), ((5, 7), (3, 3), (5, 1)), ((4, 8), (1, 5), (1, 2))][k]
        fore = [(13, 13, 15, 12), (12, 13, 12, 13), (11, 13, 10, 13), (12, 12, 14, 11)][k]
        hind = [(5, 12, 3, 13), (6, 13, 7, 13), (8, 13, 9, 13), (6, 13, 5, 13)][k]
        for (x0, y0), (x1, y1) in zip(tail, tail[1:]):
            cv.line(x0, y0, x1, y1, fur, 2)
        cv.ellipse(tail[-1][0], tail[-1][1], 2.2, 2, fur)
        cv.px(tail[-1][0] - 1, tail[-1][1] - 1, W(fur, 2))
        cv.line(fore[0], fore[1] - 2, fore[2], fore[3] + 1, dark)
        cv.line(hind[0], hind[1] - 2, hind[2], hind[3] + 1, dark)
        cv.ellipse(*body, fur)
        cv.ellipse(body[0], body[1] + 1, body[2] - 1.5, 1, belly)
        hx, hy = head
        cv.ellipse(hx, hy, 2.6, 2.2, fur)
        cv.px(hx + 2, hy + 1, belly)
        cv.px(hx + 1, hy - 1, eye)
        cv.px(hx - 1, hy - 3, dark)
        cv.outline(0.4)
        return cv
    # sitting up on its haunches; the bushy tail curls up behind (or forward over its back when flicked)
    tall = k == 6
    by = 9 if tall else 10
    if k == 7:
        cv.ellipse(5, 6, 3, 3.5, fur)
        cv.ellipse(8, 3, 3, 2.5, fur)
        cv.px(9, 2, W(fur, 2))
    else:
        cv.ellipse(4, by - 1, 2.6, 5, fur)
        cv.ellipse(5, by - 6, 2.4, 2.4, fur)
        cv.px(4, by - 7, W(fur, 2))
    cv.ellipse(9, by, 3, 4.2 if tall else 4, fur)
    cv.ellipse(9.5, by + 0.5, 1.8, 3, belly)
    hy = by - 5.5 if tall else by - 5
    cv.ellipse(10, hy, 2.5, 2.4, fur)
    cv.px(11, hy - 1, eye)
    cv.px(9, hy - 3, dark)
    if tall:
        cv.px(10, hy - 3, dark)
        cv.px(12, hy + 1, belly)
    cv.px(8, 14, dark); cv.px(10, 14, dark)
    # the nut: held at the chest, raised to the mouth while nibbling
    if k in (4, 5, 7):
        nx, ny = (11.5, by - 1) if k != 5 else (12, hy + 1.5)
        cv.ellipse(nx, ny, 1.4, 1.3, hexc('8a5a2a'))
        cv.px(nx, ny - 1, hexc('c89a5a'))
        cv.line(10, by - 1, nx - 1, ny, dark)
    if k == 5:
        cv.px(12, hy, belly)
    cv.outline(0.4)
    return cv

RACCOON_FRAMES = 8


def raccoon(k):
    """A raccoon facing right.
    k 0-3: a waddle; 4-5: hunched over, paws busy at the ground; 6: sitting up for a look; 7: low and stretched, scurrying."""
    cv = Canvas(22, 17)
    fur, pale, dark, mask = hexc('8a8a90'), hexc('d8d8dc'), hexc('4a4a50'), hexc('2a2a30')

    def tail(x0, y0, x1, y1):
        cv.line(x0, y0, x1, y1, fur, 3)
        for u in (0.3, 0.6, 0.9):
            cv.ellipse(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 1.3, 1.3, mask)

    def head(hx, hy, down=False):
        cv.ellipse(hx, hy, 3.6, 3, fur)
        cv.ellipse(hx + 1, hy + 0.5, 2.6, 1.3, mask)
        cv.px(hx + 1, hy, pale)
        cv.rect(hx + 3, hy + (1 if down else 0), hx + 4, hy + (2 if down else 1), pale)
        cv.px(hx + 5, hy + (2 if down else 1), mask)
        cv.hline(hx - 2, hx + 2, hy - 2, pale)
        for ex in (hx - 2, hx + 1):
            cv.poly([(ex - 1, hy - 2), (ex + 1, hy - 2), (ex, hy - 4)], dark)

    if k < 4:
        sway = (0, 1, 0, -1)[k]
        tail(4, 9 + sway, 0, 6 - sway)
        legs = [(6, 9, 13, 16), (7, 8, 14, 15), (6, 9, 13, 16), (5, 10, 12, 17)][k]
        for x in legs:
            cv.vline(x, 12, 15, dark)
        cv.ellipse(10.5, 10 + (k % 2) * 0.5, 6.5, 3.5, fur)
        cv.ellipse(10.5, 12, 5, 1.3, pale)
        head(17, 8 + (k % 2))
    elif k < 6:
        tail(4, 10, 0, 8)
        cv.ellipse(10, 10, 6, 4, fur)
        head(16, 11, down=True)
        # front paws working at something on the ground
        px = 18 + (k - 4) * 2
        cv.rect(px - 1, 14, px, 15, mask)
        cv.rect(px - 4 + (k - 4), 14, px - 3 + (k - 4), 15, mask)
        cv.vline(7, 12, 15, dark)
    elif k == 6:
        tail(6, 14, 1, 12)
        cv.ellipse(11, 10.5, 4.8, 5, fur)
        cv.ellipse(11.5, 11.5, 3, 3.5, pale)
        cv.rect(14, 9, 15, 10, mask)
        cv.rect(8, 9, 9, 10, mask)
        head(11, 4.5)
        cv.vline(10, 14, 15, dark); cv.vline(12, 14, 15, dark)
    else:
        tail(3, 11, 0, 11)
        cv.ellipse(11, 11, 7.5, 2.8, fur)
        cv.ellipse(11, 12.5, 6, 1, pale)
        for x in (5, 9, 14, 18):
            cv.line(x, 13, x + (2 if x > 12 else -2), 15, dark)
        head(18, 10)
    cv.outline(0.4)
    return cv


# ---------- ambience: footprints, the delivery van, sidewalk chalk, a wind chime ----------

def footprint():
    """One wet shoe print, toe up."""
    cv = Canvas(5, 8)
    c = (90, 80, 70, 150)
    cv.ellipse(2, 2, 2, 2, c)
    cv.ellipse(2, 6, 1.5, 1.5, c)
    return cv


def van():
    """A small white delivery van seen from the side, parked at the kerb."""
    cv = Canvas(60, 36)
    body, glass, trim = hexc('f0f0ec'), hexc('9ac8e0'), hexc('3a7ab8')
    cv.rrect(2, 6, 44, 28, body, 3)
    cv.poly([(44, 12), (52, 12), (58, 20), (58, 28), (44, 28)], body)
    cv.poly([(46, 14), (51, 14), (56, 20), (46, 20)], glass)
    cv.rect(2, 20, 58, 22, trim)
    cv.rect(6, 10, 30, 17, hexc('e4e4e0'))
    cv.ellipse(18, 13.5, 4, 2.5, trim)
    cv.rect(54, 23, 58, 25, hexc('f0c040'))
    cv.rect(2, 24, 3, 27, hexc('d84848'))
    for x in (12, 48):
        cv.ellipse(x, 29, 5, 5, DARK)
        cv.ellipse(x, 29, 2.5, 2.5, hexc('a8acb8'))
    cv.shade_box(2, 6, 58, 28, 0.4)
    cv.outline(0.5)
    return cv


def dolly(loaded):
    """A hand truck, stacked with three boxes on the way in and empty on the way out."""
    cv = Canvas(16, 30)
    steel = hexc('8a8e98')
    cv.vline(12, 2, 27, steel); cv.vline(13, 2, 27, W(steel, 2))
    cv.rect(4, 26, 13, 27, steel)
    cv.ellipse(12, 28, 2.5, 2.5, DARK)
    cv.rect(11, 1, 15, 2, hexc('2a2a30'))
    if loaded:
        box = hexc('c8a070')
        for i, y in enumerate((17, 9, 2)):
            cv.rect(2 + i % 2, y, 11 - (i == 2), y + 8, box)
            cv.hline(2, 11, y, W(box, 2))
            cv.vline(6, y, y + 8, hexc('a88050'))
    cv.outline(0.5)
    return cv


CHALK_COLORS = {'pink': 'f4b8c8', 'blue': 'b8d8f4', 'yellow': 'f4e8a0', 'green': 'c0e8b8', 'white': 'f4f4f0'}


def chalk(kind):
    """Children's chalk drawings on the pavement, in soft dusty colours."""
    pal = {k: hexc(v) for k, v in CHALK_COLORS.items()}
    if kind == 'hopscotch':
        cv = Canvas(64, 22)
        c = pal['white']
        boxes = [(2, 6), (12, 6), (22, 1), (22, 11), (32, 6), (42, 1), (42, 11), (52, 6)]
        for i, (x, y) in enumerate(boxes):
            for xx in range(x, x + 10):
                cv.px(xx, y, c); cv.px(xx, y + 9, c)
            for yy in range(y, y + 10):
                cv.px(x, yy, c); cv.px(x + 9, yy, c)
            cv.px(x + 4, y + 4, pal['pink']); cv.px(x + 5, y + 5, pal['pink'])
        return cv
    cv = Canvas(18, 16)
    if kind == 'flower':
        for a in range(0, 360, 60):
            t = math.radians(a)
            cv.ellipse(9 + 3.5 * math.cos(t), 6 + 3.5 * math.sin(t), 2, 2, pal['pink'])
        cv.ellipse(9, 6, 1.5, 1.5, pal['yellow'])
        cv.line(9, 9, 9, 15, pal['green'])
        cv.line(9, 13, 12, 11, pal['green'])
    elif kind == 'sun':
        cv.ellipse(9, 8, 4, 4, pal['yellow'])
        for a in range(0, 360, 45):
            t = math.radians(a)
            cv.line(9 + 5 * math.cos(t), 8 + 5 * math.sin(t), 9 + 7.5 * math.cos(t), 8 + 7.5 * math.sin(t), pal['yellow'])
        cv.px(8, 7, DARK); cv.px(10, 7, DARK)
    elif kind == 'cat':
        c = pal['blue']
        for a in range(0, 360, 12):
            t = math.radians(a)
            cv.px(9 + 6 * math.cos(t), 9 + 5 * math.sin(t), c)
        cv.line(4, 6, 5, 1, c); cv.line(5, 1, 7, 4, c)
        cv.line(14, 6, 13, 1, c); cv.line(13, 1, 11, 4, c)
        cv.px(7, 8, c); cv.px(11, 8, c)
        cv.line(8, 11, 10, 11, pal['pink'])
    else:
        c = pal['pink']
        cv.ellipse(6, 6, 3.5, 3.5, c); cv.ellipse(12, 6, 3.5, 3.5, c)
        cv.poly([(2.5, 7), (15.5, 7), (9, 14)], c)
        cv.ellipse(6, 6, 2, 2, None) if False else None
    return cv


def wind_chime(k):
    """A small wind chime over the door: metal tubes under a cap, a paper strip below. k -2..2 is the swing."""
    cv = Canvas(16, 26)
    cap, tube, paper = hexc('8a5a34'), hexc('c8ccd4'), hexc('f4f0e8')
    cv.vline(8, 0, 2, hexc('6a6a74'))
    cv.ellipse(8, 4, 5, 2, cap)
    cv.hline(3, 13, 3, W(cap, 2))
    sway = k
    for i, x in enumerate((5, 8, 11)):
        dx = sway * (0.5 + i * 0.25)
        top = 6
        length = (8, 10, 7)[i]
        cv.line(x, top, x + dx * 0.4, top + 1, hexc('6a6a74'))
        cv.rect(round(x + dx * 0.5), top + 2, round(x + dx * 0.5) + 1, top + 2 + length, tube)
        cv.px(round(x + dx * 0.5), top + 2, WHITE)
    # clapper and the paper strip that catches the wind
    cv.line(8, 6, 8 + sway, 14, hexc('6a6a74'))
    cv.ellipse(8 + sway, 14, 1.2, 1.2, cap)
    cv.line(8 + sway, 15, 8 + sway * 2, 17, hexc('6a6a74'))
    cv.poly([(7 + sway * 2, 17), (10 + sway * 2, 17), (10 + sway * 3, 25), (7 + sway * 3, 25)], paper)
    cv.hline(7 + sway * 2, 10 + sway * 2, 19, hexc('5aa8d8'))
    cv.outline(0.4)
    return cv
