import csv
import json
import os
import random
from PIL import Image

from pix import Canvas, hexc, tone, mix
import gen_products as GP
import gen_products_local as GPL
import gen_chars as GC
import gen_street as GS
import gen_cafe as GCF
import gen_world as GW
import gen_mini as GM
import gen_decor as GD
import gen_local as GL
from names import make_name, make_name_jk

NAMES_JK = {}
from products_i18n import JA_KO

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


def small_products(img, cols):
    """16px shelf icons: box-filtered downscale with a hard alpha cut so edges stay crisp."""
    rows = img.height // 32
    out = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
    for i in range(cols * rows):
        tile = img.crop(((i % cols) * 32, (i // cols) * 32, (i % cols) * 32 + 32, (i // cols) * 32 + 32)).resize((16, 16), Image.BOX)
        px = tile.load()
        for y in range(16):
            for x in range(16):
                c = px[x, y]
                px[x, y] = (c[0], c[1], c[2], 255) if c[3] >= 110 else (0, 0, 0, 0)
        out.paste(tile, ((i % cols) * 16, (i // cols) * 16))
    out.save(os.path.join(ASSETS, 'products_small.png'))


def products():
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'tools', 'products.psv'), encoding='utf-8'), delimiter='|'))
    cols = 20
    img = Image.new('RGBA', (cols * 32, ((len(rows) + cols - 1) // cols) * 32), (0, 0, 0, 0))
    out, en, zh = [], {}, {}
    for i, r in enumerate(rows):
        cv = GP.draw_product(r['tpl'], r['a'], r['b'], r['c'])
        GPL.apply_mark(cv, r['tpl'], r.get('mark'))
        cv.to_image(img, (i % cols) * 32, (i // cols) * 32)
        price = float(r['price'])
        rnd = random.Random(r['id'])
        margin = MARGIN[r['cat']] + rnd.uniform(-0.04, 0.04)
        weight, bw, bh = GP.BAG[r['tpl']]
        out.append({
            'id': r['id'], 'cat': r['cat'], 'store': STORAGE.get(r['cat'], 'shelf'),
            'price': round(price, 2), 'cost': round(price * (1 - margin), 2),
            'bag': [bw, bh, weight],
            # regional specialties only show up for new shelves in that language
            **({'region': r['region']} if r.get('region') else {}),
        })
        en[r['id']] = r['en']
        zh[r['id']] = r['zh']
    img.save(os.path.join(ASSETS, 'products.png'))
    small_products(img, cols)
    write_json(os.path.join(DATA, 'products.json'), out)
    return out, en, zh


STATIONS = ['oden', 'deli', 'bakery', 'coffee']
NPC_COUNT = 240


def npcs(prods):
    rnd = random.Random(2026)
    # regional specialties aren't anyone's favorite: players in other languages can't stock them
    prods = [p for p in prods if 'region' not in p]
    ids_by_cat = {}
    for p in prods:
        ids_by_cat.setdefault(p['cat'], []).append(p['id'])
    out, en, zh, looks = [], {}, {}, []
    name_rnd = random.Random(31)
    jk_rnd = random.Random(57)
    used_jk = set()
    ja, ko = {}, {}
    used_en, used_zh = set(), set()
    for i in range(NPC_COUNT):
        kind = 'kid' if rnd.random() < 0.13 else ('elder' if rnd.random() < 0.17 else 'adult')
        sex = rnd.choice('fm')
        en[f'n{i}'], zh[f'n{i}'] = make_name(name_rnd, sex, kind, used_en, used_zh)
        ja[f'n{i}'], ko[f'n{i}'] = make_name_jk(jk_rnd, sex, kind, used_jk)
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
    NAMES_JK['ja'], NAMES_JK['ko'] = ja, ko
    return looks, en, zh


STAFF_HAIR = ['ponytail', 'spiky', 'bob', 'parted', 'long', 'buzz', 'bun', 'short', 'ponytail', 'parted', 'bob', 'spiky']


def staff_names(used_en, used_zh):
    """Two names per staff look (index = look * 2 + k), gendered to match the hairstyle."""
    rnd = random.Random(88)
    jk = random.Random(89)
    used_jk = set(NAMES_JK['ja'].values()) | set(NAMES_JK['ko'].values())
    out = []
    for i in range(len(STAFF_HAIR) * 2):
        sex = 'f' if STAFF_HAIR[i // 2] in ('ponytail', 'bob', 'long', 'bun') else 'm'
        out.append(make_name(rnd, sex, 'adult', used_en, used_zh, 0.9) + make_name_jk(jk, sex, 'adult', used_jk, 0.9))
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
        'door_stock': GW.door_stock(), 'door_stock_open': GW.door_stock_open(), 'door_stock_half': GW.door_stock_open(True), 'pillar': GW.pillar(), 'entrance_frame': GW.entrance_frame(), 'door_panel': GW.door_panel(), 'mat': GW.mat(),
        'shelf_h': outlined(GW.shelf_h()), 'shelf_v': outlined(GW.shelf_v()),
        'produce_h': outlined(GW.produce_h()), 'produce_v': outlined(GW.produce_v()),
        'fridge_h': outlined(GW.fridge_h()), 'fridge_v': outlined(GW.fridge_v()),
        'fridge_glass_h': GW.fridge_glass_h(), 'fridge_glass_v': GW.fridge_glass_v(),
        'freezer_h': outlined(GW.freezer_h()), 'freezer_v': outlined(GW.freezer_v()),
        'freezer_glass_h': GW.freezer_glass_h(), 'freezer_glass_v': GW.freezer_glass_v(),
        'register': outlined(GW.register()), 'oden': GW.oden_counter(), 'deli': outlined(GW.deli_counter()),
        'oven': outlined(GW.oven()), 'bread_case': outlined(GW.bread_case()), 'coffee': outlined(GW.coffee_bar()),
        'bagging': outlined(GW.bagging()), 'plant': GW.plant(),
        'sign': GW.sign(), 'star_on': GW.star(True), 'star_off': GW.star(False), 'treat': GW.treat(),
        'basket': GW.basket(), 'trophy': GW.trophy(), 'carton': GW.carton(), 'shadow': GW.shadow(), 'select': GW.selection(),
        'b_cash': GW.bubble(GW.ic_cash, hexc('f0c040')), 'b_oden': GW.bubble(GW.ic_oden, hexc('f0c040')),
        'b_deli': GW.bubble(GW.ic_deli, hexc('f0c040')), 'b_coffee': GW.bubble(GW.ic_coffee, hexc('f0c040')),
        'b_bag': GW.bubble(GW.ic_bag, hexc('f0c040')), 'b_bread': GW.bubble(GW.ic_bread, hexc('f0c040')),
        'b_heart': GW.bubble(GW.ic_heart), 'b_sad': GW.bubble(GW.ic_sad), 'b_empty': GW.bubble(GW.ic_empty),
        'b_wait': GW.bubble(GW.ic_wait), 'b_star': GW.bubble(GW.ic_star, hexc('f0c040')),
        'b_paw': GW.bubble(GW.ic_paw), 'b_pricey': GW.bubble(GW.ic_pricey),
        'b_chat': GW.bubble(GW.ic_chat), 'b_laugh': GW.bubble(GW.ic_laugh), 'b_wave': GW.bubble(GW.ic_wave),
        'b_exclaim': GW.bubble(GW.ic_exclaim), 'b_question': GW.bubble(GW.ic_question), 'b_camera': GW.bubble(GW.ic_camera), 'b_zzz': GW.bubble(GW.ic_zzz),
        'umbrella_stand': GW.umbrella_stand(),
        'tray': GM.tray(), 'counter_wood': GM.wood_counter(),
        'oden_pot': GM.oden_pot(), 'oden_box_back': GM.oden_box_back(), 'oden_box_front': GM.oden_box_front(), 'slicer': GM.slicer(), 'scale': GM.scale_box(),
        'bake_sheet': GM.bake_sheet(), 'bake_sheet_end': GM.bake_sheet_end(), 'oven_wall': GM.oven_wall(), 'oven_coil': GM.oven_coil(), 'oven_rail': GM.oven_rail(), 'coffee_cup': GM.coffee_cup(), 'cafe_wall': GM.cafe_wall(), 'cafe_counter': GM.cafe_counter(), 'cafe_head': GM.cafe_head(), 'cafe_panel': GM.cafe_panel(), 'cafe_menu': GM.cafe_menu(), 'cafe_shelf': GM.cafe_shelf(), 'belt_tile': GM.belt_tile(), 'cafe_tray': GM.cafe_tray(),
        'bag_paper': GM.bag_bg('paper'), 'bag_cold': GM.bag_bg('cold'), 'font': GM.font_sheet(),
    }
    card = outlined(GW.card_counter())
    items['card_counter'] = GW.with_card_sign(card)
    for tier in (1, 2):
        items[f'card_counter_t{tier}'] = GW.with_card_sign(GW.upgraded('card', card, tier))
    for name, kind in (('register', 'register'), ('oden', 'oden'), ('deli', 'deli'), ('oven', 'oven'), ('coffee', 'coffee'), ('bagging', 'bagging')):
        for tier in (1, 2):
            items[f'{name}_t{tier}'] = GW.upgraded(kind, items[name], tier)
    items.update({
        'lanterns': GL.lanterns(), 'chochin': GL.chochin(), 'fu': GL.fu(), 'kadomatsu': GL.kadomatsu(),
        'koinobori': GL.koinobori(), 'rabbit_lantern': GL.rabbit_lantern(), 'bokjori': GL.bokjori(),
        'bunting_duanwu': GD.bunting(['3a9a5a', 'f0d040', 'd84848']), 'bunting_national': GD.bunting(['d8302a', 'f0c040']),
        'bunting_saekdong': GD.bunting(['d84848', 'f0d040', '4aa060', '3a6ad8', 'f4f2ee', 'e070a0']),
    })
    for k, fn in (('lantern_stand', GL.lantern_stand), ('lucky_bamboo', GL.lucky_bamboo), ('daruma', GL.daruma),
                  ('bonsai', GL.bonsai), ('onggi', GL.onggi), ('hanji_lamp', GL.hanji_lamp)):
        items[f'decor_{k}'] = fn()
    items['decor_maneki'] = GL.maneki(0)
    for k in range(3):
        items[f'maneki_{k}'] = GL.maneki(k)
    items.update({'bld_plaza': GL.bld_plaza(), 'bld_market': GL.bld_market(), 'bld_bathhouse': GL.bld_bathhouse(), 'bld_netcafe': GL.bld_netcafe()})
    for lang in ('zh', 'ja', 'ko'):
        items[f'bld_bus@{lang}'] = GL.bus_stop(lang)
        items[f'bld_apartments@{lang}'] = GL.apartments(lang)
    for k in ('sweet_potato', 'tanghulu', 'bungeoppang'):
        items[f'cart_{k}'] = GL.cart(k)
    # sprites named name@<lang> replace name while playing in that language
    for lang, cuts in GL.DELI_LOCAL.items():
        for meat, (style, a, b) in cuts.items():
            items[f'meat_{meat}@{lang}'] = GL.local_log(style, a, b)
            items[f'slice_{meat}@{lang}'] = GL.local_slice(style, a, b)
        counter = GL.deli_counter_local(lang, GW.counter_base)
        items[f'deli@{lang}'] = counter
        for tier in (1, 2):
            items[f'deli_t{tier}@{lang}'] = GW.upgraded('deli', counter, tier)
    items['slicer@zh'] = GL.chopping_board()
    items['cleaver'] = GL.cleaver()
    items['roast_window'] = GL.roast_window()
    items['b_laowu'] = GL.bubble_laowu()
    for coat in range(len(GL.DOG_COATS)):
        for k in range(5):
            items[f'dog_{coat}_{k}'] = GL.dog(coat, k)
    for k in range(5):
        items[f'sparrow_{k}'] = GL.sparrow(k)
    for k in range(GL.SQUIRREL_FRAMES):
        items[f'squirrel_{k}'] = GL.squirrel(k)
    items.update({'footprint': GL.footprint(), 'van': GL.van(), 'dolly_full': GL.dolly(True), 'dolly_empty': GL.dolly(False)})
    for k in ('hopscotch', 'flower', 'sun', 'cat', 'heart'):
        items[f'chalk_{k}'] = GL.chalk(k)
    for k in range(-2, 3):
        items[f'chime_{k + 2}'] = GL.wind_chime(k)
    for k in range(GL.RACCOON_FRAMES):
        items[f'raccoon_{k}'] = GL.raccoon(k)
    for k in range(5):
        items[f'pigeon_{k}'] = GL.pigeon(k)
    for k in range(2):
        items[f'butterfly_{k}'] = GL.butterfly(k)
    for k in range(4):
        items[f'slicer_{k}@zh'] = GL.cleaver_frame(k)
    zh_counter = GL.dimsum_counter(GW.counter_base)
    items['oden@zh'] = zh_counter
    for tier in (1, 2):
        items[f'oden_t{tier}@zh'] = GW.upgraded('oden', zh_counter, tier)
        items[f'card_counter_t{tier}@zh'] = GL.with_qr_sign(GW.upgraded('card', card, tier))
    items['card_counter@zh'] = GL.with_qr_sign(card)
    items['b_oden@zh'] = GW.bubble(GL.ic_bun, hexc('f0c040'))
    for odenk, dk in zip(GM.ODEN, GL.DIMSUM):
        items[f'oden_{odenk}@zh'] = GL.dimsum_item(dk)
    items['oden_pot@zh'] = GL.steamer_grid()
    items['oden_box_back@zh'] = GL.steamer_basket_back(GM.oden_box_back(), GM.BOX_CY, GM.BOX_RX, GM.BOX_RY)
    items['oden_box_front@zh'] = GL.steamer_basket_front(GM.oden_box_front())
    for k in range(4):
        items[f'oden_bubble_{k}@zh'] = GL.dimsum_steam(k)
    for name, fn in GS.BUILDINGS.items():
        items[f'bld_{name}'] = fn()
    items['bld_empty'] = GS.empty_lot()
    items['decor_table'] = GCF.table()
    items['cafe_chair'] = GCF.chair()
    for kind in GCF.TOYS:
        items[f'decor_toy_{kind}'] = GCF.toy(kind)
    items['toy_tunnel_front'] = GCF.tunnel_front()
    for k in range(3):
        items[f'mop_{k}'] = GW.mop(k)
    items['bucket'] = GW.bucket()
    for k in (1, 2):
        items[f'oven_door_{k}'] = GW.oven_door(k)
    for k in range(4):
        items[f'oden_bubble_{k}'] = GW.oden_bubbles(k)
        items[f'slicer_{k}'] = GW.slicer_blade(k)
    for k in (1, 2, 3):
        items[f'reg_drawer_{k}'] = GW.cash_drawer(k)
        items[f'receipt_{k}'] = GW.receipt(k)
    for kind in ('fridge', 'freezer'):
        for vertical in (False, True):
            for slot in (0, 1):
                for stage in (1, 2):
                    items[f'{kind}_glass_{"v" if vertical else "h"}_open{slot}_{stage}'] = GW.glass_open(kind, vertical, slot, stage)
    for k in range(3):
        items[f'gumball_{k}'] = GD.gumball_turn(k)
    for k in range(2):
        items[f'magazine_{k}'] = GD.magazine_flip(k)
    items['sign_neon_dim'] = GD.sign_style('neon', True)
    for k in range(12):
        items[f'clock_h_{k}'] = GD.clock_hand(k, True)
        items[f'clock_m_{k}'] = GD.clock_hand(k, False)
    for k in range(GD.AQUARIUM_FRAMES):
        items[f'aq_{k}'] = GD.aquarium(k)
    for kind, n in GCF.TOY_FRAMES.items():
        for k in range(n):
            items[f'toyf_{kind}_{k}'] = GCF.toy_frame(kind, k)
    items['bld_store'] = GS.mini_store()
    for kind in GW.TREASURES:
        items[f'treasure_{kind}'] = GW.treasure(kind)
    for color in GW.UMBRELLA_COLORS:
        items[f'umbrella_{color}'] = GW.umbrella(color)
    for k in ('sunny', 'cloudy', 'rain', 'snow', 'hot'):
        items[f'w_{k}'] = GW.weather_icon(k)
    for coat in GD.CAT_COATS:
        for pose in GD.CAT_POSES:
            items[f'cat_{coat}_{pose}'] = GD.cat_sprite(coat, pose)
    for acc in GD.CAT_ACCS:
        for pose in GD.CAT_POSES:
            items[f'cacc_{acc}_{pose}'] = GD.cat_acc(acc, pose)
    for st in GD.FLOOR_STYLES:
        for v in (0, 1):
            items[f'f_{st}_{v}'] = GD.floor_style(st, v)
    for st in GD.WALL_STYLES:
        for k in range(4):
            items[f'wall_{st}_{k}'] = GD.wall_style(st, k)
        for season in GD.SEASONS:
            items[f'wall_{st}_p_{season}'] = GD.wall_style(st, 2, season)
    for st in GD.SIGN_STYLES:
        items[f'sign_{st}'] = GD.sign_style(st)
    for k in GD.DECOR:
        items[f'decor_{k}'] = GD.decor(k)
    for i, d in enumerate((-1, 1)):
        items[f'decor_plant_small_s{i}'] = GD.decor('plant_small', d)
        items[f'decor_flowers_s{i}'] = GD.decor('flowers', d)
        items[f'plant_s{i}'] = GW.plant(d)
    for k in range(4):
        items[f'puddle_{k}'] = GW.puddle(k)
    for k in range(3):
        items[f'splash_{k}'] = GW.splash(k)
    for k in GD.GIFTS:
        items[f'gift_{k}'] = GD.gift_icon(k)
    items.update({
        'pumpkin': GD.pumpkin(), 'jack': GD.jack_o_lantern(), 'xmas_tree': GD.xmas_tree(), 'gift_box': GD.gift_box(),
        'bunting_july4': GD.bunting(['d84848', 'f4f2ee', '3a5ab0']), 'bunting_superbowl': GD.bunting(['3a5ab0', 'd84848']),
        'bunting_newyear': GD.bunting(['f0d040', 'e05a9a', '40a0e0', '7ad070']), 'hearts': GD.hearts(),
        'balloons': GD.balloons(), 'wreath': GD.wreath(), 'football': GD.football(),
        'spill_puddle': GD.spill('puddle'), 'spill_crumbs': GD.spill('crumbs'),
    })
    # cash sprites are named by value in cents of the game's dollar: a yen is a cent, a won a tenth of one
    for v in (1, 5, 10, 20, 50, 100):
        items[f'cash_usd_{v * 100}'] = GM.bill(v)
    for v in (5, 10, 25):
        items[f'cash_usd_{v}'] = GM.coin(v)
    per = {'cny': 100, 'jpy': 1, 'krw': 0.1}
    for cur, notes in GM.NOTES.items():
        for v in notes:
            items[f'cash_{cur}_{round(v * per[cur])}'] = GM.note(cur, v)
    for cur, coins in GM.COINS.items():
        for v in coins:
            items[f'cash_{cur}_{round(v * per[cur]) if cur != "cny" else v}'] = GM.coin_of(cur, v)
    for cur, (nb, nc) in {'usd': (5, 3), 'cny': (4, 3), 'jpy': (2, 6), 'krw': (3, 4)}.items():
        items[f'drawer_{cur}'] = GM.drawer(nb, nc)
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
    """A small, slightly irregular store scene with the owner up front."""
    w, h, band_h = 400, 210, 54
    img = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    sprite = lambda name: items[name].to_image()
    floor = [sprite('floor0'), sprite('floor1')]
    for ty in range(36, h, 32):
        for tx in range(-8, w, 32):
            img.paste(floor[((tx + 8) // 32 + (ty - 36) // 32) % 2], (tx, ty))
    walls = ['wall0', 'wall1', 'wall0', 'wall2', 'wall1', 'wall0', 'door_stock', 'wall1', 'wall0', 'wall3', 'wall1', 'wall0', 'wall0']
    for i, name in enumerate(walls):
        img.alpha_composite(sprite(name), (i * 32 - 8, -28))

    small = Image.open(os.path.join(ASSETS, 'products_small.png'))
    index = {p['id']: i for i, p in enumerate(prods)}

    def icon(pid):
        i = index[pid]
        return small.crop(((i % 20) * 16, (i // 20) * 16, (i % 20) * 16 + 16, (i // 20) * 16 + 16))

    def row(x0, y, step=7, n=3):
        return [(x0 + k * step, y) for k in range(n)]

    def spots(kind, i, vertical=False):
        if vertical:
            y0 = 2 + i * 38
            return row(1, y0, 14, 2) + row(1, y0 + 9, 14, 2) + row(1, y0 + 18, 14, 2)
        x0 = i * 32
        if kind == 'shelf_h':
            return row(x0 + 1, 11) + row(x0 + 1, 31)
        if kind == 'fridge_h':
            return row(x0 + 2, 22) + row(x0 + 2, 48)
        if kind == 'freezer_h':
            return row(x0 + 2, 3) + row(x0 + 4, 11)
        return row(x0 + 1, 4) + row(x0 + 4, 11, 8, 2) + row(x0 + 8, 16, 8, 1)

    # (sprite, x, bottom y, products per slot)
    fixtures = [
        ('fridge_h', 6, 96, ['milk_whole', 'orange_juice']),
        ('fridge_h', 74, 92, ['greek_yogurt', 'cheddar']),
        ('shelf_h', 152, 100, ['potato_chips', 'cola']),
        ('shelf_h', 222, 94, ['corn_flakes', 'peanut_butter']),
        ('produce_h', 292, 104, ['apple_red', 'banana']),
        ('shelf_v', 366, 128, ['sparkling_water', 'instant_ramen']),
        ('freezer_h', 20, 160, ['ice_cream_vanilla', 'pepperoni_pizza']),
        ('produce_h', 238, 156, ['strawberries', 'avocado']),
        ('shelf_h', 304, 166, ['cheese_puffs', 'chocolate_bar']),
    ]
    owner = (170, 146)
    order = sorted(fixtures, key=lambda f: f[2])
    drawn_owner = False
    for name, x, bottom, products in order:
        if not drawn_owner and bottom > owner[1]:
            drawn_owner = True
            draw_owner(img, items, chars_img, owner)
        body = sprite(name)
        top = bottom - body.height
        img.alpha_composite(body, (x, top))
        layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        vertical = name.endswith('_v')
        for i, pid in enumerate(products):
            for (dx, dy) in spots(name, i, vertical):
                layer.alpha_composite(icon(pid), (x + dx, top + dy))
        if name.startswith('freezer'):
            mask = Image.new('L', (w, h), 0)
            for i in range(2):
                mask.paste(255, (x + 3 + i * 29, top + 3, x + 3 + i * 29 + 28, top + 27))
            layer.putalpha(Image.composite(layer.getchannel('A'), Image.new('L', (w, h), 0), mask))
        img.alpha_composite(layer)
        glass = name.replace('_h', '_glass_h').replace('_v', '_glass_v')
        if glass in items and name.split('_')[0] in ('fridge', 'freezer'):
            img.alpha_composite(sprite(glass), (x, top))
    if not drawn_owner:
        draw_owner(img, items, chars_img, owner)
    cat = items['cat_shorthair_sit'].to_image().transpose(Image.FLIP_LEFT_RIGHT)
    img.alpha_composite(items['shadow'].to_image(), (owner[0] + 34, owner[1] - 5))
    img.alpha_composite(cat, (owner[0] + 34, owner[1] - 18))

    band = Image.new('RGBA', (w, band_h), (24, 30, 40, 232))
    img.alpha_composite(band, (0, h - band_h))
    cv = Canvas(w, band_h)
    cv.rect(0, 0, w - 1, 0, hexc('f0c040'))
    GM.glyphs(cv, 'Grocery', 13, 11, hexc('3a2a10'), 3)
    GM.glyphs(cv, 'Grocery', 12, 10, hexc('f8e08a'), 3)
    GM.glyphs(cv, 'Pixel Shopkeeping Sim', 160, 13, hexc('e8eef0'), 1)
    GM.glyphs(cv, 'https://cyberzhg.github.io/Grocery/', 160, 31, hexc('9fd8f0'), 1)
    img.alpha_composite(cv.to_image(), (0, h - band_h))
    img.resize((w * 3, h * 3), Image.NEAREST).convert('RGB').save(os.path.join(PUBLIC, 'og.png'))


def draw_owner(img, items, chars_img, pos):
    x, feet = pos
    shadow = items['shadow'].to_image()
    img.alpha_composite(shadow, (x + 4, feet - 4))
    happy_col = 9
    frame = chars_img.crop((happy_col * 32, 0, happy_col * 32 + 32, 48))
    img.alpha_composite(frame, (x, feet - 46))


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
    for idx, loc in ((0, 'ja'), (1, 'ko')):
        write_json(os.path.join(GEN_I18N, f'{loc}.json'), {
            'product': {k: v[idx] for k, v in JA_KO.items()},
            'npc': NAMES_JK[loc],
            'staff': {f's{i}': n[2 + idx] for i, n in enumerate(names)},
        }, compact=False)
    items = atlas()
    icons()
    og_image(prods, items, Image.open(os.path.join(ASSETS, 'chars.png')))


if __name__ == '__main__':
    main()
