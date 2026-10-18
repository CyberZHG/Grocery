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
  counters: CounterInfo[];
}

export type QueueDir = 'up' | 'down' | 'left' | 'right';
/** Where a counter stands (its left tile) and which way its line runs. */
export interface CounterPos {
  x: number;
  y: number;
  q: QueueDir;
}
/** A store's own arrangement of counters and pillars, kept so expanding never moves what's already there. */
export interface StorePlan {
  counters: Record<string, CounterPos>;
  pillars: P[];
}
export type CounterKind = 'register' | 'card' | 'station' | 'bagging';
export interface CounterInfo {
  id: string;
  kind: CounterKind;
  station?: StationKind;
  pos: CounterPos;
  solid: P[];
  staff: P;
  queue: P[];
  /** kept clear around the counter, but other counters' clearance may overlap it */
  extra: P[];
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

/** The cat cafe never grows: as big as the largest store, with one register, a coffee counter and a bread oven. */
export const CAFE_LEVEL: LevelDef = { w: LEVELS[LEVELS.length - 1].w, h: LEVELS[LEVELS.length - 1].h, registers: 1, cards: 0, stations: ['coffee', 'bakery'], bagging: false, cost: 0, roster: 80, rent: 60 };

function defaultLayout(level: number, variant: LayoutVariant): Omit<Layout, 'counters'> {
  if (variant === 'cafe') return baseLayout(CAFE_LEVEL, -1, false, false);
  const l = baseLayout(LEVELS[level], level, variant.startsWith('pillars'), variant.startsWith('side'));
  return variant === 'mirror' || variant.endsWith('_mirror') ? mirror(l) : l;
}

interface Spec {
  id: string;
  kind: CounterKind;
  station?: StationKind;
  def: CounterPos;
}

function specsOf(d: Omit<Layout, 'counters'>): Spec[] {
  const out: Spec[] = [];
  let reg = 0;
  let card = 0;
  for (const r of d.registers) {
    out.push(r.card ? { id: `card${card++}`, kind: 'card', def: { x: r.x, y: r.y, q: 'up' } } : { id: `reg${reg++}`, kind: 'register', def: { x: r.x, y: r.y, q: 'up' } });
  }
  if (d.bagging) out.push({ id: 'bag', kind: 'bagging', def: { x: d.bagging.x, y: d.bagging.y, q: 'up' } });
  for (const s of d.stations) out.push({ id: `st_${s.kind}`, kind: 'station', station: s.kind, def: { x: s.x, y: s.y, q: 'down' } });
  return out;
}

const STEP: Record<QueueDir, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** Directions a counter's line can run: away from the counter, never back through it. */
export function queueDirs(kind: CounterKind, mirrored: boolean): QueueDir[] {
  return kind === 'station' ? ['down', 'left', 'right'] : ['up', 'down', mirrored ? 'left' : 'right'];
}

function run(from: P, q: QueueDir, n: number): P[] {
  return [...Array(n).keys()].map((k) => ({ x: from.x + STEP[q].x * k, y: from.y + STEP[q].y * k }));
}

/**
 * The tiles a counter takes up. Stations are served from behind: the staff stand on the tile above (the wall row when
 * the counter is against the back wall) and the line forms below. Away from the wall, the bakery's oven stands on the
 * floor behind the baker. Tills are served from the side.
 */
export function counterShape(sp: Pick<Spec, 'id' | 'kind' | 'station'>, pos: CounterPos, m: boolean): CounterInfo {
  const { x, y } = pos;
  if (sp.kind === 'station') {
    const col = m ? x + 1 : x;
    const queue = run({ x: col, y: y + 1 }, pos.q, 3);
    const side = m ? x : x + 1;
    const extra = [{ x: x - 1, y }, { x: x + 2, y }, ...(pos.q === 'down' ? [1, 2, 3].map((k) => ({ x: side, y: y + k })) : [{ x: side, y: y + 1 }])]
      .filter((e) => !queue.some((p) => p.x === e.x && p.y === e.y));
    const solid = [{ x, y }, { x: x + 1, y }];
    if (sp.station === 'bakery' && y > 1) solid.push({ x, y: y - 2 }, { x: x + 1, y: y - 2 });
    return { ...sp, pos: { ...pos }, solid, staff: { x: col, y: y - 1 }, queue, extra };
  }
  const staff = m ? { x: x + 2, y } : { x: x - 1, y };
  const front = m ? { x: x - 1, y } : { x: x + 2, y };
  const queue = run(front, pos.q, sp.kind === 'bagging' ? 3 : 4);
  const extra = sp.kind === 'bagging' ? [] : [{ x: staff.x, y: y - 1 }];
  return { ...sp, pos: { ...pos }, solid: [{ x, y }, { x: x + 1, y }], staff, queue, extra };
}

type Frame = Omit<Layout, 'counters' | 'registers' | 'stations' | 'bagging' | 'pillars'>;

function frameOf(d: Omit<Layout, 'counters'>): Frame {
  const { w, h, rows } = d;
  const reserved = new Uint8Array(w * rows);
  const solid = new Uint8Array(w * rows);
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 2, h - 1]) reserved[y * w + x] = 1;
    if (x !== d.entrance && x !== d.entrance + 1) {
      solid[h * w + x] = 1;
      reserved[h * w + x] = 1;
    }
  }
  return { level: d.level, w, h, rows, entrance: d.entrance, stockDoor: d.stockDoor, mirrored: d.mirrored, reserved, solid };
}

function assemble(fr: Frame, counters: CounterInfo[], pillars: P[]): Layout {
  const { w, rows } = fr;
  const reserved = fr.reserved.slice();
  const solid = fr.solid.slice();
  const res = (p: P) => {
    if (p.x >= 0 && p.x < w && p.y >= 0 && p.y < rows) reserved[p.y * w + p.x] = 1;
  };
  for (const c of counters) {
    for (const p of c.solid) {
      solid[p.y * w + p.x] = 1;
      res(p);
    }
    res(c.staff);
    for (const p of [...c.queue, ...c.extra]) res(p);
  }
  for (const p of pillars) {
    solid[p.y * w + p.x] = 1;
    res(p);
  }
  const tills = counters.filter((c) => c.kind === 'register' || c.kind === 'card');
  // regular registers first, card counters after, as their indexes have always been
  tills.sort((a, b) => Number(a.kind === 'card') - Number(b.kind === 'card'));
  const registers: RegisterSpot[] = tills.map((c, index) => ({ index, x: c.pos.x, y: c.pos.y, cashier: c.staff, queue: c.queue, card: c.kind === 'card' }));
  const stations: StationSpot[] = counters.filter((c) => c.kind === 'station').map((c) => ({ kind: c.station!, x: c.pos.x, y: c.pos.y, staff: c.staff, queue: c.queue }));
  const bag = counters.find((c) => c.kind === 'bagging');
  const bagging = bag ? { x: bag.pos.x, y: bag.pos.y, staff: bag.staff, queue: bag.queue } : null;
  return { ...fr, reserved, solid, registers, stations, bagging, pillars: pillars.map((p) => ({ ...p })), counters };
}

const key = (p: P) => `${p.x},${p.y}`;

/** A counter fits when it stays on the floor, off the door rows, and clear of other counters and anything blocked. */
function fits(c: CounterInfo, others: CounterInfo[], blocked: Set<string>, fr: Frame): boolean {
  const { w, h } = fr;
  const hard = [...c.solid, c.staff, ...c.queue];
  const inX = (p: P) => p.x >= 0 && p.x < w;
  if (c.kind === 'station') {
    if (!hard.every((p) => inX(p) && p.y >= 0) || c.pos.y < 1 || c.queue.some((p) => p.y > h - 3)) return false;
    // the stock door and the tile in front of it stay clear
    const door = fr.stockDoor;
    if ([...hard, ...c.extra].some((p) => p.x === door.x && p.y <= 1)) return false;
  } else if (![...hard, ...c.extra].every((p) => inX(p) && p.y >= 1 && p.y <= h - 3)) return false;
  const mine = [...hard, ...c.extra.filter((p) => inX(p))];
  if (mine.some((p) => blocked.has(key(p)))) return false;
  for (const o of others) {
    const oh = new Set([...o.solid, o.staff, ...o.queue].map(key));
    const oe = new Set(o.extra.map(key));
    if (hard.some((p) => oh.has(key(p)) || oe.has(key(p)))) return false;
    if (c.extra.some((p) => oh.has(key(p)))) return false;
  }
  return true;
}

function blockedBy(fixtures: FixturePlacement[], pillars: P[]): Set<string> {
  return new Set([...fixtures.flatMap(fixtureCells), ...pillars].map(key));
}

/**
 * The floor plan for a store. Without a plan it's the default arrangement for the size; with one, counters and pillars
 * stay where the plan puts them, and anything the plan doesn't have yet (after expanding) goes where it fits around
 * the fixtures already on the floor, nearest its default spot.
 */
export function buildLayout(level: number, variant: LayoutVariant = 'base', plan?: StorePlan | null, fixtures: FixturePlacement[] = []): Layout {
  const d = defaultLayout(level, variant);
  const fr = frameOf(d);
  const m = d.mirrored;
  const specs = specsOf(d);
  if (!plan) return assemble(fr, specs.map((s) => counterShape(s, s.def, m)), d.pillars);
  const inside = (p: P) => p.x >= 0 && p.x < fr.w && p.y >= 1 && p.y <= fr.h - 3;
  const pillars = plan.pillars.filter(inside);
  const placed: CounterInfo[] = [];
  for (const s of specs) {
    const pos = plan.counters[s.id];
    if (!pos) continue;
    const c = counterShape(s, pos, m);
    if (fits(c, placed, blockedBy([], pillars), fr)) placed.push(c);
  }
  for (const s of specs) {
    if (placed.some((c) => c.id === s.id)) continue;
    placed.push(findSpot(fr, s, placed, pillars, fixtures));
  }
  // a bigger floor may call for another pillar
  for (const want of d.pillars.slice(pillars.length)) {
    const spot = nearestFree(fr, want, placed, pillars, fixtures);
    if (spot) pillars.push(spot);
  }
  return assemble(fr, placed, pillars);
}

function findSpot(fr: Frame, s: Spec, placed: CounterInfo[], pillars: P[], fixtures: FixturePlacement[]): CounterInfo {
  const cands: { c: CounterInfo; d: number }[] = [];
  for (let y = 1; y <= fr.h - 3; y++) {
    for (let x = 0; x < fr.w; x++) {
      for (const q of queueDirs(s.kind, fr.mirrored)) {
        cands.push({ c: counterShape(s, { x, y, q }, fr.mirrored), d: Math.abs(x - s.def.x) + Math.abs(y - s.def.y) + (q === s.def.q ? 0 : 0.5) });
      }
    }
  }
  cands.sort((a, b) => a.d - b.d);
  const clear = blockedBy(fixtures, pillars);
  for (const { c } of cands) {
    if (fits(c, placed, clear, fr) && connected(assemble(fr, [...placed, c], pillars), fixtures)) return c;
  }
  // no room around the fixtures: take a spot anyway and let the fixtures make way
  const bare = blockedBy([], pillars);
  return cands.find(({ c }) => fits(c, placed, bare, fr))?.c ?? counterShape(s, s.def, fr.mirrored);
}

function nearestFree(fr: Frame, want: P, placed: CounterInfo[], pillars: P[], fixtures: FixturePlacement[]): P | null {
  const base = assemble(fr, placed, pillars);
  const taken = blockedBy(fixtures, []);
  const cands: P[] = [];
  for (let y = 1; y <= fr.h - 4; y++) for (let x = 0; x < fr.w; x++) cands.push({ x, y });
  cands.sort((a, b) => Math.abs(a.x - want.x) + Math.abs(a.y - want.y) - (Math.abs(b.x - want.x) + Math.abs(b.y - want.y)));
  for (const p of cands) {
    if (base.reserved[p.y * fr.w + p.x] || taken.has(key(p))) continue;
    if (connected(assemble(fr, placed, [...pillars, p]), fixtures)) return p;
  }
  return null;
}

/** The plan as it stands, with every counter in place, or null if something overlaps or can't be reached. */
export function checkPlan(level: number, variant: LayoutVariant, plan: StorePlan, fixtures: FixturePlacement[]): Layout | null {
  const d = defaultLayout(level, variant);
  const fr = frameOf(d);
  const placed: CounterInfo[] = [];
  const clear = blockedBy(fixtures, plan.pillars);
  for (const s of specsOf(d)) {
    const pos = plan.counters[s.id];
    if (!pos) return null;
    const c = counterShape(s, pos, d.mirrored);
    if (!fits(c, placed, clear, fr)) return null;
    placed.push(c);
  }
  const l = assemble(fr, placed, plan.pillars);
  return connected(l, fixtures) ? l : null;
}

export function planOf(l: Layout): StorePlan {
  return { counters: Object.fromEntries(l.counters.map((c) => [c.id, { ...c.pos }])), pillars: l.pillars.map((p) => ({ ...p })) };
}

function mirror(l: Omit<Layout, 'counters'>): Omit<Layout, 'counters'> {
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

function baseLayout(def: LevelDef, level: number, withPillars: boolean, side: boolean): Omit<Layout, 'counters'> {
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
  return connected(layout, [...others, f]);
}

/** Every fixture, counter and the stock door can be reached from the entrance. */
export function connected(layout: Layout, all: FixturePlacement[]): boolean {
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
