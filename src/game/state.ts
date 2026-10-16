import { BREADS, NPCS, SKILLS, START_MONEY, type Bread, type FixtureKind, type Skill } from './defs';
import { freshProducts, type ProductProgress } from './progress';
import type { Leveled } from './rules';

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
}

export type Role = 'auto' | 'cashier' | 'stocker' | 'service';

export interface StaffState {
  id: number;
  name: number;
  look: number;
  wage: number;
  role: Role;
  skills: Record<Skill, Leveled>;
  hiredDay: number;
  trait: string | null;
}

export interface NpcState {
  affinity: number;
  level: number;
  exp: number;
  visits: number;
  spent: number;
}

export interface DayStats {
  day: number;
  revenue: number;
  goodsCost: number;
  wages: number;
  rent: number;
  restock: number;
  customers: number;
  manual: number;
  levelUps: number;
  avgAffinity: number;
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
  for (const n of NPCS) npcs[n.id] = { affinity: 30, level: 1, exp: 0, visits: 0, spent: 0 };
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
  };
}

export function saveGame(s: GameState): void {
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
    const s = JSON.parse(raw) as GameState;
    if (s.version !== SAVE_VERSION) return null;
    for (const n of NPCS) s.npcs[n.id] ??= { affinity: 30, level: 1, exp: 0, visits: 0, spent: 0 };
    s.former ??= [];
    s.nightRestock ??= 0;
    s.products = { ...freshProducts(), ...(s.products ?? {}) };
    for (const st of [...s.staff, ...s.candidates, ...s.former]) st.trait ??= null;
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
