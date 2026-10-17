"""Cat cafe furniture and the twenty cat toys."""
import math
from pix import Canvas, hexc, tone

WHITE = hexc('f4f0e8')
WOOD = hexc('b07848')


def W(c, k):
    return tone(c, k * 0.08)


def table():
    """One-seat cafe table seen from the front: top, apron and two legs; the chair goes behind it."""
    cv = Canvas(32, 22)
    cv.rect(1, 0, 30, 6, WOOD)
    cv.hline(1, 30, 0, W(WOOD, 3))
    cv.rect(3, 7, 28, 9, W(WOOD, -2))
    for x in (5, 25):
        cv.rect(x, 10, x + 1, 21, W(WOOD, -3))
    cv.ellipse(10, 2, 3, 1.5, WHITE)
    cv.outline(0.5)
    return cv


def chair():
    """Chair back, drawn behind a seated customer."""
    cv = Canvas(22, 26)
    c = hexc('8a5a3a')
    cv.rect(2, 0, 19, 4, c)
    cv.hline(2, 19, 0, W(c, 3))
    for x in (3, 9, 15):
        cv.rect(x, 5, x + 2, 25, W(c, -1))
    cv.outline(0.5)
    return cv


def ball(color, size=5, pattern=None):
    cv = Canvas(16, 16)
    c = hexc(color)
    cv.ellipse(8, 10, size, size, c)
    if pattern == 'stripe':
        cv.hline(3, 13, 10, W(c, -3))
    cv.px(6, 7, W(c, 4)); cv.px(7, 7, W(c, 4))
    cv.outline(0.5)
    return cv


def toy(kind):
    if kind == 'ball':
        return ball('e05050', 5, 'stripe')
    if kind == 'pingpong':
        return ball('f0f0f0', 3)
    if kind == 'bellball':
        cv = Canvas(16, 16)
        cv.ellipse(8, 10, 5, 5, hexc('f0c040'))
        for a in range(0, 360, 60):
            cv.px(round(8 + 3 * math.cos(math.radians(a))), round(10 + 3 * math.sin(math.radians(a))), hexc('a87820'))
        cv.px(8, 10, hexc('5a3a10'))
        cv.outline(0.5)
        return cv
    if kind == 'laser':
        cv = Canvas(16, 16)
        cv.line(3, 13, 11, 5, hexc('4a4a54'), 2)
        cv.rect(11, 3, 13, 5, hexc('e05050'))
        cv.outline(0.5)
        return cv
    if kind == 'mouse':
        cv = Canvas(16, 16)
        cv.ellipse(8, 11, 5, 3, hexc('a8a0a8'))
        cv.ellipse(11, 9, 1.6, 1.6, hexc('e8a0b0'))
        cv.px(12, 11, hexc('2a2a30'))
        cv.line(3, 12, 0, 14, hexc('e8a0b0'))
        cv.outline(0.5)
        return cv
    if kind == 'kicker':
        cv = Canvas(24, 12)
        f = hexc('4a9ad0')
        cv.ellipse(10, 6, 9, 4, f)
        cv.poly([(18, 6), (23, 2), (23, 10)], f)
        cv.px(5, 5, hexc('f4f0e8')); cv.px(5, 6, hexc('2a2a30'))
        for x in (9, 12, 15):
            cv.vline(x, 4, 8, W(f, -2))
        cv.outline(0.5)
        return cv
    if kind in ('wand', 'fishing', 'ribbon'):
        cv = Canvas(20, 36)
        cv.rect(8, 32, 13, 35, hexc('6a6a74'))
        cv.line(10, 32, 14, 6, hexc('a87848'), 1)
        if kind == 'wand':
            for i, c in enumerate(('e07a9a', 'f0c040', '4a9ad0')):
                cv.line(14, 6, 10 + i * 3, 0, hexc(c), 1)
        elif kind == 'fishing':
            cv.vline(15, 6, 16, hexc('d8d8e0'))
            cv.ellipse(15, 18, 3, 2, hexc('e08a3a'))
            cv.poly([(12, 18), (10, 16), (10, 20)], hexc('e08a3a'))
        else:
            for y in range(6, 22):
                cv.px(14 + round(2 * math.sin(y * 0.8)), y, hexc('d84848'))
        cv.outline(0.5)
        return cv
    if kind == 'spring':
        cv = Canvas(16, 30)
        cv.rect(3, 26, 12, 29, hexc('6a6a74'))
        for y in range(10, 26, 2):
            cv.hline(6, 9, y, hexc('c8ccd4'))
        cv.ellipse(7.5, 6, 4, 4, hexc('e07a9a'))
        cv.outline(0.5)
        return cv
    if kind == 'dangle':
        cv = Canvas(30, 34)
        c = hexc('c8a070')
        cv.line(2, 33, 15, 2, c, 2)
        cv.line(28, 33, 15, 2, c, 2)
        cv.vline(15, 3, 18, hexc('d8d8e0'))
        cv.ellipse(15, 21, 3, 3, hexc('4aa060'))
        cv.outline(0.5)
        return cv
    if kind == 'post':
        cv = Canvas(20, 42)
        cv.rect(1, 37, 18, 41, hexc('8a6a4a'))
        rope = hexc('d8c098')
        cv.rect(6, 4, 13, 36, rope)
        for y in range(5, 36, 3):
            cv.hline(6, 13, y, W(rope, -2))
        cv.rect(3, 0, 16, 3, hexc('8a6a4a'))
        cv.outline(0.5)
        return cv
    if kind == 'board':
        cv = Canvas(30, 12)
        cv.rect(0, 2, 29, 11, hexc('c8a878'))
        for x in range(2, 28, 3):
            cv.vline(x, 3, 10, hexc('a88858'))
        cv.outline(0.5)
        return cv
    if kind == 'bed':
        cv = Canvas(30, 16)
        cv.ellipse(15, 9, 14, 6.5, hexc('8a9ad0'))
        cv.ellipse(15, 8, 10, 4, hexc('d8e0f4'))
        cv.outline(0.5)
        return cv
    if kind == 'hammock':
        cv = Canvas(34, 26)
        frame = hexc('7a7a84')
        cv.line(2, 25, 6, 4, frame, 1); cv.line(32, 25, 28, 4, frame, 1)
        for x in range(6, 29):
            y = 12 + round(4 * math.sin((x - 6) / 22 * math.pi))
            cv.vline(x, y, y + 2, hexc('e8b060'))
        cv.outline(0.5)
        return cv
    if kind == 'cushion':
        cv = Canvas(26, 12)
        c = hexc('d87a8a')
        cv.rrect(0, 2, 25, 11, c, 3)
        cv.hline(3, 22, 4, W(c, 3))
        cv.px(12, 7, W(c, -3))
        cv.outline(0.5)
        return cv
    if kind == 'tunnel':
        # open at both ends so a cat can run through
        cv = Canvas(40, 20)
        c = hexc('4a8ad0')
        cv.rrect(0, 2, 39, 19, c, 8)
        for x in range(8, 33, 5):
            cv.vline(x, 3, 18, W(c, -2))
        cv.ellipse(5, 11, 4, 7, hexc('1a2a4a'))
        cv.ellipse(34, 11, 4, 7, hexc('1a2a4a'))
        cv.vline(30, 4, 18, W(c, 2))
        cv.outline(0.5)
        return cv
    if kind == 'box':
        cv = Canvas(26, 22)
        k = hexc('c89860')
        cv.rect(1, 6, 24, 21, k)
        cv.poly([(1, 6), (5, 0), (9, 6)], W(k, 2))
        cv.poly([(16, 6), (20, 0), (24, 6)], W(k, 2))
        cv.rect(3, 7, 22, 9, hexc('5a3a20'))
        cv.outline(0.5)
        return cv
    if kind == 'tower':
        cv = Canvas(34, 56)
        post = hexc('d8c098')
        pad = hexc('9a7ac0')
        cv.rect(14, 6, 19, 52, post)
        for y in range(7, 52, 3):
            cv.hline(14, 19, y, W(post, -2))
        for (y, x0, x1) in ((2, 4, 29), (24, 1, 22), (50, 2, 31)):
            cv.rrect(x0, y, x1, y + 5, pad, 2)
            cv.hline(x0 + 1, x1 - 1, y, W(pad, 3))
        cv.outline(0.5)
        return cv
    if kind == 'window':
        cv = Canvas(34, 10)
        cv.rect(0, 0, 33, 5, hexc('e8dcc8'))
        cv.rect(2, 6, 5, 9, hexc('8a6a4a')); cv.rect(28, 6, 31, 9, hexc('8a6a4a'))
        cv.rect(4, 1, 29, 4, hexc('d8a0b0'))
        cv.outline(0.5)
        return cv
    raise ValueError(kind)


def tunnel_front():
    """Only the tunnel's middle, between the two openings, drawn over a cat that is going through."""
    cv = toy('tunnel')
    for y in range(20):
        for x in range(40):
            if x <= 9 or x >= 30:
                cv.p[y][x] = None
    return cv


# Animation frames for toys that move when played with; frame 0 matches the static sprite's look.
TOY_FRAMES = {'ball': 4, 'bellball': 3, 'pingpong': 3, 'mouse': 3, 'kicker': 3, 'wand': 4, 'fishing': 4, 'ribbon': 4,
              'spring': 4, 'dangle': 4, 'hammock': 2, 'box': 2, 'cushion': 2, 'bed': 2}


def toy_frame(kind, k):
    n = TOY_FRAMES[kind]
    swing = math.sin(k / n * 2 * math.pi)
    if kind == 'ball':
        # the stripe turns as it rolls
        cv = Canvas(16, 16)
        c = hexc('e05050')
        cv.ellipse(8, 10, 5, 5, c)
        a = k * math.pi / 4
        dx, dy = math.cos(a), math.sin(a)
        for t in range(-5, 6):
            x, y = 8 + dx * t, 10 + dy * t
            if (x - 8) ** 2 + (y - 10) ** 2 <= 24:
                cv.px(round(x), round(y), WHITE)
        cv.px(6, 7, W(c, 4)); cv.px(7, 7, W(c, 4))
        cv.outline(0.5)
        return cv
    if kind == 'bellball':
        cv = Canvas(16, 16)
        cv.ellipse(8, 10, 5, 5, hexc('f0c040'))
        for a in range(0, 360, 60):
            r = math.radians(a + k * 20)
            cv.px(round(8 + 3 * math.cos(r)), round(10 + 3 * math.sin(r)), hexc('a87820'))
        cv.px(8, 10, hexc('5a3a10'))
        cv.px(6, 7, hexc('fff0b0'))
        cv.outline(0.5)
        return cv
    if kind == 'pingpong':
        cv = Canvas(16, 16)
        cv.ellipse(8, 10, 3, 3, hexc('f0f0f0'))
        hx, hy = [(7, 9), (9, 9), (8, 11)][k]
        cv.px(hx, hy, hexc('ffffff'))
        cv.px(hx + 1, hy + 1, hexc('d8d8e0'))
        cv.outline(0.5)
        return cv
    if kind == 'mouse':
        cv = Canvas(16, 16)
        cv.ellipse(8, 11, 5, 3, hexc('a8a0a8'))
        cv.ellipse(11, 9, 1.6, 1.6, hexc('e8a0b0'))
        cv.px(12, 11, hexc('2a2a30'))
        tail = [(0, 14), (0, 11), (1, 15)][k]
        cv.line(3, 12, tail[0], tail[1], hexc('e8a0b0'))
        cv.outline(0.5)
        return cv
    if kind == 'kicker':
        # the fish bends as it gets kicked
        cv = Canvas(24, 12)
        f = hexc('4a9ad0')
        bend = [0, -2, 2][k]
        cv.ellipse(10, 6, 9, 4, f)
        cv.poly([(18, 6), (23, 2 + bend), (23, 10 + bend)], f)
        cv.px(5, 5, hexc('f4f0e8')); cv.px(5, 6, hexc('2a2a30'))
        for x in (9, 12, 15):
            cv.vline(x, 4, 8, W(f, -2))
        cv.outline(0.5)
        return cv
    if kind in ('wand', 'fishing', 'ribbon'):
        # the rod bends and whatever hangs from it swings
        cv = Canvas(20, 36)
        cv.rect(8, 32, 13, 35, hexc('6a6a74'))
        tip = (14 + round(swing * 2), 6)
        cv.line(10, 32, tip[0], tip[1], hexc('a87848'), 1)
        if kind == 'wand':
            for i, c in enumerate(('e07a9a', 'f0c040', '4a9ad0')):
                cv.line(tip[0], tip[1], tip[0] - 4 + i * 3 + round(swing * 3), 0, hexc(c), 1)
        elif kind == 'fishing':
            end = (tip[0] + round(swing * 4), 16)
            cv.line(tip[0], tip[1], end[0], end[1], hexc('d8d8e0'))
            cv.ellipse(end[0], end[1] + 2, 3, 2, hexc('e08a3a'))
            cv.poly([(end[0] - 3, end[1] + 2), (end[0] - 5, end[1]), (end[0] - 5, end[1] + 4)], hexc('e08a3a'))
        else:
            for y in range(6, 22):
                cv.px(tip[0] + round(2 * math.sin(y * 0.8 + k * 1.6) + swing * (y - 6) / 6), y, hexc('d84848'))
        cv.outline(0.5)
        return cv
    if kind == 'spring':
        # bouncing: the coil stretches and squashes under the ball
        cv = Canvas(16, 30)
        cv.rect(3, 26, 12, 29, hexc('6a6a74'))
        top = [12, 10, 12, 14][k]
        for y in range(top, 26, 2):
            cv.hline(6, 9, y, hexc('c8ccd4'))
        cv.ellipse(7.5 + swing, top - 4, 4, 4, hexc('e07a9a'))
        cv.outline(0.5)
        return cv
    if kind == 'dangle':
        cv = Canvas(30, 34)
        c = hexc('c8a070')
        cv.line(2, 33, 15, 2, c, 2)
        cv.line(28, 33, 15, 2, c, 2)
        bx = 15 + round(swing * 5)
        by = 21 - round(abs(swing) * 1)
        cv.line(15, 3, bx, by - 3, hexc('d8d8e0'))
        cv.ellipse(bx, by, 3, 3, hexc('4aa060'))
        cv.outline(0.5)
        return cv
    if kind == 'hammock':
        cv = Canvas(34, 26)
        frame = hexc('7a7a84')
        cv.line(2, 25, 6, 4, frame, 1); cv.line(32, 25, 28, 4, frame, 1)
        sag = [4, 5][k]
        for x in range(6, 29):
            y = 12 + round(sag * math.sin((x - 6) / 22 * math.pi)) + (1 if k and x > 17 else 0)
            cv.vline(x, y, y + 2, hexc('e8b060'))
        cv.outline(0.5)
        return cv
    if kind == 'box':
        cv = Canvas(26, 22)
        kraft = hexc('c89860')
        cv.rect(1, 6, 24, 21, kraft)
        lift = [0, 2][k]
        cv.poly([(1, 6), (5 - lift, 0 - lift), (9, 6)], W(kraft, 2))
        cv.poly([(16, 6), (20 + lift, 0 - lift), (24, 6)], W(kraft, 2))
        cv.rect(3, 7, 22, 9, hexc('5a3a20'))
        cv.outline(0.5)
        return cv
    if kind == 'cushion':
        cv = Canvas(26, 12)
        c = hexc('d87a8a')
        squash = [0, 1][k]
        cv.rrect(0 - squash, 2 + squash * 2, 25 + squash, 11, c, 3)
        cv.hline(3, 22, 4 + squash * 2, W(c, 3))
        cv.outline(0.5)
        return cv
    # bed
    cv = Canvas(30, 16)
    squash = [0, 1][k]
    cv.ellipse(15, 9 + squash, 14 + squash, 6.5 - squash, hexc('8a9ad0'))
    cv.ellipse(15, 8 + squash, 10, 4 - squash * 0.5, hexc('d8e0f4'))
    cv.outline(0.5)
    return cv


TOYS = ['ball', 'pingpong', 'bellball', 'laser', 'mouse', 'wand', 'fishing', 'ribbon', 'spring', 'dangle',
        'post', 'board', 'bed', 'hammock', 'cushion', 'tunnel', 'box', 'tower', 'window', 'kicker']
