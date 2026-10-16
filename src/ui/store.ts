import { money, t, type Key } from '../i18n';
import { CATEGORIES, LEVELS } from '../game/defs';
import type { Game } from '../game/game';
import {
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

function equipOpen(level: number, kind: EquipKind): boolean {
  const lv = LEVELS[level];
  if (kind === 'register') return true;
  if (kind === 'bagging') return lv.bagging;
  return (lv.stations as string[]).includes(kind);
}

export function storePanel(g: Game, ui: UI): HTMLElement {
  const s = g.state;
  const rep = s.reputation;
  const starRow = h('div', { class: 'row' }, Array.from({ length: 5 }, (_, i) => spriteIcon(i < stars(rep.level) ? 'star_on' : 'star_off', 2)));
  const out = h('div', { class: 'stack' }, [
    h('h3', {}, [t('store.reputation')]),
    h('div', { class: 'card' }, [
      starRow,
      row(t('store.reputation'), rep, repExpToNext, rep.level > 1 ? t('store.repEffect', { p: (repTraffic(rep.level) * 100).toFixed(1) }) : '—'),
      h('p', { class: 'muted' }, [t('store.repHint')]),
    ]),
    h('h3', {}, [t('store.cat')]),
    catCard(g, ui),
    h('h3', {}, [t('store.equipment')]),
    h('div', { class: 'card' }, EQUIPMENT.filter((k) => equipOpen(s.level, k)).map((k) =>
      row(t(`equip.${k}` as Key), s.equipment[k], equipExpToNext, t('store.equipEffect', { v: equipSpeed(s.equipment[k].level).toFixed(2) })),
    ).concat([h('p', { class: 'muted' }, [t('store.equipHint')])])),
    h('h3', {}, [t('store.suppliers')]),
    h('div', { class: 'card' }, CATEGORIES.map((c) =>
      row(t(`cat.${c}` as Key), s.suppliers[c], supplierExpToNext, s.suppliers[c].level > 1 ? t('store.supplierEffect', { p: (supplierDiscount(s.suppliers[c].level) * 100).toFixed(1) }) : '—'),
    ).concat([h('p', { class: 'muted' }, [t('store.supplierHint')])])),
    h('h3', {}, [t('store.trend')]),
    trends(s.history.slice(-30)),
  ]);
  return out;
}

function catCard(g: Game, ui: UI): HTMLElement {
  const c = g.state.cat;
  const pets = c.petDay === g.state.day ? c.pets : 0;
  const fed = c.fedDay === g.state.day;
  return h('div', { class: 'card' }, [
    h('div', { class: 'card-head' }, [
      spriteIcon(g.sim.cat.mode === 'sleep' ? 'cat_sleep' : 'cat_sit', 2),
      h('div', { class: 'card-title' }, [
        h('strong', {}, [t('store.catName')]),
        h('span', { class: 'muted' }, [t('store.pets', { n: pets, max: PETS_PER_DAY })]),
      ]),
    ]),
    row(t('store.cat'), c, catExpToNext, ''),
    h('div', { class: 'grow-row' }, [
      h('span', { class: 'grow-name' }, [t('store.catMood')]),
      h('span', { class: 'grow-lv' }, [`${Math.round(c.mood)}`]),
      h('div', { class: 'meter heart' }, [h('div', { class: 'fill', style: { width: `${c.mood}%` } })]),
      h('span', { class: 'grow-eff' }, ['']),
    ]),
    h('p', { class: 'muted' }, [t('store.catHint')]),
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
