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


def entrance():
    cv = Canvas(64, T)
    cv.rect(0, 0, 63, 31, hexc('6a5a58'))
    cv.rect(2, 2, 61, 29, hexc('9ec8d8'))
    cv.vline(31, 2, 29, hexc('4a5a68'))
    cv.vline(32, 2, 29, hexc('4a5a68'))
    for x0 in (2, 33):
        cv.line(x0 + 4, 26, x0 + 20, 4, W(hexc('9ec8d8'), 3))
    cv.rect(0, 0, 63, 1, hexc('4a5a68'))
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


def oden_counter():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('d8d0c0'), front=hexc('8a3a3a'))
    cv.rect(6, 6, 57, 21, STEEL)
    cv.rect(8, 8, 55, 19, hexc('c89050'))
    for x in range(8, 56, 8):
        cv.vline(x, 8, 19, STEEL)
    cv.hline(8, 55, 13, STEEL)
    rnd = random.Random(4)
    cols = [hexc('f0e8c8'), hexc('a08060'), hexc('e8d8b0'), hexc('8a8a8a'), hexc('d8a860')]
    for x in range(10, 54, 8):
        for y in (9, 15):
            cv.ellipse(x + 2.5, y + 2, 2.4, 2, rnd.choice(cols))
    for i in range(4):
        cv.px(14 + i * 10, 3 - (i % 2), (255, 255, 255, 140))
        cv.px(15 + i * 10, 2 - (i % 2), (255, 255, 255, 110))
    cv.rect(18, 32, 45, 44, hexc('f0e0c0'))
    cv.ellipse(31.5, 38, 4, 3, hexc('c89050'))
    cv.outline(0.5)
    return cv


def deli_counter():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('e8ecf0'), front=hexc('5a6a7a'))
    cv.rect(2, 26, 61, 46, hexc('9ec8d8'))
    for i, c in enumerate((hexc('e8a0a0'), hexc('c84848'), hexc('e8c8a0'), hexc('f0c040'))):
        cv.rrect(5 + i * 14, 34, 15 + i * 14, 43, c, 2)
        cv.shade_ball(10 + i * 14, 38, 6, 5, 0.6, dither=False)
    cv.line(6, 44, 30, 27, (255, 255, 255, 150))
    cv.rect(36, 2, 58, 20, STEEL)
    cv.ellipse(46, 11, 8, 8, hexc('d8dce4'))
    cv.ellipse(46, 11, 2, 2, STEEL)
    cv.rect(50, 14, 58, 20, W(STEEL, -1))
    cv.shade_box(36, 2, 58, 20, 0.5)
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


def bread_case():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('e8dcc8'), front=hexc('a07048'))
    cv.rect(2, 0, 61, 22, hexc('cfe6ee'))
    cv.rect(2, 0, 61, 1, WOOD)
    cv.rect(2, 11, 61, 12, WOOD)
    cv.line(4, 20, 18, 2, (255, 255, 255, 160))
    return cv


def coffee_bar():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('5a4a40'), front=hexc('3a2a24'))
    cv.rect(6, 0, 34, 20, hexc('c8ccd4'))
    cv.rect(8, 2, 32, 7, hexc('3a3a44'))
    for x in (12, 26):
        cv.rect(x - 2, 9, x + 2, 12, hexc('2a2a30'))
        cv.rect(x - 1, 13, x + 1, 15, STEEL)
    cv.rect(10, 17, 30, 20, hexc('8a8e98'))
    cv.shade_box(6, 0, 34, 20, 0.5)
    for i, c in enumerate((hexc('f0f0f0'), hexc('e8c890'), hexc('8a5a3a'))):
        x = 40 + i * 7
        cv.rect(x, 10, x + 4, 20, c)
        cv.shade_cyl(x, 10, x + 4, 20)
    cv.rect(18, 32, 45, 44, hexc('e8d0a0'))
    cv.ellipse(31.5, 38, 4, 3.5, hexc('6a3a20'))
    return cv


def bagging():
    cv = Canvas(64, 56)
    counter_base(cv, top=hexc('d8dce4'), front=hexc('6a7a5a'))
    for i, c in enumerate((hexc('c8a070'), hexc('5a9ac0'))):
        x0 = 6 + i * 28
        cv.poly([(x0, 20), (x0 + 22, 20), (x0 + 20, 2), (x0 + 2, 2)], c)
        cv.rect(x0 + 2, 2, x0 + 20, 4, W(c, 2))
        cv.shade_cyl(x0, 2, x0 + 22, 20)
    return cv


# ---------- props / bubbles ----------

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


def plant():
    cv = Canvas(T, 48)
    pot = hexc('b06040')
    cv.poly([(9, 34), (23, 34), (21, 46), (11, 46)], pot)
    cv.rect(8, 32, 24, 34, W(pot, 1))
    cv.shade_cyl(8, 32, 24, 46)
    g = hexc('4a9a4a')
    for (x, y, rx, ry) in ((16, 16, 6, 10), (10, 22, 5, 8), (22, 22, 5, 8), (16, 26, 7, 6)):
        cv.ellipse(x, y, rx, ry, g)
    rnd = random.Random(3)
    for _ in range(30):
        x, y = rnd.randint(5, 27), rnd.randint(6, 32)
        if cv.get(x, y) == g:
            cv.px(x, y, W(g, rnd.choice((-1, 1, 2))))
    cv.shade_ball(16, 20, 12, 14, 0.7)
    cv.outline(0.5)
    return cv
