import math
import random
from pix import Canvas, hexc, tone, mix, fake_text

WHITE = hexc('f4f2ee')
DARK = hexc('2a2430')


def W(c, k):
    return tone(c, k)


FONT5x7 = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
    ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
    '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
    'x': ['00000', '10001', '01010', '00100', '01010', '10001', '00000'],
    '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
    '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    ' ': ['00000'] * 7,
    '¢': ['00000', '00100', '01111', '10100', '10100', '01111', '00100'],
    'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
    'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
    'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    'N': ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
    'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    'a': ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
    'b': ['10000', '10000', '10110', '11001', '10001', '10001', '11110'],
    'c': ['00000', '00000', '01110', '10000', '10000', '10001', '01110'],
    'd': ['00001', '00001', '01101', '10011', '10001', '10001', '01111'],
    'e': ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
    'f': ['00110', '01001', '01000', '11100', '01000', '01000', '01000'],
    'g': ['00000', '00000', '01111', '10001', '10001', '01111', '00001', '01110'],
    'h': ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
    'i': ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
    'j': ['00010', '00000', '00110', '00010', '00010', '00010', '10010', '01100'],
    'k': ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
    'l': ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
    'm': ['00000', '00000', '11010', '10101', '10101', '10001', '10001'],
    'n': ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
    'o': ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
    'p': ['00000', '00000', '11110', '10001', '10001', '11110', '10000', '10000'],
    'q': ['00000', '00000', '01111', '10001', '10001', '01111', '00001', '00001'],
    'r': ['00000', '00000', '10110', '11001', '10000', '10000', '10000'],
    's': ['00000', '00000', '01110', '10000', '01110', '00001', '11110'],
    't': ['01000', '01000', '11100', '01000', '01000', '01001', '00110'],
    'u': ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
    'v': ['00000', '00000', '10001', '10001', '10001', '01010', '00100'],
    'w': ['00000', '00000', '10001', '10001', '10101', '10101', '01010'],
    'x': ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
    'y': ['00000', '00000', '10001', '10001', '10001', '01111', '00001', '01110'],
    'z': ['00000', '00000', '11111', '00010', '00100', '01000', '11111'],
}
FONT_CHARS = list(FONT5x7.keys())

DIGITS3x5 = {
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '010'],
    '2': ['111', '001', '111', '100', '111'], '5': ['111', '100', '111', '001', '111'],
}


def font_sheet():
    cv = Canvas(6 * len(FONT_CHARS), 8)
    for i, ch in enumerate(FONT_CHARS):
        for y, row in enumerate(FONT5x7[ch]):
            for x, b in enumerate(row):
                if b == '1':
                    cv.px(i * 6 + x, y, (255, 255, 255, 255))
    return cv


def glyphs(cv, s, x, y, c, scale=1):
    for ch in s:
        g = FONT5x7.get(ch)
        if g is None:
            continue
        for gy, row in enumerate(g):
            for gx, b in enumerate(row):
                if b == '1':
                    cv.rect(x + gx * scale, y + gy * scale, x + gx * scale + scale - 1, y + gy * scale + scale - 1, c)
        x += 6 * scale


def small_digits(cv, s, x, y, c):
    for ch in s:
        g = DIGITS3x5[ch]
        for gy, row in enumerate(g):
            for gx, b in enumerate(row):
                if b == '1':
                    cv.px(x + gx, y + gy, c)
        x += 4


BILL_TINT = {1: '9ab890', 5: 'b0a8c8', 10: 'd8b890', 20: 'a8c8a0', 50: 'd8a8b8', 100: 'a8c8d8'}


def bill(v):
    w, h = 66, 30
    cv = Canvas(w, h)
    paper = hexc('dce8d0')
    tint = hexc(BILL_TINT[v])
    ink = hexc('2e5a3a')
    cv.rect(0, 0, w - 1, h - 1, paper)
    for x in range(w):
        for y in range(h):
            if (x * 3 + y * 5) % 9 == 0:
                cv.px(x, y, mix(paper, tint, 0.6))
    cv.rect(2, 2, w - 3, h - 3, None) if False else None
    for x in range(1, w - 1):
        cv.px(x, 1, ink); cv.px(x, h - 2, ink)
    for y in range(1, h - 1):
        cv.px(1, y, ink); cv.px(w - 2, y, ink)
    for x in range(3, w - 3, 2):
        cv.px(x, 3, mix(ink, paper, 0.5)); cv.px(x, h - 4, mix(ink, paper, 0.5))
    cv.ellipse(w / 2, h / 2, 9, 10.5, mix(paper, tint, 0.7))
    cv.ellipse(w / 2, h / 2, 8, 9.5, W(paper, 1))
    cv.ellipse(w / 2, h / 2 - 2, 4, 4.5, mix(ink, paper, 0.25))
    cv.poly([(w / 2 - 6, h / 2 + 9), (w / 2 + 6, h / 2 + 9), (w / 2 + 4, h / 2 + 3), (w / 2 - 4, h / 2 + 3)], mix(ink, paper, 0.25))
    if v == 100:
        cv.rect(w // 2 + 12, 3, w // 2 + 13, h - 4, hexc('5a7ad0'))
    cv.ellipse(15, 15, 4, 4, mix(hexc('5a8a5a'), paper, 0.3))
    cv.ellipse(15, 15, 2.5, 2.5, paper)
    s = str(v)
    glyphs(cv, s, 4, 4, ink)
    glyphs(cv, s, w - 5 - 6 * len(s) + 1, h - 12, ink)
    glyphs(cv, s, w - 5 - 6 * len(s) + 1, 4, mix(ink, paper, 0.3))
    fake_text(cv, 9, h - 6, 24, mix(ink, paper, 0.3), v)
    return cv


# value: (color, radius, reeded edge). Sizes follow real coins: dime < penny < nickel < quarter.
COIN = {1: ('c87a4a', 8, False), 5: ('9ea2a8', 9.5, False), 10: ('e6eaf0', 7.4, True), 25: ('c4cad4', 11.5, True)}


def coin(v):
    col, r, reeded = COIN[v]
    c = hexc(col)
    size = int(r * 2 + 3)
    cv = Canvas(size, size)
    cx = cy = size / 2
    cv.ellipse(cx, cy, r, r, W(c, -2))
    cv.ellipse(cx, cy, r - 1.5, r - 1.5, c)
    cv.shade_ball(cx, cy, r, r, 0.7, dither=False)
    if reeded:
        for a in range(0, 360, 15 if r > 9 else 20):
            t = math.radians(a)
            cv.px(cx - 0.5 + (r - 1.3) * math.cos(t), cy - 0.5 + (r - 1.3) * math.sin(t), W(c, -4))
    else:
        for a in range(0, 360, 8):
            t = math.radians(a)
            cv.px(cx - 0.5 + (r - 2) * math.cos(t), cy - 0.5 + (r - 2) * math.sin(t), W(c, -1))
    label = str(v)
    tw = len(label) * 4 - 1
    x0 = round(cx - tw / 2)
    y0 = round(cy - 2.5)
    small_digits(cv, label, x0, y0 + 1, W(c, 2))
    small_digits(cv, label, x0, y0, W(c, -4))
    cv.outline(0.5)
    return cv


def drawer():
    w, h = 300, 96
    cv = Canvas(w, h)
    body = hexc('4a4a54')
    cv.rect(0, 0, w - 1, h - 1, body)
    cv.hline(0, w - 1, 0, W(body, 2))
    slot_w = 52
    for i in range(5):
        x0 = 6 + i * (slot_w + 4)
        cv.rect(x0, 6, x0 + slot_w - 1, 52, hexc('2a2a30'))
        cv.rect(x0 + 1, 7, x0 + slot_w - 2, 51, hexc('34343c'))
        cv.rect(x0 + slot_w // 2 - 4, 4, x0 + slot_w // 2 + 3, 20, hexc('a8acb8'))
        cv.rect(x0 + slot_w // 2 - 3, 4, x0 + slot_w // 2 + 2, 5, hexc('d8dce4'))
    for i in range(4):
        x0 = 6 + i * 74
        cv.rect(x0, 58, x0 + 69, 90, hexc('2a2a30'))
        cv.ellipse(x0 + 35, 74, 32, 14, hexc('34343c'))
        cv.ellipse(x0 + 35, 72, 28, 10, hexc('3e3e48'))
    return cv


def tray():
    w, h = 140, 56
    cv = Canvas(w, h)
    c = hexc('8a8e98')
    cv.rrect(0, 0, w - 1, h - 1, c, 4)
    cv.rrect(3, 3, w - 4, h - 4, hexc('5a5e68'), 3)
    cv.hline(4, w - 5, 3, W(hexc('5a5e68'), -2))
    return cv


def wood_counter(w=96, h=64):
    cv = Canvas(w, h)
    base = hexc('c8986a')
    cv.rect(0, 0, w - 1, h - 1, base)
    rnd = random.Random(1)
    for y in range(0, h, 8):
        cv.hline(0, w - 1, y, W(base, -1))
        for _ in range(6):
            x = rnd.randint(0, w - 6)
            cv.hline(x, x + rnd.randint(2, 6), y + rnd.randint(2, 6), W(base, rnd.choice((-1, 1))))
    return cv


# ---------- oden ----------

ODEN = ['egg', 'daikon', 'konjac', 'chikuwa', 'fishball', 'tofu', 'kelp', 'tendon', 'mochi', 'sausage']


def oden_item(kind):
    cv = Canvas(28, 28)
    stick = hexc('d8b070')
    if kind == 'egg':
        cv.ellipse(14, 15, 8, 10, hexc('d8a860'))
        cv.shade_ball(14, 15, 8, 10, 0.8)
        cv.px(11, 9, hexc('f8e0b0')); cv.px(10, 10, hexc('f8e0b0'))
    elif kind == 'daikon':
        cv.ellipse(14, 12, 10, 5, hexc('f0d8a0'))
        cv.rect(4, 12, 23, 21, hexc('d8b070'))
        cv.ellipse(14, 21, 10, 4, hexc('d8b070'))
        cv.ellipse(14, 12, 10, 5, hexc('f0d8a0'))
        cv.ellipse(14, 12, 6, 2.5, hexc('e8c890'))
        cv.shade_cyl(4, 12, 23, 24, 0.6)
    elif kind == 'konjac':
        cv.poly([(4, 23), (24, 23), (14, 4)], hexc('8a8a90'))
        rnd = random.Random(3)
        for _ in range(16):
            x, y = rnd.randint(8, 20), rnd.randint(10, 22)
            if cv.get(x, y):
                cv.px(x, y, hexc('5a5a60'))
        cv.shade_ball(14, 16, 11, 10, 0.6)
    elif kind == 'chikuwa':
        cv.line(5, 20, 22, 7, hexc('c88040'), 7)
        cv.line(6, 19, 21, 8, hexc('f0d8b0'), 3)
        cv.ellipse(23, 7, 3, 3, hexc('f0e8d0'))
        cv.ellipse(23, 7, 1.4, 1.4, hexc('8a6040'))
    elif kind == 'fishball':
        cv.line(14, 2, 14, 26, stick, 2)
        for y in (7, 14, 21):
            cv.ellipse(14, y, 5, 4, hexc('e8d8b8'))
            cv.shade_ball(14, y, 5, 4, 0.8, dither=False)
    elif kind == 'tofu':
        cv.rrect(4, 7, 23, 22, hexc('d89a40'), 3)
        cv.shade_box(4, 7, 23, 22, 0.8)
        rnd = random.Random(5)
        for _ in range(14):
            cv.px(rnd.randint(6, 21), rnd.randint(9, 20), hexc('b87830'))
    elif kind == 'kelp':
        cv.line(14, 2, 14, 26, stick, 2)
        k, hi = hexc('2a4a3a'), hexc('4a7a5a')
        cv.line(7, 8, 21, 20, k, 4)
        cv.line(21, 8, 7, 20, k, 4)
        cv.ellipse(14, 14, 4, 3, hexc('1e3a2c'))
        cv.line(8, 8, 12, 12, hi)
        cv.line(20, 8, 17, 11, hi)
        cv.px(13, 13, hi)
    elif kind == 'tendon':
        cv.line(14, 2, 14, 26, stick, 2)
        for y in (8, 18):
            cv.ellipse(14, y, 7, 4, hexc('d8c098'))
            cv.ellipse(14, y, 4, 2, hexc('f0e0c0'))
    elif kind == 'mochi':
        cv.ellipse(14, 17, 9, 8, hexc('e0b060'))
        cv.poly([(10, 10), (18, 10), (16, 4), (12, 4)], hexc('e0b060'))
        cv.hline(10, 18, 10, hexc('5a7a3a'))
        cv.hline(10, 18, 11, hexc('5a7a3a'))
        cv.shade_ball(14, 15, 10, 11, 0.7)
    elif kind == 'sausage':
        cv.line(14, 2, 14, 26, stick, 2)
        cv.rrect(10, 7, 18, 22, hexc('c86048'), 3)
        cv.shade_cyl(10, 7, 18, 22)
        for y in (11, 15, 19):
            cv.hline(11, 17, y, hexc('8a3a2a'))
    cv.outline(0.5)
    return cv


def oden_pot():
    w, h = 240, 120
    cv = Canvas(w, h)
    rim = hexc('a8acb8')
    cv.rrect(0, 0, w - 1, h - 1, W(rim, -3), 7)
    cv.rrect(1, 1, w - 2, h - 2, rim, 6)
    cv.hline(6, w - 7, 1, W(rim, 3))
    cv.hline(6, w - 7, 2, W(rim, 2))
    cv.hline(6, w - 7, h - 3, W(rim, -2))
    light, deep = hexc('d49a4c'), hexc('9a5a22')
    for y in range(4, h - 4):
        for x in range(4, w - 4):
            cx = ((x - 4) % 46) / 45
            cy = ((y - 4) % 56) / 55
            k = min(1.0, (abs(cx - 0.5) * 1.6) ** 2 + (abs(cy - 0.45) * 1.5) ** 2)
            cv.px(x, y, mix(light, deep, k))
    rnd = random.Random(1)
    for _ in range(90):
        x, y = rnd.randint(6, w - 7), rnd.randint(6, h - 7)
        cv.px(x, y, hexc('e8b868'))
    for _ in range(30):
        x, y = rnd.randint(8, w - 9), rnd.randint(8, h - 9)
        cv.px(x, y, hexc('f4d8a0'))
        cv.px(x + 1, y, hexc('e8b868'))
    for i in range(1, 5):
        x = 4 + i * 46
        cv.vline(x - 1, 4, h - 5, W(rim, -3))
        cv.vline(x, 4, h - 5, W(rim, 2))
        cv.vline(x + 1, 4, h - 5, rim)
    cv.hline(4, w - 5, h // 2 - 2, W(rim, -3))
    cv.hline(4, w - 5, h // 2 - 1, W(rim, 2))
    cv.hline(4, w - 5, h // 2, rim)
    return cv


BOX_W, BOX_H, BOX_CY, BOX_RX, BOX_RY = 128, 92, 20, 60, 15


def _box_rim_y(x):
    """Front edge of the box opening at column x."""
    dx = (x - BOX_W / 2 + 0.5) / BOX_RX
    return BOX_CY + BOX_RY * math.sqrt(max(0.0, 1 - dx * dx))


def oden_box_back():
    """Takeaway oden bowl: the rim, inner wall and broth. Items are drawn over this, under oden_box_front."""
    cv = Canvas(BOX_W, BOX_H)
    cx = BOX_W / 2 - 0.5
    rim, wall = hexc('f4f0e8'), hexc('d8cfc0')
    cv.ellipse(cx, BOX_CY, BOX_RX, BOX_RY, rim)
    cv.ellipse(cx, BOX_CY, BOX_RX - 2, BOX_RY - 2, wall)
    for y in range(BOX_CY - BOX_RY, BOX_CY + 2):
        for x in range(BOX_W):
            if cv.get(x, y) == wall:
                cv.px(x, y, mix(hexc('b8ae9e'), wall, (y - (BOX_CY - BOX_RY)) / (BOX_RY + 2)))
    broth = hexc('c48a44')
    cv.ellipse(cx, BOX_CY + 4, BOX_RX - 6, BOX_RY - 6, broth)
    cv.ellipse(cx, BOX_CY + 5, BOX_RX - 14, BOX_RY - 9, hexc('d09a50'))
    rnd = random.Random(3)
    for _ in range(18):
        x, y = rnd.randint(12, BOX_W - 13), rnd.randint(BOX_CY - 3, BOX_CY + 10)
        if cv.get(x, y) in (broth, hexc('d09a50')):
            cv.px(x, y, hexc('e8b868'))
    cv.outline(0.5)
    return cv


def oden_box_front():
    cv = Canvas(BOX_W, BOX_H)
    cup = hexc('f4f0e8')
    bottom = BOX_H - 3
    for x in range(BOX_W):
        inset = (x < 4 or x > BOX_W - 5)
        top = _box_rim_y(x)
        for y in range(int(math.ceil(top)), bottom + 1):
            f = (y - BOX_CY) / (bottom - BOX_CY)
            left = 4 + 10 * f
            right = BOX_W - 5 - 10 * f
            if left <= x <= right and not inset:
                cv.px(x, y, cup)
        y0 = int(math.ceil(top))
        if 4 <= x <= BOX_W - 5:
            cv.px(x, y0, hexc('ffffff'))
            cv.px(x, y0 + 1, W(cup, 1))
    for x in range(BOX_W):
        top = int(math.ceil(_box_rim_y(x)))
        for y in range(top + 14, top + 22):
            if cv.get(x, y):
                cv.px(x, y, hexc('c84848') if y < top + 20 else hexc('a83838'))
    cv.shade_cyl(4, BOX_CY, BOX_W - 5, bottom, 0.6)
    cv.outline(0.5)
    return cv


# ---------- deli ----------

MEATS = {'turkey': ('e8c8a8', 'd8b090'), 'ham': ('f0a0a8', 'e08890'), 'roastbeef': ('b05a50', '904038'),
         'salami': ('b84848', 'f0c0b0'), 'swiss': ('f4e8b0', 'e0d090')}


def meat_log(kind):
    a, b = MEATS[kind]
    A, B = hexc(a), hexc(b)
    cv = Canvas(64, 40)
    cv.rrect(2, 6, 54, 34, A, 10)
    cv.ellipse(54, 20, 8, 14, B)
    cv.ellipse(54, 20, 6, 11, A)
    if kind == 'salami':
        rnd = random.Random(2)
        for _ in range(16):
            cv.px(rnd.randint(49, 59), rnd.randint(11, 29), B)
    if kind == 'swiss':
        for (x, y) in ((52, 15), (56, 24), (51, 26)):
            cv.ellipse(x, y, 1.6, 1.6, W(A, -2))
    cv.shade_cyl(2, 6, 61, 34, 0.5)
    cv.shade_vgrad(2, 6, 50, 34, 1.0, -1.0)
    cv.outline(0.5)
    return cv


def meat_slice(kind):
    a, b = MEATS[kind]
    A, B = hexc(a), hexc(b)
    cv = Canvas(30, 12)
    cv.ellipse(15, 6, 14, 5, A)
    cv.ellipse(15, 6, 14, 5, A)
    cv.hline(3, 26, 9, B)
    cv.outline(0.5)
    return cv


def slicer():
    w, h = 140, 100
    cv = Canvas(w, h)
    body = hexc('c8ccd4')
    cv.rrect(0, 50, w - 1, h - 1, body, 4)
    cv.rect(0, 92, w - 1, h - 1, W(body, -2))
    cv.ellipse(48, 46, 40, 40, hexc('9aa0ac'))
    cv.ellipse(48, 46, 36, 36, hexc('e8ecf0'))
    cv.shade_ball(48, 46, 36, 36, 0.6)
    cv.ellipse(48, 46, 8, 8, hexc('8a8e98'))
    cv.ellipse(48, 46, 3, 3, hexc('5a5e68'))
    cv.rect(84, 34, 136, 64, hexc('a8acb8'))
    cv.rect(84, 34, 136, 36, W(hexc('a8acb8'), 2))
    cv.rect(110, 10, 116, 34, hexc('8a8e98'))
    cv.rrect(104, 2, 122, 12, hexc('3a3a44'), 3)
    cv.outline(0.5)
    return cv


def scale_box():
    w, h = 100, 64
    cv = Canvas(w, h)
    body = hexc('e8ecf0')
    cv.rrect(0, 16, w - 1, h - 1, body, 4)
    cv.rect(6, 0, w - 7, 14, hexc('a8acb8'))
    cv.rect(6, 0, w - 7, 1, hexc('d8dce4'))
    cv.rect(14, 26, w - 15, 46, hexc('2a3a2a'))
    cv.rect(16, 28, w - 17, 44, hexc('324a32'))
    cv.shade_box(0, 16, w - 1, h - 1, 0.4)
    cv.outline(0.5)
    return cv


# ---------- bakery ----------

BREADS = ['croissant', 'baguette', 'muffin', 'cinnamon', 'melonpan', 'bagel', 'pretzel', 'anpan']


def bread(kind, state):
    cv = Canvas(40, 32)
    if state == 'raw':
        A = hexc('f0e0c0')
    elif state == 'good':
        A = hexc('d8984a')
    elif state == 'golden':
        A = hexc('e8a840')
    else:
        A = hexc('4a3028')
    if kind == 'croissant':
        for i, (x, r) in enumerate(((10, 5), (16, 6.5), (24, 6.5), (30, 5))):
            cv.ellipse(x, 17 - (1 if 0 < i < 3 else -1), r, r + 1, W(A, 0 if i % 2 else -1))
        cv.shade_ball(20, 16, 16, 9, 0.8)
    elif kind == 'baguette':
        cv.rrect(2, 11, 37, 21, A, 5)
        cv.shade_cyl(2, 11, 37, 21, 0.5)
        cv.shade_vgrad(2, 11, 37, 21, 1.0, -1.2)
        for x in (9, 17, 25):
            cv.line(x, 18, x + 5, 13, W(A, 3 if state != 'burnt' else 1))
    elif kind == 'muffin':
        paper = hexc('d06070')
        cv.poly([(10, 18), (30, 18), (27, 30), (13, 30)], paper)
        for x in range(12, 29, 3):
            cv.vline(x, 19, 29, W(paper, -2))
        cv.ellipse(20, 15, 12, 8, A)
        cv.shade_ball(20, 15, 12, 8, 0.8)
        for (x, y) in ((15, 13), (22, 11), (25, 16), (18, 17)):
            cv.px(x, y, hexc('3a3a8a'))
    elif kind == 'melonpan':
        top = mix(A, hexc('f8e8a0'), 0.45) if state != 'burnt' else A
        cv.ellipse(20, 18, 15, 11, top)
        cv.shade_ball(20, 18, 15, 11, 0.6)
        line = W(top, -2)
        for k in range(-30, 40, 6):
            cv.line(k, 32, k + 20, 6, line)
            cv.line(k + 20, 32, k, 6, line)
        clip = Canvas(40, 32)
        clip.ellipse(20, 18, 15, 11, top)
        for y in range(32):
            for x in range(40):
                if clip.get(x, y) is None:
                    cv.p[y][x] = None
    elif kind == 'bagel':
        cv.ellipse(20, 18, 15, 10, A)
        cv.shade_ball(20, 18, 15, 10, 0.8)
        for y in range(32):
            for x in range(40):
                if ((x - 20) / 4.5) ** 2 + ((y - 16) / 2.6) ** 2 <= 1:
                    cv.p[y][x] = None
        cv.hline(16, 24, 19, W(A, -2))
        rnd = random.Random(7)
        for _ in range(14):
            x, y = rnd.randint(8, 32), rnd.randint(10, 24)
            if cv.get(x, y) and abs(x - 20) > 5:
                cv.px(x, y, hexc('f4ecd8'))
    elif kind == 'pretzel':
        P = W(A, -2) if state not in ('raw', 'burnt') else A
        for y in range(32):
            for x in range(40):
                o = ((x - 20) / 15.5) ** 2 + ((y - 17) / 11.5) ** 2
                i = ((x - 20) / 11) ** 2 + ((y - 17) / 7.5) ** 2
                if o <= 1 and i > 1:
                    cv.px(x, y, P)
        cv.line(25, 27, 11, 9, P, 3)
        cv.line(15, 27, 29, 9, P, 3)
        cv.shade_ball(20, 17, 15.5, 11.5, 0.7)
        cv.line(12, 10, 24, 25, W(P, 2))
        if state != 'burnt':
            for (x, y) in ((8, 13), (14, 7), (26, 7), (32, 14), (12, 25), (28, 25), (20, 22), (6, 19), (34, 20)):
                cv.px(x, y, hexc('f8f8f0'))
    elif kind == 'anpan':
        cv.ellipse(20, 18, 14, 10, A)
        cv.shade_ball(20, 18, 14, 10, 0.9)
        cv.ellipse(20, 12, 3, 2, W(A, -2))
        if state != 'raw':
            for (x, y) in ((19, 11), (21, 12), (20, 13), (18, 12), (22, 11)):
                cv.px(x, y, hexc('2a2228') if state != 'burnt' else hexc('1a1210'))
        cv.px(13, 13, W(A, 3)); cv.px(14, 12, W(A, 3)); cv.px(15, 12, W(A, 2))
    else:
        cv.ellipse(20, 17, 14, 11, A)
        for r in (10, 7, 4):
            for a in range(0, 360, 12):
                t = math.radians(a + r * 20)
                cv.px(20 + r * math.cos(t), 17 + r * 0.8 * math.sin(t), W(A, -2))
        cv.shade_ball(20, 17, 14, 11, 0.7)
        if state != 'raw' and state != 'burnt':
            cv.line(10, 13, 28, 21, hexc('f8f4ec'))
            cv.line(12, 21, 27, 11, hexc('f8f4ec'))
    if state == 'burnt':
        rnd = random.Random(1)
        for _ in range(10):
            x, y = rnd.randint(5, 35), rnd.randint(8, 26)
            if cv.get(x, y):
                cv.px(x, y, hexc('1a1210'))
    cv.outline(0.5)
    return cv


def bake_sheet():
    """Tileable slice of a baking sheet with parchment, seen slightly from above."""
    cv = Canvas(32, 14)
    rim = hexc('b8bcc8')
    cv.rect(0, 0, 31, 1, W(rim, 2))
    cv.rect(0, 2, 31, 9, hexc('e8dcc0'))
    for x in (5, 13, 22, 29):
        cv.px(x, 4 + x % 3, hexc('dccfae'))
        cv.px(x + 1, 4 + x % 3, hexc('dccfae'))
    cv.rect(0, 10, 31, 11, rim)
    cv.rect(0, 12, 31, 13, W(rim, -3))
    return cv


def bake_sheet_end():
    cv = Canvas(4, 14)
    rim = hexc('b8bcc8')
    cv.rect(0, 0, 3, 13, rim)
    cv.vline(0, 0, 13, W(rim, 2))
    cv.vline(3, 2, 13, W(rim, -3))
    return cv


def oven_wall():
    cv = Canvas(32, 32)
    base = hexc('2a2a3a')
    cv.rect(0, 0, 31, 31, base)
    rnd = random.Random(9)
    for _ in range(40):
        cv.px(rnd.randint(0, 31), rnd.randint(0, 31), W(base, rnd.choice((-1, 1))))
    for _ in range(6):
        cv.px(rnd.randint(0, 31), rnd.randint(0, 31), hexc('5a5a74'))
    return cv


def oven_coil():
    cv = Canvas(32, 6)
    hot, warm = hexc('f8a040'), hexc('c84828')
    for x in range(32):
        y = 1 if (x // 4) % 2 == 0 else 3
        cv.px(x, y, hot)
        cv.px(x, y + 1, warm)
        if x % 4 == 0:
            cv.vline(x, 1, 4, warm)
    return cv


def oven_rail():
    cv = Canvas(8, 6)
    steel = hexc('9aa0ac')
    cv.rect(0, 1, 7, 4, steel)
    cv.hline(0, 7, 1, W(steel, 2))
    cv.hline(0, 7, 4, W(steel, -3))
    cv.px(3, 2, hexc('5a5e68')); cv.px(4, 2, hexc('5a5e68'))
    return cv


# ---------- coffee ----------

COFFEE = ['espresso', 'milk', 'foam', 'ice', 'water', 'vanilla', 'caramel', 'chocolate', 'whip']


def coffee_icon(kind):
    cv = Canvas(32, 32)
    if kind == 'espresso':
        cv.rect(8, 12, 21, 26, WHITE)
        cv.rect(22, 15, 25, 21, WHITE)
        cv.rect(23, 17, 24, 19, None) if False else None
        cv.rect(9, 12, 20, 15, hexc('4a2a18'))
        cv.hline(10, 19, 12, hexc('a06a40'))
        cv.rect(5, 27, 27, 28, WHITE)
        cv.shade_cyl(8, 12, 21, 26)
    elif kind == 'milk':
        cv.poly([(9, 8), (22, 8), (24, 28), (7, 28)], hexc('d8dce4'))
        cv.poly([(22, 8), (26, 6), (24, 11)], hexc('d8dce4'))
        cv.rect(24, 13, 27, 22, hexc('a8acb8'))
        cv.rect(9, 8, 22, 10, WHITE)
        cv.shade_cyl(7, 8, 24, 28)
    elif kind == 'foam':
        cv.poly([(9, 14), (22, 14), (24, 28), (7, 28)], hexc('d8dce4'))
        for (x, y, r) in ((11, 12, 4), (16, 10, 5), (21, 12, 4), (14, 14, 4), (19, 14, 4)):
            cv.ellipse(x, y, r, r - 0.5, WHITE)
        cv.shade_ball(16, 12, 9, 6, 0.5)
        cv.shade_cyl(7, 15, 24, 28)
    elif kind == 'ice':
        for (x, y) in ((7, 15), (16, 12), (11, 20), (19, 20)):
            cv.rect(x, y, x + 7, y + 7, hexc('c8e8f8'))
            cv.hline(x, x + 7, y, WHITE)
            cv.vline(x + 7, y, y + 7, hexc('8ac0d8'))
            cv.px(x + 2, y + 2, WHITE)
    elif kind == 'water':
        cv.ellipse(16, 18, 8, 9, hexc('5aa8e0'))
        cv.poly([(10, 14), (22, 14), (16, 3)], hexc('5aa8e0'))
        cv.shade_ball(16, 16, 9, 12, 0.8)
    elif kind in ('vanilla', 'caramel', 'chocolate'):
        col = {'vanilla': 'f0e0a0', 'caramel': 'c87a30', 'chocolate': '5a3020'}[kind]
        cv.rect(10, 10, 21, 28, hexc(col))
        cv.rect(13, 4, 18, 9, hexc('3a3a44'))
        cv.rect(15, 1, 16, 4, hexc('3a3a44'))
        cv.rect(19, 2, 23, 3, hexc('3a3a44'))
        cv.rect(11, 15, 20, 21, WHITE)
        fake_text(cv, 12, 18, 19, hexc(col), 1)
        cv.shade_cyl(10, 10, 21, 28)
    elif kind == 'whip':
        cv.rect(11, 12, 20, 29, hexc('e8ecf0'))
        cv.rect(11, 18, 20, 23, hexc('c84848'))
        cv.rect(14, 6, 17, 11, WHITE)
        cv.rect(15, 2, 16, 5, hexc('a8acb8'))
        cv.shade_cyl(11, 2, 20, 29)
    cv.outline(0.5)
    return cv


def coffee_cup():
    w, h = 56, 72
    cv = Canvas(w, h)
    cv.poly([(4, 8), (51, 8), (45, 71), (10, 71)], (255, 255, 255, 90))
    cv.rect(2, 4, 53, 8, hexc('d8dce4'))
    cv.outline(0.5)
    return cv


# ---------- bagging ----------

def bag_bg(kind):
    cell = 32
    w = cell * 4 + 8
    h = cell * 4 + 18
    cv = Canvas(w, h)
    c = hexc('c8a070') if kind == 'paper' else hexc('4a8ab8')
    cv.poly([(0, 10), (w - 1, 10), (w - 3, h - 1), (2, h - 1)], c)
    cv.rect(0, 6, w - 1, 12, W(c, 1))
    for x in range(0, w, 2):
        cv.px(x, 6, W(c, -1))
    inner = W(c, -2)
    cv.rect(4, 14, w - 5, h - 5, inner)
    for i in range(5):
        cv.vline(4 + i * cell, 14, h - 5, W(inner, -1))
        cv.hline(4, w - 5, 14 + i * cell, W(inner, -1))
    if kind != 'paper':
        for x in range(8, w - 8, 10):
            cv.px(x, 9, WHITE)
    cv.outline(0.5)
    return cv
