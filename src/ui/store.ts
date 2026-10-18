import { money, t, type Key } from '../i18n';
import { CAT_ACC_PRICE, CAT_ACCS, CAT_COATS, CAT_TREASURES, CATEGORIES, FLOOR_STYLES, SIGN_STYLES, STYLE_PRICE, STYLE_UNLOCK, WALL_STYLES } from '../game/defs';
import { catName, slotName } from '../game/names';
import { inCafe } from '../game/chain';
import { saveGame } from '../game/state';
import type { Game } from '../game/game';
import { CAT_SKILLS, catSkillExpToNext, capacityOf, freshGrowth, rackExpToNext, RACKS, type CatState,
  catExpToNext, EQUIPMENT, equipExpToNext, equipSpeed, PETS_PER_DAY, repExpToNext, repTraffic, stars, supplierDiscount,
  supplierExpToNext, type EquipKind,
} from '../game/growth';
import type { Leveled } from '../game/rules';
import type { DayStats } from '../game/state';
import { spriteIcon } from './achievements';
import type { UI } from './app';
import { h } from './dom';

export function growthName(what: string): string {
  if (what === 'reputation') return t('store.reputation');
  if (what === 'cat') return t('store.catName');
  if ((EQUIPMENT as string[]).includes(what)) return t(`equip.${what}` as Key);
  if ((RACKS as string[]).includes(what)) return t('store.rackOf', { name: t(`fixture.${what}` as Key) });
  return t('store.supplierOf', { cat: t(`cat.${what}` as Key) });
}

const LINE = '#3987e5';
const SURFACE = '#2c2734';
const GRID = '#4a4256';

function meter(l: Leveled, toNext: (lv: number) => number, cls = ''): HTMLElement {
  return h('div', { class: `meter ${cls}` }, [h('div', { class: 'fill', style: { width: `${Math.min(1, l.exp / toNext(l.level)) * 100}%` } })]);
}

function row(label: string, l: Leveled, toNext: (lv: number) => number, effect: string): HTMLElement {
  return h('div', { class: 'grow-row' }, [
    h('span', { class: 'grow-name' }, [label]),
    h('span', { class: 'grow-lv' }, [t('common.level', { n: l.level })]),
    meter(l, toNext),
    h('span', { class: 'grow-eff' }, [effect]),
  ]);
}

/** Equipment this store has, going by its floor plan (the cafe's included, put-away counters too); the bakery's equipment is its oven. */
function equipOpen(g: Game, kind: EquipKind): boolean {
  const l = g.sim.layout;
  const away = g.state.plan?.stowed ?? [];
  if (kind === 'register') return true;
  if (kind === 'bagging') return !!l.bagging || away.includes('bag');
  const id = `st_${kind === 'oven' ? 'bakery' : kind}`;
  return l.stations.some((st) => `st_${st.kind}` === id) || away.includes(id);
}

export function storePanel(g: Game, ui: UI): HTMLElement {
  const s = g.state;
  const rep = s.reputation;
  const starRow = h('div', { class: 'row' }, Array.from({ length: 5 }, (_, i) => spriteIcon(i < stars(rep.level) ? 'star_on' : 'star_off', 2)));
  const nameInput = h('input', {
    class: 'search', maxLength: 20, value: s.storeName, placeholder: t('store.defaultName'),
    onchange: (e: Event) => {
      s.storeName = (e.target as HTMLInputElement).value.trim();
      saveGame(s);
    },
  });
  const out = h('div', { class: 'stack' }, [
    h('h3', {}, [t('store.name')]),
    h('div', { class: 'row' }, [nameInput]),
    h('button', { class: 'btn small', disabled: g.phase !== 'night', onclick: () => renovate(g, ui) }, [`${t('reno.title')}${g.phase === 'night' ? '' : ` · ${t('common.nightOnly')}`}`]),
    h('h3', {}, [t('store.reputation')]),
    h('div', { class: 'card' }, [
      starRow,
      row(t('store.reputation'), rep, repExpToNext, rep.level > 1 ? t('store.repEffect', { p: (repTraffic(rep.level) * 100).toFixed(1) }) : '—'),
      h('p', { class: 'muted' }, [t('store.repHint')]),
    ]),
    h('h3', {}, [t('store.cat')]),
    catCard(g, ui),
    inCafe(s) ? cafeCats(g) : null,
    h('h3', {}, [t('store.equipment')]),
    h('div', { class: 'card' }, EQUIPMENT.filter((k) => equipOpen(g, k)).map((k) =>
      row(t(`equip.${k}` as Key), s.equipment[k], equipExpToNext, t('store.equipEffect', { v: equipSpeed(s.equipment[k].level).toFixed(2) })),
    ).concat([h('p', { class: 'muted' }, [t('store.equipHint')])])),
    // the cafe has no shelves and buys no groceries
    ...(inCafe(s) ? [] : [
      h('h3', {}, [t('store.racks')]),
      h('div', { class: 'card' }, RACKS.map((k) =>
        row(t(`fixture.${k}` as Key), s.racks[k], rackExpToNext, t('store.rackEffect', { n: capacityOf(s, k) })),
      ).concat([h('p', { class: 'muted' }, [t('store.rackHint')])])),
      h('h3', {}, [t('store.suppliers')]),
      h('div', { class: 'card' }, CATEGORIES.map((c) =>
        row(t(`cat.${c}` as Key), s.suppliers[c], supplierExpToNext, s.suppliers[c].level > 1 ? t('store.supplierEffect', { p: (supplierDiscount(s.suppliers[c].level) * 100).toFixed(1) }) : '—'),
      ).concat([h('p', { class: 'muted' }, [t('store.supplierHint')])])),
    ]),
    h('h3', {}, [t('store.trend')]),
    trends(s.history.slice(-30)),
  ]);
  return out;
}

/** At the cat cafe: every store's cat, then the coats that live here. */
function cafeCats(g: Game): HTMLElement {
  const s = g.state;
  const cards: HTMLElement[] = [];
  s.stores.forEach((slot, i) => {
    const d = slot.saved;
    if (i === s.active || !d) return;
    const name = d.catName.trim() || t('store.catDefault');
    cards.push(h('div', { class: 'card cafe-cat' }, [
      h('div', { class: 'card-head' }, [
        h('span', { class: 'layered' }, [spriteIcon(`cat_${d.catCoat}_sit`, 2), d.catAcc ? spriteIcon(`cacc_${d.catAcc}_sit`, 2) : null]),
        h('div', { class: 'card-title' }, [
          h('strong', {}, [name]),
          h('span', { class: 'muted' }, [`${t(`coat.${d.catCoat}` as Key)} · ${slotName(s, i)}`]),
        ]),
      ]),
      row(t('store.cat'), d.cat, catExpToNext, ''),
      h('div', { class: 'grow-row' }, [
        h('span', { class: 'grow-name' }, [t('store.catMood')]),
        h('span', { class: 'grow-lv' }, [`${Math.round(d.cat.mood)}`]),
        h('div', { class: 'meter heart' }, [h('div', { class: 'fill', style: { width: `${d.cat.mood}%` } })]),
        h('span', { class: 'grow-eff' }, ['']),
      ]),
      ...catSkills(d.cat),
    ]));
  });
  const used = new Set([s.catCoat, ...s.stores.map((x) => x.saved?.catCoat)]);
  for (const coat of CAT_COATS.filter((c) => !used.has(c))) {
    cards.push(h('div', { class: 'card cafe-cat' }, [
      h('div', { class: 'card-head' }, [
        spriteIcon(`cat_${coat}_sleep`, 2),
        h('div', { class: 'card-title' }, [
          h('strong', {}, [t(`coat.${coat}` as Key)]),
          h('span', { class: 'muted' }, [t('cafe.resident')]),
        ]),
      ]),
      ...catSkills(s.residents[coat] ?? freshGrowth().cat),
    ]));
  }
  return h('div', { class: 'stack' }, [h('h3', {}, [t('cafe.allCats', { n: cards.length + 1 })]), h('div', { class: 'cards' }, cards)]);
}

/** Skill levels: just a record of what the cat likes doing. */
function catSkills(c: CatState): HTMLElement[] {
  return CAT_SKILLS.map((k) => row(t(`catSkill.${k}` as Key), c.skills[k], catSkillExpToNext, ''));
}

function catCard(g: Game, ui: UI): HTMLElement {
  const c = g.state.cat;
  const pets = c.petDay === g.state.day ? c.pets : 0;
  const fed = c.fedDay === g.state.day;
  const nameInput = h('input', {
    class: 'search', maxLength: 12, value: g.state.catName, placeholder: t('store.catDefault'),
    onchange: (e: Event) => {
      g.state.catName = (e.target as HTMLInputElement).value.trim();
      saveGame(g.state);
    },
  });
  const pose = g.sim.cat.mode === 'walk' ? 'sit' : g.sim.cat.mode;
  return h('div', { class: 'card' }, [
    h('div', { class: 'card-head' }, [
      h('span', { class: 'layered' }, [
        spriteIcon(`cat_${g.state.catCoat}_${pose}`, 2),
        g.state.catAcc ? spriteIcon(`cacc_${g.state.catAcc}_${pose}`, 2) : null,
      ]),
      h('div', { class: 'card-title' }, [
        h('strong', {}, [catName(g.state)]),
        h('span', { class: 'muted' }, [`${t(`coat.${g.state.catCoat}` as Key)} · ${t('store.pets', { n: pets, max: PETS_PER_DAY })}`]),
        h('label', { class: 'row' }, [h('span', { class: 'muted' }, [t('store.rename')]), nameInput]),
      ]),
    ]),
    row(t('store.cat'), c, catExpToNext, ''),
    h('div', { class: 'grow-row' }, [
      h('span', { class: 'grow-name' }, [t('store.catMood')]),
      h('span', { class: 'grow-lv' }, [`${Math.round(c.mood)}`]),
      h('div', { class: 'meter heart' }, [h('div', { class: 'fill', style: { width: `${c.mood}%` } })]),
      h('span', { class: 'grow-eff' }, ['']),
    ]),
    ...catSkills(c),
    h('p', { class: 'muted' }, [t('store.catHint')]),
    h('div', { class: 'stack' }, [
      h('span', { class: 'muted' }, [t('store.treasures', { n: Object.keys(g.state.catTreasures).length, total: CAT_TREASURES.length })]),
      h('div', { class: 'treasures' }, CAT_TREASURES.map((k) => {
        const n = g.state.catTreasures[k] ?? 0;
        return h('div', { class: `treasure${n ? '' : ' none'}`, title: n ? t(`treasure.${k}` as Key) : '?' }, [
          spriteIcon(`treasure_${k}`, 2),
          h('span', {}, [n ? `×${n}` : '']),
        ]);
      })),
    ]),
    h('div', { class: 'row wrap' }, [
      h('span', { class: 'muted' }, [t('store.catAcc')]),
      ...CAT_ACCS.map((a) => {
        const owned = g.state.owned.includes(`acc:${a}`);
        const worn = g.state.catAcc === a;
        return h('button', {
          class: `btn small${worn ? ' active' : ''}`, disabled: !owned && g.state.money < CAT_ACC_PRICE[a],
          onclick: () => {
            if (!owned) {
              g.state.money -= CAT_ACC_PRICE[a];
              g.state.owned.push(`acc:${a}`);
            }
            g.state.catAcc = worn ? null : a;
            saveGame(g.state);
            ui.refresh();
            ui.rerenderPanel?.();
          },
        }, [owned ? t(`acc.${a}` as Key) : `${t(`acc.${a}` as Key)} ${money(CAT_ACC_PRICE[a])}`]);
      }),
    ]),
    h('button', {
      class: 'btn small primary', disabled: fed,
      onclick: () => {
        if (g.sim.feedCat()) ui.toast(t('toast.catFed'));
        ui.rerenderPanel?.();
      },
    }, [fed ? t('store.fed') : t('store.feed')]),
  ]);
}

interface Series {
  key: Key;
  value: (d: DayStats) => number;
  format: (v: number) => string;
}

const SERIES: Series[] = [
  { key: 'chart.revenue', value: (d) => d.revenue, format: (v) => money(v) },
  { key: 'chart.customers', value: (d) => d.customers, format: (v) => String(Math.round(v)) },
  { key: 'chart.affinity', value: (d) => d.avgAffinity, format: (v) => v.toFixed(2) },
  { key: 'chart.reputation', value: (d) => d.reputation ?? 1, format: (v) => String(Math.round(v)) },
];

/** Small multiples: one single-series line per measure, each on its own scale. */
function trends(days: DayStats[]): HTMLElement {
  if (days.length < 2) return h('p', { class: 'muted' }, [t('store.noData')]);
  const grid = h('div', { class: 'trend-grid' }, SERIES.map((sr) => trendChart(days, sr)));
  const table = h('table', { class: 'trend-table' }, [
    h('thead', {}, [h('tr', {}, [h('th', {}, [t('chart.day')]), ...SERIES.map((sr) => h('th', {}, [t(sr.key)]))])]),
    h('tbody', {}, days.slice().reverse().map((d) => h('tr', {}, [h('td', {}, [String(d.day)]), ...SERIES.map((sr) => h('td', {}, [sr.format(sr.value(d))]))]))),
  ]);
  return h('div', { class: 'stack' }, [grid, h('details', {}, [h('summary', {}, [t('store.table')]), table])]);
}

function trendChart(days: DayStats[], sr: Series): HTMLElement {
  const W = 240;
  const H = 72;
  const pad = 4;
  const values = days.map(sr.value);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1e-6);
  const xs = (i: number) => pad + (i / (days.length - 1)) * (W - pad * 2);
  const ys = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const canvas = h('canvas', { class: 'trend-canvas' }) as HTMLCanvasElement;
  const latest = h('strong', { class: 'trend-value' }, [sr.format(values[values.length - 1])]);
  const readout = h('span', { class: 'muted trend-readout' }, [t('hud.day', { n: days[days.length - 1].day })]);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = `${W} / ${H}`;
  const draw = (hover: number | null) => {
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = SURFACE;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, ys(min) + 0.5);
    ctx.lineTo(W - pad, ys(min) + 0.5);
    ctx.stroke();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(xs(i), ys(v)) : ctx.moveTo(xs(i), ys(v))));
    ctx.stroke();
    const mark = hover ?? values.length - 1;
    if (hover !== null) {
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(xs(mark)) + 0.5, pad);
      ctx.lineTo(Math.round(xs(mark)) + 0.5, H - pad);
      ctx.stroke();
    }
    ctx.fillStyle = SURFACE;
    ctx.beginPath();
    ctx.arc(xs(mark), ys(values[mark]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = LINE;
    ctx.beginPath();
    ctx.arc(xs(mark), ys(values[mark]), 3.5, 0, Math.PI * 2);
    ctx.fill();
    latest.textContent = sr.format(values[mark]);
    readout.textContent = t('hud.day', { n: days[mark].day });
  };
  const pick = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    draw(Math.max(0, Math.min(days.length - 1, Math.round(((x - pad) / (W - pad * 2)) * (days.length - 1)))));
  };
  canvas.addEventListener('pointermove', pick);
  canvas.addEventListener('pointerdown', pick);
  canvas.addEventListener('pointerleave', () => draw(null));
  draw(null);
  return h('div', { class: 'trend' }, [
    h('div', { class: 'trend-head' }, [h('span', {}, [t(sr.key)]), readout]),
    latest,
    canvas,
  ]);
}

/** Night-only renovation: floor, wall and sign styles unlock with reputation. Purely cosmetic. */
function renovate(g: Game, ui: UI): void {
  const s = g.state;
  const rep = s.reputation.level;
  const section = (title: Key, key: 'floor' | 'wall' | 'sign', styles: readonly string[], unlock: number[], preview: (st: string) => string) =>
    h('div', { class: 'stack' }, [
      h('h3', {}, [t(title)]),
      h('div', { class: 'reno-grid' }, styles.map((st, i) => {
        const open = rep >= unlock[i];
        const price = STYLE_PRICE[key][i];
        const owned = price === 0 || s.owned.includes(`${key}:${st}`);
        return h('button', {
          // owned styles stay selectable whatever the reputation
          class: `reno${s.style[key] === st ? ' active' : ''}`, disabled: !owned && (!open || s.money < price),
          onclick: () => {
            if (!owned) {
              s.money -= price;
              s.owned.push(`${key}:${st}`);
            }
            s.style[key] = st;
            saveGame(s);
            ui.closeModal();
            renovate(g, ui);
            ui.refresh();
          },
        }, [
          spriteIcon(preview(st), key === 'wall' ? 1 : 2),
          h('span', {}, [t(`reno.${key}.${st}` as Key)]),
          owned ? null : !open ? h('small', { class: 'muted' }, [t('reno.needs', { n: unlock[i] })]) : h('small', { class: 'muted' }, [money(price)]),
        ]);
      })),
    ]);
  const body = h('div', { class: 'stack' }, [
    h('p', { class: 'muted' }, [t('reno.hint')]),
    section('reno.floor', 'floor', FLOOR_STYLES, STYLE_UNLOCK.floor, (st) => `f_${st}_0`),
    section('reno.wall', 'wall', WALL_STYLES, STYLE_UNLOCK.wall, (st) => `wall_${st}_1`),
    section('reno.sign', 'sign', SIGN_STYLES, STYLE_UNLOCK.sign, (st) => `sign_${st}`),
  ]);
  ui.modal(t('reno.title'), body, [], true);
}
