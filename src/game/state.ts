import { locale } from '../i18n';
import { BREAD_REGION, BREAD_UNLOCK, BREADS, CAT_COATS, CATEGORIES, NPCS, SKILLS, START_MONEY, STORE_STYLE, type Bread, type Category, type CatCoat, type FixtureKind, type Skill } from './defs';
import type { GoalsState } from './goals';
import { freshGrowth, type CatState, type EquipKind } from './growth';
import { collectionCount, freshProducts, unlockOrder, type ProductProgress } from './progress';
import type { Leveled } from './rules';
import type { ChallengeId } from './chain';
import type { LayoutVariant } from './layout';
import { emptyStreet, type Lot } from './street';

export interface SlotState {
  product: string | null;
  stock: number;
}

export interface FixtureState {
  id: number;
  kind: FixtureKind;
  x: number;
  y: number;
  vertical: boolean;
  placed: boolean;
  slots: [SlotState, SlotState];
  /** decor fixtures only */
  decor?: string;
  /** where a rolling toy has ended up, in tiles; unset until it first moves */
  at?: { x: number; y: number };
}

export type Role = 'auto' | 'cashier' | 'stocker' | 'service';

export interface StaffState {
  id: number;
  name: number;
  look: number;
  /** base daily wage agreed at hiring; see wageOf for what is actually paid */
  wage: number;
  role: Role;
  skills: Record<Skill, Leveled>;
  hiredDay: number;
  trait: string | null;
  /** total skill levels when the base wage was set */
  baseLevels: number;
}

export function totalLevels(st: Pick<StaffState, 'skills'>): number {
  return Object.values(st.skills).reduce((a, b) => a + b.level - 1, 0);
}

/** Raises follow the levels gained since hiring, growing more slowly as they pile up. */
export function raiseOf(st: StaffState): number {
  return Math.round(4 * Math.sqrt(Math.max(0, totalLevels(st) - st.baseLevels)));
}

export function wageOf(st: StaffState): number {
  return st.wage + raiseOf(st);
}

export interface NpcState {
  /** affinity level and exp toward the next affinity level */
  fond: Leveled;
  level: number;
  exp: number;
  visits: number;
  spent: number;
}

export function freshNpc(): NpcState {
  return { fond: { level: 1, exp: 0 }, level: 1, exp: 0, visits: 0, spent: 0 };
}

export interface DayStats {
  day: number;
  revenue: number;
  goodsCost: number;
  wages: number;
  rent: number;
  rentWaived?: boolean;
  restock: number;
  customers: number;
  manual: number;
  levelUps: number;
  avgAffinity: number;
  reputation?: number;
  weather?: string;
  holiday?: string | null;
  event?: string | null;
  topSold?: [string, number][];
  stockouts?: [string, number][];
  /** customers who left fed up with a long wait */
  angry?: number;
  /** customers who paid cash */
  cash?: number;
  cleaned?: number;
  /** produce, dairy and meat units sold */
  fresh?: number;
  /** what the cat brought in at closing */
  treasure?: string;
  /** income from the other stores in the chain */
  chain?: number;
  spoiled?: number;
}

export type MiniKind = 'checkout' | 'oden' | 'deli' | 'bakery' | 'coffee' | 'bagging';

/** Lifetime totals used by achievements. */
export interface Lifetime {
  revenue: number;
  customers: number;
  unlocks: number;
  hires: number;
  manual: Record<MiniKind, number>;
  /** cumulative amounts: change in cents, oden pieces, deli pounds, oven trays, coffee steps, bagged items */
  amount: Record<MiniKind, number>;
}

export function freshLifetime(): Lifetime {
  const zero = { checkout: 0, oden: 0, deli: 0, bakery: 0, coffee: 0, bagging: 0 };
  return { revenue: 0, customers: 0, unlocks: 0, hires: 0, manual: { ...zero }, amount: { ...zero } };
}

export interface GameState {
  version: number;
  seed: number;
  day: number;
  money: number;
  level: number;
  fixtures: FixtureState[];
  nextId: number;
  owner: Record<Skill, Leveled>;
  staff: StaffState[];
  candidates: StaffState[];
  former: StaffState[];
  products: Record<string, ProductProgress>;
  nightRestock: number;
  npcs: Record<string, NpcState>;
  bakery: Record<Bread, { good: number; golden: number }>;
  history: DayStats[];
  lifetime: Lifetime;
  achievements: Record<string, number>;
  reputation: Leveled;
  suppliers: Record<Category, Leveled>;
  equipment: Record<EquipKind, Leveled>;
  cat: CatState;
  catCoat: CatCoat;
  catName: string;
  storeName: string;
  style: { floor: string; wall: string; sign: string };
  /** Bought cosmetics: renovation styles as 'floor:wood' and cat accessories as 'acc:bell'. */
  owned: string[];
  catAcc: string | null;
  /** regulars introduced by friends, beyond the expansion roster */
  friends: number;
  gifts: Record<string, number>;
  goals: GoalsState;
  /** Branches opened so far. */
  branch: number;
  /** Every store in the chain; the active one's data lives in the top-level fields. */
  stores: StoreSlot[];
  active: number;
  /** Breads the player has been told about, so each unlock is announced once. */
  breadsSeen: number;
  /** Day this store (or branch) opened; new stores draw extra curious visitors for two weeks. */
  openedDay: number;
  /** Categories where every product has sold at least once. */
  collections: Category[];
  /** Units taken off shelves at night, already paid for; restocking uses them first. */
  inventory: Record<string, number>;
  /** little things the cats have brought in, by kind */
  catTreasures: Record<string, number>;
  /** buildings on the lots around this store */
  street: (Lot | null)[];
  savedAt: number;
}

/** Fields that belong to one store; switching stores swaps them in and out. */
export const STORE_KEYS = [
  'level', 'fixtures', 'staff', 'candidates', 'former', 'bakery', 'history', 'reputation', 'equipment', 'style', 'storeName', 'openedDay', 'inventory', 'nightRestock',
  'cat', 'catCoat', 'catName', 'catAcc', 'street',
] as const;
export type StoreData = Pick<GameState, (typeof STORE_KEYS)[number]>;

export interface StoreSlot {
  challenge: ChallengeId;
  layout: LayoutVariant;
  done: boolean;
  /** challenge progress: a running total or a best day, depending on the challenge */
  progress: number;
  /** null for the active store */
  saved: StoreData | null;
  /** advanced tiers taken on after the first challenge; 0 while on the first */
  tier?: number;
  /** staff id of the manager who runs this store while you're elsewhere */
  manager?: number | null;
}

export const SAVE_VERSION = 1;
const SAVE_KEY = 'grocery.save.v1';

export function freshSkills(levels: Partial<Record<Skill, number>> = {}): Record<Skill, Leveled> {
  const out = {} as Record<Skill, Leveled>;
  for (const s of SKILLS) out[s] = { level: levels[s] ?? 1, exp: 0 };
  return out;
}

function fixture(id: number, kind: FixtureKind, x: number, y: number, vertical: boolean, a: string | null, b: string | null): FixtureState {
  return { id, kind, x, y, vertical, placed: true, slots: [{ product: a, stock: 0 }, { product: b, stock: 0 }] };
}

export function newGame(seed = Date.now() % 1e9): GameState {
  const fixtures = [
    fixture(1, 'produce', 2, 2, false, 'apple_red', 'banana'),
    fixture(2, 'shelf', 5, 2, false, 'potato_chips', 'cola'),
    fixture(3, 'shelf', 8, 2, false, 'corn_flakes', 'white_bread'),
    fixture(4, 'fridge', 11, 2, true, 'milk_whole', 'eggs_dozen'),
    fixture(5, 'shelf', 5, 5, false, 'instant_ramen', 'peanut_butter'),
    fixture(6, 'freezer', 8, 5, false, 'pepperoni_pizza', 'ice_cream_vanilla'),
  ];
  const npcs: Record<string, NpcState> = {};
  for (const n of NPCS) npcs[n.id] = freshNpc();
  const bakery = {} as GameState['bakery'];
  for (const b of BREADS) bakery[b] = { good: 0, golden: 0 };
  return {
    version: SAVE_VERSION,
    seed,
    day: 1,
    money: START_MONEY,
    level: 0,
    fixtures,
    nextId: 7,
    owner: freshSkills(),
    staff: [],
    candidates: [],
    former: [],
    products: freshProducts(),
    nightRestock: 0,
    npcs,
    bakery,
    history: [],
    lifetime: freshLifetime(),
    achievements: {},
    ...freshGrowth(),
    catCoat: CAT_COATS[Math.abs(seed) % CAT_COATS.length],
    catName: '',
    storeName: '',
    style: { floor: 'cream', wall: 'beige', sign: 'wood' },
    owned: [],
    catAcc: null,
    friends: 0,
    gifts: {},
    goals: { day: 0, daily: [], week: -1, weekly: [], completed: 0 },
    branch: 0,
    stores: [{ challenge: 'main', layout: 'base', done: false, progress: 0, saved: null }],
    active: 0,
    breadsSeen: 4,
    openedDay: 1,
    collections: [],
    inventory: {},
    catTreasures: {},
    street: emptyStreet(),
    savedAt: Date.now(),
  };
}

export function saveGame(s: GameState): void {
  s.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // storage may be unavailable (private mode); the game keeps running in memory
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Fills fields added after a save was written; returns null for unusable data. */
export function migrate(data: unknown): GameState | null {
  try {
    const s = data as GameState;
    if (!s || typeof s !== 'object' || s.version !== SAVE_VERSION || !Array.isArray(s.fixtures) || typeof s.money !== 'number') return null;
    s.npcs ??= {};
    s.staff ??= [];
    s.candidates ??= [];
    s.history ??= [];
    for (const n of NPCS) {
      const st = (s.npcs[n.id] ??= freshNpc()) as NpcState & { affinity?: number };
      if (!st.fond) st.fond = { level: 1 + Math.floor(Math.max(0, (st.affinity ?? 30) - 30) / 5), exp: 0 };
      delete st.affinity;
    }
    s.former ??= [];
    s.nightRestock ??= 0;
    s.products = { ...freshProducts(), ...(s.products ?? {}) };
    for (const st of [...s.staff, ...s.candidates, ...s.former]) st.trait ??= null;
    const life = freshLifetime();
    s.lifetime = { ...life, ...(s.lifetime ?? {}), manual: { ...life.manual, ...(s.lifetime?.manual ?? {}) }, amount: { ...life.amount, ...(s.lifetime?.amount ?? {}) } };
    s.achievements ??= {};
    const g = freshGrowth();
    s.reputation ??= g.reputation;
    s.suppliers = { ...g.suppliers, ...(s.suppliers ?? {}) };
    s.equipment = { ...g.equipment, ...(s.equipment ?? {}) };
    s.cat = { ...g.cat, ...(s.cat ?? {}) };
    s.bakery = { ...Object.fromEntries(BREADS.map((b) => [b, { good: 0, golden: 0 }])), ...(s.bakery ?? {}) } as GameState['bakery'];
    s.catCoat ??= CAT_COATS[Math.abs(s.seed) % CAT_COATS.length];
    s.catName ??= '';
    s.storeName ??= '';
    s.style = Object.assign({ floor: 'cream', wall: 'beige', sign: 'wood' }, s.style ?? {});
    s.owned ??= [`floor:${s.style.floor}`, `wall:${s.style.wall}`, `sign:${s.style.sign}`];
    s.catAcc ??= null;
    s.friends ??= 0;
    s.gifts ??= {};
    s.goals ??= { day: 0, daily: [], week: -1, weekly: [], completed: 0 };
    s.branch ??= 0;
    s.stores ??= [{ challenge: 'main', layout: s.branch % 2 === 1 ? 'mirror' : 'base', done: false, progress: 0, saved: null }];
    s.active ??= 0;
    s.breadsSeen ??= unlockedBreads(s).length;
    s.openedDay ??= 1;
    s.inventory ??= {};
    s.catTreasures ??= {};
    s.street ??= emptyStreet();
    // branches opened before every store had its own look get theirs, unless they were already renovated
    const plain = (st: { floor: string; wall: string; sign: string }) => st.floor === 'cream' && st.wall === 'beige' && st.sign === 'wood';
    s.stores.forEach((slot, i) => {
      if (slot.challenge === 'main') return;
      const look = STORE_STYLE[slot.challenge];
      const data = i === s.active ? s : slot.saved;
      if (!look || !data || !plain(data.style)) return;
      data.style = { ...look };
      for (const key of [`floor:${look.floor}`, `wall:${look.wall}`, `sign:${look.sign}`]) if (!s.owned.includes(key)) s.owned.push(key);
    });
    for (const slot of s.stores) if (slot.saved) slot.saved.street ??= emptyStreet();
    // stores you aren't running keep their own bakery shelf; give them the breads added since
    for (const slot of s.stores) if (slot.saved) slot.saved.bakery = { ...Object.fromEntries(BREADS.map((b) => [b, { good: 0, golden: 0 }])), ...(slot.saved.bakery ?? {}) } as GameState['bakery'];
    s.collections ??= CATEGORIES.filter((c) => collectionCount(c, s.products) === unlockOrder(c).length);
    s.savedAt ??= Date.now();
    const skills = freshSkills();
    s.owner = { ...skills, ...s.owner };
    const everyone = [s, ...s.stores.map((x) => x.saved).filter((x) => !!x)].flatMap((d) => [...d.staff, ...d.candidates, ...d.former]);
    for (const st of everyone) {
      st.skills = { ...skills, ...st.skills };
      // staff from older saves keep today's wage; raises count from here
      st.baseLevels ??= totalLevels(st);
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function stash(s: GameState, id: string, n: number): void {
  if (n > 0) s.inventory[id] = (s.inventory[id] ?? 0) + n;
}

/** Takes up to `n` stored units of a product; returns how many were taken. */
export function takeStored(s: GameState, id: string, n: number): number {
  const k = Math.min(n, s.inventory[id] ?? 0);
  if (k <= 0) return 0;
  if (k === s.inventory[id]) delete s.inventory[id];
  else s.inventory[id] -= k;
  return k;
}

/** Highest bakery skill on the team (owner or staff). */
export function bakeryLevel(s: GameState): number {
  return Math.max(s.owner.bakery.level, ...s.staff.map((st) => st.skills.bakery.level));
}

/** Breads the team can bake here, in the order they unlock. */
export function unlockedBreads(s: GameState): Bread[] {
  const lv = bakeryLevel(s);
  const lang = locale();
  return BREADS.filter((b) => BREAD_UNLOCK[b] <= lv && (!BREAD_REGION[b] || BREAD_REGION[b] === lang)).sort((a, b) => BREAD_UNLOCK[a] - BREAD_UNLOCK[b]);
}

/** Extra traffic share for a newly opened store, fading out over 14 days. */
export function openingBuzz(s: GameState): number {
  return 0.5 * Math.max(0, 1 - (s.day - s.openedDay) / 14);
}
