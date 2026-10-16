import { drawProduct, drawSprite } from '../core/assets';
import { t } from '../i18n';
import { PRODUCT_BY_ID, type ProductDef } from '../game/defs';
import { h } from '../ui/dom';
import { accuracyLabel, inRect, MiniGame, panel } from './base';

const CELL = 32;
const COLS = 4;
const ROWS = 4;
const WEIGHT_COLOR = ['#e8a0b0', '#a8d0e8', '#c8d8a0', '#d8a070'];

interface Item {
  p: ProductDef;
  w: number;
  h: number;
  weight: number;
  cold: boolean;
  bag: 0 | 1 | null;
  cx: number;
  cy: number;
  x: number;
  y: number;
}

export function bagItems(ids: string[]): Item[] {
  const items: Item[] = [];
  let area = 0;
  for (const id of ids) {
    const p = PRODUCT_BY_ID.get(id);
    if (!p) continue;
    const [w, h, weight] = p.bag;
    if (area + w * h > 26 || items.length >= 12) break;
    area += w * h;
    items.push({ p, w, h, weight, cold: p.store === 'fridge' || p.store === 'freezer', bag: null, cx: 0, cy: 0, x: 0, y: 0 });
  }
  return items;
}

export class BaggingGame extends MiniGame {
  private items: Item[];
  private bags = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  private belt = { x: 0, y: 0, w: 0, h: 0 };
  private drag: { it: Item; dx: number; dy: number } | null = null;

  constructor(ids: string[]) {
    super('bag.title', 'bag.hint');
    this.items = bagItems(ids);
    this.button('bag.done', () => this.done());
    const keys = ['bag.fragile', 'bag.light', 'bag.normal', 'bag.heavy'] as const;
    this.head.append(h('div', { class: 'legend' }, [
      ...keys.map((k, i) => h('span', {}, [h('i', { style: { background: WEIGHT_COLOR[i] } }), t(k)])),
      h('span', {}, [h('i', { style: { background: '#8ad0f0' } }), t('bag.coldMark')]),
    ]));
  }

  protected minW(): number {
    return 290;
  }

  protected minH(): number {
    return 260;
  }

  protected layout(): void {
    const { vw, vh } = this;
    const bagsW = 136 * 2 + 10;
    const bx = Math.floor((vw - bagsW) / 2);
    const by = vh - 150;
    this.bags = [{ x: bx, y: by }, { x: bx + 146, y: by }];
    this.belt = { x: 4, y: 4, w: vw - 8, h: by - 12 };
    this.arrangeBelt();
  }

  private arrangeBelt(): void {
    let x = this.belt.x + 6;
    let y = this.belt.y + 6;
    let rowH = 0;
    for (const it of this.items) {
      if (it.bag !== null || it === this.drag?.it) continue;
      const w = it.w * CELL;
      if (x + w > this.belt.x + this.belt.w - 4) {
        x = this.belt.x + 6;
        y += rowH + 4;
        rowH = 0;
      }
      it.x = x;
      it.y = y;
      x += w + 6;
      rowH = Math.max(rowH, it.h * CELL);
    }
  }

  private gridOrigin(b: number): { x: number; y: number } {
    return { x: this.bags[b].x + 4, y: this.bags[b].y + 14 };
  }

  private occupied(b: number, skip?: Item): boolean[][] {
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (const it of this.items) {
      if (it.bag !== b || it === skip) continue;
      for (let dy = 0; dy < it.h; dy++) for (let dx = 0; dx < it.w; dx++) g[it.cy + dy][it.cx + dx] = true;
    }
    return g;
  }

  /** Items settle to the lowest free row in the chosen column, like objects dropped into a bag. */
  private drop(it: Item, b: 0 | 1, col: number): boolean {
    col = Math.max(0, Math.min(COLS - it.w, col));
    const g = this.occupied(b, it);
    let best = -1;
    for (let row = 0; row <= ROWS - it.h; row++) {
      let fits = true;
      for (let dy = 0; dy < it.h && fits; dy++) for (let dx = 0; dx < it.w; dx++) if (g[row + dy][col + dx]) fits = false;
      if (!fits) break;
      best = row;
    }
    if (best < 0) return false;
    it.bag = b;
    it.cx = col;
    it.cy = best;
    this.place(it);
    return true;
  }

  private place(it: Item): void {
    const o = this.gridOrigin(it.bag!);
    it.x = o.x + it.cx * CELL;
    it.y = o.y + it.cy * CELL;
  }

  private hasOnTop(it: Item): boolean {
    if (it.bag === null) return false;
    return this.items.some((o) => o !== it && o.bag === it.bag && o.cy + o.h === it.cy && o.cx < it.cx + it.w && it.cx < o.cx + o.w);
  }

  private violations(): { crushed: number; warm: number } {
    let crushed = 0;
    let warm = 0;
    for (const it of this.items) {
      if (it.cold && it.bag === 0) warm += 1;
      for (const o of this.items) {
        if (o === it || o.bag !== it.bag || o.bag === null) continue;
        const above = o.cy + o.h === it.cy && o.cx < it.cx + it.w && it.cx < o.cx + o.w;
        if (above && o.weight - it.weight >= 2) crushed += 1;
      }
    }
    return { crushed, warm };
  }

  private done(): void {
    if (this.items.some((it) => it.bag === null)) {
      this.say(t('bag.left'), 'bad');
      return;
    }
    const v = this.violations();
    const n = v.crushed + v.warm;
    if (v.crushed) this.say(t('bag.crushed'), 'bad');
    else if (v.warm) this.say(t('bag.warm'), 'bad');
    const accuracy = n === 0 ? 1 : n === 1 ? 0.6 : 0.3;
    this.finish({ accuracy, seconds: this.elapsed, manual: true, amount: this.items.length }, accuracyLabel(accuracy));
  }

  protected pointerDown(x: number, y: number): void {
    if (this.ended) return;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (inRect(x, y, { x: it.x, y: it.y, w: it.w * CELL, h: it.h * CELL }) && !this.hasOnTop(it)) {
        this.drag = { it, dx: x - it.x, dy: y - it.y };
        this.items.splice(i, 1);
        this.items.push(it);
        return;
      }
    }
  }

  protected pointerMove(x: number, y: number): void {
    if (!this.drag) return;
    this.drag.it.x = Math.round(x - this.drag.dx);
    this.drag.it.y = Math.round(y - this.drag.dy);
  }

  protected pointerUp(x: number): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const it = d.it;
    const cxMid = it.x + (it.w * CELL) / 2;
    const cyMid = it.y + (it.h * CELL) / 2;
    for (const b of [0, 1] as const) {
      const bag = this.bags[b];
      if (inRect(cxMid, cyMid, { x: bag.x - 8, y: bag.y - 40, w: 152, h: 190 })) {
        const o = this.gridOrigin(b);
        const col = Math.round((it.x - o.x) / CELL);
        const prev = { bag: it.bag, cx: it.cx, cy: it.cy };
        if (this.drop(it, b, col)) {
          this.settle();
          return;
        }
        Object.assign(it, prev);
      }
    }
    void x;
    it.bag = null;
    this.settle();
  }

  /** After removing an item, everything above it falls down. */
  private settle(): void {
    for (const b of [0, 1] as const) {
      let moved = true;
      while (moved) {
        moved = false;
        const inBag = this.items.filter((it) => it.bag === b).sort((a, c) => c.cy - a.cy);
        for (const it of inBag) {
          const g = this.occupied(b, it);
          const below = it.cy + it.h;
          if (below >= ROWS) continue;
          let free = true;
          for (let dx = 0; dx < it.w; dx++) if (g[below][it.cx + dx]) free = false;
          if (free) {
            it.cy += 1;
            moved = true;
          }
        }
      }
      for (const it of this.items) if (it.bag === b) this.place(it);
    }
    this.arrangeBelt();
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#34383e';
    ctx.fillRect(0, 0, vw, vh);
    const b = this.belt;
    panel(ctx, b.x, b.y, b.w, b.h, '#2a2a30', '#141418');
    ctx.fillStyle = '#3a3a44';
    for (let x = b.x + 2; x < b.x + b.w; x += 12) ctx.fillRect(x, b.y + 1, 2, b.h - 2);
    drawSprite(ctx, 'bag_paper', this.bags[0].x, this.bags[0].y);
    drawSprite(ctx, 'bag_cold', this.bags[1].x, this.bags[1].y);
    for (const it of this.items) {
      const w = it.w * CELL;
      const hh = it.h * CELL;
      ctx.fillStyle = WEIGHT_COLOR[it.weight];
      ctx.globalAlpha = 0.35;
      ctx.fillRect(it.x + 1, it.y + 1, w - 2, hh - 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = WEIGHT_COLOR[it.weight];
      ctx.fillRect(it.x + 1, it.y + hh - 3, w - 2, 2);
      drawProduct(ctx, it.p.index, it.x + (w - 32) / 2, it.y + (hh - 32) / 2);
      if (it.cold) {
        ctx.fillStyle = '#8ad0f0';
        ctx.fillRect(it.x + 2, it.y + 2, 3, 3);
      }
    }
  }
}
