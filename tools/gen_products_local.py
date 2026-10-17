"""Templates and label marks for the local specialties, so each one reads as itself at 32px."""
import math
import random
from pix import hexc, tone, mix
import gen_products as GP

WHITE = GP.WHITE
INK = GP.INK
GLASS = GP.GLASS


def W(c, k):
    return tone(c, k)


def H(s):
    return hexc(s)


# ---------- produce ----------

def t_bokchoy(cv, A, B, C):
    """A head of bok choy: pale spoon-shaped stalks fanning up into dark leaves."""
    for i, dx in enumerate((-6, -3, 0, 3, 6)):
        x = 16 + dx
        cv.poly([(x - 2, 29), (x + 2, 29), (x + 3 + dx * 0.4, 16), (x - 3 + dx * 0.4, 16)], B)
        cv.ellipse(x + dx * 0.6, 10 + abs(dx) * 0.4, 4.5, 7, W(A, -1 if i % 2 else 0))
    cv.shade_ball(16, 12, 12, 9, 0.6)
    for dx in (-3, 0, 3):
        cv.line(16 + dx, 27, 16 + dx * 1.6, 8, W(B, 2))


def t_napa(cv, A, B, C):
    """Napa cabbage on its side: crinkly yellow-green leaves at one end, white ribs along the body."""
    cv.ellipse(15, 18, 13, 8, B)
    cv.ellipse(24, 17, 6, 8, A)
    for x in range(5, 24, 4):
        cv.line(x, 12, x + 2, 24, W(B, -2))
    for k in range(6):
        cv.px(22 + k, 11 + (k % 3), W(A, -2))
    cv.shade_ball(15, 17, 14, 8, 0.6)


def t_lotus(cv, A, B, C):
    """Lotus root: two tan segments, the near one cut to show the ring of holes."""
    cv.rrect(3, 12, 20, 24, A, 5)
    cv.ellipse(21, 18, 8, 8, W(A, 1))
    cv.ellipse(21, 18, 6.5, 6.5, B)
    for a in range(0, 360, 51):
        t = math.radians(a)
        cv.ellipse(21 + 3.6 * math.cos(t), 18 + 3.6 * math.sin(t), 1.2, 1.2, W(B, -4))
    cv.ellipse(21, 18, 1, 1, W(B, -4))
    cv.vline(11, 12, 24, W(A, -2))
    cv.shade_cyl(3, 12, 20, 24, 0.5)


def t_dragonfruit(cv, A, B, C):
    """Dragon fruit: hot-pink oval with green-tipped scales."""
    cv.ellipse(16, 18, 9, 11, A)
    cv.shade_ball(16, 17, 9, 11, 0.7)
    for (x, y, dx) in ((9, 12, -3), (23, 12, 3), (8, 20, -3), (24, 20, 3), (12, 7, -2), (20, 7, 2), (16, 25, 0)):
        cv.poly([(x, y), (x + 2, y + 2), (x + dx, y - 2)], B)
    cv.poly([(14, 6), (18, 6), (16, 2)], B)


def t_lychee(cv, A, B, C):
    """A little cluster of bumpy red lychees on a twig, one peeled to its white flesh."""
    cv.line(16, 3, 16, 9, C)
    for (x, y) in ((11, 14), (21, 14), (16, 21)):
        cv.ellipse(x, y, 5.5, 5.5, A)
        for (dx, dy) in ((-2, -2), (1, -3), (2, 0), (-1, 2), (3, 2), (-3, 1)):
            cv.px(x + dx, y + dy, W(A, -2))
        cv.px(x - 2, y - 3, W(A, 3))
    cv.ellipse(24, 24, 4, 4, H('f4f0e8'))
    cv.px(23, 23, WHITE)


def t_daikon(cv, A, B, C):
    """A long white radish lying across, leafy top at one end."""
    cv.poly([(4, 15), (24, 13), (29, 18), (24, 22), (4, 21)], A)
    cv.ellipse(5, 18, 3, 3, A)
    cv.shade_cyl(4, 13, 29, 22, 0.4)
    for x in (10, 16, 21):
        cv.px(x, 17, W(A, -2))
    for (x, y) in ((3, 9), (6, 7), (1, 12), (8, 10)):
        cv.line(5, 16, x, y, B, 2)
    cv.ellipse(3, 8, 2.5, 2, B)


def t_persimmon(cv, A, B, C):
    """A squat orange persimmon with a four-leaf green calyx."""
    cv.ellipse(16, 18, 11, 9, A)
    cv.shade_ball(16, 17, 11, 9, 0.8)
    for (x, y) in ((11, 11), (21, 11), (13, 13), (19, 13)):
        cv.ellipse(x, y, 3, 1.5, B)
    cv.rect(15, 7, 16, 10, H('6a4a2a'))
    cv.px(13, 15, W(A, 3)); cv.px(12, 16, W(A, 3))


def t_ridged_melon(cv, A, B, C):
    """A yellow melon with pale stripes running end to end."""
    cv.ellipse(16, 18, 12, 9, A)
    for dy in (-6, -3, 0, 3, 6):
        for x in range(6, 27):
            y = 18 + dy * math.sqrt(max(0, 1 - ((x - 16) / 12) ** 2))
            cv.px(x, round(y), B)
    cv.shade_ball(16, 17, 12, 9, 0.6)


def t_bigpear(cv, A, B, C):
    """A big round Asian pear, golden-brown with freckles, in a white foam net."""
    cv.ellipse(16, 18, 11, 10, A)
    rnd = random.Random(3)
    for _ in range(18):
        cv.px(rnd.randint(8, 24), rnd.randint(10, 26), W(A, -2))
    cv.shade_ball(16, 17, 11, 10, 0.7)
    for y in range(20, 29, 3):
        for x in range(6, 27, 3):
            if ((x - 16) / 11) ** 2 + ((y - 18) / 10) ** 2 < 1:
                cv.px(x, y, H('f4f0e8'))
    cv.rect(15, 6, 16, 9, H('6a4a2a'))


def t_squash(cv, A, B, C):
    """A squat dark-green squash with shallow ribs and a stub of stem."""
    cv.ellipse(16, 18, 12, 9, A)
    for dx in (-6, 0, 6):
        cv.line(16 + dx * 0.4, 10, 16 + dx, 26, W(A, -2))
    for (x, y) in ((10, 15), (20, 20), (14, 22)):
        cv.px(x, y, B)
    cv.shade_ball(16, 17, 12, 9, 0.7)
    cv.rect(15, 7, 17, 10, H('8a6a3a'))


def t_longmelon(cv, A, B, C):
    """A long dark-green gourd with a chalky bloom, cut open at one end to show white flesh."""
    cv.rrect(2, 11, 27, 25, A, 6)
    for (x, y) in ((6, 14), (12, 20), (18, 15), (9, 22), (22, 21)):
        cv.px(x, y, W(A, 3)); cv.px(x + 1, y, W(A, 2))
    cv.ellipse(27, 18, 4, 7, B)
    cv.ellipse(27, 18, 2, 4, W(B, -1))
    cv.shade_cyl(2, 11, 29, 25, 0.5)


def t_enoki(cv, A, B, C):
    """A bundle of thin white enoki stems with tiny caps, in a plastic sleeve."""
    for x in range(9, 24, 2):
        top = 6 + (x * 7) % 5
        cv.vline(x, top, 24, A)
        cv.ellipse(x, top, 1.4, 1.1, B)
    cv.rect(8, 22, 24, 29, C)
    cv.rect(8, 22, 24, 23, W(C, -2))
    GP.wrap_shine(cv, 7, 14, 25, 22)


def t_shiitake(cv, A, B, C):
    """Three shiitake caps, brown with white cracks, on a tray."""
    GP.tray(cv, 3, 20, 28, 28)
    for (x, y) in ((9, 18), (22, 18), (15, 13)):
        cv.ellipse(x, y, 6, 4.5, A)
        cv.shade_ball(x, y - 1, 6, 4.5, 0.7)
        for (dx, dy) in ((-2, -1), (1, -2), (2, 1), (-1, 1)):
            cv.px(x + dx, y + dy, B)


def t_kingoyster(cv, A, B, C):
    """Thick pale king oyster mushrooms with small brown caps."""
    for x in (10, 16, 22):
        cv.rrect(x - 3, 11, x + 3, 28, A, 3)
        cv.ellipse(x, 10, 4.5, 3, B)
        cv.shade_cyl(x - 3, 11, x + 3, 28, 0.4)


def t_leafstack(cv, A, B, C):
    """A small stack of serrated leaves tied with a band."""
    for i, (x, y) in enumerate(((11, 15), (17, 13), (14, 19))):
        cv.ellipse(x, y, 7, 6, W(A, i - 1))
        for a in range(0, 360, 30):
            t = math.radians(a)
            cv.px(x + 7 * math.cos(t), y + 6 * math.sin(t), W(A, -2))
        cv.line(x - 4, y + 4, x + 4, y - 4, W(A, 2))
    cv.rect(10, 22, 22, 24, C)


def t_greenonion(cv, A, B, C):
    """Long green onions in a bundle: white shafts below, dark green leaves above."""
    for i, x in enumerate((11, 14, 17, 20)):
        cv.rect(x, 17, x + 2, 30, B)
        cv.line(x + 1, 17, x - 1 + i, 2, A, 2)
    cv.rect(10, 22, 23, 23, H('d84848'))
    cv.shade_cyl(10, 17, 23, 30, 0.4)


def t_smallcitrus(cv, A, B, C):
    """Two small citrus fruits, one with a leaf on its stem."""
    for (x, y, r) in ((11, 19, 7), (21, 17, 6.5)):
        cv.ellipse(x, y, r, r * 0.9, A)
        cv.shade_ball(x, y, r, r * 0.9, 0.7)
        cv.px(x - 2, y - 3, W(A, 3))
    for (x, y) in ((9, 21), (13, 16), (23, 19)):
        cv.px(x, y, W(A, -2))
    cv.ellipse(23, 9, 3.5, 1.6, B)
    cv.vline(21, 10, 11, C)


def t_pomelo(cv, A, B, C):
    """A big pear-shaped pomelo in a red mesh bag."""
    cv.ellipse(16, 19, 11, 10, A)
    cv.ellipse(16, 11, 6, 5, A)
    cv.shade_ball(16, 17, 11, 12, 0.6)
    for y in range(10, 29, 3):
        for x in range(5, 28, 3):
            if cv.get(x, y) is not None:
                cv.px(x, y, H('d84848'))
    cv.rect(14, 3, 18, 6, H('d84848'))


def t_zucchini(cv, A, B, C):
    """A pale-green zucchini in a tight plastic wrap."""
    cv.rrect(4, 12, 28, 22, A, 5)
    for x in range(6, 27, 3):
        cv.px(x, 15, B)
    cv.shade_cyl(4, 12, 28, 22, 0.6)
    GP.wrap_shine(cv, 3, 11, 29, 23)
    cv.rect(27, 15, 29, 19, H('6a8a3a'))


# ---------- meat and fish ----------

def t_charsiu(cv, A, B, C):
    """Two glazed strips of char siu on a tray, charred edges and a sticky shine."""
    GP.tray(cv, 2, 18, 29, 28)
    for y in (12, 18):
        cv.rrect(4, y, 27, y + 6, A, 2)
        cv.hline(5, 26, y + 1, B)
        cv.rect(4, y, 5, y + 6, W(A, -4)); cv.rect(26, y, 27, y + 6, W(A, -4))
        for x in range(8, 25, 5):
            cv.px(x, y + 4, W(A, -4))
    GP.wrap_shine(cv, 2, 10, 29, 28)


def t_links(cv, A, B, C):
    """A string of cured sausages tied in pairs, red with white fat specks."""
    for i, x in enumerate((6, 13, 20)):
        cv.rrect(x, 7 + (i % 2) * 2, x + 6, 27 - (i % 2) * 2, A, 3)
        for y in range(11, 25, 3):
            cv.px(x + 2 + y % 3, y, B)
        cv.shade_cyl(x, 7, x + 6, 27, 0.6)
    cv.line(9, 6, 23, 6, C)
    cv.vline(16, 3, 6, C)


def t_skewers(cv, A, B, C):
    """Three skewers of grilled pieces with glaze and char marks, on a tray."""
    GP.tray(cv, 2, 20, 29, 28)
    for i, y in enumerate((9, 14, 19)):
        cv.line(3, y + 2, 29, y - 1, H('d8b070'))
        for k in range(4):
            x = 7 + k * 5
            cv.ellipse(x, y + 1 - k * 0.3, 2.4, 2.2, A)
            cv.px(x, y - k * 0.3, W(A, -3))
            cv.px(x - 1, y - 1 - k * 0.3, B)


def t_karaage(cv, A, B, C):
    """A paper cup heaped with golden fried chicken, a lemon wedge on top."""
    cv.poly([(7, 18), (25, 18), (23, 29), (9, 29)], C)
    cv.rect(7, 20, 25, 21, W(C, -2))
    for (x, y) in ((10, 15), (16, 13), (22, 15), (13, 18), (19, 18)):
        cv.ellipse(x, y, 4, 3.5, A)
        cv.px(x - 1, y - 1, B); cv.px(x + 1, y + 1, W(A, -2))
    cv.shade_ball(16, 15, 10, 6, 0.6)
    cv.poly([(19, 9), (24, 9), (22, 12)], H('f0d040'))


def t_cutlet(cv, A, B, C):
    """A breaded cutlet sliced in strips on shredded cabbage."""
    cv.ellipse(16, 23, 13, 4, H('c8e8a0'))
    for i, x in enumerate(range(4, 27, 5)):
        cv.rect(x, 12, x + 4, 22, A)
        cv.rect(x + 1, 13, x + 3, 21, B)
        cv.hline(x, x + 4, 12, W(A, 2))
        for y in (14, 18):
            cv.px(x + (y % 3), y, W(A, -2))
    cv.shade_box(4, 12, 28, 22, 0.4)


def t_sashimi(cv, A, B, C):
    """Rosy slices fanned on a black tray with a mound of white radish and a green leaf."""
    cv.rrect(2, 12, 29, 27, H('2a2a30'), 2)
    cv.ellipse(8, 19, 4, 4, H('f4f4f0'))
    cv.ellipse(9, 15, 3, 2, H('5aa84a'))
    for k in range(4):
        x = 13 + k * 4
        cv.rrect(x, 14, x + 5, 25, A, 1)
        cv.line(x + 1, 15, x + 4, 23, B)
    GP.wrap_shine(cv, 2, 12, 29, 27)


def t_bellyslices(cv, A, B, C):
    """Thick pork-belly slices fanned on a tray: pink meat and white fat in bands."""
    GP.tray(cv, 2, 16, 29, 28)
    for k in range(4):
        x = 5 + k * 6
        cv.rrect(x, 10 + k % 2, x + 7, 24, A, 1)
        for y in (13, 17, 21):
            cv.hline(x, x + 7, y + k % 2, B)
    GP.wrap_shine(cv, 2, 9, 29, 28)


def t_trotter(cv, A, B, C):
    """Braised, sliced pork trotter: glossy dark skin, sliced into rounds."""
    GP.tray(cv, 2, 18, 29, 28)
    for k in range(4):
        x = 7 + k * 5
        cv.ellipse(x, 17, 4, 5, A)
        cv.ellipse(x, 17, 2.5, 3, B)
        cv.px(x - 2, 14, W(A, 3))
    GP.wrap_shine(cv, 2, 10, 29, 28)


def t_fishcake(cv, A, B, C):
    """A half-moon fish cake on its board: pink rind over white."""
    cv.rect(4, 22, 27, 26, H('d8b070'))
    cv.ellipse(15.5, 22, 11, 11, B)
    cv.ellipse(15.5, 22, 9, 9, A)
    cv.rect(3, 22, 28, 30, None) if False else None
    for y in range(23, 34):
        for x in range(0, 32):
            if y > 22 and cv.get(x, y) in (A, B):
                cv.p[y][x] = None
    cv.rect(4, 22, 27, 26, H('d8b070'))
    cv.shade_ball(15.5, 17, 11, 8, 0.4)


def t_tube(cv, A, B, C):
    """Grilled tube-shaped fish cakes, browned on top with a hollow centre."""
    for i, y in enumerate((10, 18)):
        cv.rrect(3, y, 27, y + 7, B, 3)
        for x in range(5, 25, 3):
            cv.px(x, y + 1, A); cv.px(x + 1, y + 2, A)
        cv.ellipse(27, y + 3.5, 2.5, 3.5, W(B, 1))
        cv.ellipse(27, y + 3.5, 1.2, 1.8, W(B, -3))
    GP.wrap_shine(cv, 2, 9, 29, 26)


def t_fishsheet(cv, A, B, C):
    """Flat fish-cake sheets folded onto skewers."""
    for x in (9, 16, 23):
        cv.line(x, 3, x, 29, H('d8b070'))
        for k in range(3):
            y = 8 + k * 6
            cv.rrect(x - 4, y, x + 4, y + 4, A, 1)
            cv.hline(x - 3, x + 3, y + 1, B)


def t_duckneck(cv, A, B, C):
    """Spicy braised duck necks in short lengths, flecked with chili."""
    GP.tray(cv, 2, 18, 29, 28)
    for i, (x, y) in enumerate(((8, 13), (16, 15), (24, 13), (12, 20), (20, 20))):
        cv.rrect(x - 4, y - 2, x + 4, y + 2, A, 2)
        cv.px(x - 2, y - 1, B); cv.px(x + 1, y, C)
    GP.wrap_shine(cv, 2, 10, 29, 28)


# ---------- pastries and sweets ----------

def t_mantou(cv, A, B, C):
    """Three plump white steamed buns on a cloth."""
    cv.rect(3, 24, 28, 28, C)
    for (x, y) in ((9, 18), (23, 18), (16, 14)):
        cv.ellipse(x, y, 7, 6, A)
        cv.shade_ball(x, y - 1, 7, 6, 0.4, dither=False)
        cv.hline(x - 6, x + 6, y + 5, W(A, -2))


def t_flakypastry(cv, A, B, C):
    """Round flaky pastries, golden with a stamped red mark, in a box window."""
    cv.rrect(2, 10, 29, 27, B, 2)
    cv.rect(4, 12, 27, 25, H('f4f0e8'))
    for x in (9, 22):
        cv.ellipse(x, 18.5, 6, 5.5, A)
        cv.shade_ball(x, 18, 6, 5.5, 0.6)
        for y in (16, 19, 21):
            cv.hline(x - 4, x + 4, y, W(A, 2))
        cv.px(x, 17, C); cv.px(x + 1, 17, C)


def t_castella(cv, A, B, C):
    """A golden sponge loaf with a dark-brown top, on parchment, a slice cut."""
    cv.rect(3, 13, 27, 26, A)
    cv.rect(3, 10, 27, 13, B)
    cv.rect(3, 26, 27, 28, H('f4f0e8'))
    cv.vline(20, 10, 26, W(A, -2))
    cv.rect(22, 15, 28, 26, A)
    cv.rect(22, 12, 28, 15, B)
    for (x, y) in ((7, 18), (12, 22), (16, 17), (25, 20)):
        cv.px(x, y, W(A, 2))
    cv.shade_box(3, 10, 28, 28, 0.4)


def t_sandwichcake(cv, A, B, C):
    """Two brown pancakes sandwiching sweet bean paste, seen from the side."""
    for y in (9, 19):
        cv.ellipse(16, y, 13, 5, A)
        cv.ellipse(16, y - 1, 11, 3.5, W(A, 2))
    cv.rect(4, 13, 27, 18, B)
    cv.ellipse(16, 15.5, 12, 2.5, B)
    cv.shade_ball(16, 14, 13, 10, 0.4)


def t_mochi(cv, A, B, C):
    """Soft round rice cakes dusted with powder, a leaf beneath."""
    cv.ellipse(16, 25, 13, 3, C)
    for (x, y) in ((10, 19), (22, 19), (16, 14)):
        cv.ellipse(x, y, 6.5, 5.5, A)
        cv.shade_ball(x, y, 6.5, 5.5, 0.35, dither=False)
        cv.px(x - 2, y - 2, WHITE)
        cv.px(x + 1, y + 2, B)


def t_halfmoon(cv, A, B, C):
    """Half-moon rice cakes in three soft colours on pine needles."""
    for k in range(10):
        cv.line(4 + k * 2.5, 28, 7 + k * 2.5, 22, H('4a8a3a'))
    for (x, y, c) in ((9, 17, A), (16, 13, B), (23, 17, C)):
        cv.ellipse(x, y, 5.5, 4, c)
        for yy in range(y, y + 6):
            for xx in range(x - 6, x + 7):
                if cv.get(xx, yy) == c:
                    cv.p[yy][xx] = None
        cv.hline(x - 5, x + 5, y, W(c, -2))
        cv.px(x - 2, y - 2, WHITE)


def t_dustedcubes(cv, A, B, C):
    """Chewy rice-cake cubes rolled in toasted soybean powder."""
    cv.rrect(2, 11, 29, 27, H('f4f0e8'), 2)
    for k in range(6):
        x = 5 + (k % 3) * 8
        y = 13 + (k // 3) * 7
        cv.rrect(x, y, x + 6, y + 5, A, 1)
        cv.px(x + 1, y + 1, B); cv.px(x + 4, y + 3, B)
    GP.wrap_shine(cv, 2, 11, 29, 27)


def t_puffblock(cv, A, B, C):
    """Golden puffed strands pressed into a sticky block, glossy with syrup."""
    cv.rrect(3, 10, 28, 26, A, 2)
    rnd = random.Random(11)
    for _ in range(40):
        x, y = rnd.randint(4, 27), rnd.randint(11, 25)
        cv.px(x, y, rnd.choice((W(A, 2), W(A, -2), B)))
    cv.shade_box(3, 10, 28, 26, 0.6)
    GP.wrap_shine(cv, 2, 9, 29, 27)


def t_jellybar(cv, A, B, C):
    """A dark bean-jelly bar, half unwrapped from gold foil."""
    cv.rect(3, 12, 17, 22, B)
    cv.hline(3, 17, 12, W(B, 3))
    cv.rect(16, 12, 28, 22, A)
    cv.hline(16, 28, 12, W(A, 2))
    cv.rect(28, 13, 29, 21, W(A, -2))
    cv.px(20, 15, W(A, 3)); cv.px(21, 15, W(A, 3))
    cv.shade_vgrad(3, 12, 29, 22, 1.0, -1.0)


def t_flowercakes(cv, A, B, C):
    """Little flower-shaped cakes, golden-brown with a darker centre."""
    for (x, y) in ((9, 14), (22, 14), (15, 22), (25, 24), (5, 24)):
        for a in range(0, 360, 60):
            t = math.radians(a)
            cv.ellipse(x + 2.5 * math.cos(t), y + 2.5 * math.sin(t), 2, 2, A)
        cv.ellipse(x, y, 1.5, 1.5, B)


def t_silkcandy(cv, A, B, C):
    """Silky white threads of honey candy wrapped into cocoons, in a clear box."""
    cv.rrect(2, 11, 29, 27, (220, 236, 244, 120), 2)
    for (x, y) in ((8, 19), (16, 19), (24, 19)):
        cv.ellipse(x, y, 4, 5, A)
        for k in range(-3, 4, 2):
            cv.vline(x + k, y - 4, y + 4, W(A, -1))
        cv.px(x, y, B)
    cv.rect(2, 11, 29, 13, C)


# ---------- household and personal ----------

def t_redenvelope(cv, A, B, C):
    """A fan of red envelopes with gold patterns."""
    for i, dx in enumerate((-6, 0, 6)):
        x = 16 + dx
        cv.poly([(x - 6, 8 + i), (x + 6, 6 + i), (x + 8, 26 - i), (x - 4, 28 - i)], A)
        cv.ellipse(x + 1, 16, 2.5, 2.5, B)
        cv.hline(x - 3, x + 5, 22, B)
    cv.shade_box(4, 6, 28, 28, 0.4)


def t_coil(cv, A, B, C):
    """A green mosquito coil on its little metal stand, a wisp of smoke at the tip."""
    cv.rect(6, 26, 26, 28, H('8a8e98'))
    for k in range(0, 720, 10):
        t = math.radians(k)
        r = 2 + k / 720 * 9
        cv.px(16 + r * math.cos(t), 17 + r * 0.75 * math.sin(t), A)
        cv.px(16 + r * math.cos(t) + 0.6, 17 + r * 0.75 * math.sin(t), W(A, -1))
    cv.px(25, 17, H('f08030'))
    for k in range(4):
        cv.px(26 + k % 2, 15 - k * 2, (200, 200, 210, 160))


def t_chopsticks(cv, A, B, C):
    """A pair of chopsticks laid diagonally on a paper sleeve."""
    cv.poly([(4, 24), (22, 6), (27, 10), (9, 28)], C)
    cv.line(8, 25, 25, 6, A, 2)
    cv.line(10, 27, 27, 8, W(A, -1), 2)
    cv.line(20, 12, 24, 8, B, 2)
    cv.line(22, 14, 26, 10, B, 2)


def t_gloves(cv, A, B, C):
    """A pair of rubber kitchen gloves, one over the other."""
    for dx, k in ((-4, -1), (4, 0)):
        x = 16 + dx
        cv.rrect(x - 5, 12, x + 5, 28, W(A, k), 2)
        for f in range(4):
            cv.rrect(x - 5 + f * 2.6, 4 + abs(f - 1.5), x - 3.5 + f * 2.6, 13, W(A, k), 1)
        cv.ellipse(x + 6, 16, 2, 3, W(A, k))
        cv.rect(x - 5, 24, x + 5, 28, W(A, k - 1))
    cv.shade_cyl(6, 4, 26, 28, 0.5)


def t_lunchbox(cv, A, B, C):
    """A lacquered two-tier lunch box tied with a band."""
    cv.rrect(4, 9, 27, 18, A, 2)
    cv.rrect(4, 19, 27, 28, A, 2)
    cv.hline(4, 27, 18, W(A, -3))
    cv.rect(14, 8, 17, 28, B)
    cv.rect(12, 6, 19, 9, B)
    cv.shade_box(4, 9, 27, 28, 0.6)


def t_paddle(cv, A, B, C):
    """A rice paddle with a few grains stuck to it."""
    cv.ellipse(11, 12, 7, 8, A)
    cv.line(15, 18, 27, 29, A, 3)
    cv.shade_ball(11, 12, 7, 8, 0.4)
    for (x, y) in ((9, 10), (12, 13), (8, 14)):
        cv.px(x, y, WHITE)


def t_rolledcloth(cv, A, B, C):
    """A printed cotton towel rolled up, its pattern showing on the outside."""
    cv.rrect(4, 10, 27, 24, A, 4)
    for x in range(6, 26, 4):
        cv.ellipse(x, 17, 1.2, 1.2, B)
    cv.ellipse(27, 17, 3, 7, W(A, 1))
    for r in (5, 3, 1):
        cv.ellipse(27, 17, r * 0.4, r, W(A, -1)) if r > 1 else cv.px(27, 17, W(A, -3))
    cv.shade_cyl(4, 10, 27, 24, 0.6)


def t_container(cv, A, B, C):
    """A tall food container with a coloured locking lid."""
    cv.rect(6, 10, 25, 28, (230, 236, 240, 220))
    cv.rect(7, 18, 24, 27, C)
    cv.rect(5, 6, 26, 10, B)
    cv.rect(4, 8, 6, 9, W(B, -2)); cv.rect(25, 8, 27, 9, W(B, -2))
    cv.shade_cyl(6, 10, 25, 28, 0.4)


def t_basin(cv, A, B, C):
    """A shallow round plastic basin seen at an angle."""
    cv.ellipse(16, 15, 14, 5, W(A, 1))
    cv.ellipse(16, 15, 12, 3.5, W(A, -2))
    cv.poly([(2, 15), (30, 15), (26, 26), (6, 26)], A)
    cv.ellipse(16, 26, 10, 2.5, A)
    cv.ellipse(16, 15, 14, 5, None) if False else None
    cv.hline(2, 30, 15, W(A, 2))
    cv.shade_cyl(2, 15, 30, 26, 0.6)


def t_mitt(cv, A, B, C):
    """An exfoliating mitt, rough-textured with a stitched hem."""
    cv.rrect(7, 6, 25, 27, A, 4)
    for y in range(8, 25, 2):
        for x in range(9, 24, 2):
            cv.px(x + (y // 2) % 2, y, W(A, -2))
    cv.rect(7, 23, 25, 27, B)
    for x in range(8, 25, 2):
        cv.px(x, 25, WHITE)


def t_steamer(cv, A, B, C):
    """A round bamboo steamer basket with its woven lid."""
    cv.rect(4, 14, 27, 26, A)
    for y in range(15, 26, 3):
        cv.hline(4, 27, y, W(A, -2))
    cv.ellipse(15.5, 26, 11.5, 3, W(A, -2))
    cv.ellipse(15.5, 14, 11.5, 4, W(A, 1))
    for x in range(6, 26, 3):
        cv.line(x, 11, x + 3, 17, W(A, -1))
    cv.ellipse(15.5, 13, 3, 1.5, B)


def t_milkbottle(cv, A, B, C):
    """A squat glass milk bottle with a paper cap, the drink showing through."""
    cv.rrect(9, 12, 22, 29, (226, 240, 246, 180), 3)
    cv.rect(10, 15, 21, 28, A)
    cv.rect(11, 7, 20, 12, (226, 240, 246, 180))
    cv.rect(11, 8, 20, 11, A)
    cv.ellipse(15.5, 6, 5, 2, B)
    cv.rect(10, 18, 21, 22, C)
    GP.fake_text(cv, 11, 20, 20, WHITE, 3)
    cv.vline(11, 13, 27, (255, 255, 255, 200))


TEMPLATES = {k[2:]: v for k, v in globals().items() if k.startswith('t_')}
BAG = {
    'bokchoy': (0, 1, 2), 'napa': (2, 2, 1), 'lotus': (2, 1, 1), 'dragonfruit': (1, 1, 1), 'lychee': (0, 1, 1),
    'daikon': (2, 2, 1), 'persimmon': (1, 1, 1), 'ridged_melon': (2, 1, 1), 'bigpear': (1, 1, 1), 'squash': (3, 1, 1),
    'longmelon': (3, 2, 1), 'enoki': (0, 1, 1), 'shiitake': (0, 1, 1), 'kingoyster': (0, 1, 1), 'leafstack': (0, 1, 1),
    'greenonion': (1, 1, 2), 'smallcitrus': (1, 1, 1), 'pomelo': (3, 1, 2), 'zucchini': (1, 2, 1),
    'charsiu': (2, 2, 1), 'links': (2, 1, 1), 'skewers': (1, 2, 1), 'karaage': (1, 1, 1), 'cutlet': (1, 2, 1),
    'sashimi': (0, 2, 1), 'bellyslices': (2, 2, 1), 'trotter': (2, 2, 1), 'fishcake': (1, 1, 1), 'tube': (1, 2, 1),
    'fishsheet': (1, 1, 1), 'duckneck': (2, 2, 1),
    'mantou': (0, 2, 1), 'flakypastry': (0, 2, 1), 'castella': (0, 2, 1), 'sandwichcake': (0, 1, 1), 'mochi': (0, 1, 1),
    'halfmoon': (0, 1, 1), 'dustedcubes': (0, 1, 1), 'puffblock': (0, 1, 1), 'jellybar': (1, 1, 1), 'flowercakes': (0, 1, 1),
    'silkcandy': (0, 1, 1), 'redenvelope': (1, 1, 1), 'coil': (0, 1, 1), 'chopsticks': (1, 1, 1), 'gloves': (1, 1, 1),
    'lunchbox': (1, 1, 1), 'paddle': (1, 1, 1), 'rolledcloth': (1, 1, 1), 'container': (2, 1, 1), 'basin': (2, 2, 1),
    'mitt': (1, 1, 1), 'steamer': (1, 1, 1), 'milkbottle': (2, 1, 1),
}
GP.TEMPLATES.update(TEMPLATES)
GP.BAG.update(BAG)


# ---------- label marks: a tiny picture on a badge, so packages of the same shape tell apart ----------

PAL = {
    'r': H('d84040'), 'R': H('a82828'), 'g': H('4a9a3a'), 'G': H('2e6a2a'), 'b': H('5a7aa8'), 'B': H('3a5ad8'), 'w': H('f8f8f4'),
    'y': H('f0c840'), 'o': H('f08a30'), 't': H('c8965a'), 'T': H('8a5a2a'), 'k': H('2a2a30'), 'p': H('f0a0b8'), 'n': H('d87a90'),
    's': H('b8bcc8'), 'c': H('e8ecf0'), 'm': H('8a5ab8'),
}
MARKS = {
    'chili': ['....g..', '...gg..', '..rr...', '.rrr...', 'rrrR...', 'rrR....', 'r......'],
    'fish': ['.......', '..bbb.b', '.bbbbbb', 'bwbbbb.', '.bbbbbb', '..bbb.b', '.......'],
    'shrimp': ['..ooo..', '.o...o.', 'o....oo', 'o...oo.', '.o.oo..', '..oo...', '.o.....'],
    'egg': ['..www..', '.wwwww.', 'wwyyyww', 'wwyyyww', 'wwyyyww', '.wwwww.', '..www..'],
    'bean': ['.......', '..yyy..', '.yyyyy.', '.yytyy.', '.yyyyy.', '..yyy..', '.......'],
    'blackbean': ['.......', '..kkk..', '.kkkkk.', '.kkskk.', '.kkkkk.', '..kkk..', '.......'],
    'redbean': ['.......', '..RRR..', '.RRRRR.', '.RRwRR.', '.RRRRR.', '..RRR..', '.......'],
    'leaf': ['.....gg', '...gggg', '..ggggg', '.ggGgg.', '.gGgg..', 'G.gg...', 'G......'],
    'tea': ['.s.s...', '..s.s..', 'ccccc..', 'cgggcc.', 'cgggc.c', '.ccc.c.', '.......'],
    'coffee': ['.s.s...', '..s.s..', 'ccccc..', 'cTTTcc.', 'cTTTc.c', '.ccc.c.', '.......'],
    'rice': ['.wwwww.', 'wwwwwww', 'bbbbbbb', '.bbbbb.', '..bbb..', '.bbbbb.', '.......'],
    'noodle': ['.yyyyy.', 'y.y.y.y', '.y.y.y.', 'rrrrrrr', '.rrrrr.', '..rrr..', '.......'],
    'flame': ['...o...', '..oo...', '..ooo..', '.ooyoo.', '.oyyyo.', '.oyyyo.', '..ooo..'],
    'snow': ['...b...', '.b.b.b.', '..bbb..', 'bbbbbbb', '..bbb..', '.b.b.b.', '...b...'],
    'moon': ['..yyy..', '.yy....', 'yy.....', 'yy.....', 'yy.....', '.yy....', '..yyy..'],
    'pig': ['p.....p', 'ppppppp', 'ppkpkpp', 'ppnnnpp', 'ppnnnpp', '.ppppp.', '.......'],
    'cow': ['k.....k', '.kwwwk.', '.wkwkw.', '.wwwww.', '.ppppp.', '.pkpkp.', '.......'],
    'chicken': ['...rr..', '..www..', '.wwkwo.', 'wwwww..', 'wwwww..', '.www...', '..o.o..'],
    'duck': ['..yy...', '.yyyy..', '.ykyyoo', '.yyyy..', 'yyyyyy.', 'yyyyyy.', '.yyyy..'],
    'peanut': ['..tt...', '.tTtt..', '.tttt..', '..tt...', '.tttt..', '.ttTt..', '..tt...'],
    'sesame': ['.k...k.', '...k...', 'k.....k', '..k.k..', '.......', 'k..k..k', '..k....'],
    'flower': ['..p.p..', '.ppppp.', 'ppyyypp', '.pyyyp.', 'ppyyypp', '.ppppp.', '..p.p..'],
    'citrus': ['..ooo..', '.oyoyo.', 'oyyoyyo', 'ooooooo', 'oyyoyyo', '.oyoyo.', '..ooo..'],
    'berry': ['..g.g..', '.rrrrr.', 'rryrryr', 'rrrrrrr', '.ryrry.', '..rrr..', '...r...'],
    'grape': ['...g...', '.mmmmm.', '.mmmmm.', '..mmm..', '..mmm..', '...m...', '.......'],
    'mushroom': ['..TTT..', '.TTTTT.', 'TTwTTwT', 'TTTTTTT', '..www..', '..www..', '..www..'],
    'drop': ['...B...', '...B...', '..BBB..', '.BBBBB.', '.BBwBB.', '.BBBBB.', '..BBB..'],
    'heart': ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...', '.......'],
    'seaweed': ['kkkkkkk', 'kGkGkGk', 'kkkkkkk', 'kGkGkGk', 'kkkkkkk', '.......', '.......'],
    'star': ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', '.y...y.'],
    'grain': ['...y...', '..y.y..', '...y...', '..y.y..', '...y...', '..y.y..', '...g...'],
    'meat': ['..rrr..', '.rrrrr.', 'rrrwrrr', '.rrrrr.', '..rrr..', '...w...', '..w.w..'],
    'bubble': ['..c....', '.c.c...', '..c..c.', '....c.c', '.c...c.', 'c.c....', '.c.....'],
    'milk': ['..ww...', '.wwww..', '.wbbw..', '.wwww..', '.wwww..', '.wwww..', '.......'],
    'sparkle': ['...y...', '...y...', '.y.y.y.', '..yyy..', 'yyyyyyy', '..yyy..', '.y.y.y.'],
    'pepper': ['...k...', '..k.k..', '.k...k.', '..k.k..', '...k...', '.k...k.', '..k.k..'],
    'lemon': ['..yyy..', '.yyyyy.', 'yyyyyyy', 'yyyyyyy', '.yyyyy.', '..yyy..', '...g...'],
}

# where the label sits on each package template: the badge centre
ANCHOR = {
    'chipbag': (16, 17), 'box': (13, 18), 'nutbag': (15, 18), 'can': (15, 17), 'jar': (15, 19), 'tub': (16, 21),
    'frozenbag': (15, 17), 'frozenbox': (14, 18), 'smallbottle': (15, 22), 'ramen': (16, 18), 'pastabox': (14, 16),
    'canister': (15, 17), 'carton': (14, 19), 'sports': (15, 19), 'juice': (15, 20), 'cereal': (14, 15), 'candybag': (15, 18),
    'candybar': (15, 16), 'ricebag': (15, 24), 'tuna': (15, 19), 'yogurt': (16, 17), 'icecream': (15, 17), 'pastrybox': (13, 17),
    'teabox': (13, 18), 'spice': (15, 20), 'oil': (15, 21), 'squeeze': (15, 20), 'toothpaste': (15, 17), 'shampoo': (15, 20),
    'spray': (15, 21), 'tissue': (15, 19), 'soap': (15, 18), 'pills': (15, 20), 'mints': (15, 17), 'flour': (15, 18),
    'cookies': (26, 17), 'tofu': (15, 17), 'bottle2l': (15, 19), 'ricecakes': (15, 17), 'roll': (15, 17), 'sponge': (15, 17),
    'cheese': (15, 18), 'eggs': (15, 22), 'deli': (15, 18), 'lollipop': (24, 24),
}


def apply_mark(cv, tpl, mark):
    """Badge with a little picture on the package's label."""
    if not mark or tpl not in ANCHOR:
        return
    cx, cy = ANCHOR[tpl]
    cv.ellipse(cx, cy, 5.2, 5.2, H('5a5060'))
    cv.ellipse(cx, cy, 4.6, 4.6, H('fbf6ea'))
    rows = MARKS[mark]
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c != '.':
                cv.px(cx - 3 + x, cy - 3 + y, PAL[c])
