import { Rng } from '../core/rng';
import { Mover, type Dir } from './agent';
import {
  BREAD_COST_RATIO, BREAD_PRICE, BREADS, COFFEE_COST_RATIO, DAY_END, DAY_START, DRINKS, FIXTURES, LAST_ENTRY,
  LEVELS, MEAT_COST_RATIO, MEAT_PRICE_LB, MEATS, NPC_ROW0, NPCS, ODEN_COST_RATIO, ODEN_ITEMS, ODEN_PRICE,
  OWNER_ROW, PRODUCT_BY_ID, STAFF_ROW0, TRAIT_BY_ID, type Bread, type Category, type BreadQuality, type DrinkDef, type Meat, type NpcDef,
  type OdenItem, type Skill, type StationKind,
} from './defs';
import { demandMult, holidayOf, stationMult, trafficMult, weatherOf } from './calendar';
import {
  catAppeal, catLover, costOf, equipSpeed, gainCat, gainEquipment, gainReputation, gainSupplier, giftChance, PETS_PER_DAY, repTraffic, type EquipKind,
} from './growth';
import { priceMult, productExpToNext, UNLOCK_ORDER, unlockedCount } from './progress';
import { accessTiles, buildLayout, entryTile, Grid, spawnTile, type Layout, type P, type StationSpot } from './layout';
import {
  addExp, affinityValue, budgetMult, changeAffinity, makeCashPayment, npcExpToNext, roundCash, serviceReward, skillExpToNext, skillSpeed, waitPenalty,
  type CashPayment, type Leveled, type ServiceResult,
} from './rules';
import type { DayStats, FixtureState, GameState, Role } from './state';

export interface BasketItem {
  kind: 'product' | 'oden' | 'deli' | 'coffee' | 'bread';
  id: string;
  price: number;
  cost: number;
  qty: number;
}

export type OdenOrder = { kind: 'oden'; items: Partial<Record<OdenItem, number>> };
export type DeliOrder = { kind: 'deli'; meat: Meat; pounds: number };
export type CoffeeOrder = { kind: 'coffee'; drink: DrinkDef };
export type Order = OdenOrder | DeliOrder | CoffeeOrder;

type Target =
  | { t: 'slot'; fixture: number; slot: number }
  | { t: 'station'; kind: StationKind }
  | { t: 'bakery' };

type CustState = 'shop' | 'browse' | 'queue' | 'served' | 'leave';

export interface Bubble {
  icon: string;
  until: number;
}

export class Customer {
  mover: Mover;
  state: CustState = 'shop';
  targets: Target[] = [];
  basket: BasketItem[] = [];
  budget: number;
  spent = 0;
  wait = 0;
  waitStart = -1;
  timer = 0;
  line: Line | null = null;
  order: Order | null = null;
  payment: CashPayment | null = null;
  cash = false;
  mult = 1;
  affinityDelta = 0;
  bubble: Bubble | null = null;
  needsBag = false;
  hurry = false;
  manualServed = false;

  constructor(readonly id: number, readonly npc: NpcDef, p: P, budget: number) {
    this.mover = new Mover(p);
    this.budget = budget;
  }

  get row(): number {
    return NPC_ROW0 + this.npc.index;
  }

  total(): number {
    return this.basket.reduce((a, b) => a + b.price * b.qty, 0);
  }

  itemCount(): number {
    return this.basket.reduce((a, b) => a + (b.kind === 'product' ? b.qty : 1), 0);
  }
}

export type LineKind = 'register' | 'station' | 'bagging';

export class Line {
  members: Customer[] = [];
  worker: Worker | null = null;
  progress = 0;
  duration = 0;
  idle = 0;
  /** Real seconds left before staff takes over a service the player could do by hand. */
  offer = 0;
  offerFor: Customer | null = null;

  constructor(readonly kind: LineKind, readonly spots: P[], readonly staffSpot: P, readonly index: number, readonly station?: StationKind) {}

  spot(i: number): P {
    return this.spots[Math.min(i, this.spots.length - 1)];
  }

  front(): Customer | null {
    const c = this.members[0];
    return c && c.mover.at(this.spots[0]) ? c : null;
  }
}

export type Task =
  | { type: 'line'; line: Line }
  | { type: 'restock'; fixture: number; slot: number; phase: 'toStock' | 'pickup' | 'toShelf' | 'stocking'; timer: number }
  | { type: 'oven'; phase: 'load' | 'unload'; timer: number }
  | { type: 'none' };

export class Worker {
  mover: Mover;
  task: Task = { type: 'none' };
  carrying = false;
  bubble: Bubble | null = null;

  constructor(
    readonly staffId: number,
    readonly row: number,
    readonly role: Role,
    readonly skills: Record<Skill, Leveled>,
    p: P,
    readonly trait: string | null = null,
  ) {
    this.mover = new Mover(p);
  }

  speed(s: Skill): number {
    const tr = this.trait ? TRAIT_BY_ID.get(this.trait) : undefined;
    return skillSpeed(this.skills[s].level) * (tr && tr.skill === s ? tr.mult : 1);
  }
}

export class CatAgent {
  mover: Mover;
  mode: 'walk' | 'sit' | 'sleep' = 'sleep';
  timer = 0;
  bubble: Bubble | null = null;

  constructor(p: P) {
    this.mover = new Mover(p);
  }
}

export type OvenState = { phase: 'idle' } | { phase: 'loading'; bread: Bread } | { phase: 'baking'; bread: Bread; t: number } | { phase: 'ready'; bread: Bread; t: number };
export const BAKE_MIN = 18;
/** Manual window in real seconds at 1x; shorter when fast-forwarding. */
export const OFFER_SECONDS = 4;
export const OVEN_OFFER_SECONDS = 6;
export const BURN_AFTER = 10;
export const BATCH = 8;

export type SimEvent =
  | { type: 'npcLevel'; npc: string; level: number }
  | { type: 'staffLevel'; staff: number; skill: Skill; level: number }
  | { type: 'money'; amount: number; x: number; y: number }
  | { type: 'productLevel'; id: string; level: number }
  | { type: 'growth'; what: 'reputation' | 'cat' | EquipKind | Category; level: number }
  | { type: 'gift'; id: string; units: number; value: number }
  | { type: 'unlock'; id: string }
  | { type: 'closed' };

export interface Floater {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
}

export class Sim {
  layout: Layout;
  grid: Grid;
  rng: Rng;
  clock = DAY_START;
  customers: Customer[] = [];
  workers: Worker[] = [];
  registers: Line[] = [];
  stations = new Map<StationKind, Line>();
  bagging: Line | null = null;
  oven: OvenState = { phase: 'idle' };
  arrivals: { t: number; npc: NpcDef }[] = [];
  stats: DayStats;
  priority = new Set<string>();
  playerPriority = new Set<string>();
  floaters: Floater[] = [];
  closing = false;
  done = false;
  listeners: ((e: SimEvent) => void)[] = [];
  cat: CatAgent;
  private nextCust = 1;

  constructor(readonly state: GameState) {
    this.layout = buildLayout(state.level);
    this.grid = new Grid(this.layout, this.placed());
    this.rng = new Rng((state.seed + state.day * 7919) | 0);
    this.stats = {
      day: state.day, revenue: 0, goodsCost: 0, wages: 0, rent: 0, restock: 0, customers: 0, manual: 0, levelUps: 0, avgAffinity: 0,
    };
    this.buildLines();
    this.cat = new CatAgent(this.catSpot());
  }

  /** Random open floor tile in the store interior. */
  private catSpot(): P {
    for (let i = 0; i < 40; i++) {
      const p = { x: this.rng.int(0, this.layout.w - 1), y: this.rng.int(1, this.layout.h - 3) };
      if (this.grid.walkable(p.x, p.y)) return p;
    }
    return { x: 2, y: 1 };
  }

  private updateCat(dt: number): void {
    const c = this.cat;
    const st = this.state.cat;
    c.mover.step(dt, 0.5);
    if (c.bubble && c.bubble.until < this.clock) c.bubble = null;
    st.mood += (50 - st.mood) * 0.0008 * dt;
    if (gainCat(this.state, dt * 0.02)) this.emit({ type: 'growth', what: 'cat', level: st.level });
    if (c.mode === 'walk') {
      if (c.mover.path.length === 0) {
        c.mode = this.rng.chance(0.4) ? 'sleep' : 'sit';
        c.timer = c.mode === 'sleep' ? this.rng.range(40, 120) : this.rng.range(15, 50);
      }
      return;
    }
    c.timer -= dt;
    if (c.timer <= 0) {
      c.mode = 'walk';
      c.mover.goTo(this.grid, this.catSpot());
    }
  }

  /** Player petting; limited per day so it stays a small daily ritual. */
  petCat(): boolean {
    const st = this.state.cat;
    if (st.petDay !== this.state.day) {
      st.petDay = this.state.day;
      st.pets = 0;
    }
    this.cat.bubble = { icon: 'b_heart', until: this.clock + 2 };
    if (this.cat.mode === 'sleep') {
      this.cat.mode = 'sit';
      this.cat.timer = 20;
    }
    if (st.pets >= PETS_PER_DAY) return false;
    st.pets += 1;
    st.mood = Math.min(100, st.mood + 10);
    if (gainCat(this.state, 4)) this.emit({ type: 'growth', what: 'cat', level: st.level });
    return true;
  }

  feedCat(): boolean {
    const st = this.state.cat;
    if (st.fedDay === this.state.day) return false;
    st.fedDay = this.state.day;
    st.mood = Math.min(100, st.mood + 25);
    if (gainCat(this.state, 10)) this.emit({ type: 'growth', what: 'cat', level: st.level });
    return true;
  }

  on(fn: (e: SimEvent) => void): void {
    this.listeners.push(fn);
  }

  private emit(e: SimEvent): void {
    for (const l of this.listeners) l(e);
  }

  placed(): FixtureState[] {
    return this.state.fixtures.filter((f) => f.placed);
  }

  fixture(id: number): FixtureState | undefined {
    return this.state.fixtures.find((f) => f.id === id);
  }

  private buildLines(): void {
    this.registers = this.layout.registers.map((r) => new Line('register', r.queue, r.cashier, r.index));
    this.stations.clear();
    for (const s of this.layout.stations) {
      if (s.kind === 'bakery') continue;
      this.stations.set(s.kind, new Line('station', s.queue, s.staff, 0, s.kind));
    }
    const b = this.layout.bagging;
    this.bagging = b ? new Line('bagging', b.queue, b.staff, 0) : null;
  }

  stationSpot(kind: StationKind): StationSpot | undefined {
    return this.layout.stations.find((s) => s.kind === kind);
  }

  // ---------- day lifecycle ----------

  startDay(): void {
    this.restockAll();
    const roster = NPCS.slice(0, LEVELS[this.state.level].roster);
    const appeal = Math.min(0.15, this.placed().length * 0.006);
    const rep = repTraffic(this.state.reputation.level);
    const traffic = trafficMult(this.state.seed, this.state.day);
    this.supplierGifts();
    for (const npc of roster) {
      const st = this.state.npcs[npc.id];
      const aff = affinityValue(st.fond.level);
      const cat = catLover(npc.index) ? catAppeal(this.state.cat.level, this.state.cat.mood) : 0;
      const p = (0.22 + aff / 220 + appeal + rep + cat) * traffic;
      if (this.rng.chance(p)) this.arrivals.push({ t: this.arrivalTime(), npc });
      if (aff > 70 && this.rng.chance((aff - 70) / 100)) this.arrivals.push({ t: this.arrivalTime(), npc });
    }
    this.arrivals.sort((a, b) => a.t - b.t);
    const spots = [this.layout.registers[0].cashier, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 }];
    this.workers.push(new Worker(-1, OWNER_ROW, 'auto', this.state.owner, spots[0]));
    this.state.staff.forEach((s, i) => {
      const p = { x: Math.min(this.layout.w - 1, 2 + i * 2), y: 0 };
      this.workers.push(new Worker(s.id, STAFF_ROW0 + s.look, s.role, s.skills, p, s.trait));
    });
  }

  private arrivalTime(): number {
    // two soft peaks: late morning and early evening
    const r = this.rng.next();
    const peak = r < 0.45 ? 11.5 * 60 : r < 0.9 ? 17.5 * 60 : this.rng.range(DAY_START, LAST_ENTRY);
    const t = peak + (this.rng.next() + this.rng.next() + this.rng.next() - 1.5) * 150;
    return Math.max(DAY_START + 2, Math.min(LAST_ENTRY, t));
  }

  restockAll(): number {
    let spent = 0;
    for (const f of this.placed()) {
      const cap = FIXTURES[f.kind].capacity;
      for (const s of f.slots) {
        if (!s.product) continue;
        const p = PRODUCT_BY_ID.get(s.product)!;
        const unit = costOf(this.state, p);
        const need = cap - s.stock;
        const afford = Math.min(need, Math.floor(this.state.money / unit));
        if (afford <= 0) continue;
        const c = afford * unit;
        this.state.money -= c;
        spent += c;
        s.stock += afford;
        this.supplierExp(p.id, afford);
      }
    }
    this.stats.restock += spent;
    return spent;
  }

  // ---------- main update ----------

  update(dtMin: number): void {
    if (this.done) return;
    this.clock += dtMin;
    while (this.arrivals.length && this.arrivals[0].t <= this.clock && !this.closing) {
      this.spawn(this.arrivals.shift()!.npc);
    }
    if (!this.closing && this.clock >= DAY_END) {
      this.closing = true;
      this.arrivals = [];
      for (const c of this.customers) c.hurry = true;
    }
    for (const c of this.customers) this.updateCustomer(c, dtMin);
    this.customers = this.customers.filter((c) => !(c.state === 'leave' && c.mover.path.length === 0 && c.mover.y >= this.layout.h + 1));
    this.updateOven(dtMin);
    this.updateCat(dtMin);
    this.assignTasks();
    for (const w of this.workers) this.updateWorker(w, dtMin);
    for (const line of this.allLines()) this.updateLine(line, dtMin);
    for (const f of this.floaters) f.t += dtMin;
    this.floaters = this.floaters.filter((f) => f.t < 4);
    if (this.closing && this.customers.length === 0) {
      this.done = true;
      this.emit({ type: 'closed' });
    }
  }

  allLines(): Line[] {
    const out = [...this.registers, ...this.stations.values()];
    if (this.bagging) out.push(this.bagging);
    return out;
  }

  // ---------- customers ----------

  private spawn(npc: NpcDef): void {
    const st = this.state.npcs[npc.id];
    const start = spawnTile(this.layout, this.rng.chance(0.5));
    const budget = npc.budget * budgetMult(st.level) * this.rng.range(0.7, 1.2);
    const c = new Customer(this.nextCust++, npc, start, budget);
    c.targets = this.planTargets(c);
    this.customers.push(c);
    this.stats.customers += 1;
    this.state.lifetime.customers += 1;
    c.mover.goTo(this.grid, entryTile(this.layout));
  }

  private planTargets(c: Customer): Target[] {
    const npc = c.npc;
    const aff = affinityValue(this.state.npcs[npc.id].fond.level);
    const picks: { tg: Target; price: number; w: number }[] = [];
    for (const f of this.placed()) {
      f.slots.forEach((s, i) => {
        if (!s.product) return;
        const p = PRODUCT_BY_ID.get(s.product)!;
        const fav = npc.favs.includes(p.id);
        const like = npc.likes.includes(p.cat);
        const prob = Math.min(0.95, (0.08 + (like ? 0.28 : 0) + (fav ? 0.75 : 0) + aff * 0.004) * demandMult(this.state.seed, this.state.day, p.id));
        if (this.rng.chance(prob)) picks.push({ tg: { t: 'slot', fixture: f.id, slot: i }, price: this.priceOf(p.id), w: fav ? 3 : like ? 2 : 1 });
      });
    }
    picks.sort((a, b) => b.w - a.w || a.price - b.price);
    let left = c.budget;
    const out: Target[] = [];
    for (const p of picks) {
      if (p.price <= left && out.length < 7) {
        out.push(p.tg);
        left -= p.price;
      }
    }
    if (out.length === 0) {
      const slots = this.placed().flatMap((f) => f.slots.map((s, i) => ({ f, s, i }))).filter((x) => x.s.product);
      if (slots.length) {
        const x = this.rng.pick(slots);
        out.push({ t: 'slot', fixture: x.f.id, slot: x.i });
      }
    }
    for (const s of this.layout.stations) {
      const want = npc.stations[s.kind] * (0.5 + aff / 100) * stationMult(this.state.seed, this.state.day, s.kind);
      if (this.rng.chance(want)) out.push(s.kind === 'bakery' ? { t: 'bakery' } : { t: 'station', kind: s.kind });
    }
    return this.orderTargets(out);
  }

  private targetPos(tg: Target): P {
    if (tg.t === 'slot') {
      const f = this.fixture(tg.fixture)!;
      return { x: f.x, y: f.y };
    }
    const kind = tg.t === 'bakery' ? 'bakery' : tg.kind;
    const s = this.stationSpot(kind)!;
    return s.queue[0];
  }

  private orderTargets(ts: Target[]): Target[] {
    const out: Target[] = [];
    let cur = entryTile(this.layout);
    const left = ts.slice();
    while (left.length) {
      let bi = 0;
      let bd = Infinity;
      left.forEach((t, i) => {
        const p = this.targetPos(t);
        const d = Math.abs(p.x - cur.x) + Math.abs(p.y - cur.y);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      const t = left.splice(bi, 1)[0];
      out.push(t);
      cur = this.targetPos(t);
    }
    return out;
  }

  private updateCustomer(c: Customer, dt: number): void {
    c.mover.step(dt, 0.85);
    if (c.bubble && c.bubble.until < this.clock && c.state !== 'queue') c.bubble = null;
    if (c.state === 'leave') return;
    if (c.state === 'queue') {
      const held = c.line?.offerFor === c && c.line.offer > 0;
      if (c.mover.path.length === 0 && !held) c.wait += dt;
      const front = c.line?.front() === c;
      if (front) c.mover.face(c.line!.kind === 'station' ? 'up' : 'left');
      return;
    }
    if (c.state === 'browse') {
      c.timer -= dt;
      if (c.timer <= 0) {
        c.state = 'shop';
      }
      return;
    }
    if (c.state === 'served') return;
    if (c.mover.path.length) return;
    if (c.hurry && c.targets.length) c.targets = [];
    const tg = c.targets[0];
    if (!tg) {
      this.goPay(c);
      return;
    }
    if (tg.t === 'slot') {
      const f = this.fixture(tg.fixture);
      if (!f || !f.placed) {
        c.targets.shift();
        return;
      }
      const acc = accessTiles(this.grid, f, tg.slot);
      const here = acc.find((p) => c.mover.at(p));
      if (!here) {
        if (!acc.length) {
          c.targets.shift();
          return;
        }
        const t = c.mover.tile;
        acc.sort((a, b) => Math.abs(a.x - t.x) + Math.abs(a.y - t.y) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y)));
        c.mover.goTo(this.grid, acc[0]);
        return;
      }
      this.faceToward(c.mover, f.vertical ? { x: f.x, y: f.y + tg.slot } : { x: f.x + tg.slot, y: f.y });
      this.takeFromSlot(c, f, tg.slot);
      c.targets.shift();
      c.state = 'browse';
      c.timer = this.rng.range(0.6, 1.4);
      return;
    }
    if (tg.t === 'bakery') {
      const sp = this.stationSpot('bakery')!;
      const spot = sp.queue[0];
      if (!c.mover.at(spot)) {
        c.mover.goTo(this.grid, spot);
        return;
      }
      c.mover.face('up');
      this.takeBread(c);
      c.targets.shift();
      c.state = 'browse';
      c.timer = 0.8;
      return;
    }
    const line = this.stations.get(tg.kind)!;
    c.targets.shift();
    c.order = this.makeOrder(tg.kind);
    this.join(c, line);
  }

  private faceToward(m: Mover, p: P): void {
    const t = m.tile;
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    m.face(d);
  }

  private takeFromSlot(c: Customer, f: FixtureState, slot: number): void {
    const s = f.slots[slot];
    if (!s.product) return;
    const p = PRODUCT_BY_ID.get(s.product)!;
    const price = this.priceOf(p.id);
    const fav = c.npc.favs.includes(p.id);
    if (s.stock <= 0) {
      c.affinityDelta -= fav ? 3 : 1.5;
      c.bubble = { icon: 'b_empty', until: this.clock + 4 };
      this.priority.add(`${f.id}:${slot}`);
      return;
    }
    const remaining = c.budget - c.spent;
    if (price > remaining) return;
    let qty = 1;
    if (this.rng.chance(fav ? 0.5 : 0.18) && s.stock >= 2 && price * 2 <= remaining) qty = 2;
    s.stock -= qty;
    c.spent += price * qty;
    c.basket.push({ kind: 'product', id: p.id, price, cost: costOf(this.state, p), qty });
    this.productSold(p.id, qty);
    if (fav) {
      c.affinityDelta += 1.5;
      c.bubble = { icon: 'b_heart', until: this.clock + 3 };
    } else if (c.npc.likes.includes(p.cat)) {
      c.affinityDelta += 0.6;
    }
  }

  priceOf(id: string): number {
    const p = PRODUCT_BY_ID.get(id)!;
    return Math.round(p.price * priceMult(this.state.products[id].level) * 100) / 100;
  }

  private productSold(id: string, qty: number): void {
    const prog = this.state.products[id];
    const cat = PRODUCT_BY_ID.get(id)!.cat;
    const before = unlockedCount(cat, this.state.products);
    prog.sold += qty;
    const ups = addExp(prog, qty, productExpToNext);
    if (ups > 0) {
      this.emit({ type: 'productLevel', id, level: prog.level });
      const after = unlockedCount(cat, this.state.products);
      this.state.lifetime.unlocks += after - before;
      for (let i = before; i < after; i++) this.emit({ type: 'unlock', id: UNLOCK_ORDER[cat][i] });
    }
  }

  private takeBread(c: Customer): void {
    const bk = this.state.bakery;
    const avail = BREADS.filter((b) => bk[b].good + bk[b].golden > 0);
    if (!avail.length) {
      c.affinityDelta -= 1;
      c.bubble = { icon: 'b_empty', until: this.clock + 4 };
      return;
    }
    const b = this.rng.pick(avail);
    const golden = bk[b].golden > 0;
    if (golden) bk[b].golden -= 1;
    else bk[b].good -= 1;
    const price = BREAD_PRICE[b] * (golden ? 1.3 : 1);
    c.basket.push({ kind: 'bread', id: `${b}${golden ? '*' : ''}`, price, cost: BREAD_PRICE[b] * BREAD_COST_RATIO, qty: 1 });
    c.spent += price;
    if (golden) {
      c.affinityDelta += 2;
      c.bubble = { icon: 'b_heart', until: this.clock + 3 };
    }
  }

  makeOrder(kind: StationKind): Order {
    if (kind === 'oden') {
      const items: Partial<Record<OdenItem, number>> = {};
      const kinds = this.rng.shuffle([...ODEN_ITEMS]).slice(0, this.rng.int(1, 3));
      for (const k of kinds) items[k] = this.rng.int(1, 3);
      return { kind, items };
    }
    if (kind === 'deli') return { kind, meat: this.rng.pick(MEATS), pounds: this.rng.pick([0.25, 0.5, 0.5, 0.75, 1]) };
    return { kind: 'coffee', drink: this.rng.pick(DRINKS) };
  }

  orderPrice(o: Order): { price: number; cost: number; id: string } {
    if (o.kind === 'oden') {
      let price = 0;
      for (const [k, n] of Object.entries(o.items)) price += ODEN_PRICE[k as OdenItem] * (n ?? 0);
      return { price, cost: price * ODEN_COST_RATIO, id: 'oden' };
    }
    if (o.kind === 'deli') {
      const price = MEAT_PRICE_LB[o.meat] * o.pounds;
      return { price, cost: price * MEAT_COST_RATIO, id: o.meat };
    }
    return { price: o.drink.price, cost: o.drink.price * COFFEE_COST_RATIO, id: o.drink.id };
  }

  private goPay(c: Customer): void {
    if (c.basket.length === 0) {
      this.leave(c);
      return;
    }
    let best = this.registers[0];
    for (const r of this.registers) if (r.members.length < best.members.length) best = r;
    const npc = c.npc;
    c.cash = this.rng.chance(npc.cash);
    if (c.cash) c.payment = makeCashPayment(Math.round(c.total() * 100), this.rng, npc);
    c.needsBag = !!this.bagging && c.itemCount() >= 3;
    this.join(c, best);
  }

  private join(c: Customer, line: Line): void {
    c.state = 'queue';
    c.line = line;
    line.members.push(c);
    c.mover.goTo(this.grid, line.spot(line.members.length - 1));
  }

  private shiftLine(line: Line): void {
    line.members.forEach((m, i) => m.mover.goTo(this.grid, line.spot(i)));
  }

  /** Front customer done being served at this line. */
  finishService(line: Line, result: ServiceResult): void {
    const c = line.members.shift();
    line.progress = 0;
    line.duration = 0;
    if (!c) return;
    this.shiftLine(line);
    c.line = null;
    if (result.manual) this.stats.manual += 1;
    if (line.kind === 'station') {
      const o = c.order!;
      const { price, cost, id } = this.orderPrice(o);
      const r = serviceReward(result, 5, 25);
      c.mult *= r.mult;
      c.affinityDelta += r.affinity;
      if (result.accuracy > 0 || !result.manual) {
        c.basket.push({ kind: o.kind, id, price, cost, qty: 1 });
        c.spent += price;
      }
      c.order = null;
      c.state = 'shop';
      this.happyBubble(c, r.affinity);
      return;
    }
    if (line.kind === 'register') {
      const total = c.total();
      const paid = c.cash ? roundCash(Math.round(total * 100)) / 100 : total;
      this.state.money += paid;
      this.stats.revenue += paid;
      this.state.lifetime.revenue += paid;
      this.stats.goodsCost += c.basket.reduce((a, b) => a + b.cost * b.qty, 0);
      const st = this.state.npcs[c.npc.id];
      st.spent += paid;
      this.floaters.push({ text: `+$${paid.toFixed(2)}`, x: line.spots[0].x, y: line.spots[0].y, t: 0, color: '#8ee08a' });
      if (c.cash) {
        const r = serviceReward(result, 4, 20);
        c.mult *= r.mult;
        c.affinityDelta += r.affinity;
        this.happyBubble(c, r.affinity);
      }
      if (c.needsBag && this.bagging) {
        this.join(c, this.bagging);
        return;
      }
      this.leave(c);
      return;
    }
    const r = serviceReward(result, 6, 30);
    c.mult *= r.mult;
    c.affinityDelta += r.affinity;
    this.happyBubble(c, r.affinity);
    this.leave(c);
  }

  private happyBubble(c: Customer, aff: number): void {
    if (aff >= 2) c.bubble = { icon: 'b_heart', until: this.clock + 3 };
    else if (aff < 0) c.bubble = { icon: 'b_sad', until: this.clock + 3 };
  }

  private leave(c: Customer): void {
    c.state = 'leave';
    const st = this.state.npcs[c.npc.id];
    const wp = waitPenalty(c.wait, c.npc.patience);
    if (wp.affinity < 0) c.bubble = { icon: 'b_wait', until: this.clock + 3 };
    const bought = c.basket.length > 0;
    const exp = bought ? (5 + c.spent * 0.6) * c.mult * wp.mult : 1;
    const mood = c.affinityDelta + wp.affinity + (bought ? 1 : -0.5);
    changeAffinity(st.fond, mood);
    const repUps = gainReputation(this.state, Math.max(0, 1 + mood) * (c.manualServed ? 2 : 1));
    if (repUps) this.emit({ type: 'growth', what: 'reputation', level: this.state.reputation.level });
    st.visits += 1;
    const ups = addExp(st, exp, npcExpToNext);
    if (ups > 0) {
      this.stats.levelUps += ups;
      this.emit({ type: 'npcLevel', npc: c.npc.id, level: st.level });
    }
    c.mover.goTo(this.grid, spawnTile(this.layout, this.rng.chance(0.5)));
  }

  // ---------- lines ----------

  private updateLine(line: Line, dt: number): void {
    const front = line.front();
    if (front && front.waitStart < 0) front.waitStart = this.clock;
    const w = line.worker;
    if (!front) {
      if (w && line.members.length === 0) {
        line.idle += dt;
        if (line.idle > 2.5) this.release(w);
      }
      return;
    }
    line.idle = 0;
    if (this.manualEligible(line, front)) {
      if (line.offerFor !== front) {
        line.offerFor = front;
        line.offer = this.offerSeconds(OFFER_SECONDS);
      }
      if (line.offer > 0) {
        if (w && w.mover.at(line.staffSpot)) w.mover.face(line.kind === 'station' ? 'down' : 'right');
        return;
      }
    }
    if (!w || !w.mover.at(line.staffSpot)) return;
    w.mover.face(line.kind === 'station' ? 'down' : 'right');
    if (line.duration <= 0) line.duration = this.autoDuration(line, front, w);
    line.progress += dt;
    if (line.progress >= line.duration) {
      const skill = this.lineSkill(line);
      this.gainSkill(w, skill, line.kind === 'register' ? 2 + front.itemCount() * 0.3 : 3);
      this.equipExp(this.lineEquip(line), 1);
      this.finishService(line, { accuracy: 1, seconds: 0, manual: false });
      if (line.kind === 'bagging' && this.rng.chance(0.18 / w.speed('bagging'))) {
        const st = this.state.npcs[front.npc.id];
        changeAffinity(st.fond, -1);
      }
    }
  }

  lineSkill(line: Line): Skill {
    if (line.kind === 'register') return 'checkout';
    if (line.kind === 'bagging') return 'bagging';
    return line.station as Skill;
  }

  lineEquip(line: Line): EquipKind {
    return line.kind === 'register' ? 'register' : line.kind === 'bagging' ? 'bagging' : (line.station as EquipKind);
  }

  private autoDuration(line: Line, c: Customer, w: Worker): number {
    const sp = w.speed(this.lineSkill(line)) * equipSpeed(this.state.equipment[this.lineEquip(line)].level);
    if (line.kind === 'register') {
      const items = c.itemCount();
      const bagInline = this.bagging ? 0 : 0.12 * items;
      return (1.2 + 0.22 * items + (c.cash ? 2.2 : 0.4) + bagInline) / sp;
    }
    if (line.kind === 'bagging') return (1 + 0.3 * c.itemCount()) / sp;
    const o = c.order!;
    if (o.kind === 'oden') return (2.5 + 0.35 * Object.values(o.items).reduce((a, b) => a + (b ?? 0), 0)) / sp;
    if (o.kind === 'deli') return 4 / sp;
    return (2.2 + 0.5 * o.drink.steps.length) / sp;
  }

  // ---------- oven ----------

  manualEligible(line: Line, c: Customer): boolean {
    if (line.kind === 'register') return c.cash && !!c.payment;
    if (line.kind === 'station') return !!c.order;
    return true;
  }

  /** Real-time countdowns, independent of game speed so the player always has time to react. */
  tickReal(dt: number): void {
    for (const line of this.allLines()) {
      if (line.front() !== line.offerFor) line.offerFor = null;
      if (line.offerFor) line.offer = Math.max(0, line.offer - dt);
    }
    if (this.oven.phase === 'ready') this.ovenOffer = Math.max(0, this.ovenOffer - dt);
  }

  ovenOffer = 0;
  speed = 1;

  offerSeconds(base: number): number {
    return base / Math.sqrt(this.speed);
  }

  private updateOven(dt: number): void {
    const o = this.oven;
    if (o.phase === 'baking') {
      o.t += dt;
      if (o.t >= BAKE_MIN) {
        this.oven = { phase: 'ready', bread: o.bread, t: 0 };
        this.ovenOffer = this.offerSeconds(OVEN_OFFER_SECONDS);
      }
    } else if (o.phase === 'ready') {
      if (this.ovenOffer > 0) return;
      o.t += dt;
      if (o.t > BURN_AFTER) {
        this.oven = { phase: 'idle' };
        this.floaters.push({ text: 'X', x: this.stationSpot('bakery')!.x, y: 1, t: 0, color: '#e06060' });
      }
    }
  }

  ovenNeedsLoad(): boolean {
    if (this.oven.phase !== 'idle' || !this.stationSpot('bakery') || this.closing) return false;
    if (this.clock > DAY_END - BAKE_MIN - 10) return false;
    const bk = this.state.bakery;
    const total = BREADS.reduce((a, b) => a + bk[b].good + bk[b].golden, 0);
    return total < 6;
  }

  private startBake(): void {
    const bk = this.state.bakery;
    const bread = BREADS.slice().sort((a, b) => bk[a].good + bk[a].golden - (bk[b].good + bk[b].golden))[0];
    const cost = BREAD_PRICE[bread] * BREAD_COST_RATIO * BATCH;
    this.state.money -= cost;
    this.stats.goodsCost += cost;
    this.oven = { phase: 'baking', bread, t: 0 };
  }

  /** Collects the batch; qualities from the manual mini-game or all 'good' when automatic. */
  unloadOven(qualities: (BreadQuality | 'burnt' | 'raw')[]): void {
    const o = this.oven;
    if (o.phase !== 'ready' && o.phase !== 'baking') return;
    const per = BATCH / qualities.length;
    for (const q of qualities) {
      if (q === 'good' || q === 'golden') this.state.bakery[o.bread][q] += per;
    }
    this.oven = { phase: 'idle' };
  }

  // ---------- workers ----------

  private release(w: Worker): void {
    if (w.task.type === 'line') {
      w.task.line.worker = null;
      w.task.line.progress = 0;
      w.task.line.duration = 0;
    }
    w.task = { type: 'none' };
    w.carrying = false;
  }

  private claimed(): Set<string> {
    const s = new Set<string>();
    for (const w of this.workers) if (w.task.type === 'restock') s.add(`${w.task.fixture}:${w.task.slot}`);
    return s;
  }

  private canDo(w: Worker, kind: 'register' | 'station' | 'bagging' | 'restock' | 'oven'): boolean {
    switch (w.role) {
      case 'auto':
        return true;
      case 'cashier':
        return kind === 'register' || kind === 'bagging';
      case 'stocker':
        return kind === 'restock' || kind === 'oven';
      case 'service':
        return kind === 'station' || kind === 'bagging' || kind === 'oven';
    }
  }

  private preemptable(w: Worker): boolean {
    return w.task.type === 'none' || (w.task.type === 'restock' && (w.task.phase === 'toStock' || w.task.phase === 'pickup'));
  }

  private assignTasks(): void {
    const urgent = this.allLines().some((l) => !l.worker && l.members.length > 0);
    const idle = this.workers.filter((w) => w.task.type === 'none' || (urgent && this.preemptable(w)));
    if (!idle.length) return;
    const claimed = this.claimed();
    type Job = { score: number; kind: 'register' | 'station' | 'bagging' | 'restock' | 'oven'; pos: P; apply: (w: Worker) => void };
    const jobs: Job[] = [];
    for (const line of this.allLines()) {
      if (line.worker || line.members.length === 0) continue;
      const kind = line.kind === 'register' ? 'register' : line.kind === 'bagging' ? 'bagging' : 'station';
      const base = kind === 'register' ? 10 : kind === 'station' ? 8 : 7;
      jobs.push({
        score: base + line.members.length, kind, pos: line.staffSpot,
        apply: (w) => {
          line.worker = w;
          w.task = { type: 'line', line };
          w.mover.goTo(this.grid, line.staffSpot);
        },
      });
    }
    if (this.ovenNeedsLoad() || (this.oven.phase === 'ready' && this.ovenOffer <= 0)) {
      const busy = this.workers.some((w) => w.task.type === 'oven');
      const sp = this.stationSpot('bakery')!;
      if (!busy) {
        const unload = this.oven.phase === 'ready';
        jobs.push({
          score: unload ? 9 : 5, kind: 'oven', pos: sp.staff,
          apply: (w) => {
            w.task = { type: 'oven', phase: unload ? 'unload' : 'load', timer: 0 };
            w.mover.goTo(this.grid, sp.staff);
          },
        });
      }
    }
    for (const f of this.placed()) {
      const cap = FIXTURES[f.kind].capacity;
      f.slots.forEach((s, i) => {
        const key = `${f.id}:${i}`;
        if (!s.product || claimed.has(key)) return;
        const pri = this.priority.has(key);
        if (s.stock > cap * 0.4 && !pri) return;
        const p = PRODUCT_BY_ID.get(s.product)!;
        if (this.state.money < p.cost) return;
        jobs.push({
          score: 2 + (1 - s.stock / cap) * 3 + (pri ? 4 : 0), kind: 'restock', pos: { x: f.x, y: f.y },
          apply: (w) => {
            w.task = { type: 'restock', fixture: f.id, slot: i, phase: 'toStock', timer: 0 };
            w.mover.goTo(this.grid, this.layout.stockDoor);
          },
        });
      });
    }
    jobs.sort((a, b) => b.score - a.score);
    for (const job of jobs) {
      let best: Worker | null = null;
      let bd = Infinity;
      const lineJob = job.kind === 'register' || job.kind === 'station' || job.kind === 'bagging';
      for (const w of idle) {
        if (!this.canDo(w, job.kind)) continue;
        if (w.task.type !== 'none' && !(lineJob && this.preemptable(w))) continue;
        const t = w.mover.tile;
        const d = Math.abs(t.x - job.pos.x) + Math.abs(t.y - job.pos.y);
        if (d < bd) {
          bd = d;
          best = w;
        }
      }
      if (best) {
        best.carrying = false;
        job.apply(best);
      }
    }
    for (const w of idle) {
      if (w.task.type === 'none' && w.mover.path.length === 0 && w.role === 'cashier') {
        const r = this.registers.find((l) => !l.worker);
        if (r && !w.mover.at(r.staffSpot)) w.mover.goTo(this.grid, r.staffSpot);
      }
    }
  }

  private updateWorker(w: Worker, dt: number): void {
    w.mover.step(dt, 1.0 * w.speed('walk'));
    if (w.mover.moving) this.gainSkill(w, 'walk', dt * 0.05);
    if (w.bubble && w.bubble.until < this.clock) w.bubble = null;
    const t = w.task;
    if (t.type === 'restock') this.updateRestock(w, t, dt);
    else if (t.type === 'oven') {
      if (w.mover.path.length) return;
      w.mover.face('up');
      t.timer += dt;
      const need = 2 / w.speed('bakery');
      if (t.timer >= need) {
        if (t.phase === 'load' && this.oven.phase === 'idle') this.startBake();
        if (t.phase === 'unload' && this.oven.phase === 'ready') {
          this.unloadOven(['good', 'good', 'good', 'good']);
          this.equipExp('oven', 1);
        }
        this.gainSkill(w, 'bakery', 3);
        w.task = { type: 'none' };
      }
    }
  }

  private updateRestock(w: Worker, t: Extract<Task, { type: 'restock' }>, dt: number): void {
    if (w.mover.path.length) return;
    const f = this.fixture(t.fixture);
    if (!f || !f.placed || !f.slots[t.slot].product) {
      w.task = { type: 'none' };
      w.carrying = false;
      return;
    }
    if (t.phase === 'toStock') {
      t.phase = 'pickup';
      t.timer = 0;
      w.mover.face('up');
      return;
    }
    if (t.phase === 'pickup') {
      t.timer += dt;
      if (t.timer >= 0.8) {
        w.carrying = true;
        const acc = accessTiles(this.grid, f, t.slot);
        t.phase = 'toShelf';
        if (acc.length) w.mover.goTo(this.grid, acc[0]);
      }
      return;
    }
    if (t.phase === 'toShelf') {
      t.phase = 'stocking';
      t.timer = 0;
      this.faceToward(w.mover, f.vertical ? { x: f.x, y: f.y + t.slot } : { x: f.x + t.slot, y: f.y });
      return;
    }
    const s = f.slots[t.slot];
    const cap = FIXTURES[f.kind].capacity;
    const units = cap - s.stock;
    t.timer += dt;
    if (t.timer >= (0.8 + 0.12 * units) / w.speed('restock')) {
      const p = PRODUCT_BY_ID.get(s.product!)!;
      const unit = costOf(this.state, p);
      const n = Math.min(units, Math.floor(this.state.money / unit));
      const key = `${f.id}:${t.slot}`;
      if (n > 0) {
        s.stock += n;
        const c = n * unit;
        this.state.money -= c;
        this.stats.restock += c;
        this.supplierExp(p.id, n * (this.playerPriority.has(key) ? 2 : 1));
      }
      this.priority.delete(key);
      this.playerPriority.delete(key);
      this.gainSkill(w, 'restock', 1 + n * 0.25);
      w.carrying = false;
      w.task = { type: 'none' };
    }
  }

  gainSkill(w: Worker, skill: Skill, amount: number): void {
    const ups = addExp(w.skills[skill], amount, skillExpToNext);
    if (ups > 0) {
      w.bubble = { icon: 'b_heart', until: this.clock + 2 };
      this.emit({ type: 'staffLevel', staff: w.staffId, skill, level: w.skills[skill].level });
    }
  }

  // ---------- manual hooks ----------

  /** Manual service skips the worker; frees the line worker if any. */
  manualLine(line: Line, result: ServiceResult): void {
    const owner = this.workers[0];
    this.gainSkill(owner, this.lineSkill(line), 2);
    this.equipExp(this.lineEquip(line), 3);
    const c = line.front();
    if (c) c.manualServed = true;
    this.finishService(line, result);
  }

  manualOven(qualities: (BreadQuality | 'burnt' | 'raw')[]): void {
    this.equipExp('oven', 3);
    for (const w of this.workers) if (w.task.type === 'oven') w.task = { type: 'none' };
    this.stats.manual += 1;
    this.unloadOven(qualities);
  }

  prioritize(fixture: number, slot: number): void {
    this.priority.add(`${fixture}:${slot}`);
    this.playerPriority.add(`${fixture}:${slot}`);
  }

  private supplierExp(productId: string, units: number): void {
    if (gainSupplier(this.state, productId, units)) {
      const cat = PRODUCT_BY_ID.get(productId)!.cat;
      this.emit({ type: 'growth', what: cat, level: this.state.suppliers[cat].level });
    }
  }

  private equipExp(kind: EquipKind, amount: number): void {
    if (gainEquipment(this.state, kind, amount)) this.emit({ type: 'growth', what: kind, level: this.state.equipment[kind].level });
  }

  /** Suppliers occasionally send free goods; credited as a rebate since shelves start full. */
  private supplierGifts(): void {
    const seen = new Set<string>();
    for (const f of this.placed()) {
      for (const s of f.slots) {
        if (!s.product || seen.has(s.product)) continue;
        seen.add(s.product);
        const p = PRODUCT_BY_ID.get(s.product)!;
        if (!this.rng.chance(giftChance(this.state.suppliers[p.cat].level) / 4)) continue;
        const units = this.rng.int(2, 4);
        const value = units * costOf(this.state, p);
        this.state.money += value;
        this.stats.restock -= value;
        this.emit({ type: 'gift', id: p.id, units, value });
      }
    }
  }

  endDayCosts(): void {
    const wages = this.state.staff.reduce((a, s) => a + s.wage, 0);
    const rent = LEVELS[this.state.level].rent;
    this.state.money -= wages + rent;
    this.stats.wages = wages;
    this.stats.rent = rent;
    const vals = Object.values(this.state.npcs).slice(0, LEVELS[this.state.level].roster);
    this.stats.avgAffinity = vals.reduce((a, b) => a + b.fond.level, 0) / Math.max(1, vals.length);
    this.stats.reputation = this.state.reputation.level;
    this.stats.weather = weatherOf(this.state.seed, this.state.day);
    this.stats.holiday = holidayOf(this.state.day);
  }
}
