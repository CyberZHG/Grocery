import { drawChar, drawProduct, drawSprite, drawText, textWidth } from '../core/assets';
import { BREADS, FIXTURES, PRODUCT_BY_ID, type FixtureKind } from '../game/defs';
import { fixtureCells, type Layout } from '../game/layout';
import type { Customer, Line, Sim, Worker } from '../game/sim';
import type { FixtureState } from '../game/state';

export const T = 32;

export type HitAction =
  | { type: 'line'; line: Line }
  | { type: 'oven' }
  | { type: 'slot'; fixture: number; slot: number }
  | { type: 'fixture'; fixture: number }
  | { type: 'cell'; x: number; y: number }
  | { type: 'customer'; customer: Customer };

export interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  action: HitAction;
}

export interface BuildView {
  selected: number | null;
  ghost: { kind: FixtureKind; x: number; y: number; vertical: boolean; ok: boolean } | null;
}

interface Drawable {
  y: number;
  draw: () => void;
}

const FIX_H: Record<FixtureKind, [number, number]> = {
  shelf: [56, 88],
  produce: [56, 88],
  fridge: [72, 104],
  freezer: [48, 80],
};

export function worldBounds(l: Layout): { x: number; y: number; w: number; h: number } {
  return { x: -T, y: -2 * T - 8, w: (l.w + 2) * T, h: (l.h + 4) * T + 8 };
}

export class WorldRenderer {
  hits: Hit[] = [];
  time = 0;

  drawFloor(ctx: CanvasRenderingContext2D, l: Layout): void {
    for (let x = -1; x <= l.w; x++) {
      drawSprite(ctx, 'sidewalk', x * T, (l.h + 1) * T);
      drawSprite(ctx, 'sidewalk', x * T, (l.h + 2) * T);
    }
    for (let y = 0; y < l.h; y++) {
      for (let x = 0; x < l.w; x++) drawSprite(ctx, (x + y) % 2 ? 'floor1' : 'floor0', x * T, y * T);
    }
    const bakery = l.stations.find((s) => s.kind === 'bakery');
    for (let x = 0; x < l.w; x++) {
      let name = 'wall0';
      if (x % 5 === 3) name = 'wall1';
      else if (x % 7 === 5) name = 'wall2';
      else if (x === l.w - 1) name = 'wall3';
      if (x === l.stockDoor.x) name = 'door_stock';
      drawSprite(ctx, name, x * T, -2 * T);
    }
    if (bakery) drawSprite(ctx, 'oven', bakery.x * T, 16 - 72);
    for (let y = -2; y <= l.h; y++) {
      drawSprite(ctx, 'wallL', -T, y * T);
      drawSprite(ctx, 'wallR', l.w * T, y * T);
    }
    for (let x = -1; x <= l.w; x++) {
      if (x === l.entrance || x === l.entrance + 1) continue;
      drawSprite(ctx, 'wallcap', x * T, l.h * T);
    }
    drawSprite(ctx, 'mat', l.entrance * T, (l.h - 1) * T);
    drawSprite(ctx, 'entrance', l.entrance * T, l.h * T);
  }

  draw(ctx: CanvasRenderingContext2D, sim: Sim, dt: number, build: BuildView | null): void {
    this.time += dt;
    this.hits = [];
    const l = sim.layout;
    this.drawFloor(ctx, l);
    if (build) this.drawReserved(ctx, l);
    const list: Drawable[] = [];
    for (const f of sim.placed()) {
      const bottom = f.vertical ? f.y + 1 : f.y;
      list.push({ y: bottom + 0.5, draw: () => this.drawFixture(ctx, f, build?.selected === f.id) });
    }
    for (const r of l.registers) list.push({ y: r.y + 0.5, draw: () => drawSprite(ctx, 'register', r.x * T, (r.y + 1) * T - 56) });
    for (const s of l.stations) {
      if (s.kind === 'bakery') list.push({ y: s.y + 0.5, draw: () => this.drawBreadCase(ctx, sim, s.x, s.y) });
      else list.push({ y: s.y + 0.5, draw: () => drawSprite(ctx, s.kind, s.x * T, (s.y + 1) * T - 56) });
    }
    if (l.bagging) {
      const b = l.bagging;
      list.push({ y: b.y + 0.5, draw: () => drawSprite(ctx, 'bagging', b.x * T, (b.y + 1) * T - 56) });
    }
    list.push({ y: l.h - 1.4, draw: () => drawSprite(ctx, 'plant', (l.w - 1) * T, (l.h - 1) * T - 16) });
    for (const w of sim.workers) list.push({ y: w.mover.y, draw: () => this.drawWorker(ctx, w) });
    for (const c of sim.customers) list.push({ y: c.mover.y, draw: () => this.drawCustomer(ctx, c) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    if (build?.ghost) this.drawGhost(ctx, build.ghost);
    if (!build) this.drawPrompts(ctx, sim);
    for (const c of sim.customers) if (c.bubble && c.state !== 'queue') this.bubble(ctx, c.bubble.icon, c.mover.x, c.mover.y, false);
    for (const f of sim.floaters) {
      const tw = textWidth(f.text);
      drawText(ctx, f.text, f.x * T + 16 - tw / 2 + 1, f.y * T - 30 - f.t * 6 + 1, '#1a1420');
      drawText(ctx, f.text, f.x * T + 16 - tw / 2, f.y * T - 30 - f.t * 6, f.color);
    }
  }

  private drawReserved(ctx: CanvasRenderingContext2D, l: Layout): void {
    ctx.fillStyle = 'rgba(200, 70, 70, 0.16)';
    for (let y = 0; y < l.h; y++) {
      for (let x = 0; x < l.w; x++) if (l.reserved[y * l.w + x]) ctx.fillRect(x * T, y * T, T, T);
    }
    ctx.strokeStyle = 'rgba(60, 50, 70, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= l.w; x++) {
      ctx.moveTo(x * T + 0.5, 0);
      ctx.lineTo(x * T + 0.5, l.h * T);
    }
    for (let y = 0; y <= l.h; y++) {
      ctx.moveTo(0, y * T + 0.5);
      ctx.lineTo(l.w * T, y * T + 0.5);
    }
    ctx.stroke();
  }

  private spriteName(kind: FixtureKind, vertical: boolean): string {
    return `${kind}_${vertical ? 'v' : 'h'}`;
  }

  drawFixture(ctx: CanvasRenderingContext2D, f: FixtureState, selected: boolean, alpha = 1): void {
    const [hh, hv] = FIX_H[f.kind];
    const sh = f.vertical ? hv : hh;
    const px = f.x * T;
    const top = (f.y + (f.vertical ? 2 : 1)) * T - sh;
    ctx.globalAlpha = alpha;
    drawSprite(ctx, this.spriteName(f.kind, f.vertical), px, top);
    const cap = FIXTURES[f.kind].capacity;
    f.slots.forEach((s, i) => {
      if (!s.product) return;
      const p = PRODUCT_BY_ID.get(s.product)!;
      const pos = this.productPos(f, i, top);
      const full = s.stock > cap / 2;
      if (f.kind === 'freezer') {
        ctx.save();
        const [cx, cy, cw, ch] = f.vertical ? [px + 3, top + 3 + i * 30, 26, 29] : [px + 3 + i * 29, top + 3, 28, 24];
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();
      }
      if (s.stock > 0) {
        if (full && pos.back) drawProduct(ctx, p.index, pos.back[0], pos.back[1]);
        drawProduct(ctx, p.index, pos.x, pos.y);
      }
      if (f.kind === 'freezer') ctx.restore();
      const ratio = s.stock / cap;
      const bx = f.vertical ? px + 26 : px + i * T + 6;
      const by = f.vertical ? top + sh - 64 + i * T + 4 : top + sh - 4;
      if (f.vertical) {
        ctx.fillStyle = '#2a2430';
        ctx.fillRect(bx, by, 3, 22);
        ctx.fillStyle = ratio > 0.4 ? '#7ad070' : ratio > 0 ? '#f0c040' : '#e05050';
        const hgt = Math.max(1, Math.round(20 * ratio));
        ctx.fillRect(bx + 1, by + 21 - hgt, 1, hgt);
      } else {
        ctx.fillStyle = '#2a2430';
        ctx.fillRect(bx, by, 20, 3);
        ctx.fillStyle = ratio > 0.4 ? '#7ad070' : ratio > 0 ? '#f0c040' : '#e05050';
        ctx.fillRect(bx + 1, by + 1, Math.max(1, Math.round(18 * ratio)), 1);
      }
    });
    if (f.kind === 'fridge' || f.kind === 'freezer') drawSprite(ctx, `${f.kind}_glass_${f.vertical ? 'v' : 'h'}`, px, top);
    ctx.globalAlpha = 1;
    if (selected) {
      for (const c of fixtureCells(f)) drawSprite(ctx, 'select', c.x * T, c.y * T);
    }
    for (let i = 0; i < 2; i++) {
      const c = fixtureCells(f)[i];
      this.hits.push({ x: c.x * T, y: c.y * T - (f.vertical ? 0 : sh - T), w: T, h: f.vertical ? T : sh, action: { type: 'slot', fixture: f.id, slot: i } });
    }
  }

  private productPos(f: FixtureState, i: number, top: number): { x: number; y: number; back?: [number, number] } {
    const px = f.x * T;
    if (!f.vertical) {
      const x = px + i * T;
      switch (f.kind) {
        case 'shelf':
          return { x, y: top + 16, back: [x, top - 4] };
        case 'produce':
          return { x: x + 1, y: top + 2, back: [x - 3, top - 4] };
        case 'fridge':
          return { x, y: top + 33, back: [x, top + 7] };
        case 'freezer':
          return { x, y: top + 2, back: [x - 4, top - 2] };
      }
    }
    switch (f.kind) {
      case 'shelf':
        return { x: px, y: top + 10 + i * 36, back: [px - 2, top + 4 + i * 36] };
      case 'produce':
        return { x: px + 1, y: top + 16 + i * 32, back: [px - 2, top + 11 + i * 32] };
      case 'fridge':
        return { x: px + 3, y: top + 18 + i * 46, back: [px + 3, top + 6 + i * 46] };
      case 'freezer':
        return { x: px, y: top + 2 + i * 30, back: [px - 3, top + i * 30] };
    }
  }

  private drawBreadCase(ctx: CanvasRenderingContext2D, sim: Sim, x: number, y: number): void {
    const px = x * T;
    const top = (y + 1) * T - 56;
    drawSprite(ctx, 'bread_case', px, top);
    const bk = sim.state.bakery;
    BREADS.forEach((b, i) => {
      const n = bk[b].good + bk[b].golden;
      if (n <= 0) return;
      const q = bk[b].golden > 0 ? 'golden' : 'good';
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 2, top, 60, 22);
      ctx.clip();
      ctx.translate(px + 4 + (i % 2) * 30, top + (i < 2 ? -8 : 3));
      ctx.scale(0.66, 0.66);
      drawSprite(ctx, `bread_${b}_${q}`, 0, 0);
      ctx.restore();
    });
  }

  private drawGhost(ctx: CanvasRenderingContext2D, g: NonNullable<BuildView['ghost']>): void {
    const f: FixtureState = {
      id: -1, kind: g.kind, x: g.x, y: g.y, vertical: g.vertical, placed: true,
      slots: [{ product: null, stock: 0 }, { product: null, stock: 0 }],
    };
    this.drawFixture(ctx, f, false, 0.6);
    ctx.fillStyle = g.ok ? 'rgba(80, 200, 110, 0.35)' : 'rgba(220, 70, 70, 0.45)';
    for (const c of fixtureCells(f)) ctx.fillRect(c.x * T, c.y * T, T, T);
  }

  private charPos(x: number, y: number): [number, number] {
    return [Math.round(x * T), Math.round(y * T) - 18];
  }

  private drawWorker(ctx: CanvasRenderingContext2D, w: Worker): void {
    const [px, py] = this.charPos(w.mover.x, w.mover.y);
    drawSprite(ctx, 'shadow', px + 4, py + 42);
    drawChar(ctx, w.row, w.mover.dir, w.mover.frame(), px, py);
    if (w.carrying) drawSprite(ctx, 'carton', px + 6, py + 22);
    if (w.bubble) this.bubble(ctx, w.bubble.icon, w.mover.x, w.mover.y, false);
  }

  private drawCustomer(ctx: CanvasRenderingContext2D, c: Customer): void {
    const [px, py] = this.charPos(c.mover.x, c.mover.y);
    drawSprite(ctx, 'shadow', px + 4, py + 42);
    const dir = c.mover.dir;
    const showBasket = c.basket.length > 0 && c.state !== 'leave';
    if (showBasket && dir === 'up') drawSprite(ctx, 'basket', px + 16, py + 26);
    drawChar(ctx, c.row, dir, c.mover.frame(), px, py);
    this.hits.push({ x: px + 6, y: py + 4, w: 20, h: 40, action: { type: 'customer', customer: c } });
    if (showBasket && dir !== 'up') drawSprite(ctx, 'basket', dir === 'left' ? px + 2 : px + 14, py + 28);
    if (c.state === 'leave' && c.basket.length) drawSprite(ctx, 'carton', dir === 'left' ? px + 2 : px + 12, py + 24);
  }

  bubble(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, pulse: boolean, action?: HitAction): void {
    const [px, py] = this.charPos(x, y);
    const bob = pulse ? Math.round(Math.sin(this.time * 6) * 2) : 0;
    const bx = px + 4;
    const by = py - 22 + bob;
    if (pulse) {
      const a = 0.35 + 0.25 * Math.sin(this.time * 6);
      ctx.fillStyle = `rgba(255, 220, 90, ${a})`;
      ctx.fillRect(bx - 3, by - 3, 30, 26);
    }
    drawSprite(ctx, icon, bx, by);
    if (action) this.hits.push({ x: bx - 6, y: by - 6, w: 36, h: 36, action });
  }

  private drawPrompts(ctx: CanvasRenderingContext2D, sim: Sim): void {
    for (const line of sim.allLines()) {
      const c = line.front();
      if (!c) continue;
      let icon: string | null = null;
      if (line.kind === 'register' && c.cash) icon = 'b_cash';
      else if (line.kind === 'bagging') icon = 'b_bag';
      else if (line.kind === 'station' && c.order) icon = `b_${c.order.kind}`;
      if (icon) this.bubble(ctx, icon, c.mover.x, c.mover.y, true, { type: 'line', line });
    }
    const o = sim.oven;
    const bakery = sim.stationSpot('bakery');
    if (bakery && (o.phase === 'baking' || o.phase === 'ready')) {
      const urgent = o.phase === 'ready';
      this.bubble(ctx, 'b_bread', bakery.x + 0.5, -1.2, true, { type: 'oven' });
      const pct = o.phase === 'baking' ? Math.min(1, o.t / 18) : 1;
      const bx = bakery.x * T + 8;
      const by = -2 * T - 4;
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(bx, by, 48, 5);
      ctx.fillStyle = urgent ? '#f08030' : '#f0c040';
      ctx.fillRect(bx + 1, by + 1, Math.round(46 * pct), 3);
    }
  }
}
