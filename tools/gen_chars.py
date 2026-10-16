import math
import random
from pix import Canvas, hexc, tone, mix

FW, FH = 32, 48
SKIN = hexc('f4d3b8')
SKIN_SH = hexc('e2b496')
BLUSH = hexc('f0b0a0')
EYE = hexc('2a2028')
HAIR_COLORS = [hexc('231c22'), hexc('2c2228'), hexc('3a2a26'), hexc('4a3428'), hexc('1e1a24')]
GRAY_HAIR = [hexc('b8b4bc'), hexc('9c98a4'), hexc('d0ccd2')]
SHIRTS = ['e8e4dc', '5a7ab8', 'c85a5a', '6aa070', 'e0b860', '8a6ab0', '3a4a6a', 'f0a0a8', '60a8c0', 'd88040',
          'f4f0e8', '4a6a50', 'b04060', '7a8a98', 'c8b8a0', '2a3a5a']
PANTS = ['3a4a6a', '2a2a34', '6a5a48', '4a5a7a', 'b8a888', '5a4a5a', '303848']
SHOES = ['f0f0f0', '3a2a2a', '5a3a2a', '2a2a3a', 'c84a4a']
HAIRSTYLES = ['short', 'bob', 'long', 'ponytail', 'bun', 'buzz', 'spiky', 'parted']


class Look:
    def __init__(self, hair='short', hair_c=None, shirt='5a7ab8', pants='3a4a6a', shoes='3a2a2a', kid=False,
                 skirt=False, apron=None, glasses=False, cap=None, jacket=None):
        self.hair = hair
        self.hair_c = hair_c or HAIR_COLORS[0]
        self.shirt = hexc(shirt)
        self.pants = hexc(pants)
        self.shoes = hexc(shoes)
        self.kid = kid
        self.skirt = skirt
        self.apron = hexc(apron) if apron else None
        self.glasses = glasses
        self.cap = hexc(cap) if cap else None
        self.jacket = hexc(jacket) if jacket else None


def metrics(look):
    leg = 5 if look.kid else 8
    torso = 9 if look.kid else 11
    feet = 46
    leg_top = feet - 2 - leg
    torso_top = leg_top - torso
    head_cy = torso_top - 9
    return leg_top, torso_top, head_cy


def draw_head(look, d, hy):
    cv = Canvas(FW, FH)
    cv.ellipse(16, hy, 9.2, 9.0, SKIN)
    if d == 'side':
        cv.rect(24, hy + 1, 25, hy + 2, SKIN)
    cv.shade_ball(16, hy, 9.2, 9.0, 0.55, dither=False)
    ey = round(hy + 1)
    if d == 'down':
        for ex in (12, 19):
            cv.rect(ex, ey, ex + 1, ey + 2, EYE)
            cv.px(ex, ey, hexc('f8f0f0'))
        cv.px(10, ey + 4, BLUSH); cv.px(11, ey + 4, BLUSH)
        cv.px(21, ey + 4, BLUSH); cv.px(22, ey + 4, BLUSH)
        cv.rect(15, ey + 5, 16, ey + 5, hexc('c87868'))
        if look.glasses:
            for ex in (11, 18):
                cv.rect(ex, ey - 1, ex + 3, ey - 1, hexc('3a3040'))
                cv.rect(ex, ey + 3, ex + 3, ey + 3, hexc('3a3040'))
                cv.vline(ex, ey - 1, ey + 3, hexc('3a3040'))
                cv.vline(ex + 3, ey - 1, ey + 3, hexc('3a3040'))
            cv.hline(15, 17, ey, hexc('3a3040'))
    elif d == 'side':
        cv.rect(21, ey, 22, ey + 2, EYE)
        cv.px(22, ey, hexc('f8f0f0'))
        cv.px(22, ey + 4, BLUSH); cv.px(23, ey + 4, BLUSH)
        cv.px(23, ey + 5, hexc('c87868'))
        cv.rect(15, ey - 1, 16, ey + 2, SKIN_SH)
        if look.glasses:
            cv.rect(20, ey - 1, 24, ey - 1, hexc('3a3040'))
            cv.rect(20, ey + 3, 24, ey + 3, hexc('3a3040'))
            cv.vline(20, ey - 1, ey + 3, hexc('3a3040'))
            cv.hline(14, 19, ey, hexc('3a3040'))
    return cv


def draw_hair(look, d, hy):
    cv = Canvas(FW, FH)
    c = look.hair_c
    top = hy - 9.5
    style = look.hair

    def cap_mask(rx=10.2, ry=10.0, cy_off=-0.8):
        pts = []
        for y in range(FH):
            for x in range(FW):
                if cv.inside_ellipse(x, y, 16, hy + cy_off, rx, ry):
                    pts.append((x, y))
        return pts

    if style == 'buzz':
        rx, ry = 9.5, 9.3
    elif style == 'spiky':
        rx, ry = 10.4, 10.4
    else:
        rx, ry = 10.2, 10.0
    for (x, y) in cap_mask(rx, ry):
        if d == 'up':
            limit = hy + (6 if style in ('buzz', 'short', 'spiky', 'parted', 'bun', 'ponytail') else 9)
            if y <= limit:
                cv.px(x, y, c)
        elif d == 'down':
            fringe = hy - 3 + ((x * 7) % 3 == 0) * 1 - (style == 'buzz') * 2
            if style == 'parted':
                fringe = hy - 3 + (1 if x < 14 else -1) + (x % 3 == 0)
            side = (x <= 8 or x >= 24)
            side_limit = hy + (2 if style in ('short', 'spiky', 'parted', 'ponytail', 'bun') else (-1 if style == 'buzz' else 6))
            if y <= fringe or (side and y <= side_limit):
                cv.px(x, y, c)
        else:
            back = x <= 15 + max(0, (hy - 2 - y)) // 2
            limit = hy + (2 if style in ('short', 'spiky', 'parted', 'ponytail', 'bun') else (-1 if style == 'buzz' else 6))
            if y <= hy - 3 + (x > 20) * 0 or (back and y <= limit):
                cv.px(x, y, c)
    if style == 'spiky':
        for i, x in enumerate(range(8, 25, 3)):
            cv.poly([(x - 1, top + 3), (x + 2, top + 3), (x + 1 + (i % 2), top - 1)], c)
    if style in ('long', 'bob') and d != 'down':
        ext = 8 if style == 'long' else 3
        if d == 'up':
            cv.rrect(7, hy, 25, hy + 6 + ext, c, 2)
        else:
            cv.rrect(7, hy, 15, hy + 6 + ext, c, 2)
    if style == 'long' and d == 'down':
        cv.rect(6, hy, 8, hy + 13, c)
        cv.rect(24, hy, 26, hy + 13, c)
    if style == 'ponytail':
        if d == 'side':
            cv.ellipse(7, hy + 2, 2.5, 6, c)
        elif d == 'up':
            cv.ellipse(16, hy + 9, 2.6, 6, c)
        else:
            cv.rect(24, hy - 2, 26, hy + 5, c)
    if style == 'bun':
        if d == 'side':
            cv.ellipse(9, top + 2, 4, 3.5, c)
        else:
            cv.ellipse(16, top + 0.5, 4.2, 3.5, c)
    if look.cap is not None:
        capc = look.cap
        for (x, y) in cap_mask(10.4, 10.2, -1.5):
            if y <= hy - 4:
                cv.px(x, y, capc)
        if d == 'down':
            cv.rect(8, round(hy - 4), 24, round(hy - 3), tone(capc, -1))
        elif d == 'side':
            cv.rect(20, round(hy - 4), 28, round(hy - 3), tone(capc, -1))
        cv.ellipse(16, hy - 7, 2.2, 1.6, tone(capc, 2))
    cv.shade_ball(16, hy - 2, 11, 12, 0.85, dither=False)
    # glossy strand highlight
    if d != 'up' or True:
        for i in range(5):
            x, y = 11 + i, round(hy - 7 + abs(i - 2) * 0.5)
            p = cv.get(x, y)
            if p is not None:
                cv.px(x, y, tone(p, 2))
    return cv


def draw_body(look, d, frame):
    cv = Canvas(FW, FH)
    leg_top, torso_top, _ = metrics(look)
    step = 0 if frame == 0 else (1 if frame == 1 else -1)
    shirt = look.shirt
    pants = look.pants
    shoes = look.shoes

    def leg(x0, x1, lift, shift=0, dark=0):
        y1 = 43 - lift
        if look.skirt:
            cv.rect(x0 + shift, leg_top + 2, x1 + shift, y1, tone(SKIN, dark))
        else:
            cv.rect(x0 + shift, leg_top, x1 + shift, y1, tone(pants, dark))
        cv.rect(x0 + shift, y1 + 1, x1 + shift + (1 if d == 'side' else 0), y1 + 3, shoes)
        cv.hline(x0 + shift, x1 + shift, y1 + 1, tone(shoes, 1))

    if d == 'side':
        leg(14, 17, 1 if step != 0 else 0, -2 * step, -1)
        leg(14, 17, 0, 2 * step)
    else:
        leg(11, 14, 2 if step == 1 else 0)
        leg(17, 20, 2 if step == -1 else 0)
    if d == 'side':
        tx0, tx1 = 11, 20
    else:
        tx0, tx1 = 9, 22
    cv.rrect(tx0, torso_top, tx1, leg_top + (1 if not look.skirt else 0), shirt, 2)
    if look.skirt:
        cv.poly([(tx0, leg_top - 2), (tx1 + 1, leg_top - 2), (tx1 + 3, leg_top + 6), (tx0 - 2, leg_top + 6)], pants)
    else:
        cv.rect(tx0 + 1, leg_top - 1, tx1 - 1, leg_top, pants)
        cv.hline(tx0 + 1, tx1 - 1, leg_top - 1, tone(pants, -2))
    if look.jacket is not None:
        j = look.jacket
        if d == 'down':
            cv.rect(tx0, torso_top, tx0 + 3, leg_top, j)
            cv.rect(tx1 - 3, torso_top, tx1, leg_top, j)
        elif d == 'up':
            cv.rrect(tx0, torso_top, tx1, leg_top, j, 2)
        else:
            cv.rect(tx0, torso_top, tx1 - 2, leg_top, j)
    if look.apron is not None and d != 'up':
        a = look.apron
        if d == 'down':
            cv.rect(11, torso_top + 2, 20, leg_top + 4, a)
            cv.vline(11, torso_top, torso_top + 2, a)
            cv.vline(20, torso_top, torso_top + 2, a)
            cv.rect(13, torso_top + 6, 18, torso_top + 8, tone(a, 2))
            cv.hline(14, 17, torso_top + 7, tone(a, -2))
        else:
            cv.rect(18, torso_top + 2, 21, leg_top + 4, a)
            cv.vline(15, torso_top, torso_top + 4, a)
    if look.apron is not None and d == 'up':
        cv.hline(tx0 + 1, tx1 - 1, torso_top + 6, look.apron)
        cv.rect(15, torso_top + 6, 16, torso_top + 8, look.apron)
    cv.shade_cyl(tx0 - 2, torso_top, tx1 + 2, leg_top + 6, 0.6, dither=False)

    sleeve = look.jacket if look.jacket is not None else shirt
    if d == 'side':
        sw = 2 * step
        cv.rect(14 + sw, torso_top + 1, 17 + sw, torso_top + 6, sleeve)
        cv.rect(14 + sw, torso_top + 7, 17 + sw, torso_top + 8, tone(sleeve, -1))
        cv.rect(14 + sw, torso_top + 9, 17 + sw, torso_top + 10, SKIN)
    else:
        for (ax, sgn) in ((tx0 - 3, 1), (tx1 + 1, -1)):
            sw = step * sgn if d == 'down' else -step * sgn
            cv.rect(ax, torso_top + 1 + max(0, -sw), ax + 2, torso_top + 7 - max(0, sw), sleeve)
            cv.rect(ax, torso_top + 8 - max(0, sw), ax + 2, torso_top + 9 - max(0, sw), SKIN)
            cv.px(ax + (2 if sgn > 0 else 0), torso_top + 1, tone(sleeve, 1))
    return cv


def draw_frame(look, d, frame):
    _, torso_top, hy = metrics(look)
    bob = 1 if frame != 0 else 0
    out = Canvas(FW, FH)
    body = draw_body(look, d, frame)
    head = draw_head(look, d, hy)
    hair = draw_hair(look, d, hy)
    if d == 'up':
        out.blit(head, 0, 0)
        out.blit(hair, 0, 0)
        upper_hair = Canvas(FW, FH)
        upper_hair.blit(hair, 0, 0)
        out2 = Canvas(FW, FH)
        out2.blit(body, 0, 0)
        out2.blit(head, 0, -bob)
        out2.blit(hair, 0, -bob)
        out = out2
    else:
        if look.hair in ('long', 'bob', 'ponytail') and d == 'side':
            back_only = Canvas(FW, FH)
            back_only.blit(hair, 0, 0)
            out.blit(back_only, 0, -bob)
        out.blit(body, 0, 0)
        out.blit(head, 0, -bob)
        out.blit(hair, 0, -bob)
    out.outline(0.5)
    return out


def char_row(look):
    frames = []
    for d in ('down', 'side', 'up'):
        for f in range(3):
            frames.append(draw_frame(look, d, f))
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
