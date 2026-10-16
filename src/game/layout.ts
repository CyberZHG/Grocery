import { FIXTURES, LEVELS, type FixtureKind, type StationKind } from './defs';

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
}

export interface FixturePlacement {
  kind: FixtureKind;
  x: number;
  y: number;
  vertical: boolean;
}

export function fixtureCells(f: FixturePlacement): P[] {
  return f.vertical ? [{ x: f.x, y: f.y }, { x: f.x, y: f.y + 1 }] : [{ x: f.x, y: f.y }, { x: f.x + 1, y: f.y }];
}

export function buildLayout(level: number): Layout {
  const def = LEVELS[level];
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
  const entrance = Math.floor(w / 2) - 1;
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
    registers.push({ index: i, x: x0 + 1, y: ry, cashier: { x: x0, y: ry }, queue });
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

  return { level, w, h, registers, stations, bagging, entrance, stockDoor: { x: 1, y: 0 }, reserved, solid, rows };
}

export class Grid {
  readonly w: number;
  readonly rows: number;
  readonly block: Uint8Array;

  constructor(readonly layout: Layout, fixtures: FixturePlacement[]) {
    this.w = layout.w;
    this.rows = layout.rows;
    this.block = layout.solid.slice();
    for (const f of fixtures) for (const c of fixtureCells(f)) this.block[c.y * this.w + c.x] = 1;
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

  path(from: P, to: P): P[] | null {
    if (from.x === to.x && from.y === to.y) return [];
    const dist = this.flood(to.x, to.y);
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
