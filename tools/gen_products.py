import math
import random
from pix import Canvas, hexc, tone, mix, fake_text

S = 32
METAL = hexc('c8ccd8')
WHITE = hexc('f6f4f0')
CREAM = hexc('f4e8c8')
FOAM = hexc('e8ecf0')
INK = hexc('2a2430')
GLASS = hexc('cfe8f0')


def W(c, k):
    return tone(c, k)


# ---------- shared parts ----------

def box3d(cv, x0, y0, x1, y1, A, d=3, details=None, top=None, side=None):
    fx1 = x1 - d
    fy0 = y0 + d
    cv.rect(x0, fy0, fx1, y1, A)
    cv.poly([(x0, fy0), (x0 + d, y0), (x1 + 1, y0), (fx1 + 1, fy0)], top or W(A, 1))
    cv.poly([(fx1 + 1, fy0), (x1 + 1, y0), (x1 + 1, y1 - d + 1), (fx1 + 1, y1 + 1)], side or W(A, -2))
    if details:
        details(x0, fy0, fx1, y1)
    cv.shade_box(x0, fy0, fx1, y1, 0.7)


def can_body(cv, x0, y0, x1, y1, A, B=None, C=None, band=None, seed=0):
    cx = (x0 + x1 + 1) / 2
    rx = (x1 - x0 + 1) / 2
    cv.rect(x0, y0, x1, y1, A)
    if band and B:
        cv.rect(x0, band[0], x1, band[1], B)
        if C:
            fake_text(cv, x0 + 2, (band[0] + band[1]) // 2, x1 - 3, C, seed)
    cv.rect(x0, y1 + 1, x1, y1 + 1, METAL)
    cv.shade_cyl(x0, y0, x1, y1 + 1)
    cv.ellipse(cx, y0, rx, 2.2, METAL)
    cv.ellipse(cx, y0, rx - 1.5, 1.2, W(METAL, 1))
    cv.px(int(cx) + 1, y0, W(METAL, -2))


def tray(cv, x0, y0, x1, y1, color=FOAM):
    cv.rrect(x0, y0, x1, y1, color, 2)
    cv.rect(x0 + 1, y1 - 1, x1 - 1, y1, W(color, -1))


def wrap_shine(cv, x0, y0, x1, y1):
    for i in range(0, x1 - x0, 7):
        for k in range(4):
            x, y = x0 + i + k, y0 + 3 - k
            c = cv.get(x, y)
            if c is not None and y >= y0:
                cv.px(x, y, W(c, 3))


def price_sticker(cv, x, y, c=None):
    c = c or hexc('f0e070')
    cv.rect(x, y, x + 4, y + 2, c)
    cv.hline(x + 1, x + 3, y + 1, W(c, -3))


def pillow(cv, x0, y0, x1, y1, A, bulge=2):
    h = y1 - y0
    for y in range(y0, y1 + 1):
        t = (y - y0) / h
        b = int(round(bulge * math.sin(math.pi * t)))
        cv.rect(x0 - b + bulge, y, x1 + b - bulge, y, A)
    for x in range(x0 + bulge, x1 - bulge + 1):
        if (x - x0) % 2 == 0:
            cv.px(x, y0 - 1, W(A, -1))
            cv.px(x, y1 + 1, W(A, -1))


def leaf(cv, x, y, dx, dy, c, n=4):
    for i in range(n):
        cv.px(x + dx * i, y + dy * i, c)
        cv.px(x + dx * i + 1, y + dy * i, W(c, 1))


# ---------- produce ----------

def t_round(cv, A, B, C):
    cv.ellipse(16, 18, 10.5, 10, A)
    cv.rect(13, 8, 19, 9, W(A, -1))
    cv.shade_ball(16, 18, 10.5, 10)
    cv.px(15, 9, W(A, -3)); cv.px(16, 9, W(A, -3)); cv.px(16, 10, W(A, -2))
    cv.line(16, 9, 17, 4, C, 2)
    cv.ellipse(21, 6, 3.5, 2, B)
    cv.line(18, 6, 23, 6, W(B, -2))
    cv.px(11, 13, W(A, 4)); cv.px(12, 13, W(A, 4)); cv.px(11, 14, W(A, 4))


def t_tomato(cv, A, B, C):
    """Wider and flatter than an apple, with shallow ribs and a green star of sepals instead of a stem and leaf."""
    cv.ellipse(16, 19, 12.5, 8.5, A)
    cv.ellipse(10, 17, 5, 6, A)
    cv.ellipse(22, 17, 5, 6, A)
    cv.shade_ball(16, 19, 12.5, 8.5)
    for x in (11, 21):
        cv.line(x, 12, x - (1 if x < 16 else -1), 24, W(A, -1))
    for dx, dy in ((-5, 1), (5, 1), (-3, -2), (3, -2), (0, 2)):
        cv.line(16, 11, 16 + dx, 11 + dy, B, 2)
    cv.rect(15, 8, 16, 11, W(B, -2))
    cv.px(9, 14, W(A, 4)); cv.px(10, 14, W(A, 4)); cv.px(9, 15, W(A, 4))


def t_citrus(cv, A, B, C):
    cv.ellipse(16, 17, 12, 8.5, A)
    cv.rect(3, 16, 4, 18, A)
    cv.rect(27, 16, 28, 18, W(A, -1))
    cv.shade_ball(16, 17, 12, 8.5)
    rnd = random.Random(5)
    for _ in range(18):
        x, y = rnd.randint(7, 25), rnd.randint(12, 23)
        c = cv.get(x, y)
        if c:
            cv.px(x, y, W(c, -1))
    cv.px(10, 12, W(A, 4)); cv.px(11, 12, W(A, 4))
    cv.ellipse(19, 8, 4, 2, B)
    cv.line(16, 9, 22, 7, W(B, -2))


def t_banana(cv, A, B, C):
    for i, k in ((2, -1), (1, 0), (0, 1)):
        oy = 4 + i * 4
        for y in range(32):
            for x in range(3, 29):
                d1 = math.hypot(x + 0.5 - 16, y + 0.5 - (oy - 8))
                d2 = math.hypot(x + 0.5 - 16, y + 0.5 - (oy - 12))
                if d1 <= 19 and d2 > 19:
                    t = (19 - d1) / 4
                    cv.px(x, y, tone(A, k + (1 if t > 0.7 else (-1 if t < 0.25 else 0))))
        cv.rect(3, oy + 4, 4, oy + 5, C)
        cv.rect(26, oy + 3, 28, oy + 5, B)
    cv.rect(27, 4, 29, 8, B)
    cv.rect(27, 4, 29, 4, W(B, 2))


def t_grapes(cv, A, B, C):
    cv.line(16, 3, 17, 9, hexc('6a5030'), 2)
    cv.ellipse(21, 7, 4, 2, B)
    pos = [(10, 12), (15, 11), (20, 12), (8, 16), (13, 16), (18, 16), (23, 16), (10, 20), (15, 20), (20, 20), (13, 24), (18, 24), (16, 27)]
    for (x, y) in pos:
        cv.ellipse(x, y, 3.2, 3.2, A)
        cv.shade_ball(x, y, 3.2, 3.2, 1.1, dither=False)
        cv.px(x - 1, y - 2, W(C, 3))


def t_berries(cv, A, B, C):
    clear = mix(GLASS, (255, 255, 255, 255), 0.25)
    cv.rrect(3, 11, 28, 28, clear, 2)
    if A[0] > 150:
        for (x, y) in ((8, 16), (15, 15), (22, 16), (11, 22), (19, 22)):
            cv.poly([(x - 3, y - 2), (x + 4, y - 2), (x + 2, y + 4), (x - 1, y + 4)], A)
            cv.shade_ball(x + 0.5, y + 1, 4, 3.5, 1.0, dither=False)
            cv.hline(x - 2, x + 3, y - 3, B)
            cv.px(x, y - 4, W(B, -1))
            for (dx, dy) in ((-1, 0), (2, 1), (0, 2)):
                cv.px(x + dx, y + dy, mix(A, hexc('f8e070'), 0.5))
            cv.px(x - 2, y - 1, W(A, 3))
    else:
        for i in range(12):
            x = 7.5 + (i % 4) * 5.5 + (i // 4 % 2) * 2
            y = 15.5 + (i // 4) * 4
            cv.ellipse(x, y, 2.5, 2.2, W(A, -3))
            cv.ellipse(x - 0.4, y - 0.3, 1.9, 1.7, A)
            cv.px(int(x) - 1, int(y) - 1, B)
    cv.rect(3, 10, 28, 12, W(clear, 1))
    cv.hline(4, 27, 10, W(clear, 3))
    cv.rect(10, 25, 21, 28, WHITE)
    fake_text(cv, 11, 26, 20, W(A, -1), 3)
    for y in range(13, 26, 2):
        cv.px(4, y, W(clear, 3))


def t_melon(cv, A, B, C):
    cv.ellipse(16, 18, 14, 10, A)
    for x in range(2, 31):
        for y in range(7, 30):
            c = cv.get(x, y)
            if c is None:
                continue
            k = math.sin((x - 16) / 14 * 6 + math.sin(y / 3) * 0.8)
            if k > 0.45:
                cv.px(x, y, B)
    cv.shade_ball(16, 18, 14, 10)
    cv.px(6, 14, W(A, 4)); cv.px(7, 13, W(A, 4))
    cv.rect(15, 8, 17, 9, hexc('7a5a30'))


def t_avocado(cv, A, B, C):
    cv.ellipse(16, 20, 9, 9, A)
    cv.ellipse(16, 11, 5.5, 6, A)
    cv.shade_ball(16, 17, 10, 13)
    rnd = random.Random(3)
    for _ in range(30):
        x, y = rnd.randint(8, 24), rnd.randint(7, 28)
        c = cv.get(x, y)
        if c:
            cv.px(x, y, W(c, -1))
    cv.rect(15, 4, 16, 5, hexc('5a4028'))


def t_potato(cv, A, B, C):
    cv.ellipse(16, 19, 13, 8.5, A)
    cv.ellipse(10, 16, 6, 6, A)
    cv.shade_ball(16, 18, 14, 10)
    for (x, y) in ((9, 15), (19, 17), (14, 22), (23, 21), (12, 19)):
        cv.px(x, y, B); cv.px(x + 1, y, W(B, 1))
    cv.px(7, 13, W(C, 2)); cv.px(8, 12, W(C, 2))


def t_onion(cv, A, B, C):
    cv.ellipse(16, 19, 10.5, 10, A)
    cv.poly([(13, 10), (19, 10), (17, 4), (15, 4)], A)
    for dx in (-5, 0, 5):
        for y in range(11, 28):
            x = 16 + dx * (1 - abs(y - 19) / 12)
            c = cv.get(round(x), y)
            if c:
                cv.px(round(x), y, B)
    cv.shade_ball(16, 18, 11, 12)
    cv.rect(15, 2, 16, 4, hexc('b89060'))
    for x in range(12, 21, 2):
        cv.px(x, 29, hexc('d8c8a8'))


def t_garlic(cv, A, B, C):
    cv.ellipse(16, 20, 11, 9, A)
    cv.poly([(13, 12), (19, 12), (17, 4), (15, 4)], A)
    for dx in (-6, -2, 2, 6):
        for y in range(13, 28):
            x = 16 + dx * (1 - ((y - 20) / 10) ** 2) ** 0.5 if abs(y - 20) < 10 else 16
            c = cv.get(round(x), y)
            if c:
                cv.px(round(x), y, B)
    cv.shade_ball(16, 19, 11, 11, 0.8)
    for x in range(11, 22, 2):
        cv.px(x, 29, hexc('b8a888'))


def t_carrot(cv, A, B, C):
    for i, (x, y) in enumerate(((11, 9), (15, 10), (19, 8))):
        cv.line(x, y, x - 4 + i * 3, 2, B, 2)
        cv.line(x, y, x - 1 + i * 2, 3, W(B, 1))
    for i in range(3):
        ox = i * 4 - 4
        pts = [(9 + ox, 10), (17 + ox, 10), (14 + ox + 1, 29), (12 + ox + 1, 29)]
        cv.poly(pts, W(A, -i % 2))
    cv.shade_cyl(4, 10, 23, 29, 0.8)
    for y in (14, 18, 22, 25):
        for x in range(5, 24):
            c = cv.get(x, y)
            if c and (x + y) % 5 == 0:
                cv.px(x, y, W(c, -2)); cv.px(x + 1, y, W(c, -2))


def t_leafy(cv, A, B, C):
    for i, (cx, rot) in enumerate(((11, -1), (21, 1), (16, 0))):
        cv.ellipse(cx, 15, 6, 13, A if i < 2 else W(A, 1))
    cv.shade_cyl(4, 2, 28, 28, 0.8)
    for cx in (11, 21, 16):
        cv.line(cx, 27, cx + (cx - 16) // 3, 5, C)
    cv.rect(10, 26, 22, 29, C)
    cv.rect(10, 22, 22, 24, hexc('5a7ac0'))
    cv.rect(10, 23, 22, 23, W(hexc('5a7ac0'), 2))


def t_broccoli(cv, A, B, C):
    cv.poly([(12, 18), (20, 18), (19, 29), (13, 29)], C)
    cv.shade_cyl(12, 18, 20, 29, 0.8)
    for (x, y, r) in ((9, 13, 5.5), (16, 9, 6.5), (23, 13, 5.5), (12, 17, 5), (20, 17, 5)):
        cv.ellipse(x, y, r, r - 0.5, A)
    rnd = random.Random(9)
    for _ in range(70):
        x, y = rnd.randint(3, 29), rnd.randint(2, 22)
        c = cv.get(x, y)
        if c == A:
            cv.px(x, y, B)
    cv.shade_ball(16, 13, 14, 10, 0.9)


def t_pepper(cv, A, B, C):
    for cx in (10, 16, 22):
        cv.ellipse(cx, 19, 6.5, 10, A)
    cv.shade_ball(16, 19, 13, 11)
    cv.vline(13, 13, 27, W(A, -2)); cv.vline(19, 13, 27, W(A, -2))
    cv.rect(14, 6, 18, 9, B)
    cv.rect(15, 3, 17, 6, W(B, -1))


def t_corn(cv, A, B, C):
    cv.ellipse(16, 15, 6, 13, A)
    for y in range(3, 28, 2):
        for x in range(10, 23, 2):
            c = cv.get(x, y + (x // 2) % 2)
            if c:
                cv.px(x, y + (x // 2) % 2, W(A, -1))
    cv.shade_cyl(10, 2, 22, 28)
    cv.poly([(5, 30), (12, 10), (14, 30)], B)
    cv.poly([(27, 30), (20, 10), (18, 30)], W(B, -1))
    cv.line(11, 28, 12, 14, W(B, 2))


def t_pineapple(cv, A, B, C):
    cv.ellipse(16, 21, 8.5, 9, A)
    for y in range(12, 30):
        for x in range(7, 26):
            c = cv.get(x, y)
            if c and ((x + y) % 5 == 0 or (x - y) % 5 == 0):
                cv.px(x, y, C)
    cv.shade_ball(16, 21, 8.5, 9)
    for i, dx in enumerate((-6, -3, 0, 3, 6)):
        cv.line(16, 12, 16 + dx, 2 + abs(dx) // 2, W(B, i % 2), 2)


def t_mushroom(cv, A, B, C):
    tray(cv, 2, 20, 29, 29, C)
    for (x, y) in ((8, 16), (16, 14), (24, 16), (12, 20), (20, 20)):
        cv.rect(x - 1, y, x + 1, y + 4, W(A, -1))
        cv.ellipse(x, y, 5, 3.5, A)
        cv.shade_ball(x, y, 5, 3.5, 0.9, dither=False)
        cv.hline(x - 3, x + 3, y + 2, B)
    wrap_shine(cv, 3, 12, 28, 26)


# ---------- dairy / chilled ----------

def t_jug(cv, A, B, C):
    cv.rrect(6, 10, 25, 29, A, 3)
    cv.poly([(8, 11), (24, 11), (20, 5), (12, 5)], A)
    cv.rect(13, 2, 18, 5, B)
    cv.rect(13, 2, 18, 2, W(B, 2))
    cv.rect(20, 12, 23, 18, W(A, -1))
    cv.rect(21, 13, 22, 17, (0, 0, 0, 0))
    cv.rect(7, 18, 21, 25, B)
    fake_text(cv, 9, 20, 19, WHITE, 1)
    fake_text(cv, 9, 23, 17, W(B, 3), 2)
    cv.shade_cyl(6, 5, 25, 29, 0.9)
    for y in range(13, 18):
        cv.px(21, y, None)
        cv.p[y][21] = None
        cv.p[y][22] = None


def t_carton(cv, A, B, C):
    cv.rect(8, 11, 20, 29, A)
    cv.rect(21, 11, 24, 28, W(A, -2))
    cv.poly([(8, 11), (21, 11), (18, 5), (11, 5)], W(A, 1))
    cv.poly([(21, 11), (24, 11), (22, 5), (18, 5)], W(A, -1))
    cv.rect(11, 2, 21, 4, W(A, 1))
    cv.rect(18, 2, 21, 4, W(A, -1))
    cv.rect(8, 16, 20, 23, B)
    cv.ellipse(14, 19, 3, 2.5, C)
    fake_text(cv, 9, 25, 19, W(A, -3), 4)
    cv.shade_box(8, 11, 20, 29, 0.6)


def t_eggs(cv, A, B, C):
    cv.rrect(1, 16, 30, 28, A, 2)
    for i in range(6):
        x = 4 + i * 4.8
        cv.ellipse(x + 1.5, 14, 2.6, 3.5, B)
        cv.shade_ball(x + 1.5, 14, 2.6, 3.5, 1.0, dither=False)
    cv.rect(1, 16, 30, 17, W(A, 1))
    for i in range(6):
        cv.vline(int(4 + i * 4.8) + 3, 19, 26, W(A, -1))
    cv.shade_box(1, 16, 30, 28, 0.5)
    cv.rect(9, 21, 22, 25, WHITE)
    fake_text(cv, 10, 23, 21, hexc('c04040'), 2)


def t_butter(cv, A, B, C):
    box3d(cv, 2, 10, 29, 26, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 4, x1, y0 + 9, B),
        fake_text(cv, x0 + 3, y0 + 6, x1 - 3, C, 1),
        fake_text(cv, x0 + 5, y0 + 8, x1 - 6, W(B, 2), 2),
    ))


def t_cheese(cv, A, B, C):
    cv.poly([(3, 14), (27, 9), (29, 13), (29, 26), (3, 26)], A)
    cv.poly([(3, 14), (27, 9), (29, 13), (5, 17)], W(A, 2))
    for (x, y, r) in ((9, 21, 1.8), (17, 19, 2.2), (24, 22, 1.6), (13, 24, 1.2)):
        cv.ellipse(x, y, r, r, W(A, -2))
    cv.rect(3, 18, 29, 21, B)
    fake_text(cv, 6, 19, 26, WHITE, 5)
    cv.shade_box(3, 17, 29, 26, 0.6)


def t_tub(cv, A, B, C):
    cv.profile(16, 14, [24, 24, 23, 23, 22, 22, 22, 21, 21, 21, 20, 20, 20, 19, 19], A)
    cv.rect(10, 18, 22, 24, C)
    fake_text(cv, 11, 20, 21, B, 2)
    fake_text(cv, 12, 22, 20, W(C, -3), 3)
    cv.shade_cyl(4, 14, 28, 28)
    cv.ellipse(16, 12, 13, 3, B)
    cv.ellipse(16, 11, 11, 2, W(B, 2))


def t_yogurt(cv, A, B, C):
    cv.profile(16, 9, [20, 20, 19, 19, 18, 18, 18, 17, 17, 17, 16, 16, 16, 15, 15, 15, 14, 14, 14, 13], A)
    cv.rect(9, 14, 23, 21, B)
    cv.ellipse(16, 17, 4, 3, C)
    fake_text(cv, 10, 23, 21, W(B, -1), 1)
    cv.shade_cyl(6, 9, 26, 28)
    cv.ellipse(16, 8, 11, 2.5, METAL)
    cv.ellipse(16, 7, 9, 1.5, W(METAL, 2))
    cv.rect(26, 8, 28, 9, METAL)


def t_squeeze(cv, A, B, C):
    cv.rrect(9, 6, 23, 26, A, 4)
    cv.rect(12, 26, 20, 29, B)
    cv.rect(13, 27, 19, 29, W(B, -1))
    cv.rect(10, 13, 22, 20, C)
    fake_text(cv, 11, 15, 21, W(A, -2), 2)
    fake_text(cv, 12, 18, 20, W(A, -2), 3)
    cv.shade_cyl(9, 6, 23, 29)


def t_meattray(cv, A, B, C):
    tray(cv, 1, 14, 30, 28, B)
    cv.ellipse(16, 19, 12, 5.5, A)
    rnd = random.Random(1)
    for _ in range(50):
        x, y = rnd.randint(5, 27), rnd.randint(14, 24)
        c = cv.get(x, y)
        if c and c == A:
            cv.px(x, y, W(A, rnd.choice((-1, 1))))
    cv.shade_ball(16, 19, 12, 5.5, 0.6)
    wrap_shine(cv, 2, 13, 29, 26)
    price_sticker(cv, 21, 24)


def t_steak(cv, A, B, C):
    tray(cv, 1, 14, 30, 28, B)
    cv.poly([(5, 16), (14, 13), (26, 15), (27, 22), (18, 25), (6, 23)], A)
    cv.line(7, 17, 24, 22, C)
    cv.line(10, 21, 18, 16, C)
    cv.poly([(5, 16), (14, 13), (12, 15), (6, 18)], C)
    cv.shade_ball(16, 19, 12, 6, 0.6)
    wrap_shine(cv, 2, 13, 29, 26)
    price_sticker(cv, 21, 24)


def t_chicken(cv, A, B, C):
    tray(cv, 1, 14, 30, 28, B)
    for (x, y) in ((10, 19), (21, 19)):
        cv.ellipse(x, y, 7, 5, A)
        cv.shade_ball(x, y, 7, 5, 0.8)
        cv.line(x - 4, y + 1, x + 3, y - 1, C)
    wrap_shine(cv, 2, 13, 29, 26)
    price_sticker(cv, 21, 24, hexc('f0a040'))


def t_wings(cv, A, B, C):
    tray(cv, 1, 14, 30, 28, B)
    for (x, y) in ((7, 18), (13, 21), (19, 18), (25, 21), (10, 16), (22, 16)):
        cv.ellipse(x, y, 4, 2.6, A)
        cv.shade_ball(x, y, 4, 2.6, 0.9, dither=False)
        cv.px(x + 3, y + 1, C)
    wrap_shine(cv, 2, 13, 29, 26)
    price_sticker(cv, 21, 24, hexc('f0a040'))


def t_bacon(cv, A, B, C):
    cv.rect(1, 9, 30, 25, B)
    cv.rect(1, 9, 9, 25, C)
    fake_text(cv, 2, 13, 8, WHITE, 1)
    fake_text(cv, 2, 16, 7, WHITE, 2)
    for i in range(4):
        y = 11 + i * 3.5
        for x in range(11, 29):
            yy = int(y + math.sin(x / 2.2 + i) * 1.0)
            cv.px(x, yy, A); cv.px(x, yy + 1, W(A, -1)); cv.px(x, yy + 2, B)
    cv.shade_box(1, 9, 30, 25, 0.6)
    wrap_shine(cv, 11, 10, 29, 24)


def t_sausage(cv, A, B, C):
    cv.rect(1, 9, 30, 26, mix(GLASS, (255, 255, 255, 255), 0.5))
    for i in range(4):
        y = 12 + i * 3.5
        cv.rrect(3, int(y), 28, int(y) + 3, A, 1)
        cv.hline(5, 26, int(y), W(A, 2))
        cv.hline(5, 26, int(y) + 3, W(A, -2))
    cv.rect(1, 22, 30, 26, B)
    fake_text(cv, 4, 24, 26, C if C[0] > 100 else WHITE, 6)
    cv.shade_box(1, 9, 30, 26, 0.5)


def t_deli(cv, A, B, C):
    cv.rrect(2, 8, 29, 27, mix(GLASS, (255, 255, 255, 255), 0.5), 3)
    for (x, y) in ((12, 17), (18, 18), (15, 15)):
        cv.ellipse(x, y, 7, 6, A)
        cv.ellipse(x, y, 5, 4, W(A, 1))
        cv.ellipse(x, y, 7, 6, None) if False else None
    for y in range(9, 26):
        for x in range(3, 29):
            c = cv.get(x, y)
            if c and c == A and (x + y) % 6 == 0 and A[0] < 200:
                cv.px(x, y, C)
    cv.rect(2, 23, 29, 27, B)
    fake_text(cv, 5, 25, 26, WHITE, 3)
    cv.shade_box(2, 8, 29, 27, 0.5)
    wrap_shine(cv, 4, 9, 28, 21)


def t_fish(cv, A, B, C):
    tray(cv, 1, 14, 30, 28, B)
    cv.poly([(4, 18), (10, 14), (26, 15), (28, 19), (24, 24), (8, 24)], A)
    for x in range(9, 26, 3):
        cv.line(x, 15, x - 2, 23, C)
    cv.shade_ball(16, 19, 13, 6, 0.6)
    wrap_shine(cv, 2, 13, 29, 26)
    price_sticker(cv, 21, 24)


def t_shrimp(cv, A, B, C):
    tray(cv, 1, 14, 30, 28, B)
    for (x, y) in ((8, 19), (16, 18), (24, 19), (12, 23), (20, 23)):
        for a in range(0, 200, 14):
            t = math.radians(a)
            cv.px(x + 3 * math.cos(t), y + 2.4 * math.sin(t), A)
            cv.px(x + 2 * math.cos(t), y + 1.6 * math.sin(t), W(A, 1))
        cv.px(x - 3, y - 1, C)
    wrap_shine(cv, 2, 13, 29, 26)


def t_tofu(cv, A, B, C):
    box3d(cv, 3, 10, 28, 27, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0, x1, y0 + 6, B),
        fake_text(cv, x0 + 3, y0 + 3, x1 - 3, WHITE, 2),
        cv.rect(x0 + 3, y0 + 9, x1 - 3, y1 - 2, C),
    ))


def t_roast(cv, A, B, C):
    cv.rrect(2, 22, 29, 28, B, 2)
    cv.ellipse(16, 18, 11, 7.5, A)
    cv.ellipse(7, 21, 3, 2.5, A)
    cv.ellipse(25, 21, 3, 2.5, A)
    cv.shade_ball(16, 18, 11, 7.5)
    cv.px(10, 14, C); cv.px(11, 13, C); cv.px(12, 13, C)
    for x in range(3, 29):
        y = 22 - int(14 * math.sin(math.pi * (x - 2) / 27))
        c = cv.get(x, y)
        if c is None:
            cv.px(x, y, W(GLASS, 1))
    cv.px(9, 10, WHITE); cv.px(10, 9, WHITE)


# ---------- frozen ----------

def t_pizzabox(cv, A, B, C):
    box3d(cv, 1, 9, 30, 27, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.ellipse(15, y0 + 8, 9, 6, hexc('d89a50')),
        cv.ellipse(15, y0 + 8, 7.5, 4.8, B),
        [cv.ellipse(x, y, 1.4, 1.2, hexc('b03020')) for (x, y) in ((11, y0 + 6), (17, y0 + 7), (13, y0 + 10), (19, y0 + 10), (15, y0 + 5))],
        cv.rect(x0 + 1, y0 + 1, x1 - 1, y0 + 2, C),
        fake_text(cv, x0 + 2, y0 + 1, x1 - 3, W(A, -2), 1),
    ))
    for (x, y) in ((4, 12), (27, 22), (22, 13)):
        cv.px(x, y, WHITE)


def t_frozenbox(cv, A, B, C):
    box3d(cv, 6, 3, 26, 29, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 2, x1, y0 + 6, C),
        fake_text(cv, x0 + 2, y0 + 4, x1 - 2, A, 3),
        cv.rrect(x0 + 2, y0 + 9, x1 - 2, y0 + 18, B, 2),
        cv.rect(x0 + 4, y0 + 12, x1 - 4, y0 + 13, W(B, -2)),
        cv.rect(x0 + 5, y0 + 15, x1 - 6, y0 + 16, W(B, 2)),
        fake_text(cv, x0 + 2, y1 - 2, x1 - 4, WHITE, 4),
    ))
    for (x, y) in ((8, 9), (19, 27), (7, 22)):
        cv.px(x, y, WHITE)


def t_frozenbag(cv, A, B, C):
    pillow(cv, 5, 4, 26, 28, A, 2)
    cv.rrect(9, 12, 22, 22, WHITE, 2)
    rnd = random.Random(sum(B))
    for _ in range(14):
        x, y = rnd.randint(10, 21), rnd.randint(13, 21)
        cv.ellipse(x + 0.5, y + 0.5, 1.4, 1.4, rnd.choice((B, C, W(B, 1))))
    fake_text(cv, 8, 7, 23, WHITE, 2)
    fake_text(cv, 10, 25, 21, W(A, 3), 3)
    cv.shade_cyl(3, 3, 28, 29, 0.8)
    for (x, y) in ((6, 10), (25, 18)):
        cv.px(x, y, WHITE)


def t_icecream(cv, A, B, C):
    cv.profile(16, 10, [24] * 2 + [23] * 4 + [22] * 4 + [21] * 4 + [20] * 4, B)
    cv.rect(6, 13, 26, 22, A)
    cv.ellipse(16, 17, 6, 4, W(A, 1))
    rnd = random.Random(2)
    for _ in range(8):
        cv.px(rnd.randint(11, 21), rnd.randint(14, 20), C)
    fake_text(cv, 7, 24, 25, W(B, 3), 1)
    cv.shade_cyl(4, 10, 28, 27)
    cv.ellipse(16, 8, 13, 3.5, A)
    cv.ellipse(16, 7, 11, 2, W(A, 2))
    cv.rect(3, 8, 29, 9, W(A, -1))


def t_icebag(cv, A, B, C):
    pillow(cv, 4, 4, 27, 29, A, 2)
    rnd = random.Random(4)
    for _ in range(9):
        x, y = rnd.randint(7, 22), rnd.randint(13, 25)
        cv.rect(x, y, x + 3, y + 3, W(A, 2))
        cv.px(x, y, WHITE)
    cv.rect(6, 6, 25, 11, B)
    fake_text(cv, 8, 8, 23, WHITE, 1)
    cv.shade_cyl(2, 3, 29, 30, 0.6)


# ---------- bakery ----------

def t_loaf(cv, A, B, C):
    cv.rrect(2, 11, 29, 27, A, 5)
    cv.rect(2, 9, 6, 13, mix(GLASS, WHITE, 0.6))
    cv.shade_vgrad(2, 11, 29, 27, 1.2, -1.2)
    cv.rect(23, 9, 30, 27, mix(GLASS, WHITE, 0.6))
    cv.rect(26, 15, 27, 23, B)
    cv.rect(8, 16, 20, 22, WHITE)
    cv.rect(8, 17, 20, 17, C)
    fake_text(cv, 9, 20, 19, B, 2)
    for x in range(5, 22, 4):
        cv.px(x, 12, W(A, 3)); cv.px(x + 1, 12, W(A, 3))


def t_boule(cv, A, B, C):
    cv.ellipse(16, 19, 13, 10, A)
    cv.shade_ball(16, 19, 13, 10)
    for i in range(3):
        cv.line(9 + i * 6, 12, 12 + i * 6, 24, W(C, 0), 1)
        cv.line(10 + i * 6, 12, 13 + i * 6, 24, W(A, -2), 1)
    for (x, y) in ((6, 14), (24, 13), (14, 9)):
        cv.px(x, y, CREAM)


def t_buns(cv, A, B, C):
    cv.rrect(1, 11, 30, 28, mix(GLASS, WHITE, 0.6), 3)
    for i in range(4):
        x = 5 + i * 7.3
        cv.ellipse(x + 0.5, 18, 4.2, 4.5, A)
        cv.shade_ball(x + 0.5, 18, 4.2, 4.5, 1.0, dither=False)
        cv.px(int(x) - 1, 15, W(A, 3))
    cv.rect(1, 23, 30, 28, B)
    fake_text(cv, 4, 25, 26, C, 3)
    cv.rect(13, 8, 17, 11, C)


def t_hotdogbuns(cv, A, B, C):
    cv.rrect(1, 10, 30, 28, mix(GLASS, WHITE, 0.6), 3)
    for i in range(3):
        y = 13 + i * 4
        cv.rrect(3, y, 28, y + 3, A, 1)
        cv.hline(5, 26, y, W(A, 2))
        cv.hline(5, 26, y + 3, W(A, -2))
    cv.rect(1, 25, 30, 28, B)
    fake_text(cv, 4, 26, 26, C, 3)


def t_bagels(cv, A, B, C):
    cv.rrect(2, 7, 29, 29, mix(GLASS, WHITE, 0.65), 3)
    for (x, y) in ((10, 14), (21, 14), (10, 23), (21, 23)):
        cv.ellipse(x, y, 5.5, 4.5, A)
        cv.shade_ball(x, y, 5.5, 4.5, 0.9, dither=False)
        cv.ellipse(x, y, 1.6, 1.2, mix(GLASS, WHITE, 0.65))
        cv.px(x - 2, y - 3, W(A, 3))
    cv.rect(8, 4, 23, 7, C)
    fake_text(cv, 9, 5, 22, WHITE, 1)


def t_tortilla(cv, A, B, C):
    cv.ellipse(16, 18, 14, 10, mix(GLASS, WHITE, 0.6))
    cv.ellipse(16, 18, 12.5, 8.5, A)
    rnd = random.Random(7)
    for _ in range(14):
        cv.px(rnd.randint(6, 25), rnd.randint(12, 24), C)
    cv.rect(7, 15, 24, 21, B)
    fake_text(cv, 9, 17, 22, WHITE, 2)
    fake_text(cv, 10, 19, 21, W(B, 3), 3)
    cv.shade_ball(16, 18, 14, 10, 0.5)


def t_pastrybox(cv, A, B, C):
    box3d(cv, 1, 8, 30, 28, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 6, mix(GLASS, WHITE, 0.3)),
        [cv.ellipse(x0 + 5 + i * 6, y0 + 7, 3, 2.8, B) for i in range(4)],
        [cv.ellipse(x0 + 5 + i * 6, y0 + 7, 1.0, 1.0, mix(GLASS, WHITE, 0.3)) if A[0] > 240 and A[1] < 200 else cv.px(x0 + 4 + i * 6, y0 + 6, W(B, 3)) for i in range(4)],
        [cv.px(x0 + 5 + i * 6, y0 + 9, C) for i in range(4)],
        fake_text(cv, x0 + 3, y1 - 3, x1 - 3, W(A, -4), 5),
    ))


# ---------- snacks / candy ----------

def t_chipbag(cv, A, B, C):
    pillow(cv, 4, 3, 27, 29, A, 2)
    cv.ellipse(16, 17, 8, 7, B)
    cv.ellipse(16, 17, 6, 5, C)
    for (x, y) in ((14, 16), (18, 18), (16, 15)):
        cv.ellipse(x, y, 2, 1.5, W(C, -1))
    cv.rect(7, 6, 24, 8, W(A, -1))
    fake_text(cv, 8, 7, 23, WHITE if A[0] < 200 or A[2] > 150 else INK, 1)
    fake_text(cv, 9, 26, 22, W(A, 3), 2)
    cv.shade_cyl(2, 2, 29, 30, 0.8)


def t_box(cv, A, B, C):
    box3d(cv, 5, 3, 26, 29, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 3, x1, y0 + 7, B),
        fake_text(cv, x0 + 2, y0 + 5, x1 - 2, WHITE if sum(B[:3]) < 450 else INK, 1),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 15, 5, 4, C),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 15, 3, 2, W(C, -2)),
        fake_text(cv, x0 + 2, y1 - 2, x1 - 4, W(A, -3), 4),
    ))


def t_popcorn(cv, A, B, C):
    cv.poly([(7, 10), (25, 10), (23, 29), (9, 29)], B)
    for i in range(4):
        x0 = 8 + i * 4.5
        cv.poly([(x0, 10), (x0 + 2.3, 10), (x0 + 2.0 + (i - 1.5) * -0.2, 29), (x0 - 0.2, 29)], A)
    cv.shade_cyl(7, 10, 25, 29)
    for (x, y) in ((9, 8), (13, 6), (17, 7), (21, 6), (24, 8), (11, 4), (16, 3), (20, 4), (15, 9)):
        cv.ellipse(x, y, 2.3, 2.1, C)
        cv.px(x - 1, y - 1, WHITE)
    cv.rect(10, 17, 22, 22, WHITE)
    fake_text(cv, 11, 19, 21, A, 3)


def t_cookies(cv, A, B, C):
    cv.rrect(1, 9, 30, 25, A, 4)
    cv.shade_vgrad(1, 9, 30, 25, 1.0, -1.2)
    for i in range(3):
        x = 7 + i * 7
        cv.ellipse(x, 17, 4.5, 4.5, B)
        cv.shade_ball(x, 17, 4.5, 4.5, 0.9, dither=False)
        if sum(C[:3]) > 600:
            cv.hline(x - 3, x + 3, 17, C)
        else:
            for (dx, dy) in ((-1, -1), (2, 0), (0, 2)):
                cv.px(x + dx, 17 + dy, C)
    cv.rect(24, 11, 29, 23, W(A, 2))
    fake_text(cv, 25, 14, 28, WHITE, 1)


def t_jar(cv, A, B, C):
    cv.rrect(7, 9, 24, 29, A, 3)
    cv.rect(9, 15, 22, 24, C)
    fake_text(cv, 10, 17, 21, B, 2)
    fake_text(cv, 11, 20, 20, W(C, -3), 3)
    cv.rect(13, 22, 18, 22, B)
    cv.shade_cyl(7, 9, 24, 29)
    cv.rect(8, 4, 23, 8, B)
    cv.shade_cyl(8, 4, 23, 8)
    cv.hline(8, 23, 4, W(B, 2))


def t_nutbag(cv, A, B, C):
    cv.poly([(6, 3), (25, 3), (27, 29), (4, 29)], A)
    cv.rect(6, 3, 25, 5, W(A, -1))
    cv.rrect(10, 13, 21, 24, mix(GLASS, WHITE, 0.4), 2)
    rnd = random.Random(sum(A))
    for _ in range(16):
        x, y = rnd.randint(11, 20), rnd.randint(14, 23)
        cv.ellipse(x + 0.5, y + 0.5, 1.5, 1.1, rnd.choice((C, W(C, -1), W(A, 1))))
    cv.rect(7, 7, 24, 10, B)
    fake_text(cv, 8, 8, 23, WHITE, 1)
    cv.shade_cyl(4, 3, 27, 29, 0.8)


def t_ricecakes(cv, A, B, C):
    cv.rrect(1, 9, 30, 25, mix(GLASS, WHITE, 0.6), 4)
    for x in range(3, 29, 3):
        cv.rect(x, 10, x + 1, 24, A)
        cv.vline(x + 2, 10, 24, W(A, -2))
    cv.rect(11, 9, 20, 25, B)
    fake_text(cv, 12, 14, 19, WHITE, 2)
    fake_text(cv, 12, 18, 19, WHITE, 3)
    cv.shade_vgrad(1, 9, 30, 25, 1.0, -1.0)


def t_candybar(cv, A, B, C):
    cv.rect(3, 11, 28, 22, A)
    for y in range(11, 23):
        cv.px(2 - (y % 2), y, W(A, -1))
        cv.px(29 + (y % 2), y, W(A, -1))
    cv.rect(8, 13, 23, 20, B)
    fake_text(cv, 9, 15, 22, A, 2)
    fake_text(cv, 10, 18, 21, C if C != A else W(A, 2), 3)
    cv.shade_vgrad(1, 11, 30, 22, 1.2, -1.2)


def t_candybag(cv, A, B, C):
    pillow(cv, 5, 4, 26, 28, A, 2)
    cv.rrect(9, 13, 22, 24, mix(GLASS, WHITE, 0.4), 3)
    rnd = random.Random(sum(B) + sum(C))
    cols = [B, C, hexc('f08030'), hexc('40b0e0'), hexc('f0d040')]
    for _ in range(12):
        x, y = rnd.randint(10, 20), rnd.randint(14, 22)
        cv.ellipse(x + 1, y + 1, 1.7, 1.5, rnd.choice(cols))
    cv.rect(8, 7, 23, 10, B)
    fake_text(cv, 9, 8, 22, WHITE, 1)
    cv.shade_cyl(3, 3, 28, 29, 0.8)


def t_licorice(cv, A, B, C):
    pillow(cv, 5, 4, 26, 28, B, 2)
    for i in range(5):
        x = 9 + i * 3
        for y in range(10, 25):
            cv.px(x + ((y // 2) % 2), y, A if (y % 2) else C)
    cv.rect(7, 6, 24, 8, A)
    fake_text(cv, 8, 7, 23, WHITE, 1)
    cv.shade_cyl(3, 3, 28, 29, 0.7)


def t_mints(cv, A, B, C):
    cv.rrect(5, 9, 26, 25, A, 4)
    cv.ellipse(15.5, 17, 6, 5, B)
    cv.ellipse(15.5, 17, 4, 3, W(B, 2))
    cv.shade_ball(15.5, 17, 12, 9, 0.6)
    fake_text(cv, 9, 23, 22, W(A, -3), 1)


def t_gum(cv, A, B, C):
    box3d(cv, 4, 10, 27, 24, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 3, x1, y0 + 6, B),
        fake_text(cv, x0 + 2, y0 + 4, x1 - 2, A, 3),
        fake_text(cv, x0 + 3, y1 - 2, x1 - 3, C, 1),
    ))


def t_lollipop(cv, A, B, C):
    pillow(cv, 4, 4, 27, 28, mix(GLASS, WHITE, 0.6), 2)
    for i, (x, y, c) in enumerate(((10, 12, B), (16, 10, C), (22, 12, hexc('f0d040')), (13, 17, hexc('7ad03a')), (19, 17, hexc('f08030')))):
        cv.vline(x, y + 3, y + 10, WHITE)
        cv.ellipse(x + 0.5, y + 0.5, 3.2, 3.2, c)
        cv.px(x - 1, y - 1, W(c, 3))
    cv.rect(6, 24, 25, 27, B)
    fake_text(cv, 8, 25, 23, WHITE, 2)


# ---------- beverages ----------

def t_can(cv, A, B, C):
    can_body(cv, 9, 7, 22, 28, A, B, C, band=(14, 19), seed=1)
    for x in range(10, 22, 3):
        c = cv.get(x, 23)
        if c:
            cv.px(x, 23, W(c, 2))


def t_tallcan(cv, A, B, C):
    can_body(cv, 10, 4, 21, 29, A)
    for y in range(9, 26):
        x = 12 + int(3 * math.sin(y / 2))
        cv.px(x, y, B); cv.px(x + 1, y, W(B, -1))
    cv.rect(10, 13, 21, 15, C)
    fake_text(cv, 11, 14, 20, B, 2)


def bottle_shape(cv, cx, A, cap, body_w, top=3, neck=3, shoulder=4, bottom=29, cap_h=2):
    cv.rect(cx - 2, top, cx + 1, top + cap_h - 1, cap)
    nt = top + cap_h
    cv.rect(cx - 2, nt, cx + 1, nt + neck - 1, A)
    st = nt + neck
    for i in range(shoulder):
        w = 4 + (body_w - 4) * (i + 1) / shoulder
        cv.rect(round(cx - w / 2), st + i, round(cx + w / 2) - 1, st + i, A)
    cv.rect(cx - body_w // 2, st + shoulder, cx + body_w // 2 - 1, bottom, A)
    return st + shoulder


def t_bottle2l(cv, A, B, C):
    y = bottle_shape(cv, 16, mix(A, C, 0.25), B, 14, top=2, neck=3, shoulder=5)
    cv.rect(9, y + 3, 22, y + 10, B)
    fake_text(cv, 10, y + 5, 21, WHITE, 1)
    fake_text(cv, 11, y + 8, 20, W(B, 3), 2)
    cv.rect(9, 27, 22, 29, W(A, -1))
    cv.shade_cyl(9, 2, 22, 29)
    cv.vline(11, y - 2, 26, W(C, 3))


def t_canpack(cv, A, B, C):
    box3d(cv, 1, 6, 30, 28, A, d=5, top=W(A, 1), details=lambda x0, y0, x1, y1: (
        cv.rect(x0 + 2, y0 + 4, x1 - 2, y0 + 9, B),
        fake_text(cv, x0 + 3, y0 + 6, x1 - 3, A, 2),
        [can_body(cv, x0 + 2 + i * 6, y0 + 12, x0 + 6 + i * 6, y1 - 2, A, B, None) for i in range(4)],
    ))


def t_water(cv, A, B, C):
    y = bottle_shape(cv, 16, A, B, 10, top=3, neck=3, shoulder=4)
    for yy in range(y + 2, 29, 3):
        cv.hline(11, 20, yy, W(A, 1))
    cv.rect(11, y + 5, 20, y + 10, B)
    fake_text(cv, 12, y + 7, 19, C, 1)
    cv.shade_cyl(11, 3, 20, 29)
    cv.vline(13, y, 28, WHITE)


def t_watercase(cv, A, B, C):
    cv.rect(1, 14, 30, 29, mix(A, WHITE, 0.3))
    for r in range(2):
        for i in range(6):
            x = 3 + i * 4.6
            y = 6 + r * 4
            cv.rect(round(x), y + 3, round(x) + 3, y + 7, A)
            cv.rect(round(x) + 1, y, round(x) + 2, y + 2, B)
    cv.rect(1, 18, 30, 24, B)
    fake_text(cv, 4, 20, 27, WHITE, 1)
    fake_text(cv, 6, 22, 25, W(B, 3), 2)
    cv.shade_box(1, 14, 30, 29, 0.6)


def t_sports(cv, A, B, C):
    y = bottle_shape(cv, 16, A, B, 12, top=3, neck=2, shoulder=3, cap_h=3)
    cv.rect(10, y + 1, 21, 27, A)
    cv.rect(10, y + 6, 21, y + 13, B)
    cv.poly([(12, y + 13), (19, y + 6), (21, y + 6), (14, y + 13)], C)
    fake_text(cv, 11, y + 8, 18, W(B, -4), 1)
    cv.shade_cyl(10, 3, 21, 29)


def t_juice(cv, A, B, C):
    cv.rrect(7, 9, 24, 29, A, 3)
    cv.rect(10, 4, 17, 8, A)
    cv.rect(10, 2, 17, 4, B)
    cv.rect(19, 10, 22, 17, W(A, -1))
    cv.rect(10, 16, 21, 24, C)
    cv.ellipse(15.5, 20, 3, 2.5, B)
    fake_text(cv, 11, 23, 20, B, 2)
    cv.shade_cyl(7, 2, 24, 29)
    for y in range(12, 16):
        cv.p[y][20] = None
        cv.p[y][21] = None


def t_coffeebag(cv, A, B, C):
    cv.poly([(7, 4), (24, 4), (26, 29), (5, 29)], A)
    cv.rect(7, 4, 24, 6, W(A, 1))
    cv.rect(8, 11, 23, 21, B)
    cv.ellipse(15.5, 16, 3.5, 2.5, C)
    cv.vline(15, 14, 18, W(C, -3))
    fake_text(cv, 9, 12, 22, WHITE, 1)
    fake_text(cv, 9, 24, 22, W(A, 3), 3)
    cv.ellipse(20, 8, 1.6, 1.4, W(A, -2))
    cv.shade_cyl(5, 4, 26, 29, 0.8)


def t_teabox(cv, A, B, C):
    box3d(cv, 2, 8, 29, 27, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 2, x1, y0 + 5, B),
        fake_text(cv, x0 + 2, y0 + 3, x1 - 2, A, 2),
        cv.rrect(x0 + 8, y0 + 8, x0 + 16, y0 + 13, C, 1),
        cv.rect(x0 + 17, y0 + 9, x0 + 18, y0 + 11, C),
        cv.vline(x0 + 11, y0 + 5, y0 + 8, B),
    ))


# ---------- breakfast / pantry ----------

def t_cereal(cv, A, B, C):
    box3d(cv, 4, 1, 27, 30, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rect(x0 + 1, y0 + 2, x1 - 1, y0 + 6, B),
        fake_text(cv, x0 + 2, y0 + 4, x1 - 2, WHITE if sum(B[:3]) < 500 else INK, 1),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 17, 8, 4.5, WHITE),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 15, 7, 2.5, C),
        [cv.px(x0 + 5 + i * 3, y0 + 14 + (i % 2), W(C, -2)) for i in range(4)],
        cv.rect(x0 + 5, y0 + 19, x1 - 5, y0 + 20, W(WHITE, -2)),
    ))


def t_canister(cv, A, B, C):
    cv.rect(8, 7, 23, 29, A)
    cv.rect(8, 12, 23, 22, C)
    cv.ellipse(15.5, 17, 4, 3.5, B)
    fake_text(cv, 9, 25, 22, WHITE, 2)
    cv.shade_cyl(8, 7, 23, 29)
    cv.ellipse(15.5, 6, 8, 2.5, B)
    cv.ellipse(15.5, 5, 6.5, 1.5, W(B, 2))


def t_syrup(cv, A, B, C):
    cv.rrect(8, 12, 23, 29, A, 3)
    cv.rect(12, 5, 18, 12, A)
    cv.rect(12, 3, 18, 5, C)
    cv.ellipse(21, 12, 3, 3.5, A)
    cv.ellipse(21, 12, 1.5, 2, None) if False else None
    cv.px(21, 12, None)
    cv.p[12][21] = None
    cv.rect(9, 18, 22, 25, B)
    fake_text(cv, 10, 20, 21, W(A, -1), 1)
    fake_text(cv, 11, 23, 20, C, 2)
    cv.shade_cyl(8, 3, 24, 29)


def t_honey(cv, A, B, C):
    cv.ellipse(16, 22, 9, 7.5, A)
    cv.ellipse(16, 12, 6.5, 5.5, A)
    cv.ellipse(10.5, 7.5, 2, 2, A)
    cv.ellipse(21.5, 7.5, 2, 2, A)
    cv.rect(13, 2, 18, 5, hexc('d03030'))
    cv.rect(10, 20, 22, 25, C)
    fake_text(cv, 11, 22, 21, B, 2)
    cv.shade_ball(16, 17, 11, 13, 0.9)
    cv.px(14, 11, INK); cv.px(18, 11, INK)


def t_pastabox(cv, A, B, C):
    box3d(cv, 1, 9, 30, 25, A, d=4, details=lambda x0, y0, x1, y1: (
        cv.rrect(x0 + 3, y0 + 3, x1 - 3, y1 - 4, B, 1),
        [cv.hline(x0 + 4, x1 - 4, y, W(B, -1 if y % 2 else 1)) for y in range(y0 + 4, y1 - 4)],
        cv.rect(x0, y1 - 2, x1, y1, C),
        fake_text(cv, x0 + 2, y1 - 1, x1 - 2, A, 3),
    ))


def t_ramen(cv, A, B, C):
    pillow(cv, 3, 7, 28, 26, A, 2)
    cv.ellipse(16, 18, 8, 5, WHITE)
    cv.ellipse(16, 16, 7, 2.5, B)
    for x in range(10, 22, 2):
        cv.vline(x, 14, 17, W(B, -2))
    cv.rect(6, 9, 25, 11, B)
    fake_text(cv, 7, 10, 24, A, 1)
    cv.shade_cyl(1, 6, 30, 27, 0.7)


def t_ricebag(cv, A, B, C):
    cv.rrect(3, 8, 28, 29, A, 4)
    cv.poly([(7, 8), (24, 8), (21, 3), (10, 3)], A)
    cv.rect(10, 3, 21, 4, W(A, -1))
    cv.rect(3, 15, 28, 21, B)
    fake_text(cv, 6, 17, 25, WHITE, 1)
    fake_text(cv, 8, 19, 23, W(B, 3), 2)
    rnd = random.Random(8)
    for _ in range(12):
        cv.px(rnd.randint(6, 25), rnd.randint(23, 27), W(A, -1))
    cv.rect(10, 23, 21, 26, C)
    cv.shade_cyl(3, 3, 28, 29, 0.8)


def t_flour(cv, A, B, C):
    box3d(cv, 6, 3, 25, 30, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 1, x1, y0 + 2, W(A, -1)),
        cv.rect(x0 + 2, y0 + 6, x1 - 2, y0 + 11, B),
        fake_text(cv, x0 + 3, y0 + 8, x1 - 3, WHITE, 1),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 17, 4, 3, hexc('e8c070')),
        fake_text(cv, x0 + 2, y1 - 3, x1 - 2, W(A, -3), 2),
    ))


def t_sugar(cv, A, B, C):
    box3d(cv, 4, 6, 27, 29, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0 + 1, y0 + 3, x1 - 1, y0 + 9, B),
        fake_text(cv, x0 + 3, y0 + 6, x1 - 3, WHITE, 1),
        cv.rrect(x0 + 6, y0 + 12, x1 - 6, y0 + 16, C, 1),
        fake_text(cv, x0 + 2, y1 - 2, x1 - 2, W(A, -3), 3),
    ))


def t_oil(cv, A, B, C):
    y = bottle_shape(cv, 16, A, hexc('d8b030') if A[1] < 150 else hexc('3a8a3a'), 12, top=2, neck=5, shoulder=4, cap_h=2)
    cv.rect(10, y + 4, 21, y + 12, B)
    fake_text(cv, 11, y + 6, 20, C, 1)
    fake_text(cv, 12, y + 9, 19, W(B, -3), 2)
    cv.shade_cyl(10, 2, 21, 29)


def t_spice(cv, A, B, C):
    cv.rect(10, 10, 21, 29, A)
    cv.rect(10, 15, 21, 24, WHITE)
    fake_text(cv, 11, 18, 20, B, 2)
    cv.ellipse(15.5, 21, 2, 1.4, A)
    cv.shade_cyl(10, 10, 21, 29)
    cv.rect(9, 5, 22, 9, B)
    cv.shade_cyl(9, 5, 22, 9)
    for x in range(10, 22, 2):
        cv.px(x, 6, W(B, -2))


def t_smallbottle(cv, A, B, C):
    y = bottle_shape(cv, 16, A, B, 10, top=4, neck=5, shoulder=3, cap_h=3)
    cv.rect(11, y + 3, 20, y + 10, C)
    fake_text(cv, 12, y + 5, 19, B, 1)
    fake_text(cv, 12, y + 8, 18, W(C, -3), 2)
    cv.shade_cyl(11, 4, 20, 29)


def t_tuna(cv, A, B, C):
    cv.rect(5, 15, 26, 25, A)
    cv.rect(5, 17, 26, 22, B)
    fake_text(cv, 7, 19, 24, A, 2)
    cv.rect(5, 26, 26, 26, METAL)
    cv.shade_cyl(5, 15, 26, 26)
    cv.ellipse(15.5, 14, 10.5, 3, C)
    cv.ellipse(15.5, 14, 8.5, 1.8, W(C, 2))
    cv.ellipse(19, 14, 2, 1, W(C, -2))


# ---------- household / personal ----------

def t_papertowel(cv, A, B, C):
    for x0 in (4, 16):
        cv.rect(x0, 6, x0 + 11, 29, A)
        cv.shade_cyl(x0, 6, x0 + 11, 29, 0.7)
        cv.ellipse(x0 + 5.5, 6, 5.5, 2.2, W(A, 1))
        cv.ellipse(x0 + 5.5, 6, 2, 1, W(C, -2))
    cv.rect(3, 14, 28, 21, B)
    fake_text(cv, 5, 16, 26, WHITE, 1)
    fake_text(cv, 7, 19, 24, W(B, 3), 2)


def t_tp(cv, A, B, C):
    cv.rect(2, 11, 29, 29, mix(A, B, 0.06))
    for r in range(2):
        for i in range(3):
            x = 6 + i * 10
            y = 7 + r * 6
            cv.ellipse(x, y, 4.5, 2.4, W(A, 1))
            cv.ellipse(x, y, 1.6, 0.9, W(C, -3))
    cv.rect(2, 19, 29, 25, B)
    fake_text(cv, 5, 21, 26, WHITE, 1)
    fake_text(cv, 7, 23, 24, W(B, 3), 2)
    cv.shade_box(2, 11, 29, 29, 0.5)


def t_dishsoap(cv, A, B, C):
    cv.rrect(9, 9, 22, 29, A, 3)
    cv.rect(13, 3, 18, 9, B)
    cv.rect(14, 1, 16, 3, B)
    cv.rect(11, 16, 20, 24, B)
    fake_text(cv, 12, 18, 19, A, 1)
    cv.ellipse(15.5, 22, 2, 1.4, C)
    cv.shade_cyl(9, 1, 22, 29)


def t_detergent(cv, A, B, C):
    cv.rrect(3, 7, 28, 29, A, 3)
    cv.rect(5, 3, 12, 7, B)
    cv.rect(18, 8, 25, 13, W(A, -1))
    cv.rect(20, 9, 23, 12, (0, 0, 0, 0))
    cv.ellipse(13, 20, 7, 6, B)
    cv.ellipse(13, 20, 4.5, 3.5, C)
    cv.ellipse(13, 20, 2, 1.5, W(B, 2))
    fake_text(cv, 6, 27, 24, WHITE, 2)
    cv.shade_cyl(3, 3, 28, 29)
    for y in range(9, 13):
        for x in range(20, 24):
            cv.p[y][x] = None


def t_spray(cv, A, B, C):
    cv.rrect(10, 12, 22, 29, A, 2)
    cv.rect(13, 8, 19, 12, B)
    cv.rect(9, 4, 21, 8, B)
    cv.rect(7, 5, 9, 6, B)
    cv.rect(18, 8, 20, 12, W(B, -1))
    cv.rect(11, 17, 21, 25, C)
    fake_text(cv, 12, 19, 20, B, 1)
    fake_text(cv, 12, 22, 19, W(C, -3), 3)
    cv.shade_cyl(10, 4, 22, 29)


def t_roll(cv, A, B, C):
    box3d(cv, 1, 11, 30, 23, B, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 2, x0 + 8, y1 - 2, A),
        fake_text(cv, x0 + 10, y0 + 3, x1 - 2, C, 1),
        fake_text(cv, x0 + 10, y0 + 6, x1 - 5, W(B, 3), 3),
        cv.rect(x0, y1 - 1, x1, y1, hexc('a8a8b0')),
    ))


def t_sponge(cv, A, B, C):
    cv.rect(4, 14, 27, 26, A)
    rnd = random.Random(11)
    for _ in range(26):
        cv.px(rnd.randint(5, 26), rnd.randint(15, 25), W(A, -1))
    cv.rect(4, 10, 27, 13, B)
    cv.shade_box(4, 10, 27, 26, 0.8)
    for x in range(5, 27, 2):
        cv.px(x, 10, W(B, 2))


def t_battery(cv, A, B, C):
    cv.rect(4, 3, 27, 29, B)
    cv.ellipse(15.5, 6, 2, 1.5, W(B, -3))
    for i in range(4):
        x = 6 + i * 5
        cv.rect(x, 11, x + 3, 25, A)
        cv.rect(x, 11, x + 3, 15, C)
        cv.rect(x + 1, 10, x + 2, 10, METAL)
        cv.shade_cyl(x, 10, x + 3, 25)
    fake_text(cv, 6, 27, 25, WHITE, 2)
    cv.shade_box(4, 3, 27, 29, 0.5)


def t_bulb(cv, A, B, C):
    box3d(cv, 4, 3, 27, 29, B, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 6, mix(GLASS, WHITE, 0.3)),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 9, 6, 6, A),
        cv.shade_ball((x0 + x1) / 2 + 0.5, y0 + 9, 6, 6, 0.8),
        cv.rect((x0 + x1) // 2 - 2, y0 + 15, (x0 + x1) // 2 + 3, y0 + 19, C),
        [cv.hline((x0 + x1) // 2 - 2, (x0 + x1) // 2 + 3, y, W(C, -2)) for y in (y0 + 16, y0 + 18)],
        fake_text(cv, x0 + 2, y1 - 2, x1 - 2, WHITE, 2),
    ))


def t_petbag(cv, A, B, C):
    cv.rrect(3, 4, 28, 30, A, 2)
    cv.rect(3, 4, 28, 6, W(A, -1))
    cv.ellipse(15.5, 18, 8, 7, B)
    cv.ellipse(12, 15, 2.5, 3.5, W(B, -2))
    cv.ellipse(19, 15, 2.5, 3.5, W(B, -2))
    cv.px(13, 17, INK); cv.px(18, 17, INK)
    cv.rect(15, 20, 16, 21, INK)
    cv.rect(6, 8, 25, 10, C)
    fake_text(cv, 7, 9, 24, A, 1)
    cv.shade_cyl(3, 4, 28, 30, 0.8)


def t_toothpaste(cv, A, B, C):
    box3d(cv, 1, 11, 30, 23, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.poly([(x0, y1), (x0 + 10, y0), (x0 + 15, y0), (x0 + 5, y1)], B),
        cv.poly([(x0 + 8, y1), (x0 + 18, y0), (x0 + 20, y0), (x0 + 10, y1)], C),
        fake_text(cv, x0 + 15, y0 + 4, x1 - 2, B, 1),
        fake_text(cv, x0 + 16, y0 + 7, x1 - 2, C, 2),
    ))


def t_toothbrush(cv, A, B, C):
    cv.rect(8, 2, 23, 29, mix(GLASS, WHITE, 0.4))
    cv.ellipse(15.5, 5, 2, 1.5, W(GLASS, -3))
    cv.rect(14, 12, 17, 28, A)
    cv.rect(13, 7, 18, 12, B)
    for x in range(13, 19, 2):
        cv.px(x, 6, W(A, 2))
    cv.shade_cyl(13, 6, 18, 28)
    cv.rect(8, 22, 23, 29, A)
    fake_text(cv, 9, 25, 22, WHITE, 2)


def t_shampoo(cv, A, B, C):
    cv.rrect(9, 8, 22, 29, A, 4)
    cv.rect(11, 3, 20, 8, B)
    cv.rect(11, 3, 20, 3, W(B, 2))
    cv.ellipse(15.5, 19, 4.5, 5, C)
    fake_text(cv, 11, 13, 20, B, 1)
    fake_text(cv, 11, 26, 20, W(A, 3), 3)
    cv.shade_cyl(9, 3, 22, 29)


def t_soap(cv, A, B, C):
    box3d(cv, 3, 11, 28, 25, A, d=3, details=lambda x0, y0, x1, y1: (
        cv.rect(x0, y0 + 3, x1, y0 + 8, B),
        cv.ellipse((x0 + x1) / 2 + 0.5, y0 + 5.5, 5, 2.5, C),
        fake_text(cv, x0 + 6, y0 + 5, x1 - 6, B, 1),
    ))


def t_deodorant(cv, A, B, C):
    cv.rrect(10, 7, 21, 29, A, 3)
    cv.rect(10, 4, 21, 9, B)
    cv.rect(10, 4, 21, 4, W(B, 2))
    cv.rect(10, 15, 21, 22, C)
    fake_text(cv, 11, 17, 20, A, 1)
    fake_text(cv, 11, 20, 19, A, 3)
    cv.shade_cyl(10, 4, 21, 29)


def t_tissue(cv, A, B, C):
    box3d(cv, 2, 12, 29, 29, A, d=4, details=lambda x0, y0, x1, y1: (
        [cv.px(x0 + i * 3 + (j % 2), y0 + 2 + j * 3, B) for i in range(8) for j in range(5)],
        cv.rect(x0 + 2, y1 - 4, x1 - 2, y1 - 1, C),
        fake_text(cv, x0 + 3, y1 - 3, x1 - 3, W(C, -3), 2),
    ))
    cv.poly([(11, 13), (20, 13), (22, 5), (17, 8), (13, 3), (11, 9)], WHITE)
    cv.line(13, 4, 15, 11, W(WHITE, -2))


def t_pills(cv, A, B, C):
    cv.rect(9, 10, 22, 29, A)
    cv.rect(9, 14, 22, 25, B)
    fake_text(cv, 10, 16, 21, C, 1)
    fake_text(cv, 10, 19, 20, W(B, -3), 2)
    cv.rect(10, 22, 15, 23, C)
    cv.shade_cyl(9, 10, 22, 29)
    cv.rect(8, 4, 23, 9, WHITE if A[0] != 248 else C)
    cv.shade_cyl(8, 4, 23, 9)
    for x in range(9, 23, 2):
        cv.px(x, 5, W(cv.get(x, 6) or WHITE, -2))


TEMPLATES = {k[2:]: v for k, v in globals().items() if k.startswith('t_')}

# bag properties: weight class (0 fragile, 1 light, 2 normal, 3 heavy), w, h in bag cells
BAG = {
    'round': (2, 1, 1), 'tomato': (0, 1, 1), 'citrus': (2, 1, 1), 'banana': (1, 2, 1), 'grapes': (0, 1, 1), 'berries': (0, 1, 1),
    'melon': (3, 2, 2), 'avocado': (2, 1, 1), 'potato': (3, 2, 1), 'onion': (2, 1, 1), 'garlic': (1, 1, 1),
    'carrot': (2, 1, 1), 'leafy': (0, 1, 2), 'broccoli': (1, 1, 1), 'pepper': (2, 1, 1), 'corn': (2, 1, 1),
    'pineapple': (3, 1, 2), 'mushroom': (0, 1, 1), 'jug': (3, 1, 2), 'carton': (2, 1, 2), 'eggs': (0, 2, 1),
    'butter': (2, 1, 1), 'cheese': (2, 1, 1), 'tub': (2, 1, 1), 'yogurt': (2, 1, 1), 'squeeze': (2, 1, 1),
    'meattray': (2, 2, 1), 'steak': (2, 2, 1), 'chicken': (2, 2, 1), 'wings': (2, 2, 1), 'bacon': (1, 2, 1),
    'sausage': (2, 2, 1), 'deli': (1, 1, 1), 'fish': (2, 2, 1), 'shrimp': (2, 2, 1), 'tofu': (2, 1, 1),
    'roast': (2, 2, 1), 'pizzabox': (2, 2, 1), 'frozenbox': (2, 1, 1), 'frozenbag': (2, 1, 1),
    'icecream': (2, 1, 1), 'icebag': (3, 2, 2), 'loaf': (0, 2, 1), 'boule': (1, 1, 1), 'buns': (0, 2, 1),
    'hotdogbuns': (0, 2, 1), 'bagels': (0, 1, 1), 'tortilla': (1, 1, 1), 'pastrybox': (0, 2, 1),
    'chipbag': (0, 1, 1), 'box': (1, 1, 1), 'popcorn': (1, 1, 1), 'cookies': (1, 2, 1), 'jar': (3, 1, 1),
    'nutbag': (2, 1, 1), 'ricecakes': (0, 2, 1), 'candybar': (1, 1, 1), 'candybag': (1, 1, 1),
    'licorice': (1, 1, 1), 'mints': (1, 1, 1), 'gum': (1, 1, 1), 'lollipop': (1, 1, 1), 'can': (3, 1, 1),
    'tallcan': (2, 1, 1), 'bottle2l': (3, 1, 2), 'canpack': (3, 2, 1), 'water': (2, 1, 1),
    'watercase': (3, 2, 2), 'sports': (2, 1, 1), 'juice': (3, 1, 2), 'coffeebag': (2, 1, 1),
    'teabox': (1, 1, 1), 'cereal': (1, 1, 2), 'canister': (2, 1, 1), 'syrup': (3, 1, 1), 'honey': (2, 1, 1),
    'pastabox': (1, 2, 1), 'ramen': (1, 1, 1), 'ricebag': (3, 2, 1), 'flour': (3, 1, 2), 'sugar': (3, 1, 1),
    'oil': (3, 1, 2), 'spice': (1, 1, 1), 'smallbottle': (2, 1, 1), 'tuna': (2, 1, 1), 'papertowel': (1, 2, 2),
    'tp': (1, 2, 2), 'dishsoap': (2, 1, 1), 'detergent': (3, 1, 2), 'spray': (2, 1, 2), 'roll': (1, 2, 1),
    'sponge': (1, 1, 1), 'battery': (1, 1, 1), 'bulb': (0, 1, 1), 'petbag': (3, 2, 2), 'toothpaste': (1, 2, 1),
    'toothbrush': (1, 1, 1), 'shampoo': (2, 1, 2), 'soap': (1, 1, 1), 'deodorant': (1, 1, 1),
    'tissue': (1, 1, 1), 'pills': (1, 1, 1),
}


def draw_product(tpl, a, b, c):
    cv = Canvas(S, S)
    TEMPLATES[tpl](cv, hexc(a), hexc(b), hexc(c))
    cv.outline()
    return cv
