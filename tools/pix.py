import math
from PIL import Image

SHADOW_TINT = (52, 36, 96)
LIGHT_TINT = (255, 248, 224)


def hexc(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3)) + (a[3] if len(a) > 3 else 255,)


def tone(c, k):
    """Hue-shifted ramp: k<0 shifts toward a cool shadow, k>0 toward a warm light."""
    if k == 0:
        return c
    if k < 0:
        t = min(0.85, -k * 0.2)
        return mix(c, SHADOW_TINT + (255,), t)
    t = min(0.85, k * 0.2)
    return mix(c, LIGHT_TINT + (255,), t)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = [[None] * w for _ in range(h)]

    def px(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.p[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.p[y][x]
        return None

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.px(x, y, c)

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, x, y1, c)

    def inside_ellipse(self, x, y, cx, cy, rx, ry):
        dx = (x + 0.5 - cx) / rx
        dy = (y + 0.5 - cy) / ry
        return dx * dx + dy * dy <= 1.0

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(max(0, int(cy - ry - 1)), min(self.h, int(cy + ry + 2))):
            for x in range(max(0, int(cx - rx - 1)), min(self.w, int(cx + rx + 2))):
                if self.inside_ellipse(x, y, cx, cy, rx, ry):
                    self.px(x, y, c)

    def rrect(self, x0, y0, x1, y1, c, r=1):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                dx = max(x0 + r - x, 0, x - (x1 - r))
                dy = max(y0 + r - y, 0, y - (y1 - r))
                if dx * dx + dy * dy <= r * r + 0.5:
                    self.px(x, y, c)

    def poly(self, pts, c):
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            n = len(pts)
            for i in range(n):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % n]
                if (y0 <= y + 0.5 < y1) or (y1 <= y + 0.5 < y0):
                    xs.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(int(math.ceil(xs[i] - 0.5)), int(math.floor(xs[i + 1] - 0.5)) + 1):
                    self.px(x, y, c)

    def line(self, x0, y0, x1, y1, c, t=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) * 2 + 1
        for i in range(n + 1):
            k = i / n
            x = x0 + (x1 - x0) * k
            y = y0 + (y1 - y0) * k
            if t <= 1:
                self.px(round(x), round(y), c)
            else:
                r = (t - 1) / 2
                self.rect(round(x - r), round(y - r), round(x + r), round(y + r), c)

    def profile(self, cx, y0, widths, c):
        for i, w in enumerate(widths):
            if w > 0:
                x0 = int(round(cx - w / 2))
                self.rect(x0, y0 + i, x0 + w - 1, y0 + i, c)

    # --- shading passes operate on already-drawn flat colors inside a region ---

    def shade_cyl(self, x0, y0, x1, y1, strength=1.0, dither=True):
        w = x1 - x0 + 1
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = self.get(x, y)
                if c is None:
                    continue
                t = (x - x0 + 0.5) / w
                # highlight band ~30% across, falloff to the right
                v = 1.6 * math.exp(-((t - 0.3) ** 2) / 0.02) - 2.6 * max(0, t - 0.55) / 0.45 - 1.0 * max(0, 0.12 - t) / 0.12
                v *= strength
                k = self._quant(v, x, y, dither)
                self.p[y][x] = tone(c, k)

    def shade_ball(self, cx, cy, rx, ry, strength=1.0, dither=True, lx=-0.55, ly=-0.6):
        lz = math.sqrt(max(0.0, 1 - lx * lx - ly * ly))
        for y in range(max(0, int(cy - ry - 1)), min(self.h, int(cy + ry + 2))):
            for x in range(max(0, int(cx - rx - 1)), min(self.w, int(cx + rx + 2))):
                c = self.get(x, y)
                if c is None or not self.inside_ellipse(x, y, cx, cy, rx, ry):
                    continue
                nx = (x + 0.5 - cx) / rx
                ny = (y + 0.5 - cy) / ry
                nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
                d = nx * lx + ny * ly + nz * lz
                v = (d - 0.62) * 4.2 * strength
                k = self._quant(v, x, y, dither)
                self.p[y][x] = tone(c, k)

    def shade_box(self, x0, y0, x1, y1, strength=1.0):
        """Flat front face: light top-left rim, darker bottom-right rim, slight vertical gradient."""
        h = y1 - y0 + 1
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = self.get(x, y)
                if c is None:
                    continue
                v = -0.5 * (y - y0) / max(h - 1, 1)
                if x == x0 or y == y0:
                    v = 0.9
                if x == x1 or y == y1:
                    v = -1.4
                k = self._quant(v * strength, x, y, True)
                self.p[y][x] = tone(c, k)

    def shade_vgrad(self, x0, y0, x1, y1, top=0.6, bottom=-0.9):
        h = y1 - y0 + 1
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = self.get(x, y)
                if c is None:
                    continue
                t = (y - y0) / max(h - 1, 1)
                k = self._quant(top + (bottom - top) * t, x, y, True)
                self.p[y][x] = tone(c, k)

    def _quant(self, v, x, y, dither):
        base = math.floor(v)
        frac = v - base
        if dither:
            thr = (BAYER[y % 4][x % 4] + 0.5) / 16
            # Dither only in a narrow band so ramps read as clean steps.
            if 0.35 < frac < 0.65:
                return base + (1 if frac > thr else 0)
        return base + (1 if frac >= 0.5 else 0)

    def outline(self, f=0.55, sel=True):
        """Selective outline: darker on bottom/right, softer on top/left."""
        out = [row[:] for row in self.p]
        for y in range(self.h):
            for x in range(self.w):
                if self.p[y][x] is not None:
                    continue
                nb = None
                side = 0
                for dx, dy, s in ((0, -1, 1), (-1, 0, 1), (1, 0, 0), (0, 1, 0)):
                    n = self.get(x + dx, y + dy)
                    if n is not None:
                        nb = n
                        side = s
                        break
                if nb is not None:
                    k = -4 if (side == 1 or not sel) else -3
                    c = tone(nb, k)
                    out[y][x] = mix(c, (20, 14, 30, 255), f * 0.5)
        self.p = out

    def blit(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                c = other.p[y][x]
                if c is not None:
                    self.px(ox + x, oy + y, c)

    def to_image(self, img=None, ox=0, oy=0):
        if img is None:
            img = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                c = self.p[y][x]
                if c is not None:
                    img.putpixel((ox + x, oy + y), tuple(c[:4]) if len(c) == 4 else c + (255,))
        return img

    def flip_h(self):
        o = Canvas(self.w, self.h)
        for y in range(self.h):
            o.p[y] = self.p[y][::-1]
        return o


def fake_text(cv, x0, y, x1, c, seed=0, gap=1):
    """Squiggle that reads as tiny printed text at 32px scale."""
    x = x0
    s = seed * 7 + 3
    while x <= x1:
        s = (s * 1103515245 + 12345) & 0x7fffffff
        n = 1 + (s >> 8) % 3
        for i in range(n):
            if x + i <= x1:
                cv.px(x + i, y, c)
        x += n + gap


def sheet(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))
