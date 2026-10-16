import csv
import json
import os
import random
from PIL import Image

from pix import Canvas, hexc, tone, mix
import gen_products as GP
import gen_chars as GC
import gen_world as GW
import gen_mini as GM
from names import make_name

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'public', 'assets')
DATA = os.path.join(ROOT, 'src', 'data')
GEN_I18N = os.path.join(ROOT, 'src', 'i18n', 'generated')
PUBLIC = os.path.join(ROOT, 'public')

STORAGE = {'produce': 'produce', 'dairy': 'fridge', 'meat': 'fridge', 'frozen': 'freezer'}
MARGIN = {'produce': 0.46, 'dairy': 0.34, 'meat': 0.32, 'frozen': 0.38, 'bakery': 0.42, 'snacks': 0.46,
          'candy': 0.50, 'beverages': 0.46, 'breakfast': 0.42, 'pantry': 0.42, 'household': 0.40,
          'personal': 0.48}
CATEGORIES = list(MARGIN.keys())


def write_json(path, obj, compact=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def products():
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'tools', 'products.psv'), encoding='utf-8'), delimiter='|'))
    cols = 20
    img = Image.new('RGBA', (cols * 32, ((len(rows) + cols - 1) // cols) * 32), (0, 0, 0, 0))
    out, en, zh = [], {}, {}
    for i, r in enumerate(rows):
        cv = GP.draw_product(r['tpl'], r['a'], r['b'], r['c'])
        cv.to_image(img, (i % cols) * 32, (i // cols) * 32)
        price = float(r['price'])
        rnd = random.Random(r['id'])
        margin = MARGIN[r['cat']] + rnd.uniform(-0.04, 0.04)
        weight, bw, bh = GP.BAG[r['tpl']]
        out.append({
            'id': r['id'], 'cat': r['cat'], 'store': STORAGE.get(r['cat'], 'shelf'),
            'price': round(price, 2), 'cost': round(price * (1 - margin), 2),
            'bag': [bw, bh, weight],
        })
        en[r['id']] = r['en']
        zh[r['id']] = r['zh']
    img.save(os.path.join(ASSETS, 'products.png'))
    write_json(os.path.join(DATA, 'products.json'), out)
    return out, en, zh


STATIONS = ['oden', 'deli', 'bakery', 'coffee']
NPC_COUNT = 160


def npcs(prods):
    rnd = random.Random(2026)
    ids_by_cat = {}
    for p in prods:
        ids_by_cat.setdefault(p['cat'], []).append(p['id'])
    out, en, zh, looks = [], {}, {}, []
    name_rnd = random.Random(31)
    used_en, used_zh = set(), set()
    for i in range(NPC_COUNT):
        kind = 'kid' if rnd.random() < 0.13 else ('elder' if rnd.random() < 0.17 else 'adult')
        sex = rnd.choice('fm')
        en[f'n{i}'], zh[f'n{i}'] = make_name(name_rnd, sex, kind, used_en, used_zh)
        look = GC.random_look(rnd, kind)
        look.hair = rnd.choice(['bob', 'long', 'ponytail', 'bun', 'short']) if sex == 'f' else rnd.choice(['short', 'buzz', 'spiky', 'parted'])
        look.skirt = sex == 'f' and rnd.random() < 0.45
        if look.skirt:
            look.pants = hexc(rnd.choice(['5a3a5a', '3a4a6a', 'b04060', '6a5a48', '2a2a34', 'c8a060']))
        looks.append(look)
        likes = rnd.sample(CATEGORIES, 2)
        favs = rnd.sample(ids_by_cat[likes[0]], 1) + rnd.sample(ids_by_cat[likes[1]], 1) + [rnd.choice(prods)['id']]
        stations = {s: round(rnd.uniform(0.0, 0.55) if rnd.random() < 0.6 else 0.0, 2) for s in STATIONS}
        budget = rnd.randint(8, 16) if kind == 'kid' else rnd.randint(16, 42)
        cash = rnd.uniform(0.08, 0.3) + (0.25 if kind == 'elder' else 0) + (0.2 if kind == 'kid' else 0)
        out.append({
            'id': f'n{i}', 'kind': kind, 'likes': likes, 'favs': favs, 'stations': stations,
            'budget': budget, 'cash': round(min(cash, 0.8), 2), 'exact': round(rnd.uniform(0.15, 0.5), 2),
            'miscount': round(rnd.uniform(0.04, 0.18), 2), 'patience': round(rnd.uniform(0.7, 1.3), 2),
        })
    write_json(os.path.join(DATA, 'npcs.json'), out)
    return looks, en, zh


STAFF_HAIR = ['ponytail', 'spiky', 'bob', 'parted', 'long', 'buzz', 'bun', 'short', 'ponytail', 'parted', 'bob', 'spiky']


def staff_names(used_en, used_zh):
    """Two names per staff look (index = look * 2 + k), gendered to match the hairstyle."""
    rnd = random.Random(88)
    out = []
    for i in range(len(STAFF_HAIR) * 2):
        sex = 'f' if STAFF_HAIR[i // 2] in ('ponytail', 'bob', 'long', 'bun') else 'm'
        out.append(make_name(rnd, sex, 'adult', used_en, used_zh, 0.9))
    return out


def staff_looks():
    rnd = random.Random(77)
    owner = GC.Look(hair='short', hair_c=GC.HAIR_COLORS[0], shirt='f4f0e8', pants='3a4a6a', shoes='3a2a2a',
                    apron='b83a3a', cap='b83a3a')
    staff = []
    styles = STAFF_HAIR
    shirts = ['f4f0e8', 'c8d8f0', 'f0d8d8', 'e0e8c8', 'f0e8d0', 'd8d0e8']
    for i in range(12):
        lk = GC.random_look(rnd, 'adult')
        lk.hair = styles[i]
        lk.hair_c = GC.HAIR_COLORS[i % len(GC.HAIR_COLORS)]
        lk.apron = hexc('3a7a4a')
        lk.jacket = None
        lk.cap = hexc('3a7a4a') if i in (3, 9) else None
        lk.skirt = False
        lk.glasses = i in (1, 7)
        lk.shirt = hexc(shirts[i % len(shirts)])
        lk.pants = hexc(['2a2a34', '3a4a6a', '4a4a54', '5a4a3a'][i % 4])
        staff.append(lk)
    return [owner] + staff


def characters(npc_looks):
    looks = staff_looks() + npc_looks
    img = Image.new('RGBA', (GC.FW * GC.FRAMES_PER_ROW, GC.FH * len(looks)), (0, 0, 0, 0))
    for r, lk in enumerate(looks):
        for i, f in enumerate(GC.char_row(lk)):
            f.to_image(img, i * GC.FW, r * GC.FH)
    img.save(os.path.join(ASSETS, 'chars.png'))
    return len(looks)


def pack(items, width=1024):
    items = sorted(items, key=lambda kv: (-kv[1].h, kv[0]))
    x = y = row_h = 0
    rects = {}
    for name, cv in items:
        if x + cv.w > width:
            x = 0
            y += row_h + 1
            row_h = 0
        rects[name] = (x, y, cv.w, cv.h)
        x += cv.w + 1
        row_h = max(row_h, cv.h)
    h = y + row_h
    img = Image.new('RGBA', (width, h), (0, 0, 0, 0))
    lookup = dict(items)
    for name, (rx, ry, _, _) in rects.items():
        lookup[name].to_image(img, rx, ry)
    return img, rects


def outlined(cv):
    cv.outline(0.5)
    return cv


def atlas():
    items = {
        'floor0': GW.floor(0), 'floor1': GW.floor(1), 'sidewalk': GW.sidewalk(),
        'wall0': GW.wall_face(0), 'wall1': GW.wall_face(1), 'wall2': GW.wall_face(2), 'wall3': GW.wall_face(3),
        'wallcap': GW.wall_cap(), 'wallL': GW.wall_side(False), 'wallR': GW.wall_side(True),
        'door_stock': GW.door_stock(), 'entrance': GW.entrance(), 'mat': GW.mat(),
        'shelf_h': outlined(GW.shelf_h()), 'shelf_v': outlined(GW.shelf_v()),
        'produce_h': outlined(GW.produce_h()), 'produce_v': outlined(GW.produce_v()),
        'fridge_h': outlined(GW.fridge_h()), 'fridge_v': outlined(GW.fridge_v()),
        'fridge_glass_h': GW.fridge_glass_h(), 'fridge_glass_v': GW.fridge_glass_v(),
        'freezer_h': outlined(GW.freezer_h()), 'freezer_v': outlined(GW.freezer_v()),
        'freezer_glass_h': GW.freezer_glass_h(), 'freezer_glass_v': GW.freezer_glass_v(),
        'register': outlined(GW.register()), 'oden': GW.oden_counter(), 'deli': outlined(GW.deli_counter()),
        'oven': outlined(GW.oven()), 'bread_case': outlined(GW.bread_case()), 'coffee': outlined(GW.coffee_bar()),
        'bagging': outlined(GW.bagging()), 'plant': GW.plant(),
        'basket': GW.basket(), 'carton': GW.carton(), 'shadow': GW.shadow(), 'select': GW.selection(),
        'b_cash': GW.bubble(GW.ic_cash, hexc('f0c040')), 'b_oden': GW.bubble(GW.ic_oden, hexc('f0c040')),
        'b_deli': GW.bubble(GW.ic_deli, hexc('f0c040')), 'b_coffee': GW.bubble(GW.ic_coffee, hexc('f0c040')),
        'b_bag': GW.bubble(GW.ic_bag, hexc('f0c040')), 'b_bread': GW.bubble(GW.ic_bread, hexc('f0c040')),
        'b_heart': GW.bubble(GW.ic_heart), 'b_sad': GW.bubble(GW.ic_sad), 'b_empty': GW.bubble(GW.ic_empty),
        'b_wait': GW.bubble(GW.ic_wait),
        'drawer': GM.drawer(), 'tray': GM.tray(), 'counter_wood': GM.wood_counter(),
        'oden_pot': GM.oden_pot(), 'oden_cup': GM.oden_cup(), 'slicer': GM.slicer(), 'scale': GM.scale_box(),
        'oven_tray': GM.oven_tray(), 'coffee_cup': GM.coffee_cup(),
        'bag_paper': GM.bag_bg('paper'), 'bag_cold': GM.bag_bg('cold'), 'font': GM.font_sheet(),
    }
    for v in (1, 5, 10, 20, 50, 100):
        items[f'bill{v}'] = GM.bill(v)
    for v in (1, 5, 10, 25):
        items[f'coin{v}'] = GM.coin(v)
    for k in GM.ODEN:
        items[f'oden_{k}'] = GM.oden_item(k)
    for k in GM.MEATS:
        items[f'meat_{k}'] = GM.meat_log(k)
        items[f'slice_{k}'] = GM.meat_slice(k)
    for k in GM.BREADS:
        for s in ('raw', 'good', 'golden', 'burnt'):
            items[f'bread_{k}_{s}'] = GM.bread(k, s)
    for k in GM.COFFEE:
        items[f'cf_{k}'] = GM.coffee_icon(k)
    img, rects = pack(list(items.items()))
    img.save(os.path.join(ASSETS, 'atlas.png'))
    write_json(os.path.join(DATA, 'atlas.json'), {'rects': rects, 'font': ''.join(GM.FONT_CHARS)})
    return items


def icon_base():
    cv = Canvas(32, 32)
    sky = hexc('3a7ab8')
    cv.rect(0, 0, 31, 31, sky)
    cv.shade_vgrad(0, 0, 31, 31, 1.2, -0.6)
    cv.rect(0, 28, 31, 31, hexc('8a8690'))
    cv.hline(0, 31, 28, hexc('b8b4bc'))
    wall = hexc('f2e6cc')
    cv.rect(3, 9, 28, 28, wall)
    cv.rect(2, 6, 29, 9, hexc('5a3a30'))
    cv.hline(2, 29, 6, hexc('7a5a48'))
    cv.rect(9, 3, 22, 6, hexc('2e6a4a'))
    cv.rect(10, 4, 21, 5, hexc('f0d060'))
    for x in range(2, 30):
        red = ((x - 2) // 4) % 2 == 0
        c = hexc('d83a3a') if red else hexc('f8f4ee')
        cv.vline(x, 10, 13, c)
        if (x - 2) % 4 in (1, 2):
            cv.px(x, 14, c)
    cv.hline(2, 29, 10, hexc('a82a2a'))
    glass = hexc('9ed4ec')
    cv.rect(5, 16, 16, 26, hexc('4a3a34'))
    cv.rect(6, 17, 15, 25, glass)
    cv.hline(6, 15, 21, hexc('c8ccd4'))
    cv.hline(6, 15, 25, hexc('c8ccd4'))
    for i, c in enumerate(('e04040', 'f0c040', '5ab04a', 'f08030', '3a70d0')):
        cv.rect(7 + i * 2, 19, 7 + i * 2, 20, hexc(c))
        cv.rect(7 + i * 2, 23, 7 + i * 2, 24, hexc(['f8f8f8', 'd03030', 'f0d040', '7ad0f0', 'a0603a'][i]))
    cv.line(7, 18, 9, 17, hexc('e8f6fc'))
    cv.rect(19, 16, 26, 28, hexc('4a3a34'))
    cv.rect(20, 17, 25, 28, glass)
    cv.vline(22, 17, 28, hexc('4a3a34'))
    cv.vline(23, 17, 28, hexc('4a3a34'))
    cv.px(21, 18, hexc('e8f6fc'))
    return cv


def icons():
    base = icon_base()
    img32 = base.to_image()
    img32.save(os.path.join(PUBLIC, 'favicon.png'))
    padded = Image.new('RGBA', (36, 36), base.p[0][0])
    padded.paste(img32, (2, 2))
    padded.resize((180, 180), Image.NEAREST).save(os.path.join(PUBLIC, 'apple-touch-icon.png'))
    img32.resize((192, 192), Image.NEAREST).save(os.path.join(PUBLIC, 'icon-192.png'))
    img32.resize((512, 512), Image.NEAREST).save(os.path.join(PUBLIC, 'icon-512.png'))


def og_image(prods, items, chars_img):
    w, h = 300, 158
    img = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    floor = [items['floor0'].to_image(), items['floor1'].to_image()]
    for ty in range(0, h, 32):
        for tx in range(0, w, 32):
            img.paste(floor[((tx + ty) // 32) % 2], (tx, ty))
    wall = items['wall1'].to_image()
    wall0 = items['wall0'].to_image()
    for i, tx in enumerate(range(0, w, 32)):
        img.paste(wall if i % 3 == 1 else wall0, (tx, -34))
    pimg = Image.open(os.path.join(ASSETS, 'products.png'))

    def prod(idx):
        return pimg.crop(((idx % 20) * 32, (idx // 20) * 32, (idx % 20) * 32 + 32, (idx // 20) * 32 + 32))

    shelf = items['shelf_h'].to_image()
    picks = [[0, 3, 7, 22], [118, 123, 140, 147], [88, 96, 106, 112], [24, 28, 58, 60]]
    for s, row in enumerate(picks):
        sx = 8 + s * 72
        img.alpha_composite(shelf, (sx, 30))
        for j, idx in enumerate(row):
            img.alpha_composite(prod(idx), (sx + (j % 2) * 32, 30 + (j // 2) * 20 - 6))
    for i, (row, col, x) in enumerate(((0, 9, 24), (14, 9, 92), (20, 3, 150), (30, 9, 250), (3, 3, 196))):
        fr = chars_img.crop((col * 32, row * 48, col * 32 + 32, row * 48 + 48))
        img.alpha_composite(fr, (x, 64))
    band_h = 48
    band = Image.new('RGBA', (w, band_h), (24, 30, 40, 225))
    img.alpha_composite(band, (0, h - band_h))
    cv = Canvas(w, band_h)
    GM.glyphs(cv, 'Grocery', 11, 7, hexc('3a2a10'), 3)
    GM.glyphs(cv, 'Grocery', 10, 6, hexc('f8e08a'), 3)
    GM.glyphs(cv, 'Pixel Supermarket', 160, 8, hexc('e8eef0'), 1)
    GM.glyphs(cv, 'Manager', 160, 18, hexc('e8eef0'), 1)
    GM.glyphs(cv, 'https://cyberzhg.github.io/Grocery/', 10, 36, hexc('9fd8f0'), 1)
    img.alpha_composite(cv.to_image(), (0, h - band_h))
    img = img.resize((w * 4, h * 4), Image.NEAREST).crop((0, 1, 1200, 631))
    img.convert('RGB').save(os.path.join(PUBLIC, 'og.png'))


def main():
    os.makedirs(ASSETS, exist_ok=True)
    prods, p_en, p_zh = products()
    looks, n_en, n_zh = npcs(prods)
    characters(looks)
    names = staff_names(set(n_en.values()), set(n_zh.values()))
    s_en = {f's{i}': n[0] for i, n in enumerate(names)}
    s_zh = {f's{i}': n[1] for i, n in enumerate(names)}
    write_json(os.path.join(GEN_I18N, 'en.json'), {'product': p_en, 'npc': n_en, 'staff': s_en}, compact=False)
    write_json(os.path.join(GEN_I18N, 'zh.json'), {'product': p_zh, 'npc': n_zh, 'staff': s_zh}, compact=False)
    items = atlas()
    icons()
    og_image(prods, items, Image.open(os.path.join(ASSETS, 'chars.png')))


if __name__ == '__main__':
    main()
