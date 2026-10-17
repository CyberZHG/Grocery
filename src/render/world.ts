import { drawChar, drawProductSmall, drawSprite, drawText, rect, textWidth } from '../core/assets';
import { storeName } from '../game/names';
import { sfx } from '../core/audio';
import { BREADS, FIXTURES, PRODUCT_BY_ID, type FixtureKind } from '../game/defs';
import { fixtureCells, type Layout } from '../game/layout';
import { dateOf, decorHoliday, weatherOf } from '../game/calendar';
import { equipTier, stars, type EquipKind } from '../game/growth';
import { OFFER_SECONDS, OVEN_OFFER_SECONDS, type Customer, type Line, type Sim, type Worker } from '../game/sim';
import type { FixtureState } from '../game/state';
import type { Dir } from '../game/agent';

export const T = 32;

export type HitAction =
  | { type: 'line'; line: Line }
  | { type: 'oven' }
  | { type: 'slot'; fixture: number; slot: number }
  | { type: 'fixture'; fixture: number }
  | { type: 'cell'; x: number; y: number }
  | { type: 'customer'; customer: Customer }
  | { type: 'cat' }
  | { type: 'spill'; id: number };

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
  /** Fixture being dragged; drawn only as the ghost. */
  hidden?: number | null;
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
  decor: [32, 32],
};

export function worldBounds(l: Layout): { x: number; y: number; w: number; h: number } {
  return { x: -T, y: -2 * T - 8, w: (l.w + 2) * T, h: (l.h + 4) * T + 8 };
}

type RGB = [number, number, number];
/** Light through the day by game minute: [minute, outdoor tint, indoor tint]. Indoors the lights soften the change. */
const LIGHT: [number, RGB, RGB][] = [
  [480, [255, 232, 208], [255, 246, 236]],
  [600, [255, 255, 255], [255, 255, 255]],
  [960, [255, 255, 255], [255, 255, 255]],
  [1080, [255, 196, 150], [255, 240, 224]],
  [1170, [160, 132, 186], [240, 226, 230]],
  [1200, [84, 96, 160], [214, 214, 236]],
];

function lightAt(min: number): { out: RGB; inside: RGB; dark: number } {
  let i = 0;
  while (i < LIGHT.length - 1 && min >= LIGHT[i + 1][0]) i++;
  const [m0, o0, n0] = LIGHT[i];
  const [m1, o1, n1] = LIGHT[Math.min(i + 1, LIGHT.length - 1)];
  const k = m1 > m0 ? Math.min(1, Math.max(0, (min - m0) / (m1 - m0))) : 0;
  const mix = (a: RGB, b: RGB): RGB => [0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * k)) as RGB;
  const out = mix(o0, o1);
  return { out, inside: mix(n0, n1), dark: Math.max(0, 1 - (out[0] + out[1] + out[2]) / 765) * 1.6 };
}

export class WorldRenderer {
  hits: Hit[] = [];
  /** Set by the game; at night the scene uses the after-hours light. */
  night = false;
  /** Fixed game minute for the light, e.g. noon for the share card. */
  lightAt: number | null = null;
  prompts: Prompt[] = [];
  time = 0;
  doorOpen = 0;

  drawFloor(ctx: CanvasRenderingContext2D, l: Layout, sim?: Sim): void {
    for (let x = -1; x <= l.w; x++) {
      drawSprite(ctx, 'sidewalk', x * T, (l.h + 1) * T);
      drawSprite(ctx, 'sidewalk', x * T, (l.h + 2) * T);
    }
    const style = sim?.state.style ?? { floor: 'cream', wall: 'beige', sign: 'wood' };
    for (let y = 0; y < l.h; y++) {
      for (let x = 0; x < l.w; x++) drawSprite(ctx, `f_${style.floor}_${(x + y) % 2}`, x * T, y * T);
    }
    const bakery = l.stations.find((s) => s.kind === 'bakery');
    const season = sim ? dateOf(sim.state.day).season : 'spring';
    for (let x = 0; x < l.w; x++) {
      let name = `wall_${style.wall}_0`;
      if (x % 5 === 3) name = `wall_${style.wall}_1`;
      else if (x % 7 === 5) name = `wall_${style.wall}_p_${season}`;
      else if (x === l.w - 1 || x === 0) name = `wall_${style.wall}_3`;
      if (x === l.stockDoor.x) name = sim && this.stockDoorOpen(sim) ? 'door_stock_open' : 'door_stock';
      drawSprite(ctx, name, x * T, -2 * T);
    }
    if (sim) this.drawWallDecor(ctx, sim);
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

  /** Store sign beside the entrance: name, up to five stars and the reputation level. */
  private drawSign(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const l = sim.layout;
    const x = (l.entrance - 2) * T;
    const y = l.h * T + 6;
    drawSprite(ctx, `sign_${sim.state.style.sign}`, x, y);
    ctx.save();
    ctx.font = "7px 'Grocery Digits', 'Pixelify Sans', 'PingFang SC', 'Noto Sans SC', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = sim.state.style.sign === 'neon' ? '#ffb0d8' : '#f8ecd0';
    ctx.fillText(storeName(sim.state), x + 32, y + 2, 58);
    ctx.restore();
    const n = stars(sim.state.reputation.level);
    for (let i = 0; i < 5; i++) drawSprite(ctx, i < n ? 'star_on' : 'star_off', x + 4 + i * 7, y + 11);
    const lv = `Lv${sim.state.reputation.level}`;
    drawText(ctx, lv, x + 60 - textWidth(lv), y + 11, '#f0e0a0');
  }

  /** Bunting, garlands and wreaths on the back wall around holidays. */
  private drawWallDecor(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const h = decorHoliday(sim.state.day);
    if (!h) return;
    const l = sim.layout;
    const garland = { july4: 'bunting_july4', superbowl: 'bunting_superbowl', newyear: 'bunting_newyear', valentine: 'hearts' }[h as string];
    for (let x = 0; x < l.w; x++) {
      if (garland) drawSprite(ctx, garland, x * T, -2 * T + 9);
      if ((h === 'christmas' || h === 'thanksgiving') && x % 6 === 2 && x !== l.stockDoor.x) drawSprite(ctx, 'wreath', x * T + 6, -2 * T + 16);
    }
  }

  /** Floor decorations for holidays: pumpkins by the door, a tree in the corner. */
  private holidayFloor(sim: Sim, list: Drawable[], ctx: CanvasRenderingContext2D): void {
    const h = decorHoliday(sim.state.day);
    if (!h) return;
    const l = sim.layout;
    const ex = l.entrance;
    const door = (name: string, dx: number) => list.push({ y: l.h - 1.1, draw: () => drawSprite(ctx, name, (ex + dx) * T + 6, (l.h - 1) * T + 14) });
    if (h === 'halloween') {
      door('jack', -1);
      door('jack', 2);
      door('pumpkin', -1.5);
    } else if (h === 'thanksgiving') {
      door('pumpkin', -1);
      door('pumpkin', 2);
    } else if (h === 'superbowl') {
      door('football', 2);
    } else if (h === 'newyear') {
      list.push({ y: l.h - 1.1, draw: () => drawSprite(ctx, 'balloons', (ex - 1) * T + 6, (l.h - 1) * T - 2) });
    } else if (h === 'christmas') {
      const cx = l.mirrored ? l.w - 1 : 0;
      list.push({ y: 0.6, draw: () => {
        drawSprite(ctx, 'xmas_tree', cx * T, -16);
        drawSprite(ctx, 'gift_box', cx * T + 2, 22);
        drawSprite(ctx, 'gift_box', cx * T + 16, 24);
      } });
    }
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
    const pose = c.mode === 'walk' ? (Math.floor(this.time * 6) % 2 ? 'walk1' : 'walk2') : c.mode;
    const frame = `cat_${sim.state.catCoat}_${pose}`;
    drawSprite(ctx, 'shadow', px, py + 12);
    drawSprite(ctx, frame, px, py, c.mover.dir === 'left');
    if (sim.state.catAcc) drawSprite(ctx, `cacc_${sim.state.catAcc}_${pose}`, px, py, c.mover.dir === 'left');
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
    if (want && this.doorOpen === 0 && dt > 0) sfx('door');
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
    for (const sp of sim.spills) {
      const w = sim.workers.find((x) => x.task.type === 'clean' && x.task.spill === sp.id && !x.mover.path.length);
      const k = w && w.task.type === 'clean' ? Math.min(1, w.task.timer * w.speed('clean') / 1.2) : 0;
      ctx.globalAlpha = 1 - 0.75 * k;
      drawSprite(ctx, `spill_${sp.kind}`, sp.x * T + 6, sp.y * T + 14);
      ctx.globalAlpha = 1;
      this.hits.push({ x: sp.x * T, y: sp.y * T + 4, w: T, h: 28, action: { type: 'spill', id: sp.id } });
    }
    const list: Drawable[] = [];
    this.holidayFloor(sim, list, ctx);
    for (const f of sim.placed()) {
      if (build?.hidden === f.id) continue;
      const bottom = f.vertical ? f.y + 1 : f.y;
      list.push({ y: bottom + 0.5, draw: () => this.drawFixture(ctx, f, build?.selected === f.id) });
    }
    l.registers.forEach((r, i) => list.push({ y: r.y + 0.5, draw: () => this.drawRegister(ctx, sim, i) }));
    for (const s of l.stations) {
      if (s.kind === 'bakery') list.push({ y: s.y + 0.5, draw: () => this.drawBreadCase(ctx, sim, s.x, s.y) });
      else list.push({ y: s.y + 0.5, draw: () => drawSprite(ctx, this.equipSprite(sim, s.kind as EquipKind), s.x * T, (s.y + 1) * T - 56) });
    }
    if (l.bagging) {
      const b = l.bagging;
      list.push({ y: b.y + 0.5, draw: () => {
        drawSprite(ctx, this.equipSprite(sim, 'bagging'), b.x * T, (b.y + 1) * T - 56, l.mirrored);
        if (sim.bagging) this.drawBaggingFx(ctx, sim, sim.bagging, b.x * T, (b.y + 1) * T - 56);
      } });
    }
    list.push({ y: l.h - 1.4, draw: () => drawSprite(ctx, 'plant', (l.w - 1) * T, (l.h - 1) * T - 16) });
    for (const p of l.pillars) list.push({ y: p.y + 0.5, draw: () => drawSprite(ctx, 'pillar', p.x * T, (p.y + 1) * T - 72) });
    for (const w of sim.workers) list.push({ y: w.mover.y, draw: () => this.drawWorker(ctx, sim, w) });
    list.push({ y: sim.cat.mover.y + 0.2, draw: () => this.drawCat(ctx, sim) });
    for (const c of sim.customers) list.push({ y: c.mover.y, draw: () => this.drawCustomer(ctx, sim, c) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    if (!this.night && !build) this.drawStationFx(ctx, sim);
    if (!build) this.drawPicks(ctx, sim);
    this.drawLight(ctx, sim);
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

  /** Small idle animations on the counters: oden steam, a blinking espresso light, a slicer glint, the oven glow. */
  private drawStationFx(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const t = this.time;
    for (const id of sim.tidy.keys()) {
      const f = sim.state.fixtures.find((x) => x.id === id);
      if (!f) continue;
      const a = Math.sin(t * 2.2 + id * 1.7);
      if (a <= 0.2) continue;
      const [hh, hv] = FIX_H[f.kind];
      const w = f.vertical ? T : 2 * T;
      const top = (f.y + (f.vertical ? 2 : 1)) * T - (f.vertical ? hv : hh);
      const x = f.x * T + ((id * 13) % (w - 8)) + 4;
      const y = top + 4 + ((id * 7) % 10);
      ctx.fillStyle = `rgba(255, 255, 240, ${a})`;
      ctx.fillRect(x, y - 2, 1, 5);
      ctx.fillRect(x - 2, y, 5, 1);
    }
    for (const s of sim.layout.stations) {
      const px = s.x * T;
      const top = (s.y + 1) * T - 56;
      if (s.kind === 'oden') {
        [11, 25, 38, 51].forEach((cx, i) => {
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.7 + k / 3 + i * 0.27) % 1;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - ph)})`;
            ctx.fillRect(px + cx + Math.round(Math.sin(ph * 6 + i)), Math.round(top + 7 - ph * 16), 1, 2);
          }
        });
      } else if (s.kind === 'coffee') {
        if (Math.floor(t * 1.5) % 2 === 0) {
          ctx.fillStyle = '#b8ffb0';
          ctx.fillRect(px + 29, top + 6, 1, 1);
        }
        const ph = (t * 0.5) % 1;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * (1 - ph)})`;
        ctx.fillRect(px + 54 + Math.round(Math.sin(ph * 5)), Math.round(top + 10 - ph * 10), 1, 2);
      } else if (s.kind === 'deli') {
        const ph = t % 3.5;
        if (ph < 0.4) {
          const a = -Math.PI / 2 + (ph / 0.4) * Math.PI;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(Math.round(px + 44 + Math.cos(a) * 6), Math.round(top + 9 + Math.sin(a) * 6), 2, 1);
        }
      } else if (s.kind === 'bakery' && sim.oven.phase === 'baking') {
        ctx.fillStyle = `rgba(255, 150, 60, ${0.18 + 0.1 * Math.sin(t * 4)})`;
        for (let i = 0; i < 2; i++) ctx.fillRect(px + 8, 16 - 72 + 8 + i * 30 + 4, 48, 18);
      } else if (s.kind === 'bakery' && sim.oven.phase === 'ready') {
        this.puffs(ctx, px + 14, -58, 4, 12, 1.2);
        ctx.fillStyle = `rgba(255, 200, 90, ${0.2 + 0.15 * Math.sin(t * 9)})`;
        for (let i = 0; i < 2; i++) ctx.fillRect(px + 8, 16 - 72 + 8 + i * 30 + 4, 48, 18);
      }
      if (s.kind !== 'bakery') this.drawServingFx(ctx, sim, s.kind, px, top);
    }
  }

  /** Rising steam: n wisps spread over w pixels, starting at (x, y). */
  private puffs(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, rise: number, rate: number, w = 36): void {
    for (let i = 0; i < n; i++) {
      const ph = (this.time * rate + i / n) % 1;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * (1 - ph)})`;
      const sz = ph > 0.5 ? 3 : 2;
      ctx.fillRect(Math.round(x + (i * w) / n + Math.sin(ph * 5 + i) * 2), Math.round(y - ph * rise), sz, sz);
    }
  }

  private serving(line: Line | null | undefined): Customer | null {
    if (!line?.worker || line.progress <= 0) return null;
    return line.front();
  }

  /** Counter work while a staff member serves, and the finished order handed over. */
  private drawServingFx(ctx: CanvasRenderingContext2D, sim: Sim, kind: string, px: number, top: number): void {
    const line = sim.stations.get(kind as never);
    if (!line) return;
    const t = this.time;
    if (this.serving(line)) {
      if (kind === 'coffee') {
        ctx.fillStyle = '#6a3a20';
        const drip = Math.floor(t * 12) % 3;
        ctx.fillRect(px + 15, top + 13 + drip, 1, 2);
        ctx.fillRect(px + 15, top + 19, 1, 1);
        this.puffs(ctx, px + 8, top + 2, 3, 12, 1.4, 16);
        if (Math.floor(t * 10) % 2) {
          ctx.fillStyle = '#ff6060';
          ctx.fillRect(px + 9, top + 5, 1, 1);
        }
      } else if (kind === 'deli') {
        const a = t * 14;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let k = 0; k < 2; k++) ctx.fillRect(Math.round(px + 44 + Math.cos(a + k * Math.PI) * 6), Math.round(top + 9 + Math.sin(a + k * Math.PI) * 6), 2, 1);
        const ph = (t * 2.5) % 1;
        ctx.fillStyle = '#f0a0a8';
        ctx.fillRect(Math.round(px + 50 + ph * 8), Math.round(top + 8 + ph * ph * 4), 3, 1);
      } else if (kind === 'oden') {
        this.puffs(ctx, px + 8, top + 4, 6, 18, 1.1, 48);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        [12, 26, 39, 52].forEach((cx, i) => {
          if (Math.floor(t * 6 + i * 1.7) % 3 === 0) ctx.fillRect(px + cx + ((i * 5 + Math.floor(t * 3)) % 4), top + 6 + (i % 2), 1, 1);
        });
      }
    }
    const since = sim.clock - line.doneAt;
    if (line.doneAt >= 0 && since >= 0 && since < 1.5) {
      const u = since / 1.5;
      const x = px + 28;
      const y = Math.round(top + 4 + u * 18 - Math.sin(u * Math.PI) * 10);
      this.drawOrderItem(ctx, kind, x, y);
    }
  }

  private drawOrderItem(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number): void {
    if (kind === 'coffee') {
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(x - 1, y - 1, 7, 8);
      ctx.fillStyle = '#f4efe6';
      ctx.fillRect(x, y, 5, 6);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x, y, 5, 1);
      ctx.fillStyle = '#c89060';
      ctx.fillRect(x, y + 2, 5, 2);
    } else if (kind === 'deli') {
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(x - 1, y - 1, 9, 6);
      ctx.fillStyle = '#e8a0a0';
      ctx.fillRect(x, y, 7, 4);
      ctx.fillStyle = '#f8f4ec';
      ctx.fillRect(x + 2, y + 1, 3, 2);
    } else {
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(x - 1, y - 1, 9, 6);
      ctx.fillStyle = '#f0e0b0';
      ctx.fillRect(x, y, 7, 2);
      ctx.fillStyle = '#9a5a3a';
      ctx.fillRect(x, y + 2, 7, 2);
    }
  }

  /** Belt items slide past the scanner while staff ring up; the drawer pops open on payment. */
  private drawRegister(ctx: CanvasRenderingContext2D, sim: Sim, i: number): void {
    const l = sim.layout;
    const r = l.registers[i];
    const px = r.x * T;
    const top = (r.y + 1) * T - 56;
    const m = l.mirrored;
    const line = sim.registers[i];
    if (r.card) {
      // taller sprite (sign on a pole), bottom-aligned with the regular counters
      const name = this.equipSprite(sim, 'register').replace('register', 'card_counter');
      drawSprite(ctx, name, px, top + 56 - rect(name)[3], m);
    } else drawSprite(ctx, this.equipSprite(sim, 'register'), px, top, m);
    if (!line) return;
    const X = (lx: number, w = 1) => (m ? px + 64 - lx - w : px + lx);
    const c = this.serving(line);
    if (c && line.duration > 0) {
      const items = c.basket.flatMap((b) => (b.kind === 'product' ? Array<string>(Math.min(b.qty, 3)).fill(b.id) : [])).slice(0, 8);
      const k = Math.min(0.999, line.progress / line.duration);
      if (items.length) {
        const f = k * items.length;
        const n = Math.floor(f);
        const u = f - n;
        const p = PRODUCT_BY_ID.get(items[n])!;
        const [from, len, scan] = r.card ? [15, 12, 14] : [19, 18, 16];
        drawProductSmall(ctx, p.index, X(from - u * len, 16), top + 3 - Math.round(Math.sin(u * Math.PI) * 2));
        if (Math.abs(u - 0.5) < 0.15) {
          ctx.fillStyle = 'rgba(255, 70, 70, 0.9)';
          ctx.fillRect(X(scan), top + 12, 1, 9);
          ctx.fillRect(X(scan - 2, 5), top + 16, 5, 1);
        }
      }
      if (Math.floor(this.time * 6) % 2) {
        ctx.fillStyle = 'rgba(200, 255, 190, 0.9)';
        if (r.card) ctx.fillRect(X(43, 6), top + 9, 6, 1);
        else ctx.fillRect(X(41 + (Math.floor(this.time * 3) % 3) * 5, 4), top + 9, 4, 1);
      }
    }
    const since = sim.clock - line.doneAt;
    if (r.card) {
      // a green tick on the terminal when the card goes through
      if (line.doneAt >= 0 && since >= 0 && since < 1) {
        ctx.fillStyle = '#7ae07a';
        ctx.fillRect(X(42, 9), top + 8, 9, 5);
        ctx.fillStyle = '#ffffff';
        for (const [dx, dy] of [[2, 2], [3, 3], [4, 2], [5, 1], [6, 0]]) ctx.fillRect(X(42 + dx), top + 9 + dy, 1, 1);
      }
      return;
    }
    if (line.doneAt >= 0 && since >= 0 && since < 1.6) {
      const out = Math.min(1, since * 4) * (since > 1.2 ? (1.6 - since) / 0.4 : 1);
      const d = Math.round(out * 4);
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(X(36, 22), top + 22, 22, 2 + d);
      ctx.fillStyle = '#5a5464';
      ctx.fillRect(X(37, 20), top + 22, 20, 1 + d);
      if (d > 1) {
        ctx.fillStyle = '#f0c848';
        for (const cx of [39, 44, 49]) ctx.fillRect(X(cx, 3), top + 22, 3, 1);
        ctx.fillStyle = '#8ed07a';
        ctx.fillRect(X(52, 4), top + 22, 4, 1);
      }
      if (since < 0.8) {
        const a = Math.sin((since / 0.8) * Math.PI);
        ctx.fillStyle = `rgba(255, 240, 170, ${a})`;
        const sy = top + 2 - Math.round(since * 6);
        ctx.fillRect(X(47), sy - 2, 1, 5);
        ctx.fillRect(X(45, 5), sy, 5, 1);
      }
    }
  }

  private drawBaggingFx(ctx: CanvasRenderingContext2D, sim: Sim, line: Line, px: number, top: number): void {
    const c = this.serving(line);
    if (!c) return;
    const m = sim.layout.mirrored;
    const ids = c.basket.filter((b) => b.kind === 'product').map((b) => b.id);
    if (!ids.length) return;
    const ph = (this.time * 2.2) % 1;
    const p = PRODUCT_BY_ID.get(ids[Math.floor(this.time * 2.2) % ids.length])!;
    const lx = 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - 8, top - 24, 80, 24 + 6);
    ctx.clip();
    drawProductSmall(ctx, p.index, m ? px + 64 - lx - 16 : px + lx, Math.round(top - 14 + ph * ph * 18));
    ctx.restore();
  }

  /** Items taken off shelves arc into the shopper's basket. */
  private drawPicks(ctx: CanvasRenderingContext2D, sim: Sim): void {
    for (const c of sim.customers) {
      const pk = c.pick;
      if (!pk) continue;
      const u = (sim.clock - pk.at) / 0.9;
      if (u < 0 || u >= 1) continue;
      const [cx, cy] = this.charPos(c.mover.x, c.mover.y);
      const x0 = pk.x * T + 8;
      const y0 = pk.y * T - 14;
      const x1 = cx + 8;
      const y1 = cy + 22;
      drawProductSmall(ctx, pk.index, Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 10));
    }
  }

  /** Tints the scene for the time of day and adds warm light spilling from the store after dark. */
  private drawLight(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const l = sim.layout;
    const { out, inside, dark } = lightAt(this.night ? 1200 : this.lightAt ?? sim.clock);
    if (dark <= 0 && out[2] >= 255) return;
    const b = worldBounds(l);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${out.join(',')})`;
    ctx.beginPath();
    ctx.rect(b.x, b.y - 8, b.w, b.h + T + 8);
    ctx.rect(0, -2 * T - 8, l.w * T, l.h * T + 2 * T + 8);
    ctx.fill('evenodd');
    ctx.fillStyle = `rgb(${inside.join(',')})`;
    ctx.fillRect(0, -2 * T - 8, l.w * T, l.h * T + 2 * T + 8);
    if (dark > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.min(0.35, dark * 0.4);
      const ex = (l.entrance + 1) * T;
      const ey = (l.h + 1.2) * T;
      const g = ctx.createRadialGradient(ex, ey, 4, ex, ey, 3.2 * T);
      g.addColorStop(0, `rgba(255, 210, 140, ${a})`);
      g.addColorStop(1, 'rgba(255, 210, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(ex - 4 * T, ey - 4 * T, 8 * T, 8 * T);
      const sx = (l.entrance - 2) * T + 32;
      const sy = l.h * T + 14;
      const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 1.6 * T);
      const neon = sim.state.style.sign === 'neon';
      sg.addColorStop(0, neon ? `rgba(255, 120, 200, ${a})` : `rgba(255, 220, 160, ${a * 0.8})`);
      sg.addColorStop(1, 'rgba(255, 200, 160, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 2 * T, sy - 2 * T, 4 * T, 4 * T);
    }
    ctx.restore();
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

  private doorUntil = 0;

  /** Open while a worker fetches stock nearby, held briefly so it doesn't flicker. */
  private stockDoorOpen(sim: Sim): boolean {
    const d = sim.layout.stockDoor;
    const near = sim.workers.some((w) => w.task.type === 'restock' && w.task.phase !== 'stocking'
      && (w.task.phase === 'pickup' || Math.abs(w.mover.x - d.x) + Math.abs(w.mover.y - d.y) < 1.6));
    if (near) this.doorUntil = this.time + 0.5;
    return this.time < this.doorUntil;
  }

  private spriteName(kind: FixtureKind, vertical: boolean): string {
    return `${kind}_${vertical ? 'v' : 'h'}`;
  }

  drawFixture(ctx: CanvasRenderingContext2D, f: FixtureState, selected: boolean, alpha = 1): void {
    if (f.kind === 'decor') {
      const name = `decor_${f.decor ?? 'plant_small'}`;
      const [, , , sh] = rect(name);
      ctx.globalAlpha = alpha;
      drawSprite(ctx, name, f.x * T, (f.y + 1) * T - sh);
      ctx.globalAlpha = 1;
      if (selected) drawSprite(ctx, 'select', f.x * T, f.y * T);
      this.hits.push({ x: f.x * T, y: (f.y + 1) * T - sh, w: T, h: sh, action: { type: 'fixture', fixture: f.id } });
      return;
    }
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
    if (f.kind === 'fridge' || f.kind === 'freezer') {
      drawSprite(ctx, `${f.kind}_glass_${f.vertical ? 'v' : 'h'}`, px, top);
      if (alpha === 1) this.glint(ctx, f, px, top, sh);
    }
    ctx.globalAlpha = 1;
    if (selected) {
      for (const c of fixtureCells(f)) drawSprite(ctx, 'select', c.x * T, c.y * T);
    }
    for (let i = 0; i < 2; i++) {
      const c = fixtureCells(f)[i];
      this.hits.push({ x: c.x * T, y: c.y * T - (f.vertical ? 0 : sh - T), w: T, h: f.vertical ? T : sh, action: { type: 'slot', fixture: f.id, slot: i } });
    }
  }

  /** A light sheen sweeps across fridge and freezer glass now and then. */
  private glint(ctx: CanvasRenderingContext2D, f: FixtureState, px: number, top: number, sh: number): void {
    const w = f.vertical ? T : 2 * T;
    const ph = (this.time / 7 + f.id * 0.37) % 1;
    if (ph > 0.25) return;
    const x0 = px + 3;
    const y0 = top + 4;
    const gw = w - 6;
    const gh = (f.kind === 'fridge' ? sh - 12 : sh - 22);
    const off = (ph / 0.25) * (gw + gh) - gh;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    for (let y = 0; y < gh; y++) {
      const x = Math.round(off + (gh - y) * 0.6);
      const a = Math.max(0, x);
      const b = Math.min(gw, x + 3);
      if (b > a) ctx.fillRect(x0 + a, y0 + y, b - a, 1);
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
    return [];
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
    BREADS.filter((b) => bk[b].good + bk[b].golden > 0).forEach((b, i) => {
      const q = bk[b].golden > 0 ? 'golden' : 'good';
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 2, top, 60, 22);
      ctx.clip();
      ctx.translate(px + 3 + (i % 4) * 14, top + (i < 4 ? -5 : 5));
      ctx.scale(0.5, 0.5);
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

  private beat(seed: number, rate = 5): 0 | 1 {
    return (Math.floor(this.time * rate + seed * 0.37) % 2) as 0 | 1;
  }

  private working(w: Worker): boolean {
    if (w.mover.path.length) return false;
    const t = w.task;
    if (t.type === 'line') return t.line.worker === w && t.line.progress > 0;
    if (t.type === 'restock') return t.phase === 'pickup' || t.phase === 'stocking';
    if (t.type === 'clean' || t.type === 'tidy' || t.type === 'cat' || t.type === 'oven') return t.timer > 0;
    return false;
  }

  /** Idle people glance around now and then instead of standing frozen. */
  private glance(seed: number, dir: Dir): Dir {
    const k = Math.floor(this.time / 2.3 + seed * 0.61) % 5;
    return k === 1 ? 'down' : k === 3 ? (dir === 'left' ? 'right' : 'left') : dir;
  }

  private drawWorker(ctx: CanvasRenderingContext2D, sim: Sim, w: Worker): void {
    const [px, py] = this.charPos(w.mover.x, w.mover.y);
    const t = w.task;
    const work = this.working(w) ? this.beat(w.staffId, t.type === 'clean' ? 4 : 5) : null;
    const frame = w.mover.frame();
    let dir = w.mover.dir;
    if (t.type === 'none' && !w.mover.path.length && w.idleFor > 4) dir = this.glance(w.staffId + 3, dir);
    drawSprite(ctx, 'shadow', px + 4, py + 42);
    const stocking = t.type === 'restock' && t.phase === 'stocking' && work !== null;
    if (stocking) drawSprite(ctx, 'carton', dir === 'left' ? px + 14 : px - 2, py + 34);
    if (t.type === 'clean' && work !== null) this.drawMop(ctx, px, py, true);
    drawChar(ctx, w.row, dir, frame, px, py, w.bubble?.icon === 'b_heart' ? 'happy' : null, work);
    if (t.type === 'clean' && work !== null) this.drawMop(ctx, px, py, false);
    if (w.carrying && !stocking) drawSprite(ctx, 'carton', px + 6, py + 22 + (frame ? 1 : 0));
    if (work !== null) this.drawWorkFx(ctx, sim, w, px, py);
    if (w.bubble) this.bubble(ctx, w.bubble.icon, w.mover.x, w.mover.y, false);
  }

  /** Mop handle behind the body, head swishing on the floor in front. */
  private drawMop(ctx: CanvasRenderingContext2D, px: number, py: number, back: boolean): void {
    const sw = Math.round(Math.sin(this.time * 9) * 5);
    if (back) {
      ctx.fillStyle = '#8a6a4a';
      for (let i = 0; i < 18; i++) ctx.fillRect(px + 22 + Math.round(((sw - 6) * i) / 18), py + 22 + i, 1, 1);
      return;
    }
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(px + 13 + sw, py + 40, 10, 4);
    ctx.fillStyle = '#d8dce4';
    ctx.fillRect(px + 14 + sw, py + 40, 8, 3);
    ctx.fillStyle = '#aab0bc';
    ctx.fillRect(px + 14 + sw, py + 42, 8, 1);
    for (let i = 0; i < 3; i++) {
      const ph = (this.time * 1.3 + i / 3) % 1;
      ctx.fillStyle = `rgba(230, 245, 255, ${0.8 * (1 - ph)})`;
      ctx.fillRect(px + 8 + i * 8 + Math.round(Math.sin(ph * 6 + i) * 2), Math.round(py + 42 - ph * 14), 2, 2);
    }
  }

  private drawWorkFx(ctx: CanvasRenderingContext2D, sim: Sim, w: Worker, px: number, py: number): void {
    const t = w.task;
    if (t.type === 'restock' && t.phase === 'stocking') {
      const f = sim.state.fixtures.find((x) => x.id === t.fixture);
      const id = f?.slots[t.slot].product;
      if (!f || !id) return;
      const sx = (f.vertical ? f.x : f.x + t.slot) * T + 8;
      const sy = (f.vertical ? f.y + t.slot : f.y) * T - 16;
      const u = (this.time * 2.6 + w.staffId * 0.3) % 1;
      const x0 = w.mover.dir === 'left' ? px + 14 : px - 2;
      const y0 = py + 30;
      drawProductSmall(ctx, PRODUCT_BY_ID.get(id)!.index, Math.round(x0 + (sx - x0) * u), Math.round(y0 + (sy - y0) * u - Math.sin(u * Math.PI) * 12));
    } else if (t.type === 'tidy') {
      for (let i = 0; i < 3; i++) {
        const ph = (this.time * 1.6 + i / 3) % 1;
        const a = Math.sin(ph * Math.PI);
        const x = px + 6 + ((i * 11 + Math.floor(this.time * 1.6 + i / 3) * 7) % 20);
        const y = py + 6 + ((i * 5 + Math.floor(this.time * 1.6) * 3) % 14);
        ctx.fillStyle = `rgba(255, 250, 210, ${a})`;
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillRect(x - 1, y, 3, 1);
      }
    } else if (t.type === 'cat') {
      const [cx, cy] = this.charPos(sim.cat.mover.x, sim.cat.mover.y);
      for (let i = 0; i < 2; i++) {
        const ph = (this.time * 0.9 + i / 2) % 1;
        this.heart(ctx, cx + 10 + i * 8 + Math.round(Math.sin(ph * 6 + i) * 2), Math.round(cy + 30 - ph * 18), 1 - ph);
      }
    } else if (t.type === 'oven') {
      const u = Math.min(1, t.timer * w.speed('bakery') / 2);
      const k = t.phase === 'load' ? u : 1 - u;
      const x = px + 8;
      const y = Math.round(py + 16 - k * 22);
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(x - 1, y - 1, 18, 5);
      ctx.fillStyle = '#9aa0ac';
      ctx.fillRect(x, y + 2, 16, 1);
      ctx.fillStyle = t.phase === 'load' ? '#f0dcb0' : '#d89848';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 1 + i * 5, y, 4, 2);
      ctx.globalAlpha = 1;
    }
  }

  private heart(ctx: CanvasRenderingContext2D, x: number, y: number, a: number): void {
    ctx.fillStyle = `rgba(240, 90, 120, ${a})`;
    ctx.fillRect(x, y, 2, 1);
    ctx.fillRect(x + 3, y, 2, 1);
    ctx.fillRect(x - 1, y + 1, 7, 1);
    ctx.fillRect(x, y + 2, 5, 1);
    ctx.fillRect(x + 1, y + 3, 3, 1);
    ctx.fillRect(x + 2, y + 4, 1, 1);
  }

  private drawCustomer(ctx: CanvasRenderingContext2D, sim: Sim, c: Customer): void {
    const [px, py] = this.charPos(c.mover.x, c.mover.y);
    drawSprite(ctx, 'shadow', px + 4, py + 42);
    const still = !c.mover.path.length;
    const reaching = still && c.state === 'browse' && c.pick !== null && sim.clock - c.pick.at < 0.5;
    const paying = still && c.line?.kind === 'register' && this.serving(c.line) === c;
    const work = reaching ? 0 : paying ? this.beat(c.id, 3) : null;
    let dir = c.mover.dir;
    if (still && c.state === 'queue' && c.line?.front() !== c && c.wait > 2) dir = this.glance(c.id, dir);
    const showBasket = c.basket.length > 0 && c.state !== 'leave';
    if (showBasket && dir === 'up') drawSprite(ctx, 'basket', px + 16, py + 26);
    const icon = c.bubble?.icon;
    const tired = c.state === 'queue' && c.wait > 8 * c.npc.patience;
    const expr = icon === 'b_heart' ? 'happy' : icon === 'b_sad' || icon === 'b_wait' || icon === 'b_empty' || tired ? 'sad' : null;
    drawChar(ctx, c.row, dir, c.mover.frame(), px, py, work === null ? expr : null, work);
    this.hits.push({ x: px + 6, y: py + 4, w: 20, h: 40, action: { type: 'customer', customer: c } });
    if (showBasket && dir !== 'up') drawSprite(ctx, 'basket', dir === 'left' ? px + 2 : px + 14, py + 28);
    if (c.state === 'leave' && c.basket.length) drawSprite(ctx, 'carton', dir === 'left' ? px + 2 : px + 12, py + 24 + (c.mover.frame() ? 1 : 0));
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
