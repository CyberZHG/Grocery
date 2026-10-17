"""Characters are composed from hand-authored pixel templates (one per direction),
recolored per outfit. Letters map to palette slots; '.' is transparent."""
import random
from pix import Canvas, hexc, mix

FW, FH = 32, 48

SKIN = {'S': hexc('f7dcc6'), 's': hexc('e9bea2'), 'r': hexc('d79d84'), 'b': hexc('f3b4a4'),
        'E': hexc('2b2230'), 'W': hexc('ffffff'), 'm': hexc('c86e60')}
HAIR_COLORS = [hexc('2a2228'), hexc('33282a'), hexc('3e2c26'), hexc('4c3628'), hexc('241e28')]
GRAY_HAIR = [hexc('b8b4bc'), hexc('a09ca6'), hexc('cfcbd2')]
SHIRTS = ['e8e4dc', '5a7ab8', 'c85a5a', '6aa070', 'e0b860', '8a6ab0', '3a4a6a', 'f0a0a8', '60a8c0', 'd88040',
          'f4f0e8', '4a6a50', 'b04060', '7a8a98', 'c8b8a0', '2a3a5a']
PANTS = ['3a4a6a', '2a2a34', '6a5a48', '4a5a7a', 'b8a888', '5a4a5a', '303848']
SHOES = ['f0f0f0', '3a2a2a', '5a3a2a', '2a2a3a', 'c84a4a']
HAIRSTYLES = ['short', 'bob', 'long', 'ponytail', 'bun', 'buzz', 'spiky', 'parted']


def shade(c, f):
    """Darker step that keeps the hue (slightly warm-to-cool), unlike the product ramp."""
    d = (int(c[0] * (1 - f)), int(c[1] * (1 - f * 0.9)), int(c[2] * (1 - f * 0.75)), 255)
    return d


def light(c, f):
    return mix(c, (255, 250, 240, 255), f)


# ---------- head (16 x 15), origin = top-left of face ----------

FACE = {
    'down': [
        '.....SSSSSS.....',
        '...SSSSSSSSSS...',
        '..SSSSSSSSSSSS..',
        '.SSSSSSSSSSSSSS.',
        '.SSSSSSSSSSSSSS.',
        'SSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSS',
        'SSSWESSSSSSWESSS',
        'SSSEESSSSSSEESSS',
        'sSSEESSSSSSEESSs',
        'sSbbSSSSSSSSbbSs',
        '.sSSSSSmmSSSSSs.',
        '.ssSSSSSSSSSSss.',
        '..sssSSSSSSsss..',
        '....ssssssss....',
    ],
    'side': [
        '.....SSSSSS.....',
        '...SSSSSSSSSS...',
        '..SSSSSSSSSSSS..',
        '.SSSSSSSSSSSSSS.',
        '.SSSSSSSSSSSSSS.',
        'SSSSSSSSSSSSSSS.',
        'SSSSSSSSSSSSSSS.',
        'SSSsSSSSSSSWESS.',
        'SSsrSSSSSSSEESS.',
        'SSSsSSSSSSSEESSS',
        'sSSSSSSSSSSSbbSs',
        '.sSSSSSSSSSSSmS.',
        '.ssSSSSSSSSSSS..',
        '..sssSSSSSSss...',
        '....sssssss.....',
    ],
    'up': [
        '.....SSSSSS.....',
        '...SSSSSSSSSS...',
        '..SSSSSSSSSSSS..',
        '.SSSSSSSSSSSSSS.',
        '.SSSSSSSSSSSSSS.',
        'SSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSS',
        'sSSSSSSSSSSSSSSs',
        'sSSSSSSSSSSSSSSs',
        '.sSSSSSSSSSSSSs.',
        '.ssSSSSSSSSSSss.',
        '..sssSSSSSSsss..',
        '....ssssssss....',
    ],
}

# ---------- hair (18 wide), origin = face origin + (-1, -3) ----------
# H base, h shadow, L highlight. Rows may extend below the face for long styles.

HAIR = {
    'short': {
        'down': [
            '.....HHHHHHHH.....',
            '...HHHHHHHHHHHH...',
            '..HHHHLLLHHHHHHH..',
            '.HHHHLLHHHHHHHHHH.',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHhHHHHhHHHHhHHHHH',
            'Hh.hHHh..hHHh..hhH',
            'Hh..h.........h.hH',
            'hh..............hh',
            'h................h',
        ],
        'side': [
            '.....HHHHHHH......',
            '...HHHHHHHHHHH....',
            '..HHHHHLLLHHHHH...',
            '.HHHHHLLHHHHHHHH..',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHhHHHHHhhHH.',
            'HHHHHhh.hHHh...hh.',
            'HHHHh.....h.......',
            'HHHH..............',
            'HHHh..............',
            'hHh...............',
            '.h................',
        ],
        'up': [
            '.....HHHHHHHH.....',
            '...HHHHHHHHHHHH...',
            '..HHHHLLLHHHHHHH..',
            '.HHHHLLHHHHHHHHHH.',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'hHHHHHHHHHHHHHHHHh',
            '.hHHHHHHHHHHHHHHh.',
            '..hhHHHHHHHHHHhh..',
            '....hhhhhhhhhh....',
        ],
    },
    'buzz': {
        'down': [
            '..................',
            '.....hhhhhhhh.....',
            '...hHHHHHHHHHHh...',
            '..hHHHLLHHHHHHHh..',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHhhhhhhhhhhHHh.',
            '.hh............hh.',
        ],
        'side': [
            '..................',
            '.....hhhhhhh......',
            '...hHHHHHHHHHh....',
            '..hHHHHLLHHHHHh...',
            '.hHHHHHHHHHHHHHh..',
            '.hHHHHHHHHHHHHhh..',
            '.hHHHHHHHhhhh.....',
            '.hHHHh............',
            '.hHHh.............',
            '.hHh..............',
            '..h...............',
        ],
        'up': [
            '..................',
            '.....hhhhhhhh.....',
            '...hHHHHHHHHHHh...',
            '..hHHHLLHHHHHHHh..',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHHHHHHHHHHHHHh.',
            '.hHHHHHHHHHHHHHHh.',
            '..hHHHHHHHHHHHHh..',
            '...hhHHHHHHHHhh...',
            '.....hhhhhhhh.....',
        ],
    },
    'spiky': {
        'down': [
            '...H...H...H...H..',
            '..HH..HH..HH..HH..',
            '.HHHHHHHHHHHHHHHH.',
            '.HHHHLLLHHHHHHHHH.',
            'HHHHLLHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHhHHHHhHHHHhHHH',
            'Hh.H.hH.H.hH.H.hhH',
            'Hh..............hH',
            'hh..............hh',
        ],
        'side': [
            '....H...H...H.....',
            '...HH..HH..HH.....',
            '..HHHHHHHHHHHHH...',
            '.HHHHHLLLHHHHHHH..',
            'HHHHHLLHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHhHHHhHHHhH.',
            'HHHHHhH.hH.H.hH.h.',
            'HHHHh.............',
            'HHHH..............',
            'HHHh..............',
            'hHh...............',
        ],
        'up': [
            '...H...H...H...H..',
            '..HH..HH..HH..HH..',
            '.HHHHHHHHHHHHHHHH.',
            '.HHHHLLLHHHHHHHHH.',
            'HHHHLLHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'hHHHHHHHHHHHHHHHHh',
            '.hHHHHHHHHHHHHHHh.',
            '..hhHHHHHHHHHHhh..',
            '....hhhhhhhhhh....',
        ],
    },
    'parted': {
        'down': [
            '.....HHHHHHHH.....',
            '...HHHHHHHHHHHH...',
            '..HHHHHHHLLLHHHH..',
            '.HHHHHHHHLLHHHHHH.',
            '.HHHHHHHHhHHHHHHH.',
            'HHHHHHHHh.HHHHHHHH',
            'HHHHHHHh...HHHHHHH',
            'HHHHHHh.....hHHHHH',
            'HHhhh........hhHHH',
            'Hh..............hH',
            'hh..............hh',
            'h................h',
        ],
        'side': [
            '.....HHHHHHH......',
            '...HHHHHHHHHHH....',
            '..HHHHHHHLLLHHH...',
            '.HHHHHHHLLHHHHHH..',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHhHH..',
            'HHHHHhhhhhhh..hh..',
            'HHHHh.............',
            'HHHH..............',
            'HHHh..............',
            'hHh...............',
            '.h................',
        ],
        'up': None,
    },
    'bob': {
        'down': [
            '.....HHHHHHHH.....',
            '...HHHHHHHHHHHH...',
            '..HHHHLLLHHHHHHH..',
            '.HHHHLLHHHHHHHHHH.',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHhhhhhhhhhhhhhhHH',
            'HHh............hHH',
            'HHh............hHH',
            'HHh............hHH',
            'HHh............hHH',
            'HHH............HHH',
            'hHH............HHh',
            'hhh............hhh',
        ],
        'side': [
            '.....HHHHHHH......',
            '...HHHHHHHHHHH....',
            '..HHHHHLLLHHHHH...',
            '.HHHHHLLHHHHHHHH..',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHH.',
            'HHHHHHHHhhhhhhhhh.',
            'HHHHHHHHh.........',
            'HHHHHHHHh.........',
            'HHHHHHHHh.........',
            'HHHHHHHHh.........',
            'HHHHHHHHH.........',
            'hHHHHHHHh.........',
            '.hhhhhhhh.........',
        ],
        'up': [
            '.....HHHHHHHH.....',
            '...HHHHHHHHHHHH...',
            '..HHHHLLLHHHHHHH..',
            '.HHHHLLHHHHHHHHHH.',
            '.HHHHHHHHHHHHHHHH.',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'HHHHHHHHHHHHHHHHHH',
            'hHHHHHHHHHHHHHHHHh',
            'hhhhhhhhhhhhhhhhhh',
        ],
    },
}
HAIR['parted']['up'] = HAIR['short']['up']


# long: bob silhouette extended past the shoulders
HAIR['long'] = {
    'down': HAIR['bob']['down'][:-2] + [
        'HHH............HHH',
        'HHH............HHH',
        'HHH............HHH',
        'HHH............HHH',
        'HHH............HHH',
        'hHh............hHh',
        'hh..............hh',
    ],
    'side': HAIR['bob']['side'][:-2] + [
        'HHHHHHHHH.........',
        'HHHHHHHH..........',
        'HHHHHHHH..........',
        'HHHHHHHH..........',
        'HHHHHHH...........',
        'hHHHHHh...........',
        '.hhhhh............',
    ],
    'up': HAIR['bob']['up'][:-2] + [
        'HHHHHHHHHHHHHHHHHH',
        'HHHHHHHHHHHHHHHHHH',
        '.HHHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHHH.',
        '.hHHHHHHHHHHHHHHh.',
        '..hhhhhhhhhhhhhh..',
    ],
}

# ponytail and bun reuse the short cut with an extra piece
HAIR['ponytail'] = {
    'down': HAIR['short']['down'],
    'side': [r for r in HAIR['short']['side']],
    'up': HAIR['short']['up'],
}
HAIR['bun'] = {k: v for k, v in HAIR['short'].items()}

PONYTAIL = {
    'side': (-4, 6, [
        '.HHh',
        'HHHH',
        'HHHH',
        'HHHh',
        'HHH.',
        'HHH.',
        'HHh.',
        'HH..',
        'Hh..',
        'h...',
    ]),
    'up': (6, 13, [
        '.HHHHh',
        '.HHHHh',
        '.HHHH.',
        '..HHHh',
        '..HHH.',
        '..HHh.',
        '..Hh..',
    ]),
    'down': (16, 4, [
        '.Hh',
        'HHh',
        'HH.',
        'Hh.',
        'h..',
    ]),
}
BUN = {
    'down': (5, -4, ['..HHHH..', '.HHLLHH.', 'HHHLHHHH', 'hHHHHHHh', '.hhhhhh.']),
    'up': (5, -4, ['..HHHH..', '.HHLLHH.', 'HHHLHHHH', 'hHHHHHHh', '.hhhhhh.']),
    'side': (0, -2, ['..HHHH..', '.HHLLHH.', 'HHHLHHHH', 'hHHHHHHh', '.hhhhhh.']),
}

CAP = {
    'down': (0, -1, [
        '....KKKKKKKKKK....',
        '..KKKKKKkKKKKKKK..',
        '.KKKKKKKkKKKKKKKK.',
        '.KKKKKKKkKKKKKKKK.',
        'KKKKKKKKKKKKKKKKKK',
        'kkkkkkkkkkkkkkkkkk',
        '.kVVVVVVVVVVVVVVk.',
    ]),
    'side': (0, -1, [
        '....KKKKKKKKK.......',
        '..KKKKKKKKkKKKK.....',
        '.KKKKKKKKKkKKKKK....',
        '.KKKKKKKKKkKKKKKK...',
        'KKKKKKKKKKKKKKKKK...',
        'kkkkkkkkkkkkkkkkVVVV',
        '................VVV.',
    ]),
    'up': (0, -1, [
        '....KKKKKKKKKK....',
        '..KKKKKKkKKKKKKK..',
        '.KKKKKKKkKKKKKKKK.',
        '.KKKKKKKkKKKKKKKK.',
        'KKKKKKKKKKKKKKKKKK',
        'kkkkkkkkkkkkkkkkkk',
    ]),
}

GLASSES = {
    'down': (1, 6, ['GGGGG..GGGGG', 'G...GGGG...G', 'G...G..G...G', 'GGGGG..GGGGG']),
    'side': (9, 6, ['..GGGGG', 'GGG...G', '..G...G', '..GGGGG']),
}

# ---------- body (16 wide), origin x = 8 ----------

TORSO = {
    'down': [
        '....CCCCCCCC....',
        '..CCCCCCCCCCCC..',
        '.CCCCCCCCCCCCCC.',
        '.CCcCCCCCCCCcCC.',
        '.CCcCCCCCCCCcCC.',
        '.CCcCCCCCCCCcCC.',
        '.SScCCCCCCCCcSS.',
        '.sSccccccccccSs.',
        '...PPPPPPPPPP...',
    ],
    'side': [
        '.....CCCCCC.....',
        '....CCCCCCCC....',
        '....CCCCCCCCc...',
        '....CCCCCCCCc...',
        '....CCCCCCCCc...',
        '....CCCCCCCCc...',
        '....CCCCCCCCc...',
        '....ccccccccc...',
        '.....PPPPPPP....',
    ],
    'up': [
        '....CCCCCCCC....',
        '..CCCCCCCCCCCC..',
        '.CCCCCCCCCCCCCC.',
        '.CCcCCCCCCCCcCC.',
        '.CCcCCCCCCCCcCC.',
        '.CCcCCCCCCCCcCC.',
        '.SScCCCCCCCCcSS.',
        '.sSccccccccccSs.',
        '...PPPPPPPPPP...',
    ],
}
SIDE_ARM = ['CCc', 'CCc', 'CCc', 'CCc', 'cCc', 'SSs', 'sss']

WORK_ARM = ['CCCCCcSS', 'ccccccSs', '......ss']
RAISED_ARM = ['SS', 'sS', 'CC', 'CC', 'Cc', 'Cc', 'CC', 'CC']

KID_TORSO_ROWS = [0, 1, 2, 4, 6, 7, 8]


def paint(cv, ox, oy, rows, pal):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            c = pal.get(ch)
            if c is not None:
                cv.px(ox + x, oy + y, c)


class Look:
    def __init__(self, hair='short', hair_c=None, shirt='5a7ab8', pants='3a4a6a', shoes='3a2a2a', kid=False,
                 skirt=False, apron=None, glasses=False, cap=None, jacket=None):
        self.hair = hair
        self.hair_c = hair_c or HAIR_COLORS[0]
        self.shirt = hexc(shirt) if isinstance(shirt, str) else shirt
        self.pants = hexc(pants) if isinstance(pants, str) else pants
        self.shoes = hexc(shoes) if isinstance(shoes, str) else shoes
        self.kid = kid
        self.skirt = skirt
        self.apron = hexc(apron) if isinstance(apron, str) else apron
        self.glasses = glasses
        self.cap = hexc(cap) if isinstance(cap, str) else cap
        self.jacket = hexc(jacket) if isinstance(jacket, str) else jacket


def palette(look):
    h = look.hair_c
    shirt = look.shirt
    pal = dict(SKIN)
    pal.update({
        'H': h, 'h': shade(h, 0.28), 'L': light(h, 0.28),
        'C': shirt, 'c': shade(shirt, 0.2),
        'P': look.pants, 'p': shade(look.pants, 0.25),
        'F': look.shoes, 'f': shade(look.shoes, 0.3),
        'G': hexc('3a3040'),
    })
    if look.cap is not None:
        pal.update({'K': look.cap, 'k': shade(look.cap, 0.25), 'V': shade(look.cap, 0.4)})
    return pal


def legs(cv, look, d, frame, top, pal):
    """Two legs plus shoes; lifting one leg per step frame."""
    leg_len = 4 if look.kid else 6
    step = 0 if frame == 0 else (1 if frame == 1 else -1)
    P = pal['P'] if not look.skirt else pal['S']
    p = pal['p'] if not look.skirt else pal['s']
    F, f = pal['F'], pal['f']
    if d == 'side':
        for lg, (shift, dark) in enumerate(((-2 * step, True), (2 * step, False))):
            x0 = 14 + shift
            lift = 1 if (step != 0 and lg == 0) else 0
            for y in range(leg_len - lift):
                cv.px(x0, top + y, p if dark else P)
                cv.px(x0 + 1, top + y, p if dark else P)
                cv.px(x0 + 2, top + y, p)
            y = top + leg_len - lift
            for dx in range(4):
                cv.px(x0 + dx, y, f if dark else F)
                cv.px(x0 + dx, y + 1, f)
        return
    for side, x0 in ((0, 12), (1, 16)):
        lift = 1 if (step == 1 and side == 0) or (step == -1 and side == 1) else 0
        for y in range(leg_len - lift):
            for dx in range(4):
                edge = (dx == 3 and side == 0) or (dx == 3 and side == 1)
                cv.px(x0 + dx, top + y, p if edge else P)
        y = top + leg_len - lift
        for dx in range(-1 if side == 0 else 0, 4 if side == 0 else 5):
            cv.px(x0 + dx, y, F)
            cv.px(x0 + dx, y + 1, f)


EXPRESSION = {
    'happy': {7: 'SSSSSSSSSSSSSSSS', 8: 'SSSEESSSSSSEESSS', 9: 'sSESSESSSSESSESs', 11: '.sSSSSmSSmSSSSs.', 12: '.ssSSSSmmSSSSss.'},
    'sad': {6: 'SSSSESSSSSSESSSS', 11: '.sSSSSSmmSSSSSs.', 12: '.ssSSSmSSmSSSss.'},
}


def draw_frame(look, d, frame, expr=None, work=None):
    pal = palette(look)
    if work is not None:
        frame = 0
    cv = Canvas(FW, FH)
    leg_len = 4 if look.kid else 6
    feet = 45
    legs_top = feet - 1 - leg_len
    torso_rows = TORSO[d] if not look.kid else [TORSO[d][i] for i in KID_TORSO_ROWS]
    bob = 1 if frame != 0 else 0
    torso_top = legs_top - len(torso_rows) + 1 - bob
    head_top = torso_top - 14
    face_x = 8

    back = Canvas(FW, FH)
    if look.hair == 'long' and d == 'down':
        rows = HAIR['long']['down']
        paint(back, face_x - 1, head_top - 3, [''.join(ch if i in (0, 1, 2, 15, 16, 17) else '.' for i, ch in enumerate(r)) for r in rows], pal)
    if look.hair == 'ponytail' and d == 'down':
        ox, oy, rows = PONYTAIL['down']
        paint(back, face_x - 1 + ox, head_top - 3 + oy, rows, pal)
    cv.blit(back, 0, 0)

    legs(cv, look, d, frame, legs_top, pal)
    if look.skirt:
        sk = look.pants
        for i, w in enumerate((12, 13, 14, 15)):
            x0 = 16 - w // 2
            for x in range(w):
                cv.px(x0 + x, legs_top - 1 + i, shade(sk, 0.25) if (x == w - 1 or i == 3) else sk)
    tp = dict(pal)
    if look.jacket is not None:
        tp['C'] = look.jacket
        tp['c'] = shade(look.jacket, 0.2)
    if d == 'side':
        paint(cv, 8, torso_top, torso_rows, tp)
    else:
        # arms (columns 1-2 and 13-14 below the shoulders) swing opposite to each other
        arm_cols = (1, 2, 13, 14)
        core = [''.join('.' if (y >= 2 and x in arm_cols) else ch for x, ch in enumerate(r)) for y, r in enumerate(torso_rows)]
        paint(cv, 8, torso_top, core, tp)
        swing = 0 if frame == 0 else (1 if frame == 1 else -1)
        if d == 'up':
            swing = -swing
        dys = (swing, -swing)
        if work is not None:
            dys = (-4, 0) if work == 0 else (0, -4)
            if d == 'up':
                # one arm reaches up to the shelf; it's painted over the hair later
                raised = ((1, 2), (13, 14))[work]
                dys = tuple(None if cols == raised else 0 for cols in ((1, 2), (13, 14)))
        for cols, dy in zip(((1, 2), (13, 14)), dys):
            if dy is None:
                continue
            arm = [''.join(r[c] for c in cols) for r in torso_rows[2:]]
            if dy < 0:
                arm = arm[-dy:]
            paint(cv, 8 + cols[0], torso_top + 2 + max(0, dy), arm, tp)
    if look.jacket is not None and d == 'down':
        for y in range(1, len(torso_rows) - 2):
            for x in range(13, 19):
                cv.px(x, torso_top + y, pal['C'] if x not in (13, 18) else pal['c'])
    if look.apron is not None and d != 'up':
        a = look.apron
        ad = shade(a, 0.22)
        if d == 'down':
            for y in range(2, len(torso_rows) + 3):
                for x in range(12, 20):
                    cv.px(x, torso_top + y, ad if x == 19 or y == len(torso_rows) + 2 else a)
            cv.px(12, torso_top, a); cv.px(12, torso_top + 1, a)
            cv.px(19, torso_top, a); cv.px(19, torso_top + 1, a)
            for x in range(14, 18):
                cv.px(x, torso_top + 5, light(a, 0.35))
        else:
            for y in range(2, len(torso_rows) + 3):
                for x in range(18, 21):
                    cv.px(x, torso_top + y, ad if x == 20 else a)
    if d == 'up' and look.apron is not None:
        for x in range(10, 22):
            cv.px(x, torso_top + 4, look.apron)
        cv.px(15, torso_top + 5, look.apron); cv.px(16, torso_top + 5, look.apron)
        cv.px(15, torso_top + 6, shade(look.apron, 0.2)); cv.px(16, torso_top + 6, shade(look.apron, 0.2))
    if d == 'side' and work is not None:
        paint(cv, 16 if work == 0 else 13, torso_top + 2, WORK_ARM if work == 0 else WORK_ARM[:1] + WORK_ARM[2:], tp)
    elif d == 'side':
        swing = 0 if frame == 0 else (2 if frame == 1 else -2)
        arm_pal = dict(tp)
        rows = SIDE_ARM if not look.kid else SIDE_ARM[:2] + SIDE_ARM[3:]
        paint(cv, 13 + swing, torso_top + 1, rows, arm_pal)

    face = list(FACE[d])
    if expr and d == 'down':
        for row, line in EXPRESSION[expr].items():
            face[row] = line
    paint(cv, face_x, head_top, face, pal)
    style = HAIR[look.hair]
    hair_rows = style[d] or HAIR['short'][d]
    if look.hair == 'long' and d == 'down':
        hair_rows = [''.join(ch if (i < 12 or x in (0, 1, 2, 15, 16, 17)) else '.' for x, ch in enumerate(r)) for i, r in enumerate(HAIR['long']['down'])]
    hair = Canvas(FW, FH)
    paint(hair, face_x - 1, head_top - 3, hair_rows, pal)
    if look.hair == 'ponytail' and d in ('side', 'up'):
        ox, oy, rows = PONYTAIL[d]
        paint(hair, face_x - 1 + ox, head_top - 3 + oy, rows, pal)
    if look.hair == 'bun':
        ox, oy, rows = BUN[d]
        paint(hair, face_x - 1 + ox, head_top - 3 + oy, rows, pal)
    if look.cap is not None:
        ox, oy, rows = CAP[d]
        paint(hair, face_x - 1 + ox, head_top - 3 + oy, rows, pal)
    if look.glasses and d in GLASSES:
        ox, oy, rows = GLASSES[d]
        paint(cv, face_x + ox, head_top + oy, rows, pal)
    cv.blit(hair, 0, 0)
    if d == 'up' and work is not None:
        paint(cv, 8 if work == 0 else 22, torso_top - 6, RAISED_ARM, tp)
    cv.outline(0.45)
    return cv


FRAMES_PER_ROW = 21


def char_row(look):
    """Columns: down 0-2, side 3-5, up 6-8, down happy 9-11, down upset 12-14, working down 15-16, side 17-18, up 19-20."""
    frames = []
    for d in ('down', 'side', 'up'):
        for f in range(3):
            frames.append(draw_frame(look, d, f))
    for expr in ('happy', 'sad'):
        for f in range(3):
            frames.append(draw_frame(look, 'down', f, expr))
    for d in ('down', 'side', 'up'):
        for w in range(2):
            frames.append(draw_frame(look, d, 0, work=w))
    return frames


def random_look(rnd, kind):
    kid = kind == 'kid'
    elder = kind == 'elder'
    hair = rnd.choice(HAIRSTYLES)
    hair_c = rnd.choice(GRAY_HAIR) if elder else rnd.choice(HAIR_COLORS)
    shirt = rnd.choice(SHIRTS)
    pants = rnd.choice(PANTS)
    skirt = hair in ('long', 'bob', 'ponytail', 'bun') and rnd.random() < 0.4
    if skirt:
        pants = rnd.choice(['5a3a5a', '3a4a6a', 'b04060', '6a5a48', '2a2a34', 'c8a060'])
    jacket = rnd.choice(SHIRTS) if (rnd.random() < 0.25 and not kid) else None
    if jacket == shirt:
        jacket = None
    cap = rnd.choice(['c84a4a', '3a5a9a', '3a6a4a', '2a2a34']) if rnd.random() < 0.12 else None
    return Look(hair=hair, hair_c=hair_c, shirt=shirt, pants=pants, shoes=rnd.choice(SHOES), kid=kid,
                skirt=skirt, glasses=(rnd.random() < (0.5 if elder else 0.15)), cap=cap, jacket=jacket)
