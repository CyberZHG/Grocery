import { FIXTURES, isRolling, LEVELS, type FixtureKind, type LevelDef, type StationKind } from './defs';

export interface P {
  x: number;
  y: number;
}

export interface RegisterSpot {
  index: number;
  x: number;
  y: number;
  cashier: P;
  queue: P[];
  /** takes cards only */
  card: boolean;
}

export interface StationSpot {
  kind: StationKind;
  x: number;
  y: number;
  staff: P;
  queue: P[];
}

export interface BaggingSpot {
  x: number;
  y: number;
  staff: P;
  queue: P[];
}

export interface Layout {
  level: number;
  w: number;
  h: number;
  registers: RegisterSpot[];
  stations: StationSpot[];
  bagging: BaggingSpot | null;
  entrance: number;
  stockDoor: P;
  reserved: Uint8Array;
  solid: Uint8Array;
  rows: number;
  mirrored: boolean;
  /** Solid columns standing in the sales floor. */
  pillars: P[];
}

/** Each store in the chain gets its own floor plan. */
export type LayoutVariant = 'base' | 'mirror' | 'pillars' | 'side' | 'pillars_mirror' | 'side_mirror' | 'cafe';
export const LAYOUT_VARIANTS: LayoutVariant[] = ['base', 'mirror', 'pillars', 'side', 'pillars_mirror', 'side_mirror'];

export interface FixturePlacement {
  kind: FixtureKind;
  x: number;
  y: number;
  vertical: boolean;
  decor?: string;
}

export function fixtureCells(f: FixturePlacement): P[] {
  if (f.kind === 'decor') return [{ x: f.x, y: f.y }];
  return f.vertical ? [{ x: f.x, y: f.y }, { x: f.x, y: f.y + 1 }] : [{ x: f.x, y: f.y }, { x: f.x + 1, y: f.y }];
}

/** The cat cafe never grows: one register and a coffee counter. */
export const CAFE_LEVEL: LevelDef = { w: 14, h: 10, registers: 1, cards: 0, stations: ['coffee'], bagging: false, cost: 0, roster: 60, rent: 60 };

export function buildLayout(level: number, variant: LayoutVariant = 'base'): Layout {
  if (variant === 'cafe') return baseLayout(CAFE_LEVEL, -1, false, false);
  const l = baseLayout(LEVELS[level], level, variant.startsWith('pillars'), variant.startsWith('side'));
  return variant === 'mirror' || variant.endsWith('_mirror') ? mirror(l) : l;
}

function mirror(l: Layout): Layout {
  const { w, rows } = l;
  const flip = (a: Uint8Array) => {
    const out = new Uint8Array(a.length);
    for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) out[y * w + (w - 1 - x)] = a[y * w + x];
    return out;
  };
  const mp = (p: P): P => ({ x: w - 1 - p.x, y: p.y });
  return {
    ...l,
    mirrored: true,
    reserved: flip(l.reserved),
    solid: flip(l.solid),
    entrance: w - 2 - l.entrance,
    stockDoor: mp(l.stockDoor),
    registers: l.registers.map((r) => ({ ...r, x: w - 2 - r.x, cashier: mp(r.cashier), queue: r.queue.map(mp) })),
    stations: l.stations.map((s) => ({ ...s, x: w - 2 - s.x, staff: mp(s.staff), queue: s.queue.map(mp) })),
    bagging: l.bagging ? { ...l.bagging, x: w - 2 - l.bagging.x, staff: mp(l.bagging.staff), queue: l.bagging.queue.map(mp) } : null,
    pillars: l.pillars.map(mp),
  };
}

function baseLayout(def: LevelDef, level: number, withPillars: boolean, side: boolean): Layout {
  const { w, h } = def;
  const rows = h + 2;
  const reserved = new Uint8Array(w * rows);
  const solid = new Uint8Array(w * rows);
  const idx = (x: number, y: number) => y * w + x;
  const res = (x: number, y: number) => {
    if (x >= 0 && x < w && y >= 0 && y < rows) reserved[idx(x, y)] = 1;
  };
  const sol = (x: number, y: number) => {
    solid[idx(x, y)] = 1;
    res(x, y);
  };

  for (let x = 0; x < w; x++) {
    res(x, 0);
    res(x, h - 1);
    res(x, h - 2);
  }
  const entrance = side ? Math.floor(w * 0.7) : Math.floor(w / 2) - 1;
  for (let x = 0; x < w; x++) {
    if (x !== entrance && x !== entrance + 1) sol(x, h);
  }

  const ry = h - 3;
  const registers: RegisterSpot[] = [];
  for (let i = 0; i < def.registers; i++) {
    const x0 = i * 4;
    sol(x0 + 1, ry);
    sol(x0 + 2, ry);
    res(x0, ry);
    const queue: P[] = [];
    for (let k = 0; k < 4; k++) {
      queue.push({ x: x0 + 3, y: ry - k });
      res(x0 + 3, ry - k);
    }
    res(x0, ry - 1);
    registers.push({ index: i, x: x0 + 1, y: ry, cashier: { x: x0, y: ry }, queue, card: false });
  }

  let bagging: BaggingSpot | null = null;
  if (def.bagging) {
    const x0 = def.registers * 4;
    sol(x0 + 1, ry);
    sol(x0 + 2, ry);
    res(x0, ry);
    const queue: P[] = [];
    for (let k = 0; k < 3; k++) {
      queue.push({ x: x0 + 3, y: ry - k });
      res(x0 + 3, ry - k);
    }
    bagging = { x: x0 + 1, y: ry, staff: { x: x0, y: ry }, queue };
  }

  // card counters stand on the other side of the entrance
  for (let k = 0; k < def.cards; k++) {
    const x0 = entrance + 3 + k * 4;
    sol(x0 + 1, ry);
    sol(x0 + 2, ry);
    res(x0, ry);
    const queue: P[] = [];
    for (let q = 0; q < 4; q++) {
      queue.push({ x: x0 + 3, y: ry - q });
      res(x0 + 3, ry - q);
    }
    res(x0, ry - 1);
    registers.push({ index: registers.length, x: x0 + 1, y: ry, cashier: { x: x0, y: ry }, queue, card: true });
  }

  const stations: StationSpot[] = [];
  def.stations.forEach((kind, k) => {
    const x0 = w - 3 - 3 * k;
    sol(x0, 1);
    sol(x0 + 1, 1);
    for (let dx = -1; dx <= 2; dx++) res(x0 + dx, 1);
    const queue: P[] = [];
    for (let q = 0; q < 3; q++) {
      queue.push({ x: x0, y: 2 + q });
      res(x0, 2 + q);
      res(x0 + 1, 2 + q);
    }
    stations.push({ kind, x: x0, y: 1, staff: { x: x0, y: 0 }, queue });
  });

  const pillars: P[] = [];
  if (withPillars) {
    const py = Math.floor(h / 2) - 1;
    const n = w >= 22 ? 3 : 2;
    for (let k = 1; k <= n; k++) {
      let x = Math.round((k * w) / (n + 1));
      while (x < w - 1 && (reserved[idx(x, py)] || reserved[idx(x, py + 1)])) x++;
      sol(x, py);
      pillars.push({ x, y: py });
    }
  }

  return { level, w, h, registers, stations, bagging, entrance, stockDoor: { x: 1, y: 0 }, reserved, solid, rows, mirrored: false, pillars };
}

export class Grid {
  readonly w: number;
  readonly rows: number;
  readonly block: Uint8Array;

  constructor(readonly layout: Layout, fixtures: FixturePlacement[]) {
    this.w = layout.w;
    this.rows = layout.rows;
    this.block = layout.solid.slice();
    // rolling toys are small enough to step over
    for (const f of fixtures) if (!isRolling(f.decor)) for (const c of fixtureCells(f)) this.block[c.y * this.w + c.x] = 1;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.rows;
  }

  walkable(x: number, y: number): boolean {
    return this.inside(x, y) && !this.block[y * this.w + x];
  }

  /** BFS distances from a start; -1 unreachable. */
  flood(sx: number, sy: number): Int32Array {
    const dist = new Int32Array(this.w * this.rows).fill(-1);
    if (!this.walkable(sx, sy)) return dist;
    const q = [sy * this.w + sx];
    dist[q[0]] = 0;
    for (let head = 0; head < q.length; head++) {
      const cur = q[head];
      const cx = cur % this.w;
      const cy = (cur - cx) / this.w;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.walkable(nx, ny)) continue;
        const ni = ny * this.w + nx;
        if (dist[ni] >= 0) continue;
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      }
    }
    return dist;
  }

  /** Tiles in `avoid` are treated as blocked unless they are the start or goal (used to step around standing agents). */
  path(from: P, to: P, avoid?: P | readonly P[] | null): P[] | null {
    if (from.x === to.x && from.y === to.y) return [];
    const restore: number[] = [];
    for (const a of avoid ? (Array.isArray(avoid) ? avoid : [avoid as P]) : []) {
      if ((a.x === to.x && a.y === to.y) || (a.x === from.x && a.y === from.y) || !this.inside(a.x, a.y)) continue;
      const i = a.y * this.w + a.x;
      if (!this.block[i]) {
        this.block[i] = 1;
        restore.push(i);
      }
    }
    let dist = this.flood(to.x, to.y);
    if (restore.length) {
      for (const i of restore) this.block[i] = 0;
      if (dist[from.y * this.w + from.x] < 0) dist = this.flood(to.x, to.y);
    }
    if (dist[from.y * this.w + from.x] < 0) return null;
    const out: P[] = [];
    let cx = from.x;
    let cy = from.y;
    while (!(cx === to.x && cy === to.y)) {
      let best: P | null = null;
      let bd = dist[cy * this.w + cx];
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.inside(nx, ny)) continue;
        const d = dist[ny * this.w + nx];
        if (d >= 0 && d < bd) {
          bd = d;
          best = { x: nx, y: ny };
        }
      }
      if (!best) return null;
      out.push(best);
      cx = best.x;
      cy = best.y;
    }
    return out;
  }
}

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;

export function accessTiles(grid: Grid, f: FixturePlacement, slot: number): P[] {
  const c = fixtureCells(f)[slot];
  const out: P[] = [];
  const order = f.vertical ? [[-1, 0], [1, 0], [0, slot === 0 ? -1 : 1]] : [[0, 1], [0, -1], [slot === 0 ? -1 : 1, 0]];
  for (const [dx, dy] of order) {
    if (grid.walkable(c.x + dx, c.y + dy)) out.push({ x: c.x + dx, y: c.y + dy });
  }
  return out;
}

/**
 * Where people stand to use a fixture: its front if that's open, otherwise any side.
 * Horizontal fixtures face down toward the viewer; a vertical fridge's glass door faces right.
 * Vertical shelves, produce bins and chest freezers are open on both long sides.
 */
export function serveTiles(grid: Grid, f: FixturePlacement, slot: number): P[] {
  const all = accessTiles(grid, f, slot);
  const c = fixtureCells(f)[slot];
  const front = !f.vertical ? { x: c.x, y: c.y + 1 } : f.kind === 'fridge' ? { x: c.x + 1, y: c.y } : null;
  if (!front) return all;
  const open = all.filter((p) => p.x === front.x && p.y === front.y);
  return open.length ? open : all;
}

export function entryTile(l: Layout): P {
  return { x: l.entrance, y: l.h - 1 };
}

export function spawnTile(l: Layout, right: boolean): P {
  return { x: l.entrance + (right ? 1 : 0), y: l.h + 1 };
}

/** A placement is valid when it avoids reserved/occupied cells and keeps every service point reachable. */
export function canPlace(layout: Layout, others: FixturePlacement[], f: FixturePlacement): boolean {
  for (const c of fixtureCells(f)) {
    if (c.x < 0 || c.y < 0 || c.x >= layout.w || c.y >= layout.h) return false;
    if (layout.reserved[c.y * layout.w + c.x]) return false;
    for (const o of others) for (const oc of fixtureCells(o)) if (oc.x === c.x && oc.y === c.y) return false;
  }
  const all = [...others, f];
  const grid = new Grid(layout, all);
  const e = entryTile(layout);
  const dist = grid.flood(e.x, e.y);
  const ok = (p: P) => dist[p.y * layout.w + p.x] >= 0;
  for (const fx of all) {
    if (fx.kind === 'decor') continue;
    for (let s = 0; s < 2; s++) {
      if (!accessTiles(grid, fx, s).some(ok)) return false;
    }
  }
  for (const r of layout.registers) if (!ok(r.cashier) || !ok(r.queue[r.queue.length - 1])) return false;
  for (const s of layout.stations) if (!ok(s.staff) || !ok(s.queue[s.queue.length - 1])) return false;
  if (layout.bagging && (!ok(layout.bagging.staff) || !ok(layout.bagging.queue[layout.bagging.queue.length - 1]))) return false;
  return ok(layout.stockDoor);
}

export function fixturePrice(kind: FixtureKind): number {
  return FIXTURES[kind].price;
}
