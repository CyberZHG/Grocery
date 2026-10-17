import { Rng } from '../core/rng';
import { cashSet, deliOrderSizes, locale, money } from '../i18n';
import { Mover, type Dir } from './agent';
import {
  BREAD_COST_RATIO, BREAD_PRICE, BREADS, COFFEE_COST_RATIO, favBread, DAY_END, DAY_START, DRINKS, LAST_ENTRY,
  LEVELS, MEAT_COST_RATIO, MEAT_PRICE_LB, MEATS, NPC_ROW0, NPCS, ODEN_COST_RATIO, ODEN_ITEMS, ODEN_PRICE,
  offeredIn, OWNER_ROW, PRODUCT_BY_ID, STAFF_ROW0, TRAIT_BY_ID, CATEGORIES, CAT_COATS, isRolling, TOY_PLAY, type CafeToy, CAT_TREASURES, UMBRELLA_COLORS, UMBRELLA_PRICE, GIFT_KINDS, GIFT_LEVELS, unlockedSkills, type Bread, type Category, type BreadQuality, type DrinkDef, type Meat, type NpcDef,
  type OdenItem, type Skill, type StationKind,
} from './defs';
import { sunPatches, sunTiles } from './ambience';
import { dateOf, demandMult, holidayOf, stationMult, streetCart, trafficMult, weatherOf } from './calendar';
import {
  capacityOf, catAppeal, catLover, costOf, equipSpeed, gainRack, gainCat, gainEquipment, gainReputation, gainSupplier, giftChance, PETS_PER_DAY, repTraffic, rosterSize, type EquipKind, type RackKind,
} from './growth';
import { collectionCount, collectionMult, isUnlocked, priceMult, productExpToNext, unlockOrder, unlockedCount } from './progress';
import { streetFx, type StreetFx } from './street';
import { chainPriceMult, inCafe, isFresh, peaksOf, perksOf, rulesOf, storeLayout, type Perks, type Rules } from './chain';
import { accessTiles, entryTile, fixtureCells, Grid, serveTiles, spawnTile, type Layout, type P, type StationSpot } from './layout';
import {
  addExp, affinityValue, budgetMult, CASH, changeAffinity, makeCashPayment, npcExpToNext, roundCash, serviceReward, skillExpToNext, skillSpeed, waitPenalty,
  type CashPayment, type Leveled, type ServiceResult,
} from './rules';
import { openingBuzz, takeStored, unlockedBreads, wageOf, type DayStats, type FixtureState, type GameState, type Role } from './state';

export interface BasketItem {
  kind: 'product' | 'oden' | 'deli' | 'coffee' | 'bread';
  id: string;
  price: number;
  cost: number;
  qty: number;
}

export type OdenOrder = { kind: 'oden'; items: Partial<Record<OdenItem, number>> };
export type PasserKind = 'dog' | 'sparrows' | 'pigeon' | 'butterfly' | 'squirrel' | 'raccoon';
export interface Passer {
  id: number;
  kind: PasserKind;
  x: number;
  y: number;
  dir: 1 | -1;
  /** tiles per game minute */
  speed: number;
  /** which regular's look the dog walker borrows, and the dog's coat */
  look: number;
  coat: number;
  stopUntil: number;
  leaveAt: number;
  /** clock when birds took off; -1 while they're still here */
  flee: number;
  /** when it showed up: sparrows spend the first moment flying down to land */
  since: number;
  /** a startled squirrel bolting off */
  bolt?: boolean;
}
export type DeliOrder = { kind: 'deli'; meat: Meat; pounds: number };
export type CoffeeOrder = { kind: 'coffee'; drink: DrinkDef };
export type Order = OdenOrder | DeliOrder | CoffeeOrder;

type Target =
  | { t: 'slot'; fixture: number; slot: number }
  | { t: 'station'; kind: StationKind }
  | { t: 'bakery' }
  | { t: 'decor'; fixture: number };

type CustState = 'shop' | 'browse' | 'queue' | 'served' | 'leave';

export interface Bubble {
  icon: string;
  until: number;
}

/** A short body animation that goes with an interaction; drawn by the renderer. */
export type ActKind = 'talk' | 'wave' | 'laugh' | 'point' | 'reach' | 'cheer' | 'stretch' | 'hop' | 'photo' | 'crouch'
  | 'wiggle' | 'arch' | 'beg' | 'box' | 'play' | 'eat' | 'swipe' | 'read';

export interface Act {
  kind: ActKind;
  at: number;
  until: number;
}

/** Something handed over or floating up: candy, a sticker, a treat, a product, music notes, a spark. */
export interface Prop {
  kind: 'candy' | 'sticker' | 'treat' | 'item' | 'notes' | 'spark';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  at: number;
  dur: number;
  index?: number;
}

type Actor = { bubble: Bubble | null; act: Act | null };

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
  sawCat = false;
  manualServed = false;
  /** Greeting strength of the worker who welcomed this customer; softens waiting. */
  greet = 0;
  /** Bench this customer is sitting on. */
  seat: number | null = null;
  /** cafe toy this customer is waving about */
  using: number | null = null;
  act: Act | null = null;
  /** running (playing tag) until this minute */
  runUntil = -Infinity;
  /** last chat, wave or photo, so nobody socializes nonstop */
  socialAt = -Infinity;
  /** umbrella colour on a wet day */
  umbrella: string | null = null;
  /** Last item taken off a shelf, for the hand-to-basket animation. */
  pick: { index: number; x: number; y: number; at: number; fixture: number; slot: number } | null = null;

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
  /** Game minute the last customer here was served. */
  doneAt = -1;
  /** a card-only express counter */
  card = false;

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
  | { type: 'clean'; spill: number; timer: number }
  | { type: 'tidy'; fixture: number; timer: number }
  | { type: 'cat'; timer: number }
  | { type: 'rest'; fixture: number; timer: number }
  | { type: 'none' };

export interface Spill {
  id: number;
  x: number;
  y: number;
  kind: 'puddle' | 'crumbs';
  age: number;
}

type JobKind = 'register' | 'station' | 'bagging' | 'restock' | 'oven' | 'clean' | 'tidy' | 'cat';

export type DayEvent = { kind: 'tour'; at: number } | { kind: 'blogger' } | { kind: 'late'; cat: Category; until: number };

export class Worker {
  mover: Mover;
  task: Task = { type: 'none' };
  carrying = false;
  bubble: Bubble | null = null;
  idleFor = 0;
  act: Act | null = null;
  /** a short speed lift after a break on a bench */
  boost = 1;
  boostUntil = -Infinity;

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
    return skillSpeed(this.skills[s].level) * (tr && tr.skill === s ? tr.mult : 1) * this.boost;
  }

  /** 0 at level 1, about 0.35 at level 10 and 0.7 at level 100. */
  power(s: Skill): number {
    return this.speed(s) - 1;
  }
}

type CatGoal = 'tower' | 'fish' | 'friend' | 'leave' | 'rub' | 'follow' | 'box' | 'toy' | 'perch' | 'maneki' | 'sun';

export class CatAgent {
  mover: Mover;
  mode: 'walk' | 'sit' | 'sleep' | 'groom' | 'stretch' | 'loaf' = 'sleep';
  timer = 0;
  bubble: Bubble | null = null;
  /** where the cat is headed and why */
  goal: { kind: CatGoal; fixture?: number; who?: Mover; steps?: number } | null = null;
  /** up on something: which fixture, the tile, the pixel top of the cat sprite, and its draw depth */
  perch: { fixture: number; x: number; y: number; top: number; depth: number } | null = null;
  act: Act | null = null;
  /** cafe toy it is playing with */
  toy: number | null = null;
  /** last time it batted a rolling toy */
  batAt = -Infinity;
  /** a game of tag with another cat: who it is, whether this one is chasing, and when they stop */
  tag: { other: CatAgent; it: boolean; until: number } | null = null;
  /** coat and accessory for cats from other stores; the store's own cat uses the saved look */
  coat?: string;
  acc?: string | null;

  constructor(p: P) {
    this.mover = new Mover(p);
  }
}

/** A cat from another store in the chain, dropping by for a while. */
export interface GuestCat {
  store: number;
  coat: string;
  acc: string | null;
  name: string;
  level: number;
  mood: number;
  arriveAt: number;
  leaveAt: number;
  agent: CatAgent | null;
  gone: boolean;
  /** the two cats have already sized each other up */
  met?: boolean;
}

/** Sprite heights of fixtures a cat can climb, horizontal and vertical. */
const PERCH_HEIGHT: Partial<Record<string, [number, number]>> = { fridge: [72, 104], freezer: [48, 80] };
const T = 32;

/** How likely each kind of shopper is to stop at a decoration. */
const DECOR_VISIT: Record<string, Record<'adult' | 'kid' | 'elder', number>> = {
  aquarium: { adult: 0.25, kid: 0.5, elder: 0.3 },
  gumball: { adult: 0.05, kid: 0.6, elder: 0.03 },
  magazine: { adult: 0.2, kid: 0.05, elder: 0.25 },
  bench: { adult: 0.05, kid: 0.05, elder: 0.4 },
  toy_wand: { adult: 0.15, kid: 0.35, elder: 0.1 },
  toy_fishing: { adult: 0.15, kid: 0.3, elder: 0.1 },
  toy_ribbon: { adult: 0.12, kid: 0.3, elder: 0.12 },
  toy_laser: { adult: 0.2, kid: 0.3, elder: 0.05 },
};

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
  | { type: 'growth'; what: 'reputation' | 'cat' | EquipKind | RackKind | Category; level: number }
  | { type: 'gift'; id: string; units: number; value: number }
  | { type: 'reliefGift'; units: number; value: number }
  | { type: 'gifts'; units: number; value: number }
  | { type: 'npcGift'; npc: string; kind: string }
  | { type: 'friend'; by: string; friend: string }
  | { type: 'sold'; cat: Category; qty: number }
  | { type: 'served' }
  | { type: 'event'; event: DayEvent }
  | { type: 'tourArrived' }
  | { type: 'unlock'; id: string }
  | { type: 'collection'; cat: Category }
  | { type: 'guestCat'; store: number }
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
  /** Animals and dog walkers going past outside; just for looks, with their own random numbers. */
  passers: Passer[] = [];
  /** wet shoe prints inside the door on rainy and snowy days */
  footprints: { x: number; y: number; age: number; flip: boolean }[] = [];
  /** the morning delivery: someone wheeling boxes from a van to the stock door and back */
  delivery: { mover: Mover | null; phase: 'arrive' | 'in' | 'drop' | 'out' | 'leave'; timer: number; vanX: number; parkX: number } | null = null;
  private delivered = false;
  private passRng: Rng;
  private nextPasser = 1;
  workers: Worker[] = [];
  registers: Line[] = [];
  stations = new Map<StationKind, Line>();
  bagging: Line | null = null;
  oven: OvenState = { phase: 'idle' };
  arrivals: { t: number; npc: NpcDef }[] = [];
  stats: DayStats;
  readonly rules: Rules;
  readonly perks: Perks;
  readonly street: StreetFx;
  priority = new Set<string>();
  playerPriority = new Set<string>();
  floaters: Floater[] = [];
  closing = false;
  done = false;
  listeners: ((e: SimEvent) => void)[] = [];
  cat: CatAgent;
  spills: Spill[] = [];
  event: DayEvent | null = null;
  sold = new Map<string, number>();
  stockouts = new Map<string, number>();
  /** Shelves a worker has faced up, with purchases left before they look picked over again. */
  tidy = new Map<number, { left: number; power: number }>();
  /** bench fixture id → whoever is sitting on it */
  seats = new Map<number, Customer | Worker>();
  guest: GuestCat | null = null;
  readonly cafe: boolean;
  /** rolling toys in motion: velocity in tiles per game minute */
  private roll = new Map<number, { vx: number; vy: number }>();
  /** in the cat cafe: every other store's cat */
  visitors: CatAgent[] = [];
  readonly weather: string;
  /** camera flashes from customers photographing a cat */
  flashes: { x: number; y: number; at: number }[] = [];
  props: Prop[] = [];
  private socialT = 0;
  private queued: { at: number; who: Actor; icon: string | null; min: number; act?: ActKind }[] = [];
  private greeted = false;
  private catCareAt = -Infinity;
  private nextSpill = 1;
  private nextCust = 1;

  constructor(readonly state: GameState) {
    this.layout = storeLayout(state);
    this.weather = weatherOf(state.seed, state.day);
    this.passRng = new Rng((state.seed * 41 + state.day * 3163) | 0);
    this.rules = rulesOf(state);
    this.perks = perksOf(state);
    this.street = streetFx(state.street);
    this.grid = new Grid(this.layout, this.placed());
    this.rng = new Rng((state.seed + state.day * 7919) | 0);
    this.stats = {
      day: state.day, revenue: 0, goodsCost: 0, wages: 0, rent: 0, restock: 0, customers: 0, manual: 0, levelUps: 0, avgAffinity: 0,
      angry: 0, cash: 0, cleaned: 0, fresh: 0,
    };
    this.cafe = inCafe(state);
    this.buildLines();
    this.cat = new CatAgent(this.catSpot());
    if (this.cafe) {
      for (const slot of state.stores) {
        if (!slot.saved) continue;
        const k = new CatAgent(this.catSpot());
        k.coat = slot.saved.catCoat;
        k.acc = slot.saved.catAcc;
        k.mode = 'sit';
        k.timer = this.rng.range(2, 20);
        this.visitors.push(k);
      }
      // coats no store has get to live here: the cafe is where they turn up
      const seen = new Set(this.cats().map((k) => k.coat ?? state.catCoat));
      for (const coat of CAT_COATS.filter((c) => !seen.has(c))) {
        const k = new CatAgent(this.catSpot());
        k.coat = coat;
        k.acc = null;
        k.mode = 'sleep';
        k.timer = this.rng.range(5, 30);
        this.visitors.push(k);
      }
    }
  }

  /** Random open floor tile in the store interior, off the queues and away from where anyone is headed. */
  /** A tile where a resting cat can be seen: open floor with nothing standing right in front of it. */
  private catVisible(x: number, y: number): boolean {
    const g = this.grid;
    return g.walkable(x, y) && (!g.inside(x, y + 1) || g.walkable(x, y + 1));
  }

  private catSpot(): P {
    const taken = this.cat ? this.allMovers().filter((m) => m !== this.cat.mover).map((m) => m.dest) : [];
    const ok = (p: P) => this.catVisible(p.x, p.y) && !this.layout.reserved[p.y * this.layout.w + p.x] && !taken.some((t) => t.x === p.x && t.y === p.y);
    for (let i = 0; i < 40; i++) {
      const p = { x: this.rng.int(0, this.layout.w - 1), y: this.rng.int(1, this.layout.h - 3) };
      if (ok(p)) return p;
    }
    for (let y = this.layout.h - 3; y >= 1; y--) {
      for (let x = 0; x < this.layout.w; x++) if (ok({ x, y })) return { x, y };
    }
    return entryTile(this.layout);
  }

  // ---------- social ----------

  /** A stocked slot next to this tile: where it is and what's on it. */
  private stockNear(p: P): { p: P; index: number } | null {
    for (const f of this.placed()) {
      if (f.kind === 'decor') continue;
      const cells = fixtureCells(f);
      for (let i = 0; i < 2; i++) {
        const sl = f.slots[i];
        const c = cells[i];
        if (sl.product && sl.stock > 0 && Math.abs(c.x - p.x) + Math.abs(c.y - p.y) === 1) return { p: { x: c.x, y: c.y - 0.6 }, index: PRODUCT_BY_ID.get(sl.product)!.index };
      }
    }
    return null;
  }

  private nextToStock(p: P): boolean {
    return this.placed().some((f) => f.kind !== 'decor' && f.slots.some((sl) => sl.stock > 0)
      && fixtureCells(f).some((c) => Math.abs(c.x - p.x) + Math.abs(c.y - p.y) === 1));
  }

  /** Regulars who know each other: a fixed web, about one pair in five. */
  private knows(a: NpcDef, b: NpcDef): boolean {
    const i = Math.min(a.index, b.index);
    const j = Math.max(a.index, b.index);
    return ((i * 73 + j * 151 + this.state.seed) % 3) === 0 || (a.kind === 'elder' && b.kind === 'elder') || (a.kind === 'kid' && b.kind === 'kid');
  }

  /** Stop where you are for a moment, then carry on shopping. */
  private pause(c: Customer, minutes: number, face?: P): void {
    if (c.mover.path.length) this.walk(c.mover, c.mover.tile);
    c.state = 'browse';
    c.timer = Math.max(c.timer, minutes);
    c.socialAt = this.clock;
    if (face) this.faceToward(c.mover, face);
  }

  private bump(m: Mover): void {
    const c = this.customers.find((x) => x.mover === m);
    if (c && !c.bubble && c.state !== 'leave') {
      c.bubble = { icon: 'b_exclaim', until: this.clock + 1 };
      this.doAct(c, 'hop', 0.4);
    }
  }

  /** A bubble that pops up a moment later, for little back-and-forth exchanges. */
  private later(who: Actor, icon: string | null, after: number, min = 1.2, act?: ActKind): void {
    this.queued.push({ at: this.clock + after, who, icon, min, act });
  }

  private flushLater(): void {
    const due = this.queued.filter((q) => q.at <= this.clock);
    if (!due.length) return;
    this.queued = this.queued.filter((q) => q.at > this.clock);
    for (const q of due) {
      if (q.icon) q.who.bubble = { icon: q.icon, until: this.clock + q.min };
      if (q.act) this.doAct(q.who, q.act, q.min);
    }
  }

  private doAct(who: Actor, kind: ActKind, min: number): void {
    who.act = { kind, at: this.clock, until: this.clock + min };
  }

  /** Starts `delay` minutes from now; the renderer skips it until then. */
  private prop(kind: Prop['kind'], from: P, to: P, dur: number, index?: number, delay = 0): void {
    this.props.push({ kind, x0: from.x, y0: from.y, x1: to.x, y1: to.y, at: this.clock + delay, dur, index });
  }

  /** Every so often, two people (or a person and a cat) near each other do something together. */
  private socialize(dt: number): void {
    this.flushLater();
    this.socialT += dt;
    if (this.socialT < 0.5 || this.closing) return;
    this.socialT = 0;
    const near = (a: Mover, b: Mover, d: number) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= d;
    const people = this.rng.shuffle(this.customers.filter((c) => (c.state === 'shop' || c.state === 'browse') && c.seat === null && !c.hurry
      && !c.bubble && this.clock - c.socialAt > 25 && c.mover.y < this.layout.h - 0.5));
    const cats = this.cats().filter((k) => k.mode !== 'sleep' && !k.perch && k.goal?.kind !== 'leave');
    const idle = this.workers.filter((w) => w.task.type === 'none' && !w.bubble);
    // a bubble plus the matching body animation
    const say = (who: Actor, icon: string | null, min = 2, act?: ActKind) => {
      if (icon) who.bubble = { icon, until: this.clock + min };
      if (act) this.doAct(who, act, min);
    };
    const at = (m: Mover): P => ({ x: m.x, y: m.y });

    // morning: staff say hello as the doors open
    if (this.clock < DAY_START + 20 && !this.greeted) {
      const [a, b] = this.workers;
      if (a && b) {
        this.greeted = true;
        say(a, 'b_wave', 1.5, 'wave');
        this.later(b, 'b_wave', 0.4, 1.5, 'wave');
      }
    }

    // two shoppers
    outer: for (const a of people) {
      for (const b of people) {
        if (a === b || !near(a.mover, b.mover, 2)) continue;
        if (a.npc.kind === 'kid' && b.npc.kind === 'kid' && this.rng.chance(0.5)) {
          // tag: one runs off, the other gives chase
          const from = b.mover.tile;
          say(a, 'b_laugh', 2);
          say(b, 'b_laugh', 2);
          a.state = b.state = 'browse';
          a.timer = b.timer = 2;
          a.socialAt = b.socialAt = this.clock;
          a.runUntil = b.runUntil = this.clock + 2;
          const run = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => ({ x: from.x + dx, y: from.y + dy })).filter((p) => this.grid.walkable(p.x, p.y) && p.y < this.layout.h - 1);
          if (run.length) this.walk(b.mover, this.rng.pick(run));
          this.walk(a.mover, from);
          this.later(a, null, 2, 0.8, 'laugh');
          this.later(b, null, 2, 0.8, 'laugh');
        } else if (a.npc.kind === 'elder' && b.npc.kind === 'kid' && this.rng.chance(0.3)) {
          // an older regular slips a kid a sweet
          this.pause(a, 1.2, b.mover.tile);
          this.pause(b, 1.2, a.mover.tile);
          say(a, 'b_star', 1, 'reach');
          this.prop('candy', at(a.mover), at(b.mover), 0.5);
          this.later(b, 'b_heart', 0.5, 1, 'laugh');
          b.affinityDelta += 0.3;
        } else if (this.knows(a.npc, b.npc) && this.rng.chance(0.6)) {
          const fav = this.recommendation(a, b);
          if (fav) {
            // word of mouth: a favourite gets added to the friend's list
            this.pause(a, 1.5, b.mover.tile);
            this.pause(b, 1.5, a.mover.tile);
            say(a, 'b_star', 1.5, 'point');
            const f = this.fixture(fav.t === 'slot' ? fav.fixture : -1);
            const id = fav.t === 'slot' ? f?.slots[fav.slot].product : null;
            if (id) this.prop('item', at(a.mover), at(b.mover), 0.6, PRODUCT_BY_ID.get(id)!.index);
            this.later(b, 'b_question', 0.5, 1, 'talk');
            b.targets.unshift(fav);
          } else {
            const len = this.rng.range(2, 3);
            this.pause(a, len, b.mover.tile);
            this.pause(b, len, a.mover.tile);
            say(a, 'b_chat', len, 'talk');
            say(b, 'b_laugh', len, 'laugh');
            this.later(a, null, len / 2, len / 2, 'laugh');
            this.later(b, null, len / 2, len / 2, 'talk');
          }
          a.affinityDelta += 0.3;
          b.affinityDelta += 0.3;
        } else if (this.rng.chance(0.25)) {
          a.socialAt = b.socialAt = this.clock;
          say(a, 'b_wave', 1.2, 'wave');
          this.later(b, 'b_wave', 0.3, 1.2, 'wave');
        } else continue;
        break outer;
      }
    }
    // friends waiting in the same line pass the time talking
    for (const line of this.allLines()) {
      for (let i = 0; i + 1 < line.members.length; i++) {
        const [a, b] = [line.members[i], line.members[i + 1]];
        if (a.bubble || b.bubble || !this.knows(a.npc, b.npc) || !this.rng.chance(0.05)) continue;
        say(a, 'b_chat', 2, 'talk');
        this.later(b, 'b_laugh', 0.5, 2, 'laugh');
        a.wait = Math.max(0, a.wait - 2);
        b.wait = Math.max(0, b.wait - 2);
        break;
      }
    }
    for (const c of people) {
      if (c.bubble) continue;
      const cat = cats.find((k) => near(k.mover, c.mover, c.npc.kind === 'kid' ? 2 : 3));
      if (cat && c.npc.kind === 'kid' && this.rng.chance(0.5)) {
        // a kid pounces on the cat: it either bolts or puts up with a pat
        this.pause(c, 1.5, cat.mover.tile);
        say(c, 'b_laugh', 0.6, 'hop');
        this.later(c, null, 0.6, 0.9, 'crouch');
        if (this.rng.chance(0.5)) {
          say(cat, 'b_exclaim', 0.5, 'hop');
          cat.mode = 'walk';
          cat.goal = null;
          this.walk(cat.mover, this.catSpot());
        } else {
          this.later(cat, 'b_heart', 0.6, 1.5, 'wiggle');
          c.affinityDelta += 0.4;
        }
        break;
      }
      if (cat && cat.mode !== 'walk' && catLover(c.npc.index) && this.rng.chance(0.4)) {
        this.pause(c, 1.2, cat.mover.tile);
        say(c, 'b_camera', 1.2, 'photo');
        this.flashes.push({ x: cat.mover.x, y: cat.mover.y, at: this.clock + 0.4 });
        c.affinityDelta += 0.5;
        break;
      }
      if (cat && near(cat.mover, c.mover, 1.5) && this.rng.chance(0.15)) {
        this.pause(c, 1.2, cat.mover.tile);
        say(c, 'b_heart', 1.2, 'crouch');
        this.later(cat, 'b_heart', 0.3, 1.2, 'wiggle');
        c.affinityDelta += 0.3;
        if (cat === this.cat) this.state.cat.mood = Math.min(100, this.state.cat.mood + 1);
        break;
      }
      const w = idle.find((x) => near(x.mover, c.mover, 3));
      if (w && this.rng.chance(c.npc.kind === 'kid' ? 0.35 : 0.2)) {
        this.pause(c, 1.8, w.mover.tile);
        this.faceToward(w.mover, c.mover.tile);
        say(c, 'b_question', 0.6, 'talk');
        if (c.npc.kind === 'kid') {
          // a sticker for the kid
          this.later(w, 'b_star', 0.6, 0.8, 'reach');
          this.prop('sticker', at(w.mover), at(c.mover), 0.5, undefined, 0.7);
          this.later(c, 'b_heart', 1.2, 1, 'laugh');
        } else {
          // asking where something is: staff points the way, then thanks
          this.later(w, 'b_chat', 0.6, 1, 'point');
          this.later(c, 'b_star', 1.3, 0.8, 'wave');
        }
        this.gainSkill(w, 'greet', 0.3);
        c.affinityDelta += 0.3;
        break;
      }
    }
    // staff on the move wave to a shopper they pass
    const passing = this.workers.find((w) => !w.bubble && w.mover.path.length);
    const shopper = passing && people.find((c) => !c.bubble && near(c.mover, passing.mover, 1.5));
    if (passing && shopper && this.rng.chance(0.08)) {
      say(passing, 'b_wave', 1, 'wave');
      this.later(shopper, 'b_wave', 0.3, 1, 'wave');
      shopper.socialAt = this.clock;
    }
    // staff with nothing to do have a word, stop to fuss over the cat, or stretch and yawn
    const [w1, w2] = this.rng.shuffle(idle.filter((w) => !w.mover.path.length));
    if (w1 && w2 && near(w1.mover, w2.mover, 3) && this.rng.chance(0.3)) {
      this.faceToward(w1.mover, w2.mover.tile);
      this.faceToward(w2.mover, w1.mover.tile);
      say(w1, 'b_chat', 2, 'talk');
      this.later(w2, 'b_laugh', 0.6, 1.6, 'laugh');
    } else if (w1) {
      const cat = cats.find((k) => near(k.mover, w1.mover, 1.5));
      if (cat && this.rng.chance(0.2)) {
        this.faceToward(w1.mover, cat.mover.tile);
        say(w1, 'b_heart', 1.5, 'crouch');
        this.later(cat, 'b_heart', 0.3, 1.2, 'wiggle');
        if (cat === this.cat) this.state.cat.mood = Math.min(100, this.state.cat.mood + 1);
      } else if (this.rng.chance(0.04)) {
        w1.mover.face('down');
        say(w1, 'b_zzz', 1.5, 'stretch');
      }
    }
  }

  /** Something the shopper liked that the friend could pick up here. */
  private recommendation(a: Customer, b: Customer): Target | null {
    const left = b.budget - b.spent;
    for (const item of a.basket) {
      if (item.kind !== 'product' || !a.npc.favs.includes(item.id) || b.basket.some((x) => x.id === item.id)) continue;
      if (this.priceOf(item.id) > left) continue;
      for (const f of this.placed()) {
        const i = f.slots.findIndex((sl) => sl.product === item.id && sl.stock > 0);
        if (i >= 0) return { t: 'slot', fixture: f.id, slot: i };
      }
    }
    return null;
  }

  /** Rain or snow: an umbrella bought at the door or brought from home, and now and then wet footprints. */
  private rainyEntry(c: Customer): void {
    if (this.weather !== 'rain' && this.weather !== 'snow') return;
    if (this.weather === 'rain' && this.rng.chance(0.25)) {
      this.state.money += UMBRELLA_PRICE;
      this.stats.revenue += UMBRELLA_PRICE;
      this.state.lifetime.revenue += UMBRELLA_PRICE;
      const e = entryTile(this.layout);
      this.floaters.push({ text: `+${money(UMBRELLA_PRICE)}`, x: e.x + 0.5, y: e.y, t: 0, color: '#f0c040' });
      c.umbrella = this.rng.pick([...UMBRELLA_COLORS]);
    } else if (this.weather === 'rain' && this.rng.chance(0.6)) c.umbrella = this.rng.pick([...UMBRELLA_COLORS]);
    if (this.spills.length < 5 && this.rng.chance(0.12)) {
      const e = entryTile(this.layout);
      const at = [1, 2, 3].map((k) => ({ x: e.x + this.rng.int(-1, 1), y: e.y - k })).find((p) => this.spillVisible(p.x, p.y));
      if (at) this.spills.push({ id: this.nextSpill++, x: at.x, y: at.y, kind: 'puddle', age: 0 });
    }
  }

  // ---------- rolling toys ----------

  /** Toys rolling right now. */
  /** People in line for coffee or on their way to it. */
  private coffeeCrowd(): number {
    const line = this.stations.get('coffee');
    const going = this.customers.filter((c) => c.state !== 'queue' && c.state !== 'leave' && c.targets[0]?.t === 'station' && c.targets[0].kind === 'coffee').length;
    return (line?.members.length ?? 0) + going;
  }

  /** A wet customer leaves a few shoe prints just inside the door. */
  private trackIn(x: number): void {
    const l = this.layout;
    const r = this.passRng;
    for (let k = 0; k < 3; k++) {
      this.footprints.push({ x: x + r.range(-0.25, 0.25), y: l.h - 0.7 - k * 0.55 + r.range(-0.1, 0.1), age: 0, flip: k % 2 === 1 });
    }
    if (this.footprints.length > 60) this.footprints.splice(0, this.footprints.length - 60);
  }

  /** Prints dry out over a few hours; when they pile up, the mat area turns into a spill for staff to mop. */
  private updateFootprints(dt: number): void {
    for (const f of this.footprints) f.age += dt;
    this.footprints = this.footprints.filter((f) => f.age < 180);
    const l = this.layout;
    const e = entryTile(l);
    const nearDoor = (s: { x: number; y: number }) => Math.abs(s.x - e.x) <= 2 && Math.abs(s.y - e.y) <= 2;
    if (this.footprints.length >= 18 && this.spills.length < 5 && !this.spills.some(nearDoor)) {
      const at = [{ x: e.x, y: e.y - 1 }, { x: e.x + 1, y: e.y - 1 }, { x: e.x - 1, y: e.y - 1 }].find((p) => this.spillVisible(p.x, p.y));
      if (at) this.spills.push({ id: this.nextSpill++, x: at.x, y: at.y, kind: 'puddle', age: 0 });
    }
  }

  /** Mopping near the door takes the prints around it too. */
  private mopPrints(sp: { x: number; y: number }): void {
    this.footprints = this.footprints.filter((f) => Math.abs(f.x - sp.x) + Math.abs(f.y - sp.y) > 3);
  }

  /**
   * Shortly after opening, a delivery van drives up the street and parks by the door; the driver wheels boxes
   * in to the stock door, comes back, and the van drives off the other way.
   */
  private updateDelivery(dt: number): void {
    const l = this.layout;
    if (!this.delivery && !this.delivered && !this.closing && this.clock >= DAY_START + 6) {
      this.delivered = true;
      const parkX = l.mirrored ? l.entrance - 4 : l.entrance + 3;
      // the van's cab is on the right, so it comes in from the left and drives on to the right
      this.delivery = { mover: null, phase: 'arrive', timer: 0, vanX: -4, parkX };
    }
    const d = this.delivery;
    if (!d) return;
    const VAN_SPEED = 5;
    if (d.phase === 'arrive') {
      // slow down as it pulls in
      d.vanX = Math.min(d.parkX, d.vanX + Math.max(0.6, Math.min(VAN_SPEED, (d.parkX - d.vanX) * 1.5)) * dt);
      if (d.vanX >= d.parkX) {
        d.phase = 'in';
        d.mover = new Mover({ x: Math.round(d.parkX), y: l.h + 1 });
        this.walk(d.mover, l.stockDoor);
      }
      return;
    }
    if (d.phase === 'leave') {
      d.timer += dt;
      d.vanX += Math.min(VAN_SPEED, 0.6 + d.timer * 3) * dt;
      if (d.vanX > l.w + 3) this.delivery = null;
      return;
    }
    const m = d.mover!;
    m.step(dt, 0.9);
    if (d.phase === 'in' && !m.path.length) {
      d.phase = 'drop';
      m.face('up');
    } else if (d.phase === 'drop') {
      d.timer += dt;
      if (d.timer > 2) {
        d.phase = 'out';
        this.walk(m, { x: Math.round(d.parkX), y: l.h + 1 });
      }
    } else if (d.phase === 'out' && !m.path.length) {
      d.phase = 'leave';
      d.timer = 0;
      d.mover = null;
    }
  }

  /** Now and then someone walks a dog past, sparrows hop about or a pigeon wanders by; more often when the shop is quiet. */
  private updatePassers(dt: number): void {
    const l = this.layout;
    const r = this.passRng;
    const n = this.customers.length;
    const quiet = n <= 1 ? 3 : n <= 4 ? 2 : n <= 10 ? 1 : 0.4;
    const weather = this.weather === 'rain' ? 0.4 : this.weather === 'snow' ? 0.3 : 1;
    if (!this.closing && this.passers.length < 3 && r.chance(0.03 * quiet * weather * dt)) {
      const season = dateOf(this.state.day).season;
      const kinds: [PasserKind, number][] = [
        ['dog', 0.4], ['sparrows', 0.3], ['pigeon', 0.2], ['butterfly', season === 'spring' || season === 'summer' ? 0.15 : 0],
        ['squirrel', season === 'winter' ? 0.04 : 0.2],
        // raccoons come out toward evening
        ['raccoon', this.clock >= 16 * 60 ? 0.25 : 0.04],
      ];
      let pick = r.next() * kinds.reduce((a, [, w]) => a + w, 0);
      const kind = kinds.find(([, w]) => (pick -= w) <= 0)![0];
      const dir = r.chance(0.5) ? 1 : -1;
      const p: Passer = {
        id: this.nextPasser++, kind, dir, x: dir > 0 ? -2 : l.w + 1, y: l.h + r.range(1.35, 1.85),
        speed: { dog: 0.8, sparrows: 0, pigeon: 0.35, butterfly: 0.9, squirrel: 2.4, raccoon: 0.55 }[kind], look: r.int(0, 59), coat: r.int(0, 4),
        stopUntil: 0, leaveAt: this.clock + r.range(20, 40), flee: -1, since: this.clock,
      };
      if (kind === 'pigeon') p.speed = r.range(0.25, 0.5);
      // birds drop down somewhere along the sidewalk and stay a while
      if (kind === 'sparrows') p.x = r.range(1, l.w - 2);
      this.passers.push(p);
    }
    const walkers = [...this.customers.map((c) => c.mover), ...this.passers.filter((o) => o.kind === 'dog').flatMap((o) => [{ x: o.x, y: o.y }, { x: o.x + o.dir * 1.1, y: o.y }])];
    for (const p of this.passers) {
      if (p.flee >= 0) continue;
      if (p.kind === 'sparrows' || p.kind === 'pigeon') {
        // birds take off when a person or a dog comes close; sparrows also leave on their own after a while
        const landed = this.clock - p.since > 1;
        const near = walkers.some((m) => Math.abs(m.x - p.x) < 1.6 && Math.abs(m.y - p.y) < 1.2);
        if (landed && (near || (p.kind === 'sparrows' && this.clock > p.leaveAt))) {
          p.flee = this.clock;
          continue;
        }
        if (p.kind === 'sparrows') continue;
      }
      if ((p.kind === 'squirrel' || p.kind === 'raccoon') && !p.bolt) {
        // someone coming close: it freezes upright for a beat, then bolts away from them (a raccoon less quickly)
        const threat = walkers.find((m) => Math.abs(m.x - p.x) < 2 && Math.abs(m.y - p.y) < 1.2);
        if (threat) {
          p.bolt = true;
          p.dir = threat.x < p.x ? 1 : -1;
          p.speed = p.kind === 'squirrel' ? 6 : 2.6;
          p.stopUntil = this.clock + (p.kind === 'squirrel' ? 0.3 : 0.6);
        }
      }
      if (this.clock < p.stopUntil) continue;
      p.x += p.dir * p.speed * dt;
      // a dog stops now and then to sniff something; a squirrel dashes, then sits up to look around
      if (p.kind === 'dog' && r.chance(0.08 * dt)) p.stopUntil = this.clock + r.range(0.8, 2.5);
      if (p.kind === 'squirrel' && !p.bolt && r.chance(0.6 * dt)) p.stopUntil = this.clock + r.range(0.5, 1.8);
      // a pigeon dawdles: stops to peck at the pavement every so often
      if (p.kind === 'pigeon' && r.chance(0.35 * dt)) p.stopUntil = this.clock + r.range(0.4, 1.4);
      // a raccoon stops to rummage at the pavement, or sits up to look around
      if (p.kind === 'raccoon' && !p.bolt && r.chance(0.25 * dt)) p.stopUntil = this.clock + r.range(1, 3);
    }
    this.passers = this.passers.filter((p) => (p.flee >= 0 ? this.clock - p.flee < 1.5 : p.x > -3.5 && p.x < l.w + 2.5));
  }

  rollingToys(): Set<number> {
    return new Set(this.roll.keys());
  }

  toyAt(f: FixtureState): P {
    return f.at ?? { x: f.x, y: f.y };
  }

  /** Inside the store, on open floor, clear of the door rows, counters, staff spots and queues. */
  private floorOk(x: number, y: number): boolean {
    const tx = Math.round(x);
    const ty = Math.round(y);
    return ty >= 1 && ty <= this.layout.h - 3 && this.grid.walkable(tx, ty) && !this.layout.reserved[ty * this.layout.w + tx];
  }

  /** Keeps a ball from sinking halfway into a wall or a counter beside its tile. */
  private clampToFloor(x: number, y: number): P {
    const tx = Math.round(x);
    const ty = Math.round(y);
    const m = 0.25;
    if (!this.floorOk(tx - 1, ty)) x = Math.max(x, tx - m);
    if (!this.floorOk(tx + 1, ty)) x = Math.min(x, tx + m);
    if (!this.floorOk(tx, ty - 1)) y = Math.max(y, ty - m);
    if (!this.floorOk(tx, ty + 1)) y = Math.min(y, ty + m);
    return { x, y };
  }

  private nearestFloor(p: P): P | null {
    const x0 = Math.round(p.x);
    const y0 = Math.round(p.y);
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.floorOk(x0 + dx, y0 + dy)) return { x: x0 + dx, y: y0 + dy };
        }
      }
    }
    return null;
  }

  private kick(f: FixtureState, dx: number, dy: number, speed: number): void {
    const n = Math.hypot(dx, dy) || 1;
    this.roll.set(f.id, { vx: (dx / n) * speed, vy: (dy / n) * speed });
  }

  /** Rolling toys keep going, bounce off shelves and walls, and slow to a stop wherever they end up. */
  private updateToys(dt: number): void {
    for (const [id, v] of this.roll) {
      const f = this.fixture(id);
      if (!f?.placed) {
        this.roll.delete(id);
        continue;
      }
      const p = this.toyAt(f);
      let x = p.x + v.vx * dt;
      let y = p.y + v.vy * dt;
      if (!this.floorOk(x, p.y)) {
        v.vx = -v.vx * 0.7;
        x = p.x;
      }
      if (!this.floorOk(x, y)) {
        v.vy = -v.vy * 0.7;
        y = p.y;
      }
      f.at = this.clampToFloor(x, y);
      const k = Math.exp(-dt * 0.9);
      v.vx *= k;
      v.vy *= k;
      if (Math.hypot(v.vx, v.vy) < 0.15) this.roll.delete(id);
    }
    // shoppers walking past nudge a ball along with their foot
    for (const f of this.placed()) {
      if (!isRolling(f.decor) || this.roll.has(f.id)) continue;
      let p = this.toyAt(f);
      // a ball left behind a counter by an older version is put back on the floor
      if (!this.floorOk(p.x, p.y)) {
        const q = this.nearestFloor(p);
        if (q) f.at = p = q;
      } else {
        const q = this.clampToFloor(p.x, p.y);
        if (q.x !== p.x || q.y !== p.y) f.at = p = q;
      }
      const c = this.customers.find((x) => x.mover.moving && Math.abs(x.mover.x - p.x) + Math.abs(x.mover.y - p.y) < 0.5);
      if (c) this.kick(f, p.x - c.mover.x + (c.mover.dir === 'right' ? 0.5 : c.mover.dir === 'left' ? -0.5 : 0), p.y - c.mover.y + (c.mover.dir === 'down' ? 0.5 : c.mover.dir === 'up' ? -0.5 : 0), 1.2);
    }
  }

  /** A cat after a ball: run to wherever it is, bat it away, chase again. */
  private chase(c: CatAgent, f: FixtureState): void {
    const p = this.toyAt(f);
    const d = Math.abs(c.mover.x - p.x) + Math.abs(c.mover.y - p.y);
    if (d < 1.1) {
      if (this.clock - c.batAt > 0.8 && !this.roll.has(f.id)) {
        c.batAt = this.clock;
        this.faceToward(c.mover, { x: Math.round(p.x), y: Math.round(p.y) });
        this.doAct(c, 'swipe', 0.4);
        this.kick(f, p.x - c.mover.x + this.rng.range(-0.8, 0.8), p.y - c.mover.y + this.rng.range(-0.8, 0.8), this.rng.range(1.8, 3.2));
      }
      return;
    }
    const goal = { x: Math.round(p.x), y: Math.round(p.y) };
    const dest = c.mover.dest;
    if (Math.abs(dest.x - goal.x) + Math.abs(dest.y - goal.y) > 1) {
      const to = this.grid.walkable(goal.x, goal.y) ? goal : this.beside(c.mover, goal);
      if (to) this.walk(c.mover, to);
    }
  }

  /** The store's own cat plus a visiting one, if any. */
  cats(): CatAgent[] {
    return [this.cat, ...this.visitors, ...(this.guest?.agent ? [this.guest.agent] : [])];
  }

  private updateCat(dt: number): void {
    const st = this.state.cat;
    st.mood += (50 - st.mood) * 0.0008 * dt;
    // the cat tower is the comfiest spot in the store
    if (this.cat.perch) st.mood = Math.min(100, st.mood + 0.01 * dt);
    if (gainCat(this.state, dt * 0.02)) this.emit({ type: 'growth', what: 'cat', level: st.level });
    this.stepCat(this.cat, dt);
    for (const k of this.visitors) this.stepCat(k, dt);
    const g = this.guest;
    if (!g || g.gone) return;
    if (!g.agent) {
      if (this.clock < g.arriveAt || this.closing) return;
      g.agent = new CatAgent(spawnTile(this.layout, this.rng.chance(0.5)));
      g.agent.mode = 'walk';
      this.walk(g.agent.mover, entryTile(this.layout));
      this.emit({ type: 'guestCat', store: g.store });
      return;
    }
    const a = g.agent;
    if ((this.clock >= g.leaveAt || this.closing) && a.goal?.kind !== 'leave') {
      if (a.tag) a.tag.other.tag = null;
      a.tag = null;
      a.mode = 'walk';
      a.perch = null;
      a.goal = { kind: 'leave' };
      this.walk(a.mover, spawnTile(this.layout, this.rng.chance(0.5)));
    }
    this.stepCat(a, dt);
  }

  private stepCat(c: CatAgent, dt: number): void {
    if (c.tag) {
      this.playTag(c);
      this.stepMover(c.mover, dt, 1.8);
      if (c.bubble && c.bubble.until < this.clock) c.bubble = null;
      return;
    }
    if (c.mode === 'walk') c.toy = null;
    const ball = c.toy !== null ? this.fixture(c.toy) : undefined;
    const chasing = !!ball && isRolling(ball.decor);
    if (chasing) this.chase(c, ball!);
    this.stepMover(c.mover, dt, chasing ? 1.6 : 0.5);
    if (c.bubble && c.bubble.until < this.clock) c.bubble = null;
    if (c.mode === 'walk') {
      if (c.mover.path.length) return;
      if (c.goal?.kind === 'leave') {
        if (this.guest?.agent === c) {
          this.guest.agent = null;
          this.guest.gone = true;
        }
        return;
      }
      this.settleCat(c);
      return;
    }
    c.timer -= dt;
    if (c.timer <= 0) this.wanderCat(c);
  }

  /** Arrived somewhere: curl up on the tower, watch the fish, play with the other cat, or just rest. */
  private settleCat(c: CatAgent): void {
    const goal = c.goal;
    c.goal = null;
    const timer = (a: number, b: number) => this.rng.range(a, b);
    const f = goal?.fixture !== undefined ? this.fixture(goal.fixture) : undefined;
    if ((goal?.kind === 'tower' || goal?.kind === 'perch') && f?.placed && !this.cats().some((k) => k !== c && k.perch?.fixture === f.id)) {
      c.perch = this.perchOn(f);
      c.mode = this.rng.pick(['sleep', 'loaf', 'sit'] as const);
      c.timer = timer(40, 120);
      return;
    }
    if (goal?.kind === 'sun') {
      c.mode = this.passRng.chance(0.6) ? 'sleep' : 'loaf';
      c.timer = timer(30, 70);
      return;
    }
    if (goal?.kind === 'maneki' && f?.placed) {
      c.mode = 'sit';
      c.mover.face(f.x < c.mover.tile.x ? 'left' : 'right');
      c.timer = timer(5, 9);
      for (let k = 0; k < 4; k++) this.later(c, k === 0 ? 'b_paw' : null, k * 1.1, 0.5, 'swipe');
      return;
    }
    if (goal?.kind === 'fish' && f?.placed) {
      c.mode = 'sit';
      c.mover.face(f.x < c.mover.tile.x ? 'left' : 'right');
      c.bubble = { icon: 'b_paw', until: this.clock + 3 };
      c.timer = timer(10, 25);
      return;
    }
    if (goal?.kind === 'friend') {
      // only a cat standing still can be greeted; one on its way somewhere would slide while sitting
      const other = this.cats().find((k) => k !== c && !k.mover.path.length && !k.tag);
      if (other && this.guest && !this.guest.met && Math.abs(other.mover.tile.x - c.mover.tile.x) + Math.abs(other.mover.tile.y - c.mover.tile.y) <= 2) {
        // first meeting today: a hiss and a stare before they warm up
        this.guest.met = true;
        for (const k of [c, other]) {
          k.perch = null;
          k.mode = 'sit';
          k.timer = timer(4, 8);
          k.bubble = { icon: 'b_exclaim', until: this.clock + 1.5 };
          this.doAct(k, 'arch', 1.5);
          this.faceToward(k.mover, (k === c ? other : c).mover.tile);
        }
        return;
      }
      if (other && Math.abs(other.mover.tile.x - c.mover.tile.x) + Math.abs(other.mover.tile.y - c.mover.tile.y) <= 2) {
        for (const k of [c, other]) {
          k.perch = null;
          k.mode = 'sit';
          k.timer = timer(12, 25);
          k.bubble = { icon: 'b_heart', until: this.clock + 3 };
          this.doAct(k, 'play', 4);
          this.faceToward(k.mover, (k === c ? other : c).mover.tile);
        }
        this.laowu(c, other);
        this.state.cat.mood = Math.min(100, this.state.cat.mood + 5);
        return;
      }
    }
    if (goal?.kind === 'toy' && f?.placed) {
      const play = TOY_PLAY[f.decor!.slice(4) as CafeToy];
      c.toy = f.id;
      c.mode = play === 'nap' ? 'sleep' : play === 'scratch' ? 'stretch' : play === 'perch' || play === 'hide' ? 'loaf' : play === 'kick' ? 'groom' : 'sit';
      c.timer = timer(play === 'nap' ? 30 : 10, play === 'nap' ? 70 : 25);
      this.faceToward(c.mover, f);
      if (play !== 'nap') c.bubble = { icon: 'b_paw', until: this.clock + 1.5 };
      if (c === this.cat) this.state.cat.mood = Math.min(100, this.state.cat.mood + 3);
      return;
    }
    if (goal?.kind === 'follow' && goal.who && (goal.steps ?? 0) > 0) {
      const cust = this.customers.find((x) => x.mover === goal.who && x.state !== 'leave' && x.mover.y < this.layout.h - 1);
      const to = cust ? this.beside(c.mover, cust.mover.tile) : null;
      if (cust && to) {
        if (goal.steps === 3 && !cust.bubble) {
          cust.bubble = { icon: 'b_heart', until: this.clock + 1.5 };
          this.doAct(cust, 'laugh', 1);
        }
        c.goal = { ...goal, steps: goal.steps! - 1 };
        this.walk(c.mover, to);
        return;
      }
    }
    if (goal?.kind === 'box' && goal.who) {
      const w = this.workers.find((x) => x.mover === goal.who);
      if (w && w.task.type === 'restock' && Math.abs(w.mover.x - c.mover.x) + Math.abs(w.mover.y - c.mover.y) <= 1.5) {
        c.mode = 'loaf';
        c.timer = timer(5, 9);
        c.bubble = { icon: 'b_heart', until: this.clock + 1.5 };
        this.doAct(c, 'box', c.timer);
        if (!w.bubble) {
          w.bubble = { icon: 'b_laugh', until: this.clock + 1.5 };
          this.doAct(w, 'laugh', 1);
        }
        return;
      }
    }
    if (goal?.kind === 'rub' && goal.who) {
      const m = goal.who;
      if (Math.abs(m.x - c.mover.x) + Math.abs(m.y - c.mover.y) <= 1.5) {
        c.mode = 'sit';
        c.timer = timer(8, 15);
        c.bubble = { icon: 'b_heart', until: this.clock + 2 };
        this.doAct(c, 'wiggle', 2);
        this.faceToward(c.mover, m.tile);
        const cust = this.customers.find((x) => x.mover === m);
        const w = this.workers.find((x) => x.mover === m);
        if (cust) {
          cust.affinityDelta += catLover(cust.npc.index) ? 1 : 0.5;
          if (!cust.bubble) {
            cust.bubble = { icon: 'b_heart', until: this.clock + 2 };
            this.doAct(cust, cust.state === 'queue' ? 'laugh' : 'crouch', 1.5);
          }
        } else if (w) {
          // begging: up on its hind legs until a treat comes down
          c.bubble = { icon: 'b_paw', until: this.clock + 1.5 };
          this.doAct(c, 'beg', 1);
          this.faceToward(w.mover, c.mover.tile);
          this.later(w, 'b_heart', 0.5, 1, 'crouch');
          this.prop('treat', { x: m.x, y: m.y }, { x: c.mover.x, y: c.mover.y }, 0.4, undefined, 0.6);
          this.later(c, null, 1, 1.2, 'eat');
          this.gainSkill(w, 'petcare', 0.5);
          if (c === this.cat) this.state.cat.mood = Math.min(100, this.state.cat.mood + 3);
        }
        if (c === this.cat) this.state.cat.mood = Math.min(100, this.state.cat.mood + 2);
        return;
      }
    }
    // brushing past a stocked shelf, the cat sometimes knocks something off and sits there looking innocent
    if (this.spills.length < 5 && this.rng.chance(0.06) && this.nextToStock(c.mover.tile) && this.spillVisible(c.mover.tile.x, c.mover.tile.y)) {
      const t = c.mover.tile;
      this.spills.push({ id: this.nextSpill++, x: t.x, y: t.y, kind: 'crumbs', age: 0 });
      const from = this.stockNear(t);
      if (from) this.prop('item', from.p, { x: t.x, y: t.y }, 0.5, from.index);
      this.doAct(c, 'swipe', 0.4);
      c.mode = 'sit';
      c.timer = timer(6, 12);
      return;
    }
    const r = this.rng.next();
    c.mode = r < 0.3 ? 'sit' : r < 0.55 ? 'sleep' : r < 0.7 ? 'groom' : r < 0.9 ? 'loaf' : 'stretch';
    c.timer = { sit: [15, 50], sleep: [40, 120], groom: [8, 20], loaf: [30, 90], stretch: [3, 6] }[c.mode].reduce((a, b) => this.rng.range(a, b));
  }

  /** Where a cat sits on top of a fixture: the tile, the sprite's top in pixels, and the draw depth just after the fixture. */
  private perchOn(f: FixtureState): { fixture: number; x: number; y: number; top: number; depth: number } {
    const bottomRow = f.vertical ? f.y + 1 : f.y;
    const height = f.decor === 'cat_tower' ? 41 : f.decor === 'table' ? 22 : PERCH_HEIGHT[f.kind]?.[f.vertical ? 1 : 0] ?? 32;
    const x = f.vertical || f.kind === 'decor' ? f.x : f.x + this.rng.int(0, 1);
    // feet (sprite row 16) a couple of pixels below the top edge
    return { fixture: f.id, x, y: f.y, top: (bottomRow + 1) * T - height + 2 - 16, depth: bottomRow + 0.58 };
  }

  private beside(m: Mover, t: P): P | null {
    const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })).filter((p) => this.catVisible(p.x, p.y));
    return this.freeTile(m, around) ?? null;
  }

  /** Sends a cat to a toy; it starts playing when it gets there. */
  private goPlay(c: CatAgent, f: FixtureState): boolean {
    const p = this.toyAt(f);
    const rolling = isRolling(f.decor);
    // pawing toys are played with side-on, so a tile to the left or right comes first
    const sides = [[-1, 0], [1, 0]].map(([dx]) => ({ x: f.x + dx, y: f.y })).filter((q) => this.grid.walkable(q.x, q.y) && this.catVisible(q.x, q.y));
    const acc = rolling
      ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: Math.round(p.x) + dx, y: Math.round(p.y) + dy })).filter((q) => this.floorOk(q.x, q.y))
      : sides.length ? sides : serveTiles(this.grid, f, 0);
    const to = acc.length ? this.freeTile(c.mover, acc) : undefined;
    if (!to) return false;
    c.mode = 'walk';
    c.perch = null;
    c.toy = null;
    c.goal = { kind: 'toy', fixture: f.id };
    this.walk(c.mover, to);
    return true;
  }

  /** Two cats chase each other around: the chaser runs at the other, a tap swaps roles, the runner bolts somewhere random. */
  private playTag(c: CatAgent): void {
    const t = c.tag!;
    const o = t.other;
    if (this.clock > t.until || this.closing || !o.tag || o.tag.other !== c || (this.guest?.agent === o && this.guest.gone)) {
      // game over: trot to the nearest tile, then settle down as usual
      c.tag = null;
      c.goal = null;
      c.mode = 'walk';
      this.walk(c.mover, c.mover.tile);
      return;
    }
    if (t.it) {
      const d = Math.abs(c.mover.x - o.mover.x) + Math.abs(c.mover.y - o.mover.y);
      if (d < 1.1) {
        // tagged: a quick pounce and the other one gives chase
        this.doAct(c, 'swipe', 0.4);
        this.doAct(o, 'hop', 0.4);
        c.bubble = { icon: 'b_paw', until: this.clock + 1 };
        t.it = false;
        o.tag!.it = true;
        this.walk(c.mover, this.runAway(c));
        return;
      }
      const goal = o.mover.tile;
      const dest = c.mover.dest;
      if (Math.abs(dest.x - goal.x) + Math.abs(dest.y - goal.y) > 1) {
        const to = this.beside(c.mover, goal);
        if (to) this.walk(c.mover, to);
      }
    } else if (!c.mover.path.length) {
      this.walk(c.mover, this.runAway(c));
    }
  }

  /** A random open spot a few tiles away. */
  private runAway(c: CatAgent): P {
    for (let i = 0; i < 12; i++) {
      const p = this.catSpot();
      if (Math.abs(p.x - c.mover.x) + Math.abs(p.y - c.mover.y) >= 3) return p;
    }
    return this.catSpot();
  }

  /**
   * Chinese only: once in a while, two cats sitting together close by yell "老吴" at each other.
   * Both stay put until the exchange is over.
   */
  private laowu(a: CatAgent, b: CatAgent): void {
    const near = Math.abs(a.mover.x - b.mover.x) + Math.abs(a.mover.y - b.mover.y) <= 2;
    if (locale() !== 'zh' || !near || a.mover.path.length || b.mover.path.length || !this.rng.chance(0.04)) return;
    for (const k of [a, b]) {
      k.mode = 'sit';
      k.timer = Math.max(k.timer, 6);
    }
    a.bubble = { icon: 'b_laowu', until: this.clock + 3.5 };
    this.later(b, 'b_laowu', 1.5, 3.5);
  }

  private startTag(a: CatAgent, b: CatAgent): void {
    const until = this.clock + this.rng.range(4, 9);
    a.tag = { other: b, it: true, until };
    b.tag = { other: a, it: false, until };
    for (const k of [a, b]) {
      k.perch = null;
      k.toy = null;
      k.goal = null;
      k.mode = 'sit';
    }
    b.bubble = { icon: 'b_exclaim', until: this.clock + 0.8 };
    this.walk(b.mover, this.runAway(b));
  }

  private wanderCat(c: CatAgent): void {
    // sometimes, instead of wandering, start a chase with another cat that's up and about
    const free = this.cats().filter((k) => k !== c && !k.tag && !k.perch && k.toy === null && k.mode !== 'sleep' && k.goal?.kind !== 'leave' && k.mover.y < this.layout.h);
    if (free.length && !this.closing && this.rng.chance(0.15)) {
      this.startTag(c, this.rng.pick(free));
      return;
    }
    c.mode = 'walk';
    c.perch = null;
    c.toy = null;
    // now and then up onto a cafe table, a chest freezer or a fridge
    if (this.rng.chance(0.12)) {
      const taken = new Set(this.cats().map((k) => k.perch?.fixture ?? (k.goal?.kind === 'perch' ? k.goal.fixture : undefined)));
      const highs = this.placed().filter((f) => (f.decor === 'table' || f.kind === 'fridge' || f.kind === 'freezer') && !taken.has(f.id));
      const f = highs.length ? this.rng.pick(highs) : undefined;
      const acc = f ? accessTiles(this.grid, f, f.kind === 'decor' ? 0 : this.rng.int(0, 1)).filter((p) => this.catVisible(p.x, p.y)) : [];
      const to = acc.length ? this.freeTile(c.mover, acc) : undefined;
      if (f && to) {
        c.goal = { kind: 'perch', fixture: f.id };
        this.walk(c.mover, to);
        return;
      }
    }
    if (this.cafe && this.rng.chance(0.55)) {
      const busy = new Set(this.cats().map((k) => k.toy ?? k.goal?.fixture));
      const toys = this.placed().filter((f) => f.decor?.startsWith('toy_') && !busy.has(f.id));
      // a ball lying close by catches the eye before anything else
      const near = toys.filter((f) => isRolling(f.decor) && !this.roll.has(f.id) && Math.abs(this.toyAt(f).x - c.mover.x) + Math.abs(this.toyAt(f).y - c.mover.y) <= 5);
      if (near.length && this.rng.chance(0.4) && this.goPlay(c, this.rng.pick(near))) return;
      if (toys.length && this.goPlay(c, this.rng.pick(toys))) return;
    }
    const decor = (kind: string) => this.placed().filter((f) => f.kind === 'decor' && f.decor === kind);
    // a tile next to the decoration; for watching fish it has to be one where the cat stays in view
    // (on the tower it is drawn on top, so where it jumps from doesn't matter)
    const near = (f: FixtureState, inView: boolean) => {
      const acc = serveTiles(this.grid, f, 0).filter((p) => !inView || this.catVisible(p.x, p.y));
      return acc.length ? this.freeTile(c.mover, acc) ?? null : null;
    };
    const other = this.cats().find((k) => k !== c && k.goal?.kind !== 'leave');
    // on a sunny day the patch of light under a window is the best spot in the shop
    const patches = sunPatches(this.layout, this.state.seed, this.state.day, this.clock).filter((p) => p.strength > 0.3);
    if (patches.length && this.passRng.chance(0.22)) {
      const tiles = patches.flatMap((p) => sunTiles(this.layout, p)).filter((q) => this.catVisible(q.x, q.y) && !this.layout.reserved[q.y * this.layout.w + q.x]);
      const to = tiles.length ? this.freeTile(c.mover, tiles) : undefined;
      if (to) {
        c.goal = { kind: 'sun' };
        this.walk(c.mover, to);
        return;
      }
    }
    // a beckoning cat figurine gets beckoned back
    const lucky = decor('maneki');
    if (lucky.length && this.rng.chance(0.12)) {
      const f = this.rng.pick(lucky);
      const to = near(f, true);
      if (to) {
        c.goal = { kind: 'maneki', fixture: f.id };
        this.walk(c.mover, to);
        return;
      }
    }
    const r = this.rng.next();
    // cats are sociable: a good share of their wandering is toward someone
    const tower = r < 0.3 ? this.rng.pick(decor('cat_tower')) : undefined;
    const tank = r >= 0.3 && r < 0.42 ? this.rng.pick(decor('aquarium')) : undefined;
    let to: P | null = null;
    if (tower && (to = near(tower, false))) c.goal = { kind: 'tower', fixture: tower.id };
    else if (tank && (to = near(tank, true))) c.goal = { kind: 'fish', fixture: tank.id };
    else if (other && r >= 0.42 && r < 0.62) {
      to = this.beside(c.mover, other.mover.tile);
      if (to) c.goal = { kind: 'friend' };
    } else if (r >= 0.62 && r < 0.8) {
      // rub against someone who is standing still
      const still = [
        ...this.customers.filter((x) => (x.state === 'browse' || x.state === 'queue') && x.seat === null && !x.mover.path.length).map((x) => x.mover),
        ...this.workers.filter((w) => w.task.type === 'none' && !w.mover.path.length).map((w) => w.mover),
      ].filter((m) => Math.abs(m.x - c.mover.x) + Math.abs(m.y - c.mover.y) <= 8 && m.y < this.layout.h);
      const who = still.length ? this.rng.pick(still) : null;
      to = who ? this.beside(c.mover, who.tile) : null;
      if (who && to) c.goal = { kind: 'rub', who };
    } else if (r >= 0.8 && r < 0.88) {
      // trail after a shopper for a bit
      const walking = this.customers.filter((x) => x.state === 'shop' && x.mover.path.length && x.mover.y < this.layout.h - 1
        && Math.abs(x.mover.x - c.mover.x) + Math.abs(x.mover.y - c.mover.y) <= 6);
      const who = walking.length ? this.rng.pick(walking).mover : null;
      to = who ? this.beside(c.mover, who.tile) : null;
      if (who && to) c.goal = { kind: 'follow', who, steps: 3 };
    } else if (r >= 0.88 && r < 0.95) {
      // the carton someone is unpacking looks like a fine place to sit
      const w = this.workers.find((x) => x.task.type === 'restock' && x.task.phase === 'stocking' && !x.mover.path.length);
      to = w ? this.beside(c.mover, w.mover.tile) : null;
      if (w && to) c.goal = { kind: 'box', who: w.mover };
    }
    this.walk(c.mover, to ?? this.catSpot());
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
    this.registers = this.layout.registers.map((r) => {
      const line = new Line('register', r.queue, r.cashier, r.index);
      line.card = r.card;
      return line;
    });
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
    const broke = this.state.money <= 0;
    if (broke) this.supplierGifts(true);
    this.restockAll();
    const roster = NPCS.slice(0, rosterSize(this.state));
    const appeal = Math.min(0.15, this.placed().length * 0.006);
    const rep = repTraffic(this.state.reputation.level);
    const traffic = trafficMult(this.state.seed, this.state.day) * (1 + openingBuzz(this.state)) * this.rules.traffic * this.street.traffic * (streetCart(this.state.seed, this.state.day) ? 1.05 : 1);
    if (!broke) this.supplierGifts(false);
    this.rollEvent();
    if (!this.cafe) this.planGuest();
    const guestAppeal = this.guest ? catAppeal(this.guest.level, this.guest.mood) : 0;
    const bakery = !!this.stationSpot('bakery');
    const bk = this.state.bakery;
    for (const npc of roster) {
      const st = this.state.npcs[npc.id];
      const aff = affinityValue(st.fond.level);
      const cat = catLover(npc.index) ? catAppeal(this.state.cat.level, this.state.cat.mood) + guestAppeal : 0;
      const fb = favBread(npc.index);
      const bread = bakery && bk[fb].good + bk[fb].golden > 0 ? 0.05 : 0;
      const kind = npc.kind === 'kid' ? this.street.kid : npc.kind === 'elder' ? this.street.elder : 1;
      const p = (0.22 + aff / 220 + appeal + rep + cat + bread) * traffic * kind;
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

  /** Each store has its own busy hours; whoever doesn't come at a peak drops in any time. */
  /** Now and then a cat from another store in the chain drops by for an hour or three. */
  private planGuest(): void {
    const others = this.state.stores.flatMap((x, i) => (i !== this.state.active && x.saved ? [{ i, d: x.saved }] : []));
    if (!others.length || !this.rng.chance(0.35)) return;
    const { i, d } = this.rng.pick(others);
    const arriveAt = this.rng.range(9 * 60, 16 * 60);
    this.guest = {
      store: i, coat: d.catCoat, acc: d.catAcc, name: d.catName, level: d.cat.level, mood: d.cat.mood,
      arriveAt, leaveAt: arriveAt + this.rng.range(60, 180), agent: null, gone: false,
    };
  }

  private arrivalTime(): number {
    let r = this.rng.next();
    let t = this.rng.range(DAY_START, LAST_ENTRY);
    for (const [at, share, spread] of [...peaksOf(this.state), ...this.street.peaks]) {
      if (r < share) {
        t = at + (this.rng.next() + this.rng.next() - 1) * spread;
        break;
      }
      r -= share;
    }
    return Math.max(DAY_START + 2, Math.min(LAST_ENTRY, t));
  }

  restockAll(): number {
    let spent = 0;
    for (const f of this.placed()) {
      const cap = capacityOf(this.state, f.kind);
      for (const s of f.slots) {
        if (!s.product) continue;
        const p = PRODUCT_BY_ID.get(s.product)!;
        const unit = costOf(this.state, p);
        s.stock += takeStored(this.state, p.id, cap - s.stock);
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
      const npc = this.arrivals.shift()!.npc;
      // at the cafe, a long line for coffee turns some newcomers away at the door
      if (this.cafe && this.rng.chance(Math.min(0.9, this.coffeeCrowd() * 0.2))) continue;
      this.spawn(npc);
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
    this.updateToys(dtMin);
    this.updatePassers(dtMin);
    this.updateFootprints(dtMin);
    this.updateDelivery(dtMin);
    for (const sp of this.spills) sp.age += dtMin;
    const ev = this.event;
    if (ev?.kind === 'tour' && this.clock >= ev.at && !this.closing) {
      ev.at = Infinity;
      const roster = NPCS.slice(0, rosterSize(this.state));
      for (let i = 0; i < 8; i++) this.arrivals.push({ t: this.clock + i * 0.6, npc: this.rng.pick(roster) });
      this.arrivals.sort((a, b) => a.t - b.t);
      this.emit({ type: 'tourArrived' });
    }
    this.socialize(dtMin);
    this.assignTasks();
    for (const w of this.workers) this.updateWorker(w, dtMin);
    for (const line of this.allLines()) this.updateLine(line, dtMin);
    for (const f of this.floaters) f.t += dtMin;
    this.flashes = this.flashes.filter((f) => this.clock - f.at < 0.6);
    this.props = this.props.filter((p) => this.clock - p.at < p.dur);
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
    const budget = npc.budget * budgetMult(st.level) * this.rng.range(0.7, 1.2) * this.rules.budget * this.perks.budget * this.street.budget;
    const c = new Customer(this.nextCust++, npc, start, budget);
    c.targets = this.planTargets(c);
    this.customers.push(c);
    this.stats.customers += 1;
    this.state.lifetime.customers += 1;
    this.walk(c.mover, entryTile(this.layout));
    this.welcome(c);
    if (this.weather === 'rain' || this.weather === 'snow') this.trackIn(start.x);
  }

  /** The worker nearest the entrance says hello. */
  private welcome(c: Customer): void {
    const e = entryTile(this.layout);
    let best: Worker | null = null;
    let bd = Infinity;
    for (const w of this.workers) {
      const d = Math.abs(w.mover.x - e.x) + Math.abs(w.mover.y - e.y);
      if (d < bd) {
        bd = d;
        best = w;
      }
    }
    this.rainyEntry(c);
    if (!best) return;
    c.greet = best.power('greet');
    c.affinityDelta += c.greet * 0.8;
    this.gainSkill(best, 'greet', 0.6);
  }

  /** At the cafe: a coffee at the counter, then a seat at a free table, maybe a go with a toy, then pay. */
  private cafeTargets(c: Customer): Target[] {
    const out: Target[] = [];
    if (this.stations.has('coffee')) out.push({ t: 'station', kind: 'coffee' });
    if (this.stationSpot('bakery') && this.rng.chance(0.3 + c.npc.stations.bakery)) out.push({ t: 'bakery' });
    const tables = this.placed().filter((f) => f.decor === 'table');
    if (tables.length) out.push({ t: 'decor', fixture: this.rng.pick(tables).id });
    for (const f of this.rng.shuffle(this.placed().filter((x) => x.kind === 'decor' && DECOR_VISIT[x.decor ?? '']))) {
      if (this.rng.chance(DECOR_VISIT[f.decor!][c.npc.kind])) {
        out.push({ t: 'decor', fixture: f.id });
        break;
      }
    }
    return out;
  }

  private planTargets(c: Customer): Target[] {
    if (this.cafe) return this.cafeTargets(c);
    const npc = c.npc;
    const aff = affinityValue(this.state.npcs[npc.id].fond.level);
    const picks: { tg: Target; price: number; w: number }[] = [];
    for (const f of this.placed()) {
      f.slots.forEach((s, i) => {
        if (!s.product) return;
        const p = PRODUCT_BY_ID.get(s.product)!;
        const fav = npc.favs.includes(p.id);
        const like = npc.likes.includes(p.cat);
        const prob = Math.min(0.95, (0.08 + (like ? 0.28 : 0) + (fav ? 0.75 : 0) + aff * 0.004) * demandMult(this.state.seed, this.state.day, p.id) * (this.street.cat[p.cat] ?? 1) * (this.street.items[p.id] ?? 1));
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
      const want = npc.stations[s.kind] * (0.5 + aff / 100) * stationMult(this.state.seed, this.state.day, s.kind) * (this.street.station[s.kind] ?? 1);
      if (this.rng.chance(want)) out.push(s.kind === 'bakery' ? { t: 'bakery' } : { t: 'station', kind: s.kind });
    }
    // at most one stop at a decoration per visit
    for (const f of this.rng.shuffle(this.placed().filter((x) => x.kind === 'decor' && DECOR_VISIT[x.decor ?? '']))) {
      if (this.rng.chance(DECOR_VISIT[f.decor!][npc.kind])) {
        out.push({ t: 'decor', fixture: f.id });
        break;
      }
    }
    return this.orderTargets(out);
  }

  private targetPos(tg: Target): P {
    if (tg.t === 'slot' || tg.t === 'decor') {
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

  private allMovers(): Mover[] {
    return [...this.customers.map((c) => c.mover), ...this.workers.map((w) => w.mover), ...this.cats().map((k) => k.mover)];
  }

  /** Tiles where others stand still, so walkers route around them. */
  private standing(self: Mover): P[] {
    return this.allMovers().filter((m) => m !== self && m.path.length === 0).map((m) => m.tile);
  }

  /** The stockroom door and the tiles beside it on the back corridor. */
  private doorTiles(): P[] {
    const d = this.layout.stockDoor;
    return [0, -1, 1].map((dx) => ({ x: d.x + dx, y: d.y })).filter((p) => this.grid.walkable(p.x, p.y));
  }

  /** Back-corridor spots where staff with nothing to do wait, clear of the door and the counters. */
  /** Where staff stand to serve: registers, counters, bagging and the oven, for the jobs this worker does. */
  private counterSpots(w: Worker): P[] {
    const out: P[] = [];
    if (this.canDo(w, 'register')) out.push(...this.registers.filter((l) => !l.worker).map((l) => l.staffSpot));
    if (this.canDo(w, 'station')) out.push(...[...this.stations.values()].filter((l) => !l.worker).map((l) => l.staffSpot));
    if (this.bagging && !this.bagging.worker && this.canDo(w, 'bagging')) out.push(this.bagging.staffSpot);
    const bakery = this.stationSpot('bakery');
    if (bakery && this.canDo(w, 'oven')) out.push(bakery.staff);
    return out;
  }

  private posts(): P[] {
    const d = this.layout.stockDoor;
    const out: P[] = [];
    for (let x = 0; x < this.layout.w; x++) {
      if (Math.abs(x - d.x) < 2 || !this.grid.walkable(x, 0)) continue;
      if (this.layout.stations.some((s) => s.staff.x === x)) continue;
      out.push({ x, y: 0 });
    }
    return out;
  }

  private walk(m: Mover, p: P): void {
    m.goTo(this.grid, p, this.standing(m));
  }

  /** The candidate nearest to `near` (default: the mover) that nobody else stands on or is heading to. */
  private freeTile(m: Mover, cands: P[], near?: P): P | undefined {
    const taken = new Set(this.allMovers().filter((o) => o !== m).map((o) => `${o.dest.x},${o.dest.y}`));
    const t = near ?? m.tile;
    const sorted = cands.slice().sort((a, b) => Math.abs(a.x - t.x) + Math.abs(a.y - t.y) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y)));
    return sorted.find((p) => !taken.has(`${p.x},${p.y}`)) ?? sorted[0];
  }

  /** Steps a mover, detouring around or briefly waiting for anyone standing on its next tile. */
  private stepMover(m: Mover, dt: number, speed: number): void {
    const next = m.path[0];
    const centered = Math.abs(m.x - Math.round(m.x)) < 0.001 && Math.abs(m.y - Math.round(m.y)) < 0.001;
    if (next && centered && this.grid.inside(next.x, next.y)) {
      const blocker = this.allMovers().find((o) => o !== m && o.path.length === 0 && o.tile.x === next.x && o.tile.y === next.y);
      if (blocker) {
        // the cat gets up and moves on when someone needs its spot
        const cat = this.cats().find((k) => k.mover === blocker);
        if (cat && cat.mode !== 'walk' && m.path.length === 1) cat.timer = 0;
        if (m.path.length > 1) {
          this.walk(m, m.dest);
        } else if (m.held < 1.5) {
          if (m.held < 0.8 && m.held + dt >= 0.8) this.bump(m);
          m.held += dt;
          m.moving = false;
          return;
        }
      }
    }
    m.held = 0;
    m.step(dt, speed);
  }

  private updateCustomer(c: Customer, dt: number): void {
    this.stepMover(c.mover, dt, 0.85 * this.rules.walk * (this.clock < c.runUntil ? 2 : 1));
    if (c.bubble && c.bubble.until < this.clock && c.state !== 'queue') c.bubble = null;
    if (c.state === 'leave') return;
    if (c.state === 'queue') {
      const held = c.line?.offerFor === c && c.line.offer > 0;
      if (c.mover.path.length === 0 && !held) c.wait += dt;
      const front = c.line?.front() === c;
      if (front) c.mover.face(c.line!.kind === 'station' ? 'up' : this.layout.mirrored ? 'right' : 'left');
      return;
    }
    if (c.state === 'browse') {
      c.timer -= dt;
      if (c.timer <= 0) {
        c.state = 'shop';
        if (c.seat !== null) this.seats.delete(c.seat);
        c.seat = null;
        c.using = null;
      }
      return;
    }
    if (c.state === 'served') return;
    if (!c.sawCat && !c.bubble && catLover(c.npc.index)) {
      const a = c.mover.tile;
      if (this.cats().some((k) => Math.abs(a.x - k.mover.tile.x) + Math.abs(a.y - k.mover.tile.y) <= 2)) {
        c.sawCat = true;
        c.affinityDelta += 0.5;
        c.bubble = { icon: 'b_paw', until: this.clock + 3 };
      }
    }
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
      const acc = serveTiles(this.grid, f, tg.slot);
      const here = acc.find((p) => c.mover.at(p));
      if (!here) {
        if (!acc.length) {
          c.targets.shift();
          return;
        }
        this.walk(c.mover, this.freeTile(c.mover, acc)!);
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
        this.walk(c.mover, spot);
        return;
      }
      c.mover.face('up');
      this.takeBread(c);
      c.targets.shift();
      c.state = 'browse';
      c.timer = 0.8;
      return;
    }
    if (tg.t === 'decor') {
      const f = this.fixture(tg.fixture);
      const acc = f?.placed ? serveTiles(this.grid, f, 0) : [];
      const seat = f?.decor === 'bench' || f?.decor === 'table';
      if (f && seat && this.seats.has(f.id)) {
        // that table is taken: try another free one, or skip sitting
        const free = this.placed().find((x) => x.decor === f.decor && !this.seats.has(x.id));
        if (free) c.targets[0] = { t: 'decor', fixture: free.id };
        else c.targets.shift();
        return;
      }
      if (!f || !acc.length) {
        c.targets.shift();
        return;
      }
      if (!acc.some((p) => c.mover.at(p))) {
        this.walk(c.mover, this.freeTile(c.mover, acc) ?? acc[0]);
        return;
      }
      c.targets.shift();
      this.faceToward(c.mover, f);
      this.useDecor(c, f);
      return;
    }
    const line = this.stations.get(tg.kind)!;
    c.targets.shift();
    c.order = this.makeOrder(tg.kind);
    this.join(c, line);
  }

  /** What a shopper does at a decoration. */
  private useDecor(c: Customer, f: FixtureState): void {
    c.state = 'browse';
    c.timer = 1;
    if (f.decor === 'aquarium') {
      c.timer = 1.5;
      c.affinityDelta += 0.4;
      c.bubble ??= { icon: 'b_star', until: this.clock + 2 };
      this.doAct(c, c.npc.kind === 'kid' ? 'laugh' : 'point', 1.5);
    } else if (f.decor === 'gumball') {
      c.using = f.id;
      this.doAct(c, 'reach', 0.8);
      this.prop('candy', { x: f.x, y: f.y + 0.3 }, { x: c.mover.x, y: c.mover.y }, 0.4, undefined, 0.3);
      this.state.money += 1;
      this.stats.revenue += 1;
      this.state.lifetime.revenue += 1;
      this.floaters.push({ text: `+${money(1)}`, x: f.x, y: f.y, t: 0, color: '#f0c040' });
    } else if (f.decor === 'magazine') {
      c.timer = 2;
      c.using = f.id;
      this.doAct(c, 'read', 2);
      // an ad catches the eye: one more stop on the way
      if (this.rng.chance(0.4)) {
        const left = c.budget - c.spent;
        const slots = this.placed().flatMap((x) => x.slots.map((sl, i) => ({ x, sl, i })))
          .filter(({ sl }) => sl.product && sl.stock > 0 && this.priceOf(sl.product) <= left);
        if (slots.length) {
          const pick = this.rng.pick(slots);
          c.targets.unshift({ t: 'slot', fixture: pick.x.id, slot: pick.i });
        }
      }
    } else if (f.decor === 'bench' || f.decor === 'table') {
      this.seats.set(f.id, c);
      c.seat = f.id;
      c.timer = f.decor === 'table' ? this.rng.range(8, 14) : 4;
      c.affinityDelta += 0.6;
      c.mover.face('down');
    } else if (f.decor?.startsWith('toy_')) {
      // playing with a wand or laser: the nearest free cat comes over
      c.timer = 2.5;
      c.using = f.id;
      this.doAct(c, f.decor === 'toy_laser' ? 'point' : 'wave', 2.5);
      c.bubble = { icon: 'b_laugh', until: this.clock + 2.5 };
      c.affinityDelta += 0.5;
      const cat = this.cats().filter((k) => k.toy === null && k.mode !== 'sleep' && k.goal?.kind !== 'leave')
        .sort((a, b) => Math.abs(a.mover.x - f.x) + Math.abs(a.mover.y - f.y) - (Math.abs(b.mover.x - f.x) + Math.abs(b.mover.y - f.y)))[0];
      if (cat) this.goPlay(cat, f);
    }
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
      this.stockouts.set(p.id, (this.stockouts.get(p.id) ?? 0) + 1);
      return;
    }
    const remaining = c.budget - c.spent;
    if (price > remaining) {
      if (!c.bubble && this.rng.chance(fav ? 0.8 : 0.3)) c.bubble = { icon: 'b_pricey', until: this.clock + 3 };
      return;
    }
    let qty = 1;
    const neat = this.tidy.get(f.id);
    const two = (fav ? 0.5 : 0.18) + (neat ? 0.06 + neat.power * 0.15 : 0);
    if (neat && --neat.left <= 0) this.tidy.delete(f.id);
    if (this.rng.chance(two) && s.stock >= 2 && price * 2 <= remaining) qty = 2;
    s.stock -= qty;
    if (gainRack(this.state, f.kind, qty)) this.emit({ type: 'growth', what: f.kind as RackKind, level: this.state.racks[f.kind as RackKind].level });
    c.pick = { index: p.index, x: f.vertical ? f.x : f.x + slot, y: f.vertical ? f.y + slot : f.y, at: this.clock, fixture: f.id, slot };
    c.spent += price * qty;
    c.basket.push({ kind: 'product', id: p.id, price, cost: costOf(this.state, p), qty });
    this.productSold(p.id, qty);
    this.sold.set(p.id, (this.sold.get(p.id) ?? 0) + qty);
    this.emit({ type: 'sold', cat: p.cat, qty });
    if (isFresh(p.cat)) this.stats.fresh! += qty;
    if (this.spills.length < 5 && this.rng.chance(0.02 * this.rules.spill * this.perks.spill)) {
      const t = c.mover.tile;
      const at = [t, { x: t.x - 1, y: t.y }, { x: t.x + 1, y: t.y }, { x: t.x, y: t.y - 1 }].find((p) => this.spillVisible(p.x, p.y));
      if (at) this.spills.push({ id: this.nextSpill++, x: at.x, y: at.y, kind: this.rng.chance(0.5) ? 'puddle' : 'crumbs', age: 0 });
    }
    if (fav) {
      c.affinityDelta += 1.5;
      c.bubble = { icon: 'b_star', until: this.clock + 3 };
    } else if (c.npc.likes.includes(p.cat)) {
      c.affinityDelta += 0.6;
    }
  }

  priceOf(id: string): number {
    const p = PRODUCT_BY_ID.get(id)!;
    return Math.round(p.price * priceMult(this.state.products[id].level) * collectionMult(p.cat, this.state.collections) * chainPriceMult(this.perks, p.cat) * 100) / 100;
  }

  private productSold(id: string, qty: number): void {
    const prog = this.state.products[id];
    const cat = PRODUCT_BY_ID.get(id)!.cat;
    const before = unlockedCount(cat, this.state.products);
    const first = prog.sold === 0;
    prog.sold += qty;
    if (first && !this.state.collections.includes(cat) && collectionCount(cat, this.state.products) === unlockOrder(cat).length) {
      this.state.collections.push(cat);
      this.emit({ type: 'collection', cat });
    }
    const ups = addExp(prog, qty, productExpToNext);
    if (ups > 0) {
      this.emit({ type: 'productLevel', id, level: prog.level });
      const after = unlockedCount(cat, this.state.products);
      this.state.lifetime.unlocks += after - before;
      for (let i = before; i < after; i++) this.emit({ type: 'unlock', id: unlockOrder(cat)[i] });
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
    const fav = favBread(c.npc.index);
    const b = avail.includes(fav) ? fav : this.rng.pick(avail);
    const golden = bk[b].golden > 0;
    if (golden) bk[b].golden -= 1;
    else bk[b].good -= 1;
    const price = BREAD_PRICE[b] * (golden ? 1.3 : 1);
    c.basket.push({ kind: 'bread', id: `${b}${golden ? '*' : ''}`, price, cost: BREAD_PRICE[b] * BREAD_COST_RATIO, qty: 1 });
    c.spent += price;
    if (b === fav) {
      c.affinityDelta += 1.5;
      c.bubble = { icon: 'b_star', until: this.clock + 3 };
    }
    if (golden) {
      c.affinityDelta += 2;
      if (b !== fav) c.bubble = { icon: 'b_heart', until: this.clock + 3 };
    }
  }

  makeOrder(kind: StationKind): Order {
    if (kind === 'oden') {
      const items: Partial<Record<OdenItem, number>> = {};
      const kinds = this.rng.shuffle([...ODEN_ITEMS]).slice(0, this.rng.int(1, 3));
      for (const k of kinds) items[k] = this.rng.int(1, 3);
      return { kind, items };
    }
    if (kind === 'deli') return { kind, meat: this.rng.pick(MEATS), pounds: this.rng.pick(deliOrderSizes()) };
    return { kind: 'coffee', drink: this.rng.pick(DRINKS.filter((d) => offeredIn(d, locale()))) };
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

  /** A cashier may suggest a small treat from the rack by the register. */
  private upsell(c: Customer, line: Line): void {
    const w = line.worker ?? this.workers.filter((x) => this.canDo(x, 'register')).sort((a, b) => b.skills.upsell.level - a.skills.upsell.level)[0];
    if (!w) return;
    const p = w.power('upsell');
    this.gainSkill(w, 'upsell', 0.4);
    if (!this.rng.chance(0.05 + p * 0.12)) return;
    const treats = unlockOrder('candy').filter((id) => isUnlocked(id, this.state.products));
    const id = this.rng.pick(treats);
    const prod = PRODUCT_BY_ID.get(id)!;
    const price = this.priceOf(id);
    if (price > c.budget - c.spent + 2) return;
    c.basket.push({ kind: 'product', id, price, cost: costOf(this.state, prod), qty: 1 });
    c.spent += price;
    this.productSold(id, 1);
    this.sold.set(id, (this.sold.get(id) ?? 0) + 1);
    this.emit({ type: 'sold', cat: prod.cat, qty: 1 });
    this.floaters.push({ text: `+${money(price)}`, x: c.mover.x, y: c.mover.y, t: 0, color: '#f0d060' });
    this.gainSkill(w, 'upsell', 2);
  }

  private goPay(c: Customer): void {
    if (c.basket.length === 0) {
      this.leave(c);
      return;
    }
    const npc = c.npc;
    c.cash = this.rng.chance(this.rules.cash ?? Math.min(0.9, npc.cash * cashSet().share));
    // cash payers can't use the card-only counters
    const open = this.registers.filter((r) => !r.card || !c.cash);
    let best = open[0];
    for (const r of open) if (r.members.length < best.members.length) best = r;
    this.upsell(c, best);
    if (c.cash) c.payment = makeCashPayment(Math.round(c.total() * 100), this.rng, npc, cashSet());
    c.needsBag = !!this.bagging && c.itemCount() >= 3;
    this.join(c, best);
  }

  private join(c: Customer, line: Line): void {
    c.state = 'queue';
    c.line = line;
    line.members.push(c);
    const n = line.members.length - 1;
    if (n < line.spots.length) this.walk(c.mover, line.spot(n));
    else {
      const spots = this.queueSpots(line);
      this.walk(c.mover, spots[Math.min(n, spots.length - 1)]);
    }
  }

  private shiftLine(line: Line): void {
    const spots = line.members.length > line.spots.length ? this.queueSpots(line) : line.spots;
    line.members.forEach((m, i) => this.walk(m.mover, spots[Math.min(i, spots.length - 1)]));
  }

  /** The marked queue spots, then overflow that runs straight on and spills onto the nearest open floor. */
  private queueSpots(line: Line): P[] {
    const out = line.spots.slice();
    const used = new Set<string>();
    const key = (p: P) => `${p.x},${p.y}`;
    for (const l of [...this.registers, ...this.stations.values(), ...(this.bagging ? [this.bagging] : [])]) {
      for (const p of [...l.spots, l.staffSpot]) used.add(key(p));
    }
    const last = out[out.length - 1];
    const prev = out[out.length - 2] ?? last;
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    let p = last;
    while (dx || dy) {
      p = { x: p.x + dx, y: p.y + dy };
      if (!this.grid.walkable(p.x, p.y) || used.has(key(p)) || out.length >= line.spots.length + 6) break;
      out.push(p);
      used.add(key(p));
    }
    const end = out[out.length - 1];
    const dist = this.grid.flood(end.x, end.y);
    const rest: { p: P; d: number }[] = [];
    for (let i = 0; i < dist.length; i++) {
      const q = { x: i % this.grid.w, y: Math.floor(i / this.grid.w) };
      if (dist[i] > 0 && dist[i] <= 6 && !used.has(key(q)) && !this.layout.reserved[i]) rest.push({ p: q, d: dist[i] });
    }
    rest.sort((a, b) => a.d - b.d);
    return out.concat(rest.map((r) => r.p));
  }

  /** Front customer done being served at this line. */
  finishService(line: Line, result: ServiceResult): void {
    const c = line.members.shift();
    line.progress = 0;
    line.duration = 0;
    if (!c) return;
    line.doneAt = this.clock;
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
      const paid = c.cash ? roundCash(Math.round(total * 100), CASH[c.payment?.cash ?? cashSet().id]) / 100 : total;
      if (c.cash) this.stats.cash! += 1;
      this.state.money += paid;
      this.stats.revenue += paid;
      this.state.lifetime.revenue += paid;
      this.stats.goodsCost += c.basket.reduce((a, b) => a + b.cost * b.qty, 0);
      const st = this.state.npcs[c.npc.id];
      st.spent += paid;
      this.floaters.push({ text: `+${money(paid)}`, x: line.spots[0].x, y: line.spots[0].y, t: 0, color: '#8ee08a' });
      if (c.cash) {
        const r = serviceReward(result, 4, 20);
        c.mult *= r.mult;
        c.affinityDelta += r.affinity;
        this.happyBubble(c, r.affinity);
      }
      // with a long bagging line the cashier bags at the register instead
      if (c.needsBag && this.bagging && this.bagging.members.length < 3) {
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
    const wp = waitPenalty(c.wait * (1 - Math.min(0.4, c.greet * 0.4)), c.npc.patience * this.rules.patience * (1 + Math.min(1, st.fond.level * 0.01)));
    if (wp.affinity < 0) c.bubble = { icon: 'b_wait', until: this.clock + 3 };
    if (wp.affinity <= -2) this.stats.angry! += 1;
    const bought = c.basket.length > 0;
    const exp = bought ? (5 + c.spent * 0.6) * c.mult * wp.mult : 1;
    let mood = c.affinityDelta + wp.affinity + (bought ? 1 : -0.5) - this.spills.length * 0.15;
    if (mood > 0) mood *= this.perks.affinity;
    const fondBefore = st.fond.level;
    changeAffinity(st.fond, mood);
    this.giveGifts(c.npc.id, fondBefore, st.fond.level);
    this.maybeBringFriend(c);
    const repMult = (c.manualServed ? 2 : 1) * (this.event?.kind === 'blogger' ? 2 : 1);
    const repUps = gainReputation(this.state, Math.max(0, 1 + mood) * repMult * this.street.rep);
    this.emit({ type: 'served' });
    if (repUps) this.emit({ type: 'growth', what: 'reputation', level: this.state.reputation.level });
    st.visits += 1;
    const ups = addExp(st, exp, npcExpToNext);
    if (ups > 0) {
      this.stats.levelUps += ups;
      this.emit({ type: 'npcLevel', npc: c.npc.id, level: st.level });
    }
    this.walk(c.mover, spawnTile(this.layout, this.rng.chance(0.5)));
  }

  /** Regulars hand over keepsakes when their affinity crosses gift levels. */
  private giveGifts(npc: string, before: number, after: number): void {
    if (after <= before) return;
    const have = this.state.gifts[npc] ?? 0;
    let n = have;
    while (n < GIFT_LEVELS.length && after >= GIFT_LEVELS[n]) n += 1;
    for (let i = have; i < n; i++) this.emit({ type: 'npcGift', npc, kind: GIFT_KINDS[i] });
    if (n > have) this.state.gifts[npc] = n;
  }

  /** Close regulars sometimes introduce a new neighbor, who visits right away. */
  private maybeBringFriend(c: Customer): void {
    const lv = this.state.npcs[c.npc.id].fond.level;
    const size = rosterSize(this.state);
    if (lv < 5 || size >= NPCS.length || !this.rng.chance(0.015 * Math.log(lv))) return;
    this.state.friends += 1;
    const friend = NPCS[size];
    this.emit({ type: 'friend', by: c.npc.id, friend: friend.id });
    if (!this.closing) this.arrivals.push({ t: this.clock + 1, npc: friend });
    this.arrivals.sort((a, b) => a.t - b.t);
  }

  // ---------- spills ----------

  /** Anything standing on the tile below is drawn over the spill. */
  private spillVisible(x: number, y: number): boolean {
    const g = this.grid;
    return g.walkable(x, y) && (!g.inside(x, y + 1) || g.walkable(x, y + 1)) && !this.spills.some((s) => s.x === x && s.y === y);
  }

  /** Player tap: clears the spill instantly. */
  cleanSpill(id: number): boolean {
    const i = this.spills.findIndex((s) => s.id === id);
    if (i < 0) return false;
    this.mopPrints(this.spills[i]);
    this.spills.splice(i, 1);
    this.stats.cleaned! += 1;
    for (const w of this.workers) if (w.task.type === 'clean' && w.task.spill === id) w.task = { type: 'none' };
    this.gainSkill(this.workers[0], 'clean', 3);
    return true;
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
    // staff hold back for the player only while nobody else is waiting in this line
    if (line.members.length > 1 && line.offerFor === front) line.offer = 0;
    if (line.members.length <= 1 && this.manualEligible(line, front)) {
      if (line.offerFor !== front) {
        line.offerFor = front;
        line.offer = this.offerSeconds(OFFER_SECONDS);
      }
      if (line.offer > 0) {
        if (w && w.mover.at(line.staffSpot)) w.mover.face(line.kind === 'station' ? 'down' : this.layout.mirrored ? 'left' : 'right');
        return;
      }
    }
    if (!w || !w.mover.at(line.staffSpot)) return;
    w.mover.face(line.kind === 'station' ? 'down' : this.layout.mirrored ? 'left' : 'right');
    if (line.duration <= 0) {
      line.duration = this.autoDuration(line, front, w);
      // the cashier knows this regular by name
      if (line.kind === 'register' && this.state.npcs[front.npc.id].fond.level >= 8 && !w.bubble && this.rng.chance(0.5)) {
        w.bubble = { icon: 'b_heart', until: this.clock + 1.5 };
        this.doAct(w, 'wave', 1);
        this.later(front, 'b_laugh', 0.5, 1.5, 'laugh');
      }
    }
    line.progress += dt;
    if (line.progress >= line.duration) {
      const skill = this.lineSkill(line);
      this.gainSkill(w, skill, line.kind === 'register' ? 2 + front.itemCount() * 0.3 : 3);
      this.equipExp(this.lineEquip(line), 1);
      this.finishService(line, { accuracy: 1, seconds: 0, manual: false });
      const mate = this.workers.find((x) => x !== w && !x.bubble && Math.abs(x.mover.x - w.mover.x) + Math.abs(x.mover.y - w.mover.y) <= 1.5);
      if (mate && !w.bubble && this.rng.chance(0.15)) {
        // high five
        w.bubble = { icon: 'b_star', until: this.clock + 1 };
        this.doAct(w, 'cheer', 0.8);
        this.doAct(mate, 'cheer', 0.8);
        this.prop('spark', { x: (w.mover.x + mate.mover.x) / 2, y: (w.mover.y + mate.mover.y) / 2 }, { x: 0, y: 0 }, 0.5, undefined, 0.3);
      }
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
    const sp = w.speed(this.lineSkill(line)) * equipSpeed(this.state.equipment[this.lineEquip(line)].level) * (line.kind === 'station' ? 1 : this.perks.service);
    if (line.kind === 'register') {
      const items = c.itemCount();
      const bagInline = this.bagging ? 0 : 0.12 * items;
      if (line.card) return (0.8 + 0.18 * items + 0.2 + bagInline) / sp;
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
    const bread = unlockedBreads(this.state).sort((a, b) => bk[a].good + bk[a].golden - (bk[b].good + bk[b].golden))[0];
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

  private canDo(w: Worker, kind: JobKind): boolean {
    switch (w.role) {
      case 'auto':
        return true;
      case 'cashier':
        return kind === 'register' || kind === 'bagging';
      case 'stocker':
        return kind === 'restock' || kind === 'oven' || kind === 'clean' || kind === 'tidy' || kind === 'cat';
      case 'service':
        return kind === 'station' || kind === 'bagging' || kind === 'oven';
    }
  }

  private preemptable(w: Worker): boolean {
    return w.task.type === 'none' || (w.task.type === 'restock' && (w.task.phase === 'toStock' || w.task.phase === 'pickup'));
  }

  private assignTasks(): void {
    const urgent = this.allLines().some((l) => !l.worker && l.members.length > 0);
    const idle = this.workers.filter((w) => w.task.type === 'none' || w.task.type === 'rest' || (urgent && this.preemptable(w)));
    if (!idle.length) return;
    const claimed = this.claimed();
    type Job = { score: number; kind: JobKind; pos: P; apply: (w: Worker) => void };
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
          this.walk(w.mover, line.staffSpot);
        },
      });
    }
    const cleaning = new Set(this.workers.map((w) => (w.task.type === 'clean' ? w.task.spill : -1)));
    for (const sp of this.spills) {
      if (cleaning.has(sp.id)) continue;
      jobs.push({
        score: 3 + Math.min(3, sp.age / 20), kind: 'clean', pos: sp,
        apply: (w) => {
          w.task = { type: 'clean', spill: sp.id, timer: 0 };
          this.walk(w.mover, { x: sp.x, y: sp.y });
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
            this.walk(w.mover, sp.staff);
          },
        });
      }
    }
    // with nobody shopping, top up anything that isn't nearly full
    const quiet = this.customers.every((c) => c.state === 'leave');
    for (const f of this.placed()) {
      const cap = capacityOf(this.state, f.kind);
      f.slots.forEach((s, i) => {
        const key = `${f.id}:${i}`;
        if (!s.product || claimed.has(key)) return;
        const pri = this.priority.has(key);
        // below 40% it's a real job; up to 85% it's filler work for anyone with nothing better to do
        if (s.stock > cap * 0.85 && !pri) return;
        const filler = s.stock > cap * 0.4 && !pri && !quiet;
        const p = PRODUCT_BY_ID.get(s.product)!;
        if (this.state.money < p.cost && !this.state.inventory[p.id]) return;
        if (this.event?.kind === 'late' && this.event.cat === p.cat && this.clock < this.event.until) return;
        jobs.push({
          score: filler ? 1.2 + (1 - s.stock / cap) : 2 + (1 - s.stock / cap) * 3 + (pri ? 4 : 0), kind: 'restock', pos: { x: f.x, y: f.y },
          apply: (w) => {
            w.task = { type: 'restock', fixture: f.id, slot: i, phase: 'toStock', timer: 0 };
            this.walk(w.mover, this.freeTile(w.mover, this.doorTiles(), this.layout.stockDoor) ?? this.layout.stockDoor);
          },
        });
      });
    }
    const tidying = new Set(this.workers.map((w) => (w.task.type === 'tidy' ? w.task.fixture : -1)));
    for (const f of this.placed()) {
      if (f.kind === 'decor' || this.tidy.has(f.id) || tidying.has(f.id) || !f.slots.some((s) => s.product && s.stock > 0)) continue;
      const acc = serveTiles(this.grid, f, 0);
      if (!acc.length) continue;
      jobs.push({
        score: 0.5, kind: 'tidy', pos: { x: f.x, y: f.y },
        apply: (w) => {
          w.task = { type: 'tidy', fixture: f.id, timer: 0 };
          this.walk(w.mover, this.freeTile(w.mover, acc) ?? acc[0]);
        },
      });
    }
    const cat = this.cat;
    if (this.state.cat.mood < 80 && cat.mode !== 'walk' && cat.mode !== 'sleep' && this.clock - this.catCareAt > 90 && !this.workers.some((w) => w.task.type === 'cat')) {
      const ct = cat.mover.tile;
      const near = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => ({ x: ct.x + dx, y: ct.y + dy })).filter((p) => this.grid.walkable(p.x, p.y));
      if (near.length) {
        jobs.push({
          score: 1, kind: 'cat', pos: ct,
          apply: (w) => {
            w.task = { type: 'cat', timer: 0 };
            this.walk(w.mover, this.freeTile(w.mover, near) ?? near[0]);
          },
        });
      }
    }
    jobs.sort((a, b) => b.score - a.score);
    for (const job of jobs) {
      let best: Worker | null = null;
      let bd = Infinity;
      const lineJob = job.kind === 'register' || job.kind === 'station' || job.kind === 'bagging';
      for (const w of idle) {
        if (!this.canDo(w, job.kind)) continue;
        if (w.task.type !== 'none' && w.task.type !== 'rest' && !(lineJob && this.preemptable(w))) continue;
        // a break is only cut short for real work, not filler
        if (w.task.type === 'rest' && job.score < 2) continue;
        const t = w.mover.tile;
        const d = Math.abs(t.x - job.pos.x) + Math.abs(t.y - job.pos.y);
        if (d < bd) {
          bd = d;
          best = w;
        }
      }
      if (best) {
        this.standUp(best);
        best.carrying = false;
        job.apply(best);
      }
    }
    for (const w of idle) {
      if (w.task.type === 'none' && w.mover.path.length === 0 && w.role === 'cashier') {
        const r = this.registers.find((l) => !l.worker);
        if (r && !w.mover.at(r.staffSpot)) this.walk(w.mover, r.staffSpot);
      } else if (w.task.type === 'none' && w.idleFor > 1.5) {
        w.idleFor = -Infinity;
        // someone overdue for a break takes it; otherwise wait at a counter, ready for the next customer
        if (this.clock - w.boostUntil > 150 && this.takeBreak(w)) continue;
        const counter = this.freeTile(w.mover, this.counterSpots(w));
        if (counter) {
          if (!w.mover.at(counter)) this.walk(w.mover, counter);
          continue;
        }
        if (this.takeBreak(w)) continue;
        const post = this.freeTile(w.mover, this.posts(), this.layout.stockDoor);
        if (post && !w.mover.at(post)) this.walk(w.mover, post);
      }
    }
  }

  /** Idle staff sit on a free bench for a few minutes, then work a little faster for a while. */
  private takeBreak(w: Worker): boolean {
    if (this.clock < w.boostUntil + 30) return false;
    for (const f of this.placed()) {
      if (f.kind !== 'decor' || f.decor !== 'bench' || this.seats.has(f.id)) continue;
      const acc = serveTiles(this.grid, f, 0);
      const to = acc.length ? this.freeTile(w.mover, acc) : undefined;
      if (!to) continue;
      this.seats.set(f.id, w);
      w.task = { type: 'rest', fixture: f.id, timer: 0 };
      this.walk(w.mover, to);
      return true;
    }
    return false;
  }

  private standUp(w: Worker): void {
    if (w.task.type === 'rest') this.seats.delete(w.task.fixture);
  }

  private updateWorker(w: Worker, dt: number): void {
    if (w.boost > 1 && this.clock > w.boostUntil) w.boost = 1;
    this.stepMover(w.mover, dt, 1.0 * w.speed('walk'));
    w.idleFor = w.task.type === 'none' && w.mover.path.length === 0 ? w.idleFor + dt : 0;
    if (w.mover.moving) this.gainSkill(w, 'walk', dt * 0.05);
    if (w.bubble && w.bubble.until < this.clock) w.bubble = null;
    const t = w.task;
    if (t.type === 'rest') {
      if (w.mover.path.length) return;
      w.mover.face('down');
      t.timer += dt;
      if (t.timer >= 8) {
        this.standUp(w);
        w.boost = 1.1;
        w.boostUntil = this.clock + 90;
        w.task = { type: 'none' };
        this.doAct(w, 'stretch', 1);
      }
      return;
    }
    if (t.type === 'clean') {
      if (w.mover.path.length) return;
      const sp = this.spills.find((s) => s.id === t.spill);
      if (!sp) {
        w.task = { type: 'none' };
        return;
      }
      w.mover.face('down');
      t.timer += dt;
      if (t.timer >= 1.2 / w.speed('clean')) {
        this.spills = this.spills.filter((s) => s !== sp);
        this.mopPrints(sp);
        this.stats.cleaned! += 1;
        this.gainSkill(w, 'clean', 2);
        w.task = { type: 'none' };
      }
      return;
    }
    if (t.type === 'tidy') {
      if (w.mover.path.length) return;
      const f = this.fixture(t.fixture);
      if (!f || !f.placed) {
        w.task = { type: 'none' };
        return;
      }
      this.faceToward(w.mover, { x: f.x, y: f.y });
      t.timer += dt;
      if (t.timer >= 1.5 / w.speed('display')) {
        this.tidy.set(f.id, { left: 10, power: w.power('display') });
        this.gainSkill(w, 'display', 2);
        w.task = { type: 'none' };
      }
      return;
    }
    if (t.type === 'cat') {
      if (w.mover.path.length) return;
      const ct = this.cat.mover.tile;
      const wt = w.mover.tile;
      if (Math.abs(ct.x - wt.x) + Math.abs(ct.y - wt.y) > 2) {
        w.task = { type: 'none' };
        return;
      }
      this.faceToward(w.mover, ct);
      t.timer += dt;
      if (this.cat.mode !== 'walk') this.cat.timer = Math.max(this.cat.timer, 3);
      if (t.timer >= 1.2) {
        const st = this.state.cat;
        st.mood = Math.min(100, st.mood + 4 + w.power('petcare') * 8);
        if (gainCat(this.state, 1)) this.emit({ type: 'growth', what: 'cat', level: st.level });
        this.cat.bubble = { icon: 'b_heart', until: this.clock + 2 };
        this.catCareAt = this.clock;
        this.gainSkill(w, 'petcare', 3);
        w.task = { type: 'none' };
      }
      return;
    }
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
      if (t.timer >= 0.8 / w.speed('storage')) {
        this.gainSkill(w, 'storage', 1);
        w.carrying = true;
        const acc = serveTiles(this.grid, f, t.slot);
        t.phase = 'toShelf';
        if (acc.length) this.walk(w.mover, this.freeTile(w.mover, acc)!);
      }
      return;
    }
    if (t.phase === 'toShelf') {
      t.phase = 'stocking';
      t.timer = 0;
      if (!w.bubble && this.rng.chance(0.12)) {
        // humming along while stocking
        w.bubble = { icon: 'b_laugh', until: this.clock + 1.5 };
        this.prop('notes', { x: w.mover.x, y: w.mover.y }, { x: 0, y: 0 }, 3);
      }
      this.faceToward(w.mover, f.vertical ? { x: f.x, y: f.y + t.slot } : { x: f.x + t.slot, y: f.y });
      return;
    }
    const s = f.slots[t.slot];
    const cap = capacityOf(this.state, f.kind);
    const units = cap - s.stock;
    t.timer += dt;
    if (t.timer >= (0.8 + 0.12 * units) / w.speed('restock')) {
      let moved = this.fillSlot(f, t.slot);
      // a well-organised worker brings enough for the shelf's other slot too
      const other = 1 - t.slot;
      const os = f.slots[other];
      const busy = this.workers.some((x) => x !== w && x.task.type === 'restock' && x.task.fixture === f.id && x.task.slot === other);
      if (os?.product && os.stock < cap && !busy && this.rng.chance(0.2 + w.power('storage') * 0.8)) {
        moved += this.fillSlot(f, other);
        this.gainSkill(w, 'storage', 1);
      }
      this.gainSkill(w, 'restock', 1 + moved * 0.25);
      w.carrying = false;
      w.task = { type: 'none' };
    }
  }

  /** Tops a slot up from storage first, then buys the rest; returns units added. */
  private fillSlot(f: FixtureState, slot: number): number {
    const s = f.slots[slot];
    const units = capacityOf(this.state, f.kind) - s.stock;
    const p = PRODUCT_BY_ID.get(s.product!)!;
    const unit = costOf(this.state, p);
    const stored = takeStored(this.state, p.id, units);
    s.stock += stored;
    const n = Math.max(0, Math.min(units - stored, Math.floor(this.state.money / unit)));
    const key = `${f.id}:${slot}`;
    if (n > 0) {
      s.stock += n;
      const c = n * unit;
      this.state.money -= c;
      this.stats.restock += c;
      this.supplierExp(p.id, n * (this.playerPriority.has(key) ? 2 : 1));
    }
    this.priority.delete(key);
    this.playerPriority.delete(key);
    return n + stored;
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

  /** One calm random event on some days: a tour bus, a food blogger, or a late delivery. */
  private rollEvent(): void {
    const r = this.rng.next();
    if (r < 0.1) this.event = { kind: 'tour', at: this.rng.range(10 * 60, 16 * 60) };
    else if (r < 0.18) this.event = { kind: 'blogger' };
    else if (r < 0.26) this.event = { kind: 'late', cat: this.rng.pick(CATEGORIES), until: 12 * 60 };
    if (this.event) this.emit({ type: 'event', event: this.event });
  }

  /** Suppliers occasionally send free goods, credited as a rebate since shelves start full. When the store is out of money they send much more, so a broke store can always restock. */
  private supplierGifts(broke: boolean): void {
    const seen = new Set<string>();
    let units = 0;
    let value = 0;
    const kinds: { id: string; n: number; v: number }[] = [];
    for (const f of this.placed()) {
      for (const s of f.slots) {
        if (!s.product || seen.has(s.product)) continue;
        seen.add(s.product);
        const p = PRODUCT_BY_ID.get(s.product)!;
        const chance = giftChance(this.state.suppliers[p.cat].level) / 4;
        if (!this.rng.chance(broke ? Math.max(0.6, chance) : chance)) continue;
        const n = broke ? this.rng.int(6, 10) : this.rng.int(2, 4);
        const v = n * costOf(this.state, p);
        this.state.money += v;
        this.stats.restock -= v;
        units += n;
        value += v;
        kinds.push({ id: p.id, n, v });
      }
    }
    if (broke && units > 0) this.emit({ type: 'reliefGift', units, value });
    else if (kinds.length === 1) this.emit({ type: 'gift', id: kinds[0].id, units: kinds[0].n, value: kinds[0].v });
    else if (kinds.length > 1) this.emit({ type: 'gifts', units, value });
  }

  /** Experienced coworkers pass on a little of each skill to lower-level staff every day. */
  private mentor(): void {
    const team = [{ skills: this.state.owner, id: -1 }, ...this.state.staff.map((s) => ({ skills: s.skills, id: s.id }))];
    if (team.length < 2) return;
    for (const skill of unlockedSkills(this.state.level)) {
      const best = Math.max(...team.map((m) => m.skills[skill].level));
      for (const m of team) {
        const gap = best - m.skills[skill].level;
        if (gap <= 0 || m.id < 0) continue;
        if (addExp(m.skills[skill], Math.min(30, gap * 2), skillExpToNext)) this.emit({ type: 'staffLevel', staff: m.id, skill, level: m.skills[skill].level });
      }
    }
  }

  /** Staff standing near a hand-served counter watch and learn. */
  watchLearn(skill: Skill, at: P): void {
    for (const w of this.workers.slice(1)) {
      const t = w.mover.tile;
      if (Math.abs(t.x - at.x) + Math.abs(t.y - at.y) <= 5) this.gainSkill(w, skill, 2);
    }
  }

  /** A content cat sometimes leaves a little find by the register at closing. */
  private catTreasure(): void {
    if (!this.rng.chance(0.12 + this.state.cat.mood / 500)) return;
    const k = this.rng.pick([...CAT_TREASURES]);
    this.state.catTreasures[k] = (this.state.catTreasures[k] ?? 0) + 1;
    this.stats.treasure = k;
  }

  endDayCosts(): void {
    this.catTreasure();
    const wages = this.state.staff.reduce((a, s) => a + wageOf(s), 0);
    this.state.money -= wages;
    const rent = this.state.money <= 0 ? 0 : Math.round(LEVELS[this.state.level].rent * this.rules.rent);
    this.state.money -= rent;
    this.stats.rentWaived = rent === 0;
    this.stats.wages = wages;
    this.stats.rent = rent;
    this.mentor();
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    this.stats.topSold = top(this.sold);
    this.stats.stockouts = top(this.stockouts);
    this.stats.event = this.event?.kind ?? null;
    const vals = Object.values(this.state.npcs).slice(0, rosterSize(this.state));
    this.stats.avgAffinity = vals.reduce((a, b) => a + b.fond.level, 0) / Math.max(1, vals.length);
    this.stats.reputation = this.state.reputation.level;
    this.stats.weather = weatherOf(this.state.seed, this.state.day);
    this.stats.holiday = holidayOf(this.state.day);
  }
}
