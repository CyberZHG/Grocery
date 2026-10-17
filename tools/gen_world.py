import math
import random
from pix import Canvas, hexc, tone, mix, fake_text

T = 32
WOOD = hexc('b8875a')
METAL = hexc('b8bcc8')
STEEL = hexc('8c92a0')
DARK = hexc('3a3440')
WHITE = hexc('f4f2ee')
GLASS = hexc('bfe0ec')
RED = hexc('c84848')
GREEN = hexc('4a8a5a')


def W(c, k):
    return tone(c, k)


def floor(variant):
    cv = Canvas(T, T)
    base = hexc('ece4d4') if variant == 0 else hexc('e2d8c6')
    cv.rect(0, 0, T - 1, T - 1, base)
    rnd = random.Random(variant + 3)
    for _ in range(18):
        cv.px(rnd.randint(1, 30), rnd.randint(1, 30), W(base, rnd.choice((-1, 1))))
    cv.hline(0, T - 1, 0, W(base, 1))
    cv.vline(0, 0, T - 1, W(base, 1))
    cv.hline(0, T - 1, T - 1, W(base, -1))
    cv.vline(T - 1, 0, T - 1, W(base, -1))
    return cv


def sidewalk():
    cv = Canvas(T, T)
    base = hexc('a8a4a0')
    cv.rect(0, 0, T - 1, T - 1, base)
    rnd = random.Random(2)
    for _ in range(30):
        cv.px(rnd.randint(0, 31), rnd.randint(0, 31), W(base, rnd.choice((-1, 1))))
    cv.hline(0, 31, 31, W(base, -2))
    cv.vline(31, 0, 31, W(base, -2))
    return cv


def wall_face(kind=0):
    cv = Canvas(T, 64)
    base = hexc('d8c8a8')
    cv.rect(0, 0, 31, 63, base)
    cv.rect(0, 0, 31, 7, hexc('6a5a58'))
    cv.hline(0, 31, 7, W(hexc('6a5a58'), -2))
    for y in range(12, 54, 6):
        cv.hline(0, 31, y, W(base, -1) if y % 12 == 0 else W(base, 0))
    cv.rect(0, 54, 31, 63, hexc('7a6a5a'))
    cv.hline(0, 31, 54, W(hexc('7a6a5a'), 2))
    if kind == 1:
        cv.rect(4, 14, 27, 44, hexc('5a6a7a'))
        cv.rect(6, 16, 25, 42, hexc('8ec4e0'))
        cv.shade_vgrad(6, 16, 25, 42, 1.2, -1.0)
        cv.line(9, 40, 22, 18, W(hexc('8ec4e0'), 3))
        cv.vline(15, 16, 42, hexc('5a6a7a'))
        cv.hline(6, 25, 29, hexc('5a6a7a'))
        cv.rect(3, 44, 28, 46, W(base, 2))
    elif kind == 2:
        cv.rect(7, 16, 24, 38, WHITE)
        cv.rect(7, 16, 24, 22, RED)
        fake_text(cv, 9, 19, 22, WHITE, 1)
        cv.ellipse(15.5, 30, 5, 4, hexc('f0c040'))
        fake_text(cv, 9, 36, 22, DARK, 2)
        cv.shade_box(7, 16, 24, 38, 0.5)
    elif kind == 3:
        cv.rect(3, 18, 28, 21, WOOD)
        cv.rect(3, 22, 28, 22, W(WOOD, -2))
        cv.ellipse(15.5, 33, 7, 7, WHITE)
        cv.ellipse(15.5, 33, 5.5, 5.5, hexc('f8f6f0'))
        cv.line(15, 33, 15, 29, DARK)
        cv.line(15, 33, 18, 33, DARK)
        cv.outline(0.5)
    return cv


def wall_cap():
    cv = Canvas(T, T)
    c = hexc('6a5a58')
    cv.rect(0, 0, 31, 31, c)
    for y in range(0, 32, 8):
        cv.hline(0, 31, y, W(c, 1))
    return cv


def wall_side(right=False):
    cv = Canvas(T, T)
    c = hexc('6a5a58')
    cv.rect(0, 0, 31, 31, c)
    edge = 0 if right else 31
    cv.vline(edge, 0, 31, W(c, -2))
    cv.vline(31 - edge, 0, 31, W(c, 1))
    for y in range(0, 32, 8):
        cv.hline(0, 31, y, W(c, 1))
    return cv


def door_stock():
    cv = Canvas(T, 64)
    cv.blit(wall_face(0), 0, 0)
    cv.rect(4, 14, 27, 63, hexc('5a4a40'))
    cv.rect(6, 16, 25, 63, hexc('8a6a50'))
    cv.rect(8, 22, 23, 32, hexc('9ec8d8'))
    cv.hline(8, 23, 22, W(hexc('9ec8d8'), 2))
    cv.rect(21, 42, 23, 44, hexc('e0c060'))
    cv.shade_box(6, 16, 25, 63, 0.5)
    cv.rect(7, 4, 24, 10, GREEN)
    fake_text(cv, 9, 7, 22, WHITE, 3)
    return cv


def door_stock_open(half=False):
    """The stock door swung inward: a lit back room with shelves of cartons. Half-open, the leaf still hides most of it."""
    cv = door_stock()
    cv.rect(6, 16, 25, 63, hexc('2e262c'))
    cv.rect(6, 16, 25, 23, hexc('3e3436'))
    cv.rect(6, 19, 25, 21, hexc('362e32'))
    cv.rect(13, 17, 18, 18, hexc('f0e0a0'))
    for y in (30, 44):
        cv.hline(6, 25, y, hexc('6a5a50'))
        cv.hline(6, 25, y + 1, hexc('3a3036'))
    kraft = hexc('b08858')
    for x0, x1, top in ((12, 17, 24), (19, 24, 26), (13, 18, 38), (20, 24, 37)):
        cv.rect(x0, top, x1, 29 if top < 30 else 43, kraft)
        cv.hline(x0, x1, top, W(kraft, 2))
        cv.vline(x1, top, 29 if top < 30 else 43, W(kraft, -2))
    cv.rect(14, 52, 22, 60, kraft)
    cv.hline(14, 22, 52, W(kraft, 2))
    cv.hline(14, 22, 56, W(kraft, -1))
    cv.rect(6, 61, 25, 63, hexc('4a4044'))
    leaf = hexc('8a6a50')
    edge = 17 if half else 10
    cv.rect(6, 16, edge, 63, W(leaf, -1))
    cv.vline(edge, 16, 63, W(leaf, -3))
    cv.rect(8, 22, edge - 2, 32, hexc('9ec8d8'))
    if half:
        cv.rect(edge - 3, 38, edge - 2, 41, hexc('d8c070'))
    return cv


def entrance_frame():
    """Door frame with a transparent opening; the sliding panels are drawn separately."""
    cv = Canvas(64, T)
    frame = hexc('4a5a68')
    cv.rect(0, 0, 63, 31, frame)
    cv.rect(0, 0, 63, 1, W(frame, -2))
    cv.rect(1, 2, 2, 31, W(frame, 1))
    cv.rect(61, 2, 62, 31, W(frame, -1))
    for y in range(3, 31):
        for x in range(3, 61):
            cv.p[y][x] = None
    cv.hline(3, 60, 30, hexc('8a8e98'))
    cv.hline(3, 60, 31, hexc('6a6e78'))
    return cv


def door_panel():
    cv = Canvas(30, 27)
    glass = hexc('9ec8d8')
    cv.rect(0, 0, 29, 26, hexc('5a6a78'))
    cv.rect(2, 2, 27, 24, glass)
    cv.shade_vgrad(2, 2, 27, 24, 0.8, -0.6)
    cv.line(5, 21, 18, 4, W(glass, 3))
    cv.line(8, 22, 21, 5, W(glass, 2))
    cv.rect(2, 13, 27, 13, W(glass, -1))
    return cv


def mat():
    cv = Canvas(64, T)
    cv.rrect(2, 4, 61, 27, hexc('5a4a5a'), 2)
    for y in range(7, 26, 3):
        cv.hline(5, 58, y, hexc('6a5a6a'))
    cv.rect(18, 12, 45, 19, hexc('c84848'))
    fake_text(cv, 20, 15, 43, WHITE, 1)
    return cv


# ---------- fixtures ----------

def shelf_h():
    cv = Canvas(64, 56)
    side = hexc('7a8494')
    back = hexc('d8dce4')
    cv.rect(0, 0, 63, 55, side)
    cv.rect(0, 0, 63, 5, W(back, 1))
    cv.hline(0, 63, 0, W(back, 3))
    cv.rect(3, 6, 60, 50, back)
    for x in range(5, 60, 4):
        for y in range(9, 48, 4):
            cv.px(x, y, W(back, -1))
    for y in (26, 46):
        cv.rect(2, y, 61, y + 3, hexc('f0f2f4'))
        cv.hline(2, 61, y + 3, W(STEEL, -1))
        cv.rect(14, y + 1, 18, y + 2, hexc('f0d060'))
        cv.rect(46, y + 1, 50, y + 2, hexc('f0d060'))
    cv.rect(0, 50, 63, 55, W(side, -2))
    cv.shade_box(0, 0, 63, 55, 0.4)
    return cv


def shelf_v():
    cv = Canvas(T, 88)
    side = hexc('7a8494')
    top = hexc('e0e4ea')
    cv.rect(0, 0, 31, 87, side)
    cv.rect(2, 2, 29, 79, top)
    for y in range(4, 78, 6):
        cv.hline(3, 28, y, W(top, -1))
    cv.vline(15, 3, 78, W(top, -2))
    cv.vline(16, 3, 78, W(top, 1))
    cv.rect(0, 80, 31, 87, W(side, -2))
    cv.rect(4, 81, 27, 84, hexc('f0f2f4'))
    cv.shade_box(0, 0, 31, 87, 0.4)
    return cv


def produce_h():
    cv = Canvas(64, 56)
    for i in range(2):
        x0 = i * 32
        cv.poly([(x0 + 1, 18), (x0 + 30, 18), (x0 + 31, 55), (x0, 55)], WOOD)
        for y in range(22, 54, 6):
            cv.hline(x0 + 1, x0 + 30, y, W(WOOD, -2))
        cv.rect(x0 + 2, 12, x0 + 29, 30, hexc('6a4a30'))
        cv.rect(x0 + 2, 12, x0 + 29, 13, W(WOOD, 2))
        cv.rect(x0 + 8, 40, x0 + 23, 46, hexc('f0e8d0'))
        fake_text(cv, x0 + 10, 43, x0 + 21, DARK, i)
    cv.shade_box(0, 12, 63, 55, 0.5)
    return cv


def produce_v():
    cv = Canvas(T, 88)
    cv.rect(0, 16, 31, 87, WOOD)
    for i in range(2):
        y0 = 18 + i * 32
        cv.rect(2, y0, 29, y0 + 28, hexc('6a4a30'))
        cv.hline(2, 29, y0, W(WOOD, 2))
    for y in range(20, 86, 6):
        cv.px(0, y, W(WOOD, -2))
    cv.rect(0, 82, 31, 87, W(WOOD, -2))
    cv.shade_box(0, 16, 31, 87, 0.5)
    return cv


def fridge_h():
    cv = Canvas(64, 72)
    body = hexc('e8ecf0')
    cv.rect(0, 0, 63, 71, body)
    cv.rect(0, 0, 63, 7, hexc('3a7ab0'))
    fake_text(cv, 6, 3, 57, WHITE, 2)
    cv.rect(2, 9, 61, 65, hexc('2a3a48'))
    cv.rect(3, 10, 60, 64, hexc('5a7a8a'))
    for y in (37, 63):
        cv.rect(3, y, 60, y + 1, hexc('a8b8c0'))
    cv.vline(31, 9, 65, body)
    cv.vline(32, 9, 65, W(body, -1))
    cv.rect(0, 66, 63, 71, W(body, -2))
    cv.rect(28, 30, 29, 44, STEEL)
    cv.rect(34, 30, 35, 44, STEEL)
    cv.shade_box(0, 0, 63, 71, 0.4)
    return cv


def fridge_glass_h():
    cv = Canvas(64, 72)
    g = GLASS[:3] + (60,)
    cv.rect(3, 10, 30, 64, g)
    cv.rect(33, 10, 60, 64, g)
    hl = (255, 255, 255, 110)
    for x0 in (3, 33):
        cv.line(x0 + 3, 60, x0 + 22, 12, hl)
        cv.line(x0 + 6, 62, x0 + 25, 14, hl)
    return cv


def fridge_v():
    cv = Canvas(T, 104)
    body = hexc('e8ecf0')
    cv.rect(0, 0, 31, 103, body)
    cv.rect(0, 0, 7, 103, hexc('3a7ab0'))
    cv.rect(9, 4, 29, 97, hexc('2a3a48'))
    cv.rect(10, 5, 28, 96, hexc('5a7a8a'))
    cv.rect(10, 50, 28, 51, hexc('a8b8c0'))
    cv.rect(0, 98, 31, 103, W(body, -2))
    cv.shade_box(0, 0, 31, 103, 0.4)
    return cv


def fridge_glass_v():
    cv = Canvas(T, 104)
    cv.rect(10, 5, 28, 96, GLASS[:3] + (60,))
    hl = (255, 255, 255, 110)
    for y0 in (8, 54):
        cv.line(12, y0 + 36, 26, y0 + 4, hl)
    return cv


def freezer_h():
    cv = Canvas(64, 48)
    body = hexc('f0f2f6')
    cv.rect(0, 0, 63, 47, body)
    cv.rect(2, 2, 61, 27, hexc('7a9aaa'))
    cv.rect(3, 3, 60, 26, hexc('a8d0e0'))
    cv.vline(31, 2, 27, body)
    cv.rect(0, 28, 63, 47, body)
    cv.rect(4, 32, 59, 38, hexc('3a7ab0'))
    fake_text(cv, 8, 35, 55, WHITE, 3)
    cv.rect(0, 43, 63, 47, W(body, -2))
    cv.shade_box(0, 0, 63, 47, 0.4)
    return cv


def freezer_glass_h():
    cv = Canvas(64, 48)
    hl = (255, 255, 255, 120)
    cv.rect(3, 3, 60, 26, (210, 238, 248, 70))
    for x in (8, 40):
        cv.line(x, 24, x + 14, 5, hl)
    return cv


def freezer_v():
    cv = Canvas(T, 80)
    body = hexc('f0f2f6')
    cv.rect(0, 0, 31, 79, body)
    cv.rect(2, 2, 29, 63, hexc('7a9aaa'))
    cv.rect(3, 3, 28, 62, hexc('a8d0e0'))
    cv.hline(2, 29, 32, body)
    cv.rect(0, 64, 31, 79, body)
    cv.rect(4, 67, 27, 72, hexc('3a7ab0'))
    cv.rect(0, 75, 31, 79, W(body, -2))
    cv.shade_box(0, 0, 31, 79, 0.4)
    return cv


def freezer_glass_v():
    cv = Canvas(T, 80)
    cv.rect(3, 3, 28, 62, (210, 238, 248, 70))
    for y in (10, 42):
        cv.line(6, y + 16, 22, y, (255, 255, 255, 120))
    return cv


def cash_drawer(k):
    """The register drawer sliding out (k = 1..3 pixels pairs), coins and notes in their trays."""
    cv = Canvas(24, 9)
    depth = k * 2 + 2
    body = hexc('4a4a54')
    cv.rect(0, 0, 23, depth, body)
    cv.hline(0, 23, depth, W(body, -2))
    if depth >= 4:
        for i, c in enumerate(('7ab06a', '8ac07a', 'f0c040', 'c8ccd4', 'd8a060')):
            x = 2 + i * 4
            cv.rect(x, 1, x + 2, min(depth - 1, 3), hexc(c))
    cv.outline(0.5)
    return cv


def receipt(k):
    """Paper feeding out of the printer slot, a little more each frame."""
    cv = Canvas(8, 13)
    h = k * 4
    cv.rect(1, 12 - h, 6, 12, WHITE)
    for y in range(13 - h, 12, 2):
        cv.hline(2, 5 if y % 4 else 4, y, hexc('a8acb8'))
    cv.outline(0.4)
    return cv


def glass_open(kind, vertical, slot, stage):
    """Glass overlay with one door swinging open (fridge) or one lid slid across (freezer); stage 1 is halfway, 2 is fully open."""
    hl = (255, 255, 255, 110)
    edge = hexc('c8ccd4')
    if kind == 'fridge' and not vertical:
        cv = Canvas(64, 72)
        g = GLASS[:3] + (60,)
        for i, x0 in enumerate((3, 33)):
            if i != slot:
                cv.rect(x0, 10, x0 + 27, 64, g)
                cv.line(x0 + 3, 60, x0 + 22, 12, hl)
                continue
            # the door turns on its outer hinge: narrower as it opens, its frame catching the light
            w = 13 if stage == 1 else 3
            hx0 = x0 if slot == 0 else x0 + 27 - w
            cv.rect(hx0, 10, hx0 + w, 64, GLASS[:3] + (90,))
            cv.rect(hx0, 10, hx0, 64, edge) if slot == 0 else cv.rect(hx0 + w, 10, hx0 + w, 64, edge)
            cv.rect(hx0 + (w if slot == 0 else 0), 10, hx0 + (w if slot == 0 else 0), 64, W(edge, -2))
        return cv
    if kind == 'fridge':
        cv = Canvas(T, 104)
        w = 9 if stage == 1 else 2
        cv.rect(28 - w, 5, 28, 96, GLASS[:3] + (90,))
        cv.vline(28 - w, 5, 96, W(edge, -2))
        cv.vline(28, 5, 96, edge)
        return cv
    if not vertical:
        # sliding lids: this slot's lid rides over the other one
        cv = Canvas(64, 48)
        shift = 14 if stage == 1 else 27
        lids = [(3, 30), (33, 60)]
        other = lids[1 - slot]
        cv.rect(other[0], 3, other[1], 26, (210, 238, 248, 70))
        mine = lids[slot]
        dx = shift if slot == 0 else -shift
        cv.rect(mine[0] + dx, 3, mine[1] + dx, 26, (210, 238, 248, 95))
        cv.vline(mine[0] + dx, 3, 26, edge)
        cv.vline(mine[1] + dx, 3, 26, edge)
        return cv
    cv = Canvas(T, 80)
    shift = 15 if stage == 1 else 29
    lids = [(3, 32), (33, 62)]
    other = lids[1 - slot]
    cv.rect(3, other[0], 28, other[1], (210, 238, 248, 70))
    mine = lids[slot]
    dy = shift if slot == 0 else -shift
    cv.rect(3, mine[0] + dy, 28, mine[1] + dy, (210, 238, 248, 95))
    cv.hline(3, 28, mine[0] + dy, edge)
    cv.hline(3, 28, mine[1] + dy, edge)
    return cv


def counter_base(cv, w=64, h=56, top=hexc('e8dcc8'), front=hexc('8a6a4a')):
    cv.rect(0, 8, w - 1, 23, top)
    cv.hline(0, w - 1, 8, W(top, 2))
    cv.rect(0, 24, w - 1, h - 1, front)
    for x in range(8, w, 16):
        cv.vline(x, 26, h - 4, W(front, -1))
    cv.rect(0, h - 4, w - 1, h - 1, W(front, -2))
    cv.hline(0, w - 1, 24, W(front, 2))


def register():
    cv = Canvas(64, 56)
    counter_base(cv)
    cv.rect(2, 12, 30, 20, hexc('3a3a44'))
    for x in range(4, 29, 4):
        cv.vline(x, 12, 20, hexc('4a4a54'))
    cv.rect(36, 4, 58, 20, hexc('4a4a58'))
    cv.rect(38, 6, 56, 11, hexc('2a3a2a'))
    fake_text(cv, 40, 8, 54, hexc('7ae07a'), 4)
    for yy in range(13, 19, 2):
        for xx in range(39, 56, 3):
            cv.rect(xx, yy, xx + 1, yy, hexc('d8d8e0'))
    cv.rect(40, 0, 41, 4, STEEL)
    cv.rect(37, 0, 44, 2, hexc('e0e0e8'))
    cv.shade_box(36, 4, 58, 20, 0.5)
    cv.rect(26, 32, 37, 40, WHITE)
    fake_text(cv, 27, 36, 36, RED, 1)
    return cv


def card_counter():
    """Card-only express counter: a short belt and a payment terminal, no cash drawer."""
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('dce6ee'), front=hexc('3a6a9a'))
    cv.hline(0, 63, 28, hexc('e8f0f8'))
    cv.hline(0, 63, 29, hexc('a8c0d8'))
    cv.rect(4, 12, 24, 20, hexc('3a3a44'))
    for x in range(6, 23, 4):
        cv.vline(x, 12, 20, hexc('4a4a54'))
    cv.rect(40, 6, 52, 21, hexc('2e2e38'))
    cv.rect(42, 8, 50, 12, hexc('9ad8f0'))
    cv.hline(43, 47, 10, hexc('3a7a9a'))
    for yy in range(14, 20, 2):
        for xx in range(42, 50, 3):
            cv.rect(xx, yy, xx + 1, yy, hexc('c8ccd8'))
    cv.vline(53, 14, 20, hexc('7ae07a'))
    cv.shade_box(40, 6, 52, 21, 0.5)
    card = hexc('3a8ad8')
    cv.rrect(25, 31, 38, 40, card, 1)
    cv.hline(25, 38, 34, hexc('1a3a5a'))
    cv.rect(27, 37, 30, 38, hexc('f0c040'))
    return cv


def with_card_sign(base):
    """Raises the card counter by a sign on a pole, so it reads differently from a cash register at a glance."""
    cv = Canvas(64, base.h + 16)
    sign = Canvas(64, base.h + 16)
    sign.rect(45, 12, 46, 24, hexc('8a8e98'))
    sign.rrect(32, 0, 60, 13, hexc('2a5a8a'), 1)
    sign.rect(34, 2, 58, 11, WHITE)
    sign.rrect(36, 3, 48, 10, hexc('3a8ad8'), 1)
    sign.hline(36, 48, 5, hexc('1a3a5a'))
    sign.rect(38, 7, 40, 8, hexc('f0c040'))
    for i, x in enumerate((51, 53, 55)):
        sign.vline(x, 5 - i, 8 + i, hexc('3a8ad8'))
    sign.outline(0.5)
    cv.blit(sign, 0, 0)
    cv.blit(base, 0, 16)
    return cv


def _oden_bits(cv, x, y, kind):
    """Tiny oden pieces seen from above, about 6x5 px each."""
    if kind == 'egg':
        cv.ellipse(x + 3, y + 2.5, 2.6, 2.1, hexc('c89a58'))
        cv.px(x + 2, y + 1, hexc('f0d8a8'))
    elif kind == 'daikon':
        cv.ellipse(x + 3, y + 2.5, 2.8, 2.3, hexc('e8cc90'))
        cv.ellipse(x + 3, y + 2.5, 1.4, 1.1, hexc('f4e2b4'))
    elif kind == 'konjac':
        cv.poly([(x, y + 5), (x + 6, y + 5), (x + 3, y)], hexc('7a7884'))
        cv.px(x + 3, y + 3, hexc('4a4854'))
    elif kind == 'balls':
        cv.hline(x - 1, x + 7, y + 2, hexc('d8b070'))
        for i in range(3):
            cv.ellipse(x + 1 + i * 2.2, y + 2.5, 1.3, 1.6, hexc('ece0c4'))
    elif kind == 'chikuwa':
        cv.rect(x, y + 1, x + 6, y + 4, hexc('f0dcb0'))
        cv.rect(x, y + 1, x + 6, y + 2, hexc('b8743a'))
        cv.px(x + 6, y + 3, hexc('8a6040'))
    elif kind == 'tofu':
        cv.rect(x, y + 1, x + 5, y + 5, hexc('d08c38'))
        cv.hline(x, x + 5, y + 1, hexc('e8a850'))


def oden_counter():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('d8d0c0'), front=hexc('8a3a3a'))
    steel = STEEL
    cv.rrect(4, 7, 59, 22, W(steel, -2), 2)
    cv.rrect(5, 8, 58, 21, steel, 2)
    cv.hline(6, 57, 8, W(steel, 2))
    cv.rect(7, 10, 56, 20, hexc('b87a34'))
    for y in range(10, 21):
        k = abs(y - 15) / 5
        cv.hline(7, 56, y, mix(hexc('c88a40'), hexc('9a5c24'), k))
    for x in (19, 32, 44):
        cv.vline(x, 10, 20, W(steel, 1))
        cv.vline(x + 1, 10, 20, W(steel, -2))
    cv.hline(7, 56, 15, W(steel, 1))
    layout = [('egg', 8, 10), ('daikon', 12, 10), ('konjac', 21, 10), ('egg', 25, 10), ('balls', 34, 10), ('tofu', 38, 10),
              ('chikuwa', 46, 10), ('daikon', 50, 10), ('daikon', 8, 16), ('tofu', 13, 16), ('chikuwa', 21, 16), ('konjac', 26, 16),
              ('egg', 34, 16), ('konjac', 38, 16), ('balls', 47, 16), ('egg', 51, 16)]
    for kind, x, y in layout:
        _oden_bits(cv, x, y, kind)
    cv.rect(4, 25, 59, 30, hexc('f4ece0'))
    for x in range(4, 60, 14):
        cv.vline(x, 25, 31, W(hexc('f4ece0'), -2))
    cv.hline(4, 59, 31, hexc('c8b8a0'))
    cv.rect(22, 35, 41, 48, hexc('f0e0c0'))
    cv.rect(23, 36, 40, 47, hexc('f8ecd4'))
    cv.line(31, 37, 31, 47, hexc('a07a4a'))
    cv.poly([(28, 41), (34, 41), (31, 37)], hexc('7a7884'))
    cv.ellipse(31, 43.5, 2.2, 1.8, hexc('e8cc90'))
    cv.rect(29, 45, 33, 46, hexc('d08c38'))
    cv.outline(0.5)
    for i, x in enumerate((11, 25, 38, 51)):
        for k in range(4):
            cv.px(x + (k + i) % 2, 6 - k + (i % 2), (255, 255, 255, 110 - k * 22))
    return cv


def deli_counter():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('e8ecf0'), front=hexc('5a6a7a'))
    cv.rect(4, 14, 24, 21, hexc('c8a070'))
    cv.hline(4, 24, 14, hexc('e0bc88'))
    for i in range(4):
        cv.ellipse(9 + i * 4, 17, 3, 2, hexc('f0a8b0') if i % 2 else hexc('e898a0'))
    cv.rect(36, 13, 60, 22, STEEL)
    cv.hline(36, 60, 13, W(STEEL, 2))
    cv.ellipse(44, 9, 8, 8, hexc('c8ccd4'))
    cv.ellipse(44, 9, 7, 7, hexc('e8ecf0'))
    cv.ellipse(44, 9, 2, 2, W(STEEL, -2))
    cv.line(39, 5, 42, 8, WHITE)
    cv.rect(50, 8, 60, 15, hexc('e8a0a8'))
    cv.ellipse(50, 11.5, 2, 3.5, hexc('f4c0c4'))
    cv.shade_cyl(50, 8, 60, 15, 0.6)
    glass = hexc('b8dce8')
    cv.rect(2, 26, 61, 47, glass)
    cv.shade_vgrad(2, 26, 61, 47, 0.5, -0.4)
    cv.hline(2, 61, 37, hexc('e8f0f4'))
    meats = [('e8a0a8', 'f4c8cc'), ('a83a3a', 'd86a6a'), ('e8d0a8', 'f4e4c8'), ('9a4a3a', 'c87060')]
    for i, (a, b) in enumerate(meats):
        x = 4 + i * 14
        cv.rrect(x, 30, x + 11, 35, hexc(a), 2)
        cv.ellipse(x + 11, 32.5, 1.5, 2.5, hexc(b))
        if i == 1:
            cv.px(x + 3, 32, hexc('f4e0d0')); cv.px(x + 6, 33, hexc('f4e0d0')); cv.px(x + 8, 31, hexc('f4e0d0'))
    cv.poly([(5, 46), (17, 46), (17, 40)], hexc('f0c840'))
    cv.px(13, 44, hexc('d8a828')); cv.px(15, 42, hexc('d8a828'))
    cv.ellipse(28, 43.5, 6, 2.5, hexc('e8a0a8'))
    cv.ellipse(28, 42.5, 5, 2, hexc('f4c0c4'))
    cv.rrect(40, 40, 58, 46, hexc('f4f0e8'), 1)
    for x in (43, 49, 55):
        cv.ellipse(x, 42.5, 2, 1.5, hexc('8ab060'))
    for i in range(4):
        cv.rect(6 + i * 14, 36, 9 + i * 14, 36, WHITE)
    cv.line(6, 46, 26, 27, (255, 255, 255, 140))
    cv.line(9, 46, 29, 27, (255, 255, 255, 70))
    cv.rect(2, 48, 61, 51, W(STEEL, -1))
    return cv


def oven():
    cv = Canvas(64, 72)
    body = hexc('9aa0ac')
    cv.rect(0, 0, 63, 71, body)
    cv.rect(0, 0, 63, 5, W(body, 2))
    for i in range(2):
        y0 = 8 + i * 30
        cv.rect(4, y0, 59, y0 + 25, hexc('4a4a54'))
        cv.rect(8, y0 + 4, 55, y0 + 21, hexc('2a2228'))
        cv.rect(9, y0 + 15, 54, y0 + 16, hexc('f08030'))
        cv.rect(9, y0 + 5, 54, y0 + 14, hexc('5a3028'))
        cv.rect(10, y0 + 1, 53, y0 + 2, hexc('d8dce4'))
    cv.rect(0, 68, 63, 71, W(body, -2))
    cv.shade_box(0, 0, 63, 71, 0.4)
    return cv


def mop(k):
    """Mop held from the right hand, its head swishing across the floor: left, middle, right."""
    cv = Canvas(24, 24)
    head_x = (2, 7, 12)[k]
    cv.line(18, 1, head_x + 5, 19, hexc('a8784a'), 1)
    cv.rect(head_x, 19, head_x + 10, 22, hexc('dfe4ec'))
    for x in range(head_x, head_x + 11, 2):
        cv.px(x, 23, hexc('b8bec8'))
    cv.hline(head_x, head_x + 10, 19, hexc('8a8e98'))
    cv.outline(0.4)
    return cv


def bucket():
    cv = Canvas(14, 12)
    c = hexc('4a8ad0')
    cv.poly([(1, 3), (12, 3), (11, 11), (2, 11)], c)
    cv.rect(2, 3, 11, 4, hexc('8ec4e0'))
    cv.line(1, 3, 6, 0, hexc('8a8e98'))
    cv.line(12, 3, 7, 0, hexc('8a8e98'))
    cv.outline(0.4)
    return cv


def slicer_blade(k):
    """The deli slicer's disc with two light spokes, turned a little each frame so it reads as spinning."""
    cv = Canvas(20, 20)
    disc = hexc('dfe4ec')
    cv.ellipse(10, 10, 8.5, 8.5, disc)
    a = k * math.pi / 8
    for spoke in (a, a + math.pi / 2):
        for r in range(3, 8):
            for sgn in (1, -1):
                cv.px(round(10 + sgn * r * math.cos(spoke)), round(10 + sgn * r * math.sin(spoke)), (255, 255, 255, 220))
    for r in range(3, 8):
        cv.px(round(10 + r * math.cos(a + math.pi / 4)), round(10 + r * math.sin(a + math.pi / 4)), hexc('b8bec8'))
    cv.ellipse(10, 10, 2, 2, hexc('6a6a84'))
    cv.outline(0.4)
    return cv


def oden_bubbles(k):
    """Broth simmering in the four sections of the oden pot: bubbles swell and pop, a highlight drifts."""
    cv = Canvas(64, 24)
    rnd = random.Random(31 + k)
    for x0, x1 in ((7, 18), (21, 31), (34, 43), (46, 56)):
        for _ in range(2):
            x, y = rnd.randint(x0 + 1, x1 - 1), rnd.randint(10, 19)
            r = rnd.choice((0, 1, 1))
            if r:
                cv.px(x, y - 1, (255, 240, 200, 200)); cv.px(x - 1, y, (255, 240, 200, 200))
                cv.px(x + 1, y, (255, 240, 200, 200)); cv.px(x, y + 1, (255, 240, 200, 160))
            else:
                cv.px(x, y, (255, 245, 220, 230))
        hx = x0 + (k * 3) % (x1 - x0 - 3)
        cv.hline(hx, hx + 2, 12 + k % 2 * 4, (255, 230, 180, 120))
    return cv


def oven_door(k):
    """The lower oven door dropping open (drawn 36px down the oven): halfway, then flat, with the hot inside showing."""
    cv = Canvas(64, 34)
    inside = hexc('2a2228')
    cv.rect(4, 2, 59, 27, hexc('4a4a54'))
    cv.rect(6, 4, 57, 25, inside)
    cv.rect(7, 18, 56, 19, hexc('8a8e98'))
    cv.rect(7, 24, 56, 25, hexc('f08030'))
    glow = (240, 140, 60, 70)
    cv.rect(7, 5, 56, 23, glow)
    door = hexc('5a5a64')
    if k == 1:
        # tilted halfway: the door looks short, its window catching the light
        cv.rect(4, 15, 59, 27, door)
        cv.rect(10, 17, 53, 24, hexc('5a3028'))
        cv.rect(14, 15, 49, 15, hexc('d8dce4'))
    else:
        # flat out in front, seen edge-on below the opening
        cv.rect(2, 28, 61, 31, door)
        cv.hline(2, 61, 28, hexc('d8dce4'))
    cv.outline(0.4)
    return cv


def bread_case():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('e8dcc8'), front=hexc('a07048'))
    glass = hexc('d4ecf2')
    cv.rect(2, 0, 61, 23, glass)
    cv.shade_vgrad(2, 0, 61, 23, 0.3, -0.3)
    cv.rect(1, 0, 62, 1, WOOD)
    cv.rect(1, 0, 2, 23, WOOD)
    cv.rect(61, 0, 62, 23, WOOD)
    for y in (11, 22):
        cv.rect(3, y, 60, y + 1, W(WOOD, 1))
        for x in range(4, 60, 4):
            cv.px(x, y - 1, hexc('f8f4ec'))
    cv.rect(10, 30, 53, 44, hexc('3a3a34'))
    cv.rect(11, 31, 52, 43, hexc('2e3a30'))
    fake_text(cv, 14, 33, 40, hexc('f4f0e8'), 7)
    fake_text(cv, 14, 37, 34, hexc('e8d8a8'), 8)
    fake_text(cv, 14, 41, 44, hexc('f4f0e8'), 9)
    cv.ellipse(47, 38, 3.5, 2.5, hexc('d8984a'))
    cv.hline(45, 49, 37, hexc('f0c070'))
    return cv


def coffee_bar():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('5a4a40'), front=hexc('3a2a24'))
    body = hexc('c8ccd4')
    cv.rrect(4, 1, 34, 21, body, 2)
    cv.hline(5, 33, 1, W(body, 2))
    for x in (10, 20):
        cv.rect(x, -1 + 1, x + 4, 0 + 1, WHITE)
    cv.rect(6, 4, 32, 10, hexc('3a3a44'))
    cv.ellipse(19, 7, 2.5, 2.5, WHITE)
    cv.px(19, 6, DARK); cv.px(20, 7, hexc('c84848'))
    cv.px(9, 6, hexc('e84848')); cv.px(29, 6, hexc('7ae07a'))
    for x in (11, 27):
        cv.rect(x - 3, 11, x + 3, 13, hexc('8a8e98'))
        cv.rect(x - 1, 14, x + 1, 15, STEEL)
        cv.hline(x + 2, x + 7 if x == 11 else x + 6, 13, hexc('2a2228'))
    cv.line(33, 8, 36, 17, STEEL)
    cv.rect(6, 18, 32, 20, hexc('5a5e68'))
    for x in range(7, 32, 2):
        cv.px(x, 19, hexc('8a8e98'))
    cv.shade_box(4, 1, 34, 21, 0.4)
    cv.rect(39, 4, 46, 10, hexc('d8ecf0'))
    cv.rect(40, 6, 45, 10, hexc('5a3420'))
    for (x, y) in ((41, 7), (43, 8), (44, 6)):
        cv.px(x, y, hexc('8a5a30'))
    cv.rect(38, 11, 47, 20, hexc('2a2a30'))
    cv.rect(41, 14, 44, 16, STEEL)
    for i in range(3):
        y = 20 - i * 3
        cv.poly([(50, y), (58, y), (57, y - 3), (51, y - 3)], WHITE)
        cv.hline(51, 57, y - 2, hexc('a07048'))
    cv.rect(8, 28, 55, 47, hexc('8a6a4a'))
    cv.rect(10, 30, 53, 45, hexc('2a3430'))
    fake_text(cv, 13, 32, 38, hexc('f4f0e8'), 3)
    fake_text(cv, 13, 36, 34, hexc('e8d8a8'), 5)
    fake_text(cv, 13, 40, 40, hexc('f4f0e8'), 6)
    cv.rect(43, 35, 49, 41, WHITE)
    cv.vline(50, 36, 39, WHITE)
    cv.rect(44, 36, 48, 37, hexc('8a5a30'))
    cv.px(45, 33, (255, 255, 255, 140)); cv.px(47, 32, (255, 255, 255, 140))
    return cv


def bagging():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('d8dce4'), front=hexc('6a7a5a'))
    paper = hexc('c89a68')
    cv.poly([(5, 21), (25, 21), (24, 6), (6, 6)], paper)
    for x in (8, 14, 20):
        cv.vline(x, 8, 20, W(paper, -1))
    cv.rect(6, 6, 24, 7, W(paper, 2))
    cv.line(10, 6, 16, -1 + 2, hexc('e8c890'), 3)
    cv.ellipse(19, 4, 3, 2.5, hexc('6aa040'))
    cv.px(18, 3, hexc('9ad070'))
    cv.ellipse(9, 5, 2, 2, hexc('d84848'))
    cv.shade_cyl(5, 6, 25, 21, 0.5)
    blue = hexc('4a8ac0')
    cv.rrect(30, 8, 48, 21, blue, 2)
    cv.line(33, 8, 36, 2, W(blue, -2), 2)
    cv.line(45, 8, 42, 2, W(blue, -2), 2)
    cv.hline(36, 42, 2, W(blue, -2))
    cv.rect(35, 12, 43, 16, hexc('f4f0e8'))
    cv.ellipse(39, 14, 1.8, 1.4, hexc('6aa060'))
    cv.shade_cyl(30, 8, 48, 21, 0.5)
    cv.vline(55, 2, 21, STEEL)
    cv.rect(51, 4, 59, 11, hexc('e8ecf0'))
    cv.hline(51, 59, 7, hexc('c8ccd4'))
    cv.poly([(53, 11), (57, 11), (58, 17), (52, 17)], (240, 244, 248, 200))
    cv.ellipse(31.5, 37, 7, 7, hexc('f4f0e8'))
    cv.ellipse(31.5, 37, 5.5, 5.5, hexc('6aa060'))
    cv.poly([(28, 39), (32, 33), (35, 39)], hexc('f4f0e8'))
    cv.vline(31, 39, 41, hexc('f4f0e8'))
    return cv


def basket():
    cv = Canvas(16, 14)
    c = hexc('d84848')
    cv.rect(1, 5, 14, 13, c)
    for x in range(2, 14, 3):
        cv.vline(x, 6, 12, W(c, -2))
    cv.hline(1, 14, 5, W(c, 2))
    cv.line(3, 5, 6, 0, DARK)
    cv.line(12, 5, 9, 0, DARK)
    cv.hline(6, 9, 0, DARK)
    cv.outline(0.5)
    return cv


def carton():
    cv = Canvas(20, 16)
    c = hexc('c8955a')
    cv.rect(1, 4, 15, 15, c)
    cv.poly([(1, 4), (5, 0), (19, 0), (15, 4)], W(c, 1))
    cv.poly([(16, 4), (19, 1), (19, 12), (16, 15)], W(c, -2))
    cv.hline(1, 15, 9, hexc('d8c0a0'))
    cv.outline(0.5)
    return cv


def bubble(icon_fn, accent=None):
    cv = Canvas(24, 26)
    c = WHITE
    cv.rrect(0, 0, 23, 20, c, 4)
    cv.poly([(9, 20), (15, 20), (12, 25)], c)
    if accent:
        cv.rrect(0, 0, 23, 20, accent, 4)
        cv.rrect(1, 1, 22, 19, c, 3)
        cv.poly([(9, 19), (15, 19), (12, 24)], c)
    icon_fn(cv)
    cv.outline(0.6)
    return cv


def ic_cash(cv):
    g = hexc('6aa060')
    cv.rect(3, 5, 20, 15, g)
    cv.rect(4, 6, 19, 14, hexc('b8d8a8'))
    cv.ellipse(11.5, 10, 3, 3.5, g)
    cv.vline(11, 7, 13, hexc('f0f8e8'))
    cv.hline(10, 13, 8, hexc('f0f8e8'))
    cv.hline(10, 13, 12, hexc('f0f8e8'))


def ic_oden(cv):
    cv.rect(5, 7, 18, 16, hexc('d8a860'))
    cv.rect(5, 7, 18, 8, hexc('a07040'))
    cv.vline(11, 1, 9, hexc('a07040'))
    cv.ellipse(11.5, 6, 2.5, 2.5, hexc('f0e8c8'))
    cv.poly([(14, 4), (19, 4), (16, 9)], hexc('8a8a8a'))
    cv.vline(16, 2, 9, hexc('a07040'))


def ic_deli(cv):
    cv.ellipse(11.5, 10.5, 8, 6, hexc('e8a0a0'))
    cv.ellipse(11.5, 10.5, 5, 3.5, hexc('f0c0c0'))
    cv.ellipse(9, 9, 1.2, 1, hexc('f8e0e0'))


def ic_coffee(cv):
    cv.rect(6, 6, 16, 17, hexc('f0f0f0'))
    cv.rect(6, 6, 16, 8, hexc('6a3a20'))
    cv.rect(17, 9, 19, 13, hexc('f0f0f0'))
    cv.px(9, 3, hexc('b0b0b0')); cv.px(10, 2, hexc('b0b0b0')); cv.px(13, 3, hexc('b0b0b0'))


def ic_bag(cv):
    cv.poly([(5, 17), (18, 17), (17, 6), (6, 6)], hexc('c8a070'))
    cv.hline(6, 17, 6, hexc('a07848'))
    cv.line(9, 6, 9, 3, hexc('7a5a3a')); cv.line(14, 6, 14, 3, hexc('7a5a3a'))
    cv.hline(9, 14, 3, hexc('7a5a3a'))


def ic_bread(cv):
    cv.ellipse(11.5, 11, 8, 5, hexc('d8984a'))
    cv.line(7, 10, 9, 8, hexc('f0d090')); cv.line(11, 10, 13, 8, hexc('f0d090')); cv.line(15, 10, 17, 8, hexc('f0d090'))


def ic_heart(cv):
    r = hexc('e05070')
    cv.ellipse(8.5, 8, 3.5, 3.5, r)
    cv.ellipse(14.5, 8, 3.5, 3.5, r)
    cv.poly([(5, 9), (18, 9), (11.5, 16)], r)
    cv.px(7, 6, hexc('f8c0d0'))


def ic_sad(cv):
    c = hexc('6a7aa0')
    cv.ellipse(11.5, 10, 7, 7, hexc('f0e0a0'))
    cv.px(9, 8, c); cv.px(14, 8, c)
    cv.hline(9, 14, 13, c); cv.px(8, 14, c); cv.px(15, 14, c)


def ic_empty(cv):
    cv.rect(4, 6, 19, 15, hexc('d8dce4'))
    cv.hline(4, 19, 15, hexc('8a92a0'))
    cv.line(7, 4, 16, 17, hexc('d84848'), 2)


def ic_wait(cv):
    c = hexc('5a6a8a')
    cv.ellipse(11.5, 10, 7, 7, hexc('f0f2f6'))
    cv.vline(11, 5, 10, c)
    cv.hline(11, 14, 10, c)


def ic_star(cv):
    g = hexc('f0c040')
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        r = 7.5 if i % 2 == 0 else 3.2
        pts.append((11.5 + r * math.cos(a), 10.5 - r * math.sin(a)))
    cv.poly(pts, g)
    cv.px(10, 7, hexc('fff0b0')); cv.px(11, 6, hexc('fff0b0'))


def ic_paw(cv):
    p = hexc('e8909a')
    cv.ellipse(11.5, 12.5, 4, 3.2, p)
    for (x, y) in ((6.5, 8), (9.5, 5.5), (13.5, 5.5), (16.5, 8)):
        cv.ellipse(x, y, 1.6, 1.8, p)


def ic_pricey(cv):
    g = hexc('6aa060')
    cv.rect(3, 6, 15, 15, g)
    cv.rect(4, 7, 14, 14, hexc('b8d8a8'))
    cv.ellipse(9, 10.5, 2, 2.5, g)
    cv.ellipse(18, 7, 2, 2.6, hexc('7ab0e8'))
    cv.poly([(16.5, 6), (19.5, 6), (18, 3)], hexc('7ab0e8'))


def ic_chat(cv):
    c = hexc('6a7a9a')
    for x in (6, 11, 16):
        cv.rect(x, 9, x + 2, 11, c)


def ic_laugh(cv):
    c = hexc('e07a9a')
    cv.vline(13, 4, 12, c)
    cv.hline(13, 16, 4, c)
    cv.hline(14, 17, 5, c)
    cv.ellipse(11, 13, 2.6, 2, c)


def ic_wave(cv):
    s = hexc('f4c8a4')
    d = hexc('c89878')
    cv.rect(8, 8, 15, 15, s)
    for i, x in enumerate((8, 10, 12, 14)):
        cv.rect(x, 3 + (i % 2), x + 1, 8, s)
    cv.rect(16, 9, 17, 12, s)
    cv.vline(15, 9, 15, d)
    cv.hline(8, 15, 15, d)
    cv.px(4, 6, hexc('a0b0c8')); cv.px(5, 4, hexc('a0b0c8')); cv.px(19, 5, hexc('a0b0c8'))


def ic_exclaim(cv):
    c = hexc('e05050')
    cv.rect(10, 3, 13, 11, c)
    cv.rect(10, 14, 13, 16, c)


def ic_question(cv):
    c = hexc('4a8ad0')
    cv.rect(8, 4, 15, 5, c)
    cv.rect(14, 5, 15, 9, c)
    cv.rect(11, 9, 14, 10, c)
    cv.rect(11, 11, 12, 12, c)
    cv.rect(11, 14, 12, 16, c)
    cv.rect(8, 6, 9, 7, c)


def ic_zzz(cv):
    c = hexc('7a8ab0')
    for (x, y, n) in ((5, 11, 5), (11, 6, 4), (16, 2, 3)):
        cv.hline(x, x + n, y, c)
        cv.line(x + n, y + 1, x, y + n - 1, c)
        cv.hline(x, x + n, y + n, c)


def ic_camera(cv):
    b = hexc('3a3a44')
    cv.rect(4, 7, 19, 16, b)
    cv.rect(7, 5, 11, 7, b)
    cv.ellipse(11.5, 11.5, 3.5, 3.5, hexc('8ab0d8'))
    cv.ellipse(11.5, 11.5, 1.5, 1.5, hexc('2a3a5a'))
    cv.rect(16, 8, 17, 9, hexc('f0f0a0'))


TREASURES = ['leaf', 'feather', 'bottlecap', 'button', 'ribbon', 'pebble', 'flower', 'sock', 'mouse', 'bell', 'acorn', 'shell']


def treasure(kind):
    """Little things the cat brings back, 14x14."""
    cv = Canvas(14, 14)
    if kind == 'leaf':
        cv.poly([(2, 11), (6, 3), (12, 2), (10, 8)], hexc('d8903a'))
        cv.line(2, 12, 11, 3, hexc('a8602a'))
    elif kind == 'feather':
        cv.poly([(3, 12), (5, 6), (10, 1), (11, 4), (7, 10)], hexc('e8ecf0'))
        cv.line(2, 13, 10, 2, hexc('a8acb8'))
    elif kind == 'bottlecap':
        cv.ellipse(6.5, 7, 5.5, 5.5, hexc('d84848'))
        for a in range(0, 360, 45):
            import math as _m
            cv.px(round(6.5 + 6 * _m.cos(_m.radians(a))), round(7 + 6 * _m.sin(_m.radians(a))), hexc('a83030'))
        cv.ellipse(6.5, 7, 3, 3, hexc('f0f0f0'))
    elif kind == 'button':
        cv.ellipse(6.5, 6.5, 5.5, 5.5, hexc('4a8ad0'))
        for (x, y) in ((5, 5), (8, 5), (5, 8), (8, 8)):
            cv.px(x, y, hexc('1a3a6a'))
    elif kind == 'ribbon':
        cv.poly([(1, 3), (6, 6), (1, 10)], hexc('e07a9a'))
        cv.poly([(12, 3), (7, 6), (12, 10)], hexc('e07a9a'))
        cv.rect(5, 5, 8, 8, hexc('c05a7a'))
    elif kind == 'pebble':
        cv.ellipse(6.5, 7.5, 5.5, 4, hexc('9a9aa8'))
        cv.px(4, 6, hexc('c8c8d4')); cv.px(5, 5, hexc('c8c8d4'))
    elif kind == 'flower':
        for (x, y) in ((6.5, 3.5), (3.5, 6.5), (9.5, 6.5), (6.5, 9.5)):
            cv.ellipse(x, y, 2.4, 2.4, hexc('f0d040'))
        cv.ellipse(6.5, 6.5, 1.8, 1.8, hexc('e08030'))
    elif kind == 'sock':
        cv.rect(4, 1, 8, 8, hexc('e8e0d0'))
        cv.rect(4, 8, 11, 11, hexc('e8e0d0'))
        cv.hline(4, 8, 2, hexc('d84848')); cv.hline(4, 8, 4, hexc('d84848'))
        cv.rect(10, 9, 11, 11, hexc('c8c0b0'))
    elif kind == 'mouse':
        cv.ellipse(7, 8, 4.5, 3, hexc('a8a0a8'))
        cv.ellipse(10, 6, 1.6, 1.6, hexc('e8a0b0'))
        cv.px(10, 8, hexc('2a2a30'))
        cv.line(2, 9, 0, 12, hexc('e8a0b0'))
    elif kind == 'bell':
        cv.poly([(3, 10), (4, 4), (6.5, 2), (9, 4), (10, 10)], hexc('f0c040'))
        cv.hline(2, 11, 10, hexc('c89830'))
        cv.px(6, 12, hexc('a87820')); cv.px(7, 12, hexc('a87820'))
    elif kind == 'acorn':
        cv.ellipse(6.5, 8.5, 3.5, 4, hexc('b07840'))
        cv.rect(2, 3, 11, 5, hexc('7a5030'))
        cv.vline(6, 0, 2, hexc('5a3a20'))
    elif kind == 'shell':
        cv.poly([(1, 11), (6.5, 2), (12, 11)], hexc('f0c8b0'))
        for x in (4, 6, 8):
            cv.line(6, 3, x, 11, hexc('d8a088'))
    cv.outline(0.5)
    return cv


UMBRELLA_COLORS = {'red': 'd84848', 'blue': '4a8ad0', 'yellow': 'f0c040'}


def umbrella(color):
    """Open umbrella seen from the front, held over a head outdoors."""
    cv = Canvas(28, 16)
    c = hexc(UMBRELLA_COLORS[color])
    cv.poly([(1, 9), (4, 4), (9, 1), (14, 0), (19, 1), (24, 4), (27, 9)], c)
    for x in (1, 7, 14, 21, 27):
        cv.ellipse(x, 9, 2.6, 1.2, c)
    cv.line(14, 1, 9, 9, W(c, -2))
    cv.line(14, 1, 19, 9, W(c, -2))
    cv.poly([(9, 1), (14, 0), (12, 4)], W(c, 2))
    cv.vline(14, 9, 15, hexc('4a4a54'))
    cv.outline(0.5)
    return cv


def umbrella_stand():
    cv = Canvas(20, 30)
    for i, (x, color) in enumerate(((5, 'red'), (9, 'blue'), (13, 'yellow'))):
        c = hexc(UMBRELLA_COLORS[color])
        cv.rect(x, 3 + i % 2, x + 2, 16, c)
        cv.vline(x + 2, 3 + i % 2, 16, W(c, -2))
        cv.hline(x - 1, x + 1, 1 + i % 2, hexc('4a4a54'))
        cv.px(x - 1, 2 + i % 2, hexc('4a4a54'))
    body = hexc('7a8090')
    cv.rect(3, 14, 16, 29, body)
    cv.rect(3, 14, 4, 29, W(body, 2))
    cv.rect(15, 14, 16, 29, W(body, -2))
    cv.hline(3, 16, 14, W(body, 3))
    cv.outline(0.5)
    return cv


def trophy():
    cv = Canvas(20, 22)
    g = hexc('f0c040')
    cv.rect(4, 2, 15, 3, g)
    cv.poly([(4, 3), (16, 3), (14, 10), (11, 13), (9, 13), (6, 10)], g)
    for (x0, x1) in ((1, 4), (15, 18)):
        cv.rect(x0, 4, x1, 5, g)
    cv.rect(1, 4, 2, 8, g)
    cv.rect(17, 4, 18, 8, g)
    cv.rect(2, 8, 4, 9, g)
    cv.rect(15, 8, 17, 9, g)
    cv.rect(9, 13, 10, 16, W(g, -1))
    cv.rect(6, 17, 13, 18, W(g, -1))
    cv.rect(5, 19, 14, 20, hexc('8a5a3a'))
    cv.shade_cyl(4, 2, 16, 13, 0.8)
    cv.px(7, 5, W(g, 4)); cv.px(7, 6, W(g, 4)); cv.px(8, 5, W(g, 3))
    cv.rect(1, 6, 2, 7, (0, 0, 0, 0))
    cv.p[6][1] = cv.p[6][2] = cv.p[7][1] = cv.p[7][2] = None
    cv.p[6][17] = cv.p[6][18] = cv.p[7][17] = cv.p[7][18] = None
    cv.outline(0.5)
    return cv


# ---------- growth visuals ----------

GOLD = hexc('e8b840')


def upgraded(kind, base, tier):
    """Equipment looks newer at higher levels: tier 1 adds brass trim, tier 2 a kind-specific gadget."""
    cv = Canvas(base.w, base.h)
    cv.blit(base, 0, 0)
    if tier <= 0:
        return cv
    if kind == 'oven':
        cv.rect(2, 2, 61, 3, GOLD)
        cv.rect(26, 64, 37, 67, GOLD)
    else:
        for x in range(0, base.w):
            if cv.get(x, 8) is not None:
                cv.px(x, 8, GOLD)
        cv.rect(base.w - 12, 45, base.w - 5, 49, GOLD)
        cv.px(base.w - 10, 47, W(GOLD, -3)); cv.px(base.w - 7, 47, W(GOLD, -3))
    if tier >= 2:
        if kind == 'register':
            cv.rect(24, 2, 32, 12, hexc('2a2a34'))
            cv.rect(25, 3, 31, 7, hexc('5ad0f0'))
            cv.rect(26, 9, 30, 10, hexc('8a8e98'))
            cv.rect(2, 4, 10, 11, hexc('e8ecf0'))
            cv.rect(4, 0, 8, 4, WHITE)
        elif kind == 'oden':
            cv.rect(2, 0, 4, 12, hexc('6a4a30'))
            cv.rect(5, 0, 13, 9, hexc('d84848'))
            cv.rect(6, 2, 12, 2, WHITE); cv.rect(6, 5, 12, 5, WHITE)
            cv.rect(46, 4, 61, 7, hexc('c8ccd4'))
        elif kind == 'deli':
            cv.rect(2, 6, 14, 20, hexc('e8ecf0'))
            cv.rect(4, 8, 12, 12, hexc('2a3a2a'))
            cv.rect(5, 9, 11, 10, hexc('7ae07a'))
        elif kind == 'coffee':
            cv.rect(34, 2, 38, 20, hexc('c8ccd4'))
            cv.rect(35, 9, 37, 12, hexc('2a2a30'))
            cv.rect(9, 3, 31, 5, hexc('5ad0f0'))
        elif kind == 'card':
            cv.rect(55, 10, 61, 21, hexc('e8ecf0'))
            cv.rect(56, 6, 60, 10, WHITE)
            cv.hline(57, 59, 8, hexc('a8acb8'))
        elif kind == 'bagging':
            cv.rect(29, 0, 34, 14, hexc('8a8e98'))
            cv.ellipse(31.5, 3, 3, 3, hexc('e8dcc8'))
        elif kind == 'oven':
            cv.rect(20, 4, 43, 7, hexc('2a2a30'))
            cv.rect(22, 5, 30, 6, hexc('f08030'))
            cv.rect(34, 5, 41, 6, hexc('7ae07a'))
    cv.outline(0.45) if kind == 'oden' else None
    return cv


def sign():
    cv = Canvas(48, 20)
    wood = hexc('5a3a28')
    cv.rrect(0, 0, 47, 19, wood, 2)
    cv.rrect(2, 2, 45, 17, hexc('2a2430'), 1)
    cv.rect(23, 18, 24, 19, wood)
    cv.outline(0.5)
    return cv


def star(filled):
    cv = Canvas(7, 7)
    c = hexc('f0c040') if filled else hexc('5a5266')
    for (x, y) in ((3, 0), (3, 1), (2, 2), (3, 2), (4, 2), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
                   (1, 4), (2, 4), (3, 4), (4, 4), (5, 4), (1, 5), (2, 5), (4, 5), (5, 5), (1, 6), (5, 6)):
        cv.px(x, y, c)
    if filled:
        cv.px(3, 2, W(c, 3))
    return cv


def weather_icon(kind):
    cv = Canvas(16, 16)
    sun = hexc('f0c040')
    cloud = hexc('e8ecf4')
    if kind in ('sunny', 'hot'):
        cv.ellipse(8, 8, 4, 4, sun if kind == 'sunny' else hexc('f08030'))
        for a in range(0, 360, 45):
            import math as _m
            t = _m.radians(a)
            cv.px(8 + 6.5 * _m.cos(t) - 0.5, 8 + 6.5 * _m.sin(t) - 0.5, sun if kind == 'sunny' else hexc('f05030'))
        cv.px(6, 6, W(sun, 3))
    else:
        dark = kind in ('rain', 'snow')
        c = W(cloud, -2) if dark else cloud
        cv.ellipse(6, 8, 4, 3.5, c)
        cv.ellipse(10, 7, 4.5, 4, c)
        cv.rect(3, 8, 13, 10, c)
        if kind == 'cloudy':
            cv.ellipse(12, 4, 2.5, 2.5, sun)
            cv.ellipse(6, 8, 4, 3.5, cloud)
            cv.ellipse(10, 7, 4.5, 4, cloud)
        if kind == 'rain':
            for x in (4, 8, 12):
                cv.px(x, 12, hexc('5aa8e0')); cv.px(x - 1, 13, hexc('5aa8e0'))
        if kind == 'snow':
            for x in (4, 8, 12):
                cv.px(x, 13, WHITE); cv.px(x - 1, 14, WHITE); cv.px(x + 1, 14, WHITE)
    cv.outline(0.5)
    return cv


def cat(frame):
    """Orange tabby, side view facing right. frames: sit, walk1, walk2, sleep."""
    cv = Canvas(24, 18)
    fur = hexc('e89040')
    dark = W(fur, -2)
    light = hexc('f8e0c0')
    if frame == 'sleep':
        cv.ellipse(12, 12, 9, 5, fur)
        cv.ellipse(18, 11, 4, 3.5, fur)
        cv.poly([(16, 8), (17, 5), (19, 8)], fur)
        cv.poly([(19, 8), (21, 5), (22, 9)], fur)
        cv.line(4, 14, 14, 16, dark, 2)
        for x in (8, 11, 14):
            cv.vline(x, 8, 9, dark)
        cv.hline(17, 19, 11, hexc('3a2a20'))
        cv.hline(20, 21, 11, hexc('3a2a20'))
        cv.ellipse(12, 15, 6, 1.5, light)
    else:
        body_y = 11 if frame == 'sit' else 10
        if frame == 'sit':
            cv.ellipse(10, 11, 6, 5, fur)
            cv.ellipse(9, 15, 5, 2, fur)
            cv.line(4, 14, 1, 8, fur, 2)
        else:
            cv.ellipse(11, body_y, 7, 3.5, fur)
            step = 1 if frame == 'walk1' else -1
            for (x, d) in ((6, step), (9, -step), (14, step), (16, -step)):
                cv.vline(x + d, body_y + 2, 16, fur if d > 0 else dark)
            cv.line(4, body_y - 1, 1, body_y - 6, fur, 2)
        hx, hy = (16, 6) if frame == 'sit' else (18, 7)
        cv.ellipse(hx, hy, 4, 3.5, fur)
        cv.poly([(hx - 3, hy - 2), (hx - 2, hy - 6), (hx, hy - 3)], fur)
        cv.poly([(hx + 1, hy - 3), (hx + 3, hy - 6), (hx + 4, hy - 1)], fur)
        cv.px(hx + 1, hy, hexc('2a2030'))
        cv.px(hx + 3, hy + 1, hexc('e08080'))
        cv.ellipse(hx + 1, hy + 2, 2, 1, light)
        for x in range(hx - 9, hx - 2, 3):
            cv.vline(x, body_y - 2, body_y - 1, dark)
    cv.outline(0.5)
    return cv


def treat():
    cv = Canvas(12, 10)
    cv.ellipse(6, 6, 5, 3, hexc('d8d0c0'))
    cv.ellipse(6, 5, 3.5, 1.6, hexc('e86a5a'))
    cv.outline(0.5)
    return cv


def shadow():
    cv = Canvas(24, 8)
    cv.ellipse(12, 4, 11, 3.5, (30, 20, 40, 70))
    return cv


def selection():
    cv = Canvas(T, T)
    c = hexc('f0d040')
    for i in range(6):
        for (x, y) in ((i, 0), (0, i), (31 - i, 0), (31, i), (i, 31), (0, 31 - i), (31 - i, 31), (31, 31 - i)):
            cv.px(x, y, c)
    return cv


def pillar():
    """A square plaster column standing on one floor tile."""
    cv = Canvas(T, 72)
    wall = hexc('e8dcc8')
    cv.rect(5, 4, 26, 67, wall)
    cv.rect(5, 4, 8, 67, W(wall, 1))
    cv.rect(22, 4, 26, 67, W(wall, -2))
    cv.vline(15, 10, 60, W(wall, -1))
    cv.rect(3, 0, 28, 5, W(wall, 2))
    cv.hline(3, 28, 5, W(wall, -3))
    cv.rect(4, 60, 27, 67, hexc('8a7060'))
    cv.hline(4, 27, 60, hexc('a48a74'))
    cv.rect(5, 68, 26, 71, hexc('5a4a44'))
    cv.outline(0.5)
    return cv


def plant(sway=0):
    cv = Canvas(T, 48)
    pot = hexc('b06040')
    cv.poly([(9, 34), (23, 34), (21, 46), (11, 46)], pot)
    cv.rect(8, 32, 24, 34, W(pot, 1))
    cv.shade_cyl(8, 32, 24, 46)
    g = hexc('4a9a4a')
    # the top leans further than the base when it sways
    for (x, y, rx, ry) in ((16, 16, 6, 10), (10, 22, 5, 8), (22, 22, 5, 8), (16, 26, 7, 6)):
        cv.ellipse(x + sway * (1.5 if y < 20 else 0.6), y, rx, ry, g)
    rnd = random.Random(3)
    for _ in range(30):
        x, y = rnd.randint(5, 27), rnd.randint(6, 32)
        if cv.get(x, y) == g:
            cv.px(x, y, W(g, rnd.choice((-1, 1, 2))))
    cv.shade_ball(16 + sway, 20, 12, 14, 0.7)
    cv.outline(0.5)
    return cv


def puddle(k):
    """A sidewalk puddle; k > 0 adds a raindrop ring that widens and fades."""
    cv = Canvas(24, 10)
    water = hexc('7a90a8')
    cv.ellipse(11.5, 5, 11, 4, water)
    cv.ellipse(9, 4, 5, 1.6, W(water, 2))
    if k:
        rx, ry = 1 + k * 2, 0.5 + k * 0.8
        ring = mix(W(water, 4), water, (k - 1) / 3)
        for i in range(64):
            a = i / 64 * 2 * math.pi
            x, y = round(14 + math.cos(a) * rx), round(5 + math.sin(a) * ry)
            if cv.get(x, y) is not None:
                cv.px(x, y, ring)
    return cv


def splash(k):
    """A raindrop hitting the pavement: crown, then droplets falling away."""
    cv = Canvas(8, 6)
    c = hexc('c8dcf0')
    if k == 0:
        cv.px(3, 4, c); cv.px(4, 4, c); cv.px(2, 3, c); cv.px(5, 3, c)
    elif k == 1:
        cv.px(1, 2, c); cv.px(6, 2, c); cv.px(3, 1, c); cv.px(4, 5, c); cv.px(3, 5, c)
    else:
        cv.px(0, 4, c); cv.px(7, 4, c); cv.px(2, 2, c); cv.px(5, 2, c)
    return cv
