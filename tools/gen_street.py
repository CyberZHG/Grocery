"""Buildings for the street map around a store, 48x48 each, seen from the front."""
from pix import Canvas, hexc, tone

S = 48
WHITE = hexc('f4f0e8')


def W(c, k):
    return tone(c, k * 0.08)


def ground(cv, c=hexc('8ab070')):
    cv.rect(0, 40, S - 1, S - 1, c)
    cv.hline(0, S - 1, 40, W(c, 2))


def windows(cv, x0, y0, cols, rows, dx, dy, w=4, h=4, c=hexc('9ad0e8')):
    for r in range(rows):
        for k in range(cols):
            x, y = x0 + k * dx, y0 + r * dy
            cv.rect(x, y, x + w - 1, y + h - 1, c)
            cv.px(x, y, W(c, 3))


def tree(cv, x, y, r=7):
    cv.rect(x - 1, y + r - 2, x + 1, y + r + 5, hexc('7a5434'))
    cv.ellipse(x, y, r, r, hexc('4a9a4a'))
    cv.ellipse(x - 2, y - 2, r * 0.45, r * 0.45, hexc('6ab85a'))


def park():
    cv = Canvas(S, S)
    cv.rect(0, 20, S - 1, S - 1, hexc('8ac070'))
    cv.poly([(18, 47), (30, 47), (26, 20), (22, 20)], hexc('e0d0a8'))
    tree(cv, 10, 22, 8)
    tree(cv, 38, 20, 7)
    tree(cv, 40, 34, 5)
    cv.rect(4, 36, 15, 37, hexc('a87848'))
    cv.rect(4, 33, 15, 34, hexc('a87848'))
    cv.vline(5, 38, 40, hexc('4a4a54')); cv.vline(14, 38, 40, hexc('4a4a54'))
    for x, c in ((30, 'f0c040'), (33, 'e07a9a'), (8, 'e07a9a')):
        cv.px(x, 44, hexc(c)); cv.px(x + 1, 44, hexc(c))
    cv.outline(0.5)
    return cv


def bus():
    cv = Canvas(S, S)
    ground(cv, hexc('a8a8b0'))
    cv.rect(6, 16, 34, 18, hexc('3a6a9a'))
    cv.rect(8, 19, 32, 38, hexc('c8e4f0'))
    cv.vline(8, 19, 38, hexc('6a7a8a')); cv.vline(32, 19, 38, hexc('6a7a8a'))
    cv.rect(10, 32, 30, 34, hexc('a87848'))
    cv.vline(41, 10, 40, hexc('6a6a74'))
    cv.ellipse(41, 10, 5, 5, hexc('3a8ad8'))
    cv.ellipse(41, 10, 3, 3, WHITE)
    cv.rect(39, 9, 43, 11, hexc('3a8ad8'))
    cv.outline(0.5)
    return cv


def apartments():
    cv = Canvas(S, S)
    ground(cv)
    body = hexc('d8b898')
    cv.rect(8, 2, 39, 40, body)
    cv.rect(8, 2, 10, 40, W(body, 2))
    cv.rect(37, 2, 39, 40, W(body, -2))
    windows(cv, 12, 6, 4, 4, 7, 8)
    for y in (13, 21, 29):
        cv.hline(11, 36, y, hexc('8a6a50'))
    cv.rect(20, 34, 27, 40, hexc('6a4a34'))
    cv.rect(6, 0, 41, 2, W(body, -3))
    cv.outline(0.5)
    return cv


def school():
    cv = Canvas(S, S)
    ground(cv)
    body = hexc('f0e0c8')
    cv.rect(3, 18, 44, 40, body)
    cv.poly([(16, 18), (24, 8), (32, 18)], hexc('c05a4a'))
    cv.ellipse(24, 15, 3, 3, WHITE)
    cv.px(24, 14, hexc('2a2430')); cv.px(25, 15, hexc('2a2430'))
    windows(cv, 6, 22, 6, 2, 6, 8, 4, 5)
    cv.rect(21, 32, 27, 40, hexc('8a5a3a'))
    cv.vline(44, 2, 18, hexc('8a8e98'))
    cv.rect(38, 2, 43, 6, hexc('d84848'))
    cv.outline(0.5)
    return cv


def office():
    cv = Canvas(S, S)
    ground(cv, hexc('a8a8b0'))
    glass = hexc('5a8ab8')
    cv.rect(10, 0, 37, 40, glass)
    for y in range(2, 40, 4):
        cv.hline(10, 37, y, W(glass, -2))
    for x in (17, 24, 31):
        cv.vline(x, 0, 40, W(glass, -2))
    cv.poly([(12, 0), (20, 0), (12, 14)], W(glass, 3))
    cv.rect(20, 34, 27, 40, hexc('2a3a4a'))
    cv.outline(0.5)
    return cv


def clinic():
    cv = Canvas(S, S)
    ground(cv)
    cv.rect(6, 12, 41, 40, WHITE)
    cv.rect(6, 10, 41, 12, hexc('9ac0d8'))
    cv.rect(20, 14, 27, 26, hexc('d84848'))
    cv.rect(17, 17, 30, 23, hexc('d84848'))
    windows(cv, 9, 28, 2, 1, 6, 0, 4, 5)
    windows(cv, 33, 28, 1, 1, 0, 0, 4, 5)
    cv.rect(20, 30, 27, 40, hexc('9ac0d8'))
    cv.outline(0.5)
    return cv


def arcade():
    cv = Canvas(S, S)
    ground(cv, hexc('c8b8a0'))
    for i, (wall, awn) in enumerate((('e8d8c0', 'd84848'), ('d8e0e8', '3a8ad8'), ('f0e0b0', '4aa060'))):
        x0 = 1 + i * 16
        cv.rect(x0, 14, x0 + 14, 40, hexc(wall))
        for k in range(0, 15, 4):
            cv.rect(x0 + k, 18, x0 + min(14, k + 1), 21, hexc(awn))
            cv.rect(x0 + k + 2, 18, x0 + min(14, k + 3), 21, WHITE)
        cv.rect(x0 + 2, 24, x0 + 12, 33, hexc('9ad0e8'))
        cv.rect(x0 + 3, 10, x0 + 11, 13, hexc(awn))
    cv.outline(0.5)
    return cv


def parking():
    cv = Canvas(S, S)
    cv.rect(0, 10, S - 1, S - 1, hexc('7a7a84'))
    for x in (2, 16, 30, 44):
        cv.vline(x, 14, 30, WHITE)
    for x0, c in ((5, 'd84848'), (33, '3a8ad8')):
        col = hexc(c)
        cv.rrect(x0, 16, x0 + 9, 30, col, 2)
        cv.rect(x0 + 1, 18, x0 + 8, 21, hexc('c8e4f0'))
        cv.rect(x0 + 1, 26, x0 + 8, 28, hexc('c8e4f0'))
    cv.rect(18, 34, 28, 44, hexc('3a6ad8'))
    cv.rect(21, 36, 25, 42, WHITE)
    cv.rect(22, 37, 24, 38, hexc('3a6ad8'))
    cv.outline(0.5)
    return cv


def gym():
    cv = Canvas(S, S)
    ground(cv)
    body = hexc('7a8a9a')
    cv.rect(4, 16, 43, 40, body)
    cv.rect(4, 16, 43, 18, W(body, 3))
    windows(cv, 7, 24, 4, 1, 9, 0, 6, 8, hexc('c8e4f0'))
    cv.rect(18, 4, 29, 6, hexc('3a3a44'))
    for x in (13, 32):
        cv.rect(x, 1, x + 2, 9, hexc('e05050'))
    cv.outline(0.5)
    return cv


def tower():
    cv = Canvas(S, S)
    ground(cv)
    brick = hexc('b06a4a')
    cv.rect(16, 12, 31, 40, brick)
    for y in range(14, 40, 4):
        cv.hline(16, 31, y, W(brick, -1))
    cv.poly([(14, 12), (24, 0), (33, 12)], hexc('4a6a8a'))
    cv.ellipse(23.5, 20, 5.5, 5.5, WHITE)
    cv.vline(23, 16, 20, hexc('2a2430'))
    cv.hline(23, 26, 20, hexc('2a2430'))
    cv.rect(21, 32, 26, 40, hexc('5a3a2a'))
    cv.outline(0.5)
    return cv


def empty_lot():
    cv = Canvas(S, S)
    cv.rect(0, 14, S - 1, S - 1, hexc('b8a080'))
    for x in range(1, S, 6):
        cv.vline(x, 12, 20, hexc('a88a5a'))
    cv.hline(0, S - 1, 14, hexc('a88a5a'))
    cv.hline(0, S - 1, 18, hexc('a88a5a'))
    cv.vline(24, 24, 40, hexc('7a5434'))
    cv.rect(16, 22, 32, 31, WHITE)
    cv.rect(18, 25, 30, 26, hexc('d84848'))
    cv.rect(18, 28, 26, 28, hexc('8a8e98'))
    cv.outline(0.5)
    return cv


def mini_store():
    cv = Canvas(S, S)
    ground(cv, hexc('a8a8b0'))
    cv.rect(2, 10, 45, 40, hexc('e8dcc8'))
    cv.rect(2, 8, 45, 15, hexc('4a8a5a'))
    cv.rect(10, 9, 37, 13, hexc('f0e0a0'))
    for k in range(2, 46, 6):
        cv.rect(k, 16, k + 2, 19, hexc('d84848'))
        cv.rect(k + 3, 16, min(45, k + 5), 19, WHITE)
    cv.rect(5, 22, 18, 33, hexc('9ad0e8'))
    cv.rect(29, 22, 42, 33, hexc('9ad0e8'))
    cv.rect(20, 24, 27, 40, hexc('c8e4f0'))
    cv.vline(23, 24, 40, hexc('6a7a8a'))
    cv.outline(0.5)
    return cv


BUILDINGS = {
    'park': park, 'bus': bus, 'apartments': apartments, 'school': school, 'office': office,
    'clinic': clinic, 'arcade': arcade, 'parking': parking, 'gym': gym, 'tower': tower,
}
