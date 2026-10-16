import { drawChar, drawProductSmall, drawSprite, drawText, textWidth } from '../core/assets';
import { BREADS, FIXTURES, PRODUCT_BY_ID, type FixtureKind } from '../game/defs';
import { fixtureCells, type Layout } from '../game/layout';
import { weatherOf } from '../game/calendar';
import { equipTier, stars, type EquipKind } from '../game/growth';
import { OFFER_SECONDS, OVEN_OFFER_SECONDS, type Customer, type Line, type Sim, type Worker } from '../game/sim';
import type { FixtureState } from '../game/state';

export const T = 32;

export type HitAction =
  | { type: 'line'; line: Line }
  | { type: 'oven' }
  | { type: 'slot'; fixture: number; slot: number }
  | { type: 'fixture'; fixture: number }
  | { type: 'cell'; x: number; y: number }
  | { type: 'customer'; customer: Customer }
  | { type: 'cat' };

export interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  action: HitAction;
}

export interface Prompt {
  key: string;
  label: string;
  wx: number;
  wy: number;
  /** remaining share of the manual window, 0 when staff already took over */
  ratio: number;
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
  prompts: Prompt[] = [];
  time = 0;
  doorOpen = 0;

  drawFloor(ctx: CanvasRenderingContext2D, l: Layout, sim?: Sim): void {
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
    if (bakery) drawSprite(ctx, sim ? this.equipSprite(sim, 'oven') : 'oven', bakery.x * T, 16 - 72);
    for (let y = -2; y <= l.h; y++) {
      drawSprite(ctx, 'wallL', -T, y * T);
      drawSprite(ctx, 'wallR', l.w * T, y * T);
    }
    for (let x = -1; x <= l.w; x++) {
      if (x === l.entrance || x === l.entrance + 1) continue;
      drawSprite(ctx, 'wallcap', x * T, l.h * T);
    }
    drawSprite(ctx, 'mat', l.entrance * T, (l.h - 1) * T);
    this.drawDoor(ctx, l);
    if (sim) this.drawSign(ctx, sim);
  }

  private equipSprite(sim: Sim, kind: EquipKind): string {
    const tier = equipTier(sim.state.equipment[kind].level);
    return tier ? `${kind}_t${tier}` : kind;
  }

  /** Reputation sign beside the entrance: up to five stars and the level. */
  private drawSign(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const l = sim.layout;
    const x = (l.entrance - 2) * T + 10;
    const y = l.h * T + 6;
    drawSprite(ctx, 'sign', x, y);
    const n = stars(sim.state.reputation.level);
    for (let i = 0; i < 5; i++) drawSprite(ctx, i < n ? 'star_on' : 'star_off', x + 4 + i * 8, y + 3);
    const lv = `Lv${sim.state.reputation.level}`;
    drawText(ctx, lv, x + 24 - textWidth(lv) / 2, y + 11, '#f0e0a0');
  }

  /** Rain or snow falls over the sidewalk; the whole scene gets a light weather tint. */
  private drawWeather(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const w = weatherOf(sim.state.seed, sim.state.day);
    const l = sim.layout;
    const x0 = -T;
    const x1 = (l.w + 1) * T;
    const y0 = (l.h + 1) * T;
    const y1 = (l.h + 3) * T;
    if (w === 'rain' || w === 'snow') {
      const n = Math.round((x1 - x0) / 6);
      ctx.fillStyle = w === 'rain' ? 'rgba(170, 200, 230, 0.75)' : 'rgba(255, 255, 255, 0.9)';
      for (let i = 0; i < n; i++) {
        const speed = w === 'rain' ? 70 : 14;
        const hgt = y1 - y0;
        const px = x0 + ((i * 53.7 + (w === 'snow' ? Math.sin(this.time + i) * 6 : this.time * 18)) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
        const py = y0 + ((i * 31.3 + this.time * speed) % hgt);
        if (w === 'rain') ctx.fillRect(Math.round(px), Math.round(py), 1, 4);
        else ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
      }
    }
    const tint: Record<string, string> = {
      rain: 'rgba(40, 55, 90, 0.10)', snow: 'rgba(210, 225, 255, 0.07)', cloudy: 'rgba(60, 70, 90, 0.05)', hot: 'rgba(255, 170, 60, 0.05)',
    };
    if (tint[w]) {
      ctx.fillStyle = tint[w];
      ctx.fillRect(x0, -3 * T, x1 - x0, (l.h + 6) * T);
    }
  }

  private drawCat(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const c = sim.cat;
    const px = Math.round(c.mover.x * T) + 4;
    const py = Math.round(c.mover.y * T) + 12;
    const frame = c.mode === 'sleep' ? 'cat_sleep' : c.mode === 'sit' ? 'cat_sit' : Math.floor(this.time * 6) % 2 ? 'cat_walk1' : 'cat_walk2';
    drawSprite(ctx, 'shadow', px, py + 12);
    drawSprite(ctx, frame, px, py, c.mover.dir === 'left');
    this.hits.push({ x: px - 4, y: py - 6, w: 32, h: 28, action: { type: 'cat' } });
    if (c.bubble) this.bubble(ctx, c.bubble.icon, c.mover.x, c.mover.y + 0.6, false);
  }

  /** Automatic sliding doors: two panels slide into the walls, clipped to the opening. */
  private drawDoor(ctx: CanvasRenderingContext2D, l: Layout): void {
    const x = l.entrance * T;
    const y = l.h * T;
    drawSprite(ctx, 'floor0', x, y);
    drawSprite(ctx, 'floor1', x + T, y);
    const slide = Math.round(this.doorOpen * 28);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, y + 2, 58, 28);
    ctx.clip();
    drawSprite(ctx, 'door_panel', x + 2 - slide, y + 3);
    drawSprite(ctx, 'door_panel', x + 32 + slide, y + 3);
    ctx.restore();
    drawSprite(ctx, 'entrance_frame', x, y);
  }

  private updateDoor(sim: Sim, dt: number): void {
    const l = sim.layout;
    const cx = l.entrance + 0.5;
    const near = (m: { x: number; y: number }) => Math.abs(m.x - cx) < 1.6 && m.y > l.h - 2.2 && m.y < l.h + 1.8;
    const want = sim.customers.some((c) => near(c.mover)) || sim.workers.some((w) => near(w.mover)) ? 1 : 0;
    // ease at a fixed real-time rate; dt is 0 while paused so the doors freeze too
    const step = dt * 3.5;
    this.doorOpen = want ? Math.min(1, this.doorOpen + step) : Math.max(0, this.doorOpen - step * 0.7);
  }

  draw(ctx: CanvasRenderingContext2D, sim: Sim, dt: number, build: BuildView | null): void {
    this.time += dt;
    this.hits = [];
    this.prompts = [];
    this.updateDoor(sim, dt);
    const l = sim.layout;
    this.drawFloor(ctx, l, sim);
    if (build) this.drawReserved(ctx, l);
    const list: Drawable[] = [];
    for (const f of sim.placed()) {
      const bottom = f.vertical ? f.y + 1 : f.y;
      list.push({ y: bottom + 0.5, draw: () => this.drawFixture(ctx, f, build?.selected === f.id) });
    }
    for (const r of l.registers) list.push({ y: r.y + 0.5, draw: () => drawSprite(ctx, this.equipSprite(sim, 'register'), r.x * T, (r.y + 1) * T - 56) });
    for (const s of l.stations) {
      if (s.kind === 'bakery') list.push({ y: s.y + 0.5, draw: () => this.drawBreadCase(ctx, sim, s.x, s.y) });
      else list.push({ y: s.y + 0.5, draw: () => drawSprite(ctx, this.equipSprite(sim, s.kind as EquipKind), s.x * T, (s.y + 1) * T - 56) });
    }
    if (l.bagging) {
      const b = l.bagging;
      list.push({ y: b.y + 0.5, draw: () => drawSprite(ctx, this.equipSprite(sim, 'bagging'), b.x * T, (b.y + 1) * T - 56) });
    }
    list.push({ y: l.h - 1.4, draw: () => drawSprite(ctx, 'plant', (l.w - 1) * T, (l.h - 1) * T - 16) });
    for (const w of sim.workers) list.push({ y: w.mover.y, draw: () => this.drawWorker(ctx, w) });
    list.push({ y: sim.cat.mover.y + 0.2, draw: () => this.drawCat(ctx, sim) });
    for (const c of sim.customers) list.push({ y: c.mover.y, draw: () => this.drawCustomer(ctx, c) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    this.drawWeather(ctx, sim);
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
      const spots = this.slotSpots(f, i);
      // Front spots are listed last and fill first, so the back empties as stock runs down.
      const shown = s.stock <= 0 ? 0 : Math.max(1, Math.ceil((s.stock / cap) * spots.length));
      const clip = this.slotClip(f, i, top);
      if (clip) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(px + clip[0], clip[1], clip[2], clip[3]);
        ctx.clip();
      }
      for (const [dx, dy] of spots.slice(spots.length - shown)) drawProductSmall(ctx, p.index, px + dx, top + dy);
      if (clip) ctx.restore();
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

  /** Small-icon positions for one slot, relative to the sprite's left and top, ordered back to front. */
  private slotSpots(f: FixtureState, i: number): [number, number][] {
    const row = (x0: number, y: number, step = 7, n = 3): [number, number][] => Array.from({ length: n }, (_, k) => [x0 + k * step, y]);
    if (!f.vertical) {
      const x0 = i * T;
      switch (f.kind) {
        case 'shelf':
          return [...row(x0 + 1, 11), ...row(x0 + 1, 31)];
        case 'fridge':
          return [...row(x0 + 2, 22), ...row(x0 + 2, 48)];
        case 'freezer':
          return [...row(x0 + 2, 3), ...row(x0 + 4, 11)];
        case 'produce':
          return [...row(x0 + 1, 4), ...row(x0 + 4, 11, 8, 2), ...row(x0 + 8, 16, 8, 1)];
      }
    }
    switch (f.kind) {
      case 'shelf': {
        const y0 = 2 + i * 38;
        return [...row(1, y0, 14, 2), ...row(1, y0 + 9, 14, 2), ...row(1, y0 + 18, 14, 2)];
      }
      case 'produce': {
        const y0 = 16 + i * 32;
        return [...row(1, y0, 14, 2), ...row(1, y0 + 6, 14, 2), ...row(8, y0 + 11, 14, 1)];
      }
      case 'fridge': {
        const y0 = 7 + i * 46;
        return [[12, y0], [10, y0 + 13], [12, y0 + 26]];
      }
      case 'freezer': {
        const y0 = 3 + i * 30;
        return [...row(3, y0, 10, 2), ...row(5, y0 + 10, 10, 2)];
      }
    }
  }

  private slotClip(f: FixtureState, i: number, top: number): [number, number, number, number] | null {
    if (f.kind !== 'freezer') return null;
    return f.vertical ? [3, top + 3 + i * 30, 26, 29] : [3 + i * 29, top + 3, 28, 24];
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
    drawChar(ctx, w.row, w.mover.dir, w.mover.frame(), px, py, w.bubble?.icon === 'b_heart' ? 'happy' : null);
    if (w.carrying) drawSprite(ctx, 'carton', px + 6, py + 22);
    if (w.bubble) this.bubble(ctx, w.bubble.icon, w.mover.x, w.mover.y, false);
  }

  private drawCustomer(ctx: CanvasRenderingContext2D, c: Customer): void {
    const [px, py] = this.charPos(c.mover.x, c.mover.y);
    drawSprite(ctx, 'shadow', px + 4, py + 42);
    const dir = c.mover.dir;
    const showBasket = c.basket.length > 0 && c.state !== 'leave';
    if (showBasket && dir === 'up') drawSprite(ctx, 'basket', px + 16, py + 26);
    const icon = c.bubble?.icon;
    const tired = c.state === 'queue' && c.wait > 8 * c.npc.patience;
    const expr = icon === 'b_heart' ? 'happy' : icon === 'b_sad' || icon === 'b_wait' || icon === 'b_empty' || tired ? 'sad' : null;
    drawChar(ctx, c.row, dir, c.mover.frame(), px, py, expr);
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
      if (!icon) continue;
      const action: HitAction = { type: 'line', line };
      this.bubble(ctx, icon, c.mover.x, c.mover.y, true, action);
      const label = line.kind === 'register' ? 'register' : line.kind === 'bagging' ? 'bagging' : line.station!;
      this.prompts.push({
        key: `${line.kind}${line.index}${line.station ?? ''}`, label,
        wx: c.mover.x * T + 16, wy: c.mover.y * T - 42,
        ratio: line.offerFor === c ? line.offer / sim.offerSeconds(OFFER_SECONDS) : 0, action,
      });
    }
    const o = sim.oven;
    const bakery = sim.stationSpot('bakery');
    if (bakery && (o.phase === 'baking' || o.phase === 'ready')) {
      const urgent = o.phase === 'ready';
      this.bubble(ctx, 'b_bread', bakery.x + 0.5, -1.2, true, { type: 'oven' });
      this.prompts.push({
        key: 'oven', label: 'oven', wx: (bakery.x + 0.5) * T + 16, wy: -1.2 * T - 42,
        ratio: urgent ? sim.ovenOffer / sim.offerSeconds(OVEN_OFFER_SECONDS) : 0, action: { type: 'oven' },
      });
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
