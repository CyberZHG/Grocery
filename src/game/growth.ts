import { streetFx } from './street';
import { CATEGORIES, FIXTURES, LEVELS, NPCS, PRODUCT_BY_ID, type Category, type FixtureKind, type ProductDef } from './defs';
import { addExp, type Leveled } from './rules';
import type { GameState } from './state';

export type EquipKind = 'register' | 'oden' | 'deli' | 'oven' | 'coffee' | 'bagging';
export const EQUIPMENT: EquipKind[] = ['register', 'oden', 'deli', 'oven', 'coffee', 'bagging'];

export interface CatState extends Leveled {
  /** 0-100, rises with petting and treats, drifts down slowly */
  mood: number;
  pets: number;
  petDay: number;
  fedDay: number;
}

export type RackKind = Exclude<FixtureKind, 'decor'>;
export const RACKS: RackKind[] = ['shelf', 'produce', 'fridge', 'freezer'];

export function freshGrowth(): Pick<GameState, 'reputation' | 'suppliers' | 'equipment' | 'cat' | 'racks'> {
  const suppliers = {} as Record<Category, Leveled>;
  for (const c of CATEGORIES) suppliers[c] = { level: 1, exp: 0 };
  const equipment = {} as Record<EquipKind, Leveled>;
  for (const e of EQUIPMENT) equipment[e] = { level: 1, exp: 0 };
  const racks = {} as Record<RackKind, Leveled>;
  for (const r of RACKS) racks[r] = { level: 1, exp: 0 };
  return { reputation: { level: 1, exp: 0 }, suppliers, equipment, cat: { level: 1, exp: 0, mood: 60, pets: 0, petDay: 0, fedDay: 0 }, racks };
}

// ---------- fixture capacity ----------

/** Items customers take from a kind of fixture, needed for its next capacity level. */
export const rackExpToNext = (lv: number) => 30 + 15 * (lv - 1);

/** How many items one slot holds: one more every 3 levels of that fixture kind, up to double. */
export function capacityOf(s: Pick<GameState, 'racks'>, kind: FixtureKind): number {
  const base = FIXTURES[kind].capacity;
  if (kind === 'decor') return base;
  const lv = s.racks?.[kind]?.level ?? 1;
  return base + Math.min(base, Math.floor((lv - 1) / 3));
}

/** All fixtures of a kind in this store share one level; true when it went up. */
export function gainRack(s: GameState, kind: FixtureKind, amount: number): boolean {
  if (kind === 'decor') return false;
  return addExp(s.racks[kind], amount, rackExpToNext) > 0;
}

// ---------- reputation ----------

export const repExpToNext = (lv: number) => 30 + 20 * (lv - 1);

/** 1-5 stars: doubling level thresholds. */
export function stars(level: number): number {
  return Math.min(5, 1 + Math.floor(Math.log2(Math.max(1, level)) / 1.2));
}

export function repTraffic(level: number): number {
  return 0.04 * Math.log(Math.max(1, level));
}

export function gainReputation(s: GameState, amount: number): number {
  return addExp(s.reputation, amount, repExpToNext);
}

// ---------- suppliers ----------

export const supplierExpToNext = (lv: number) => 40 + 25 * (lv - 1);

/** About -5% at Lv 10 and -14% at Lv 999. */
export function supplierDiscount(level: number): number {
  return 0.02 * Math.log(Math.max(1, level));
}

export function costOf(s: GameState, p: ProductDef): number {
  return p.cost * (1 - supplierDiscount(s.suppliers[p.cat].level));
}

export function gainSupplier(s: GameState, productId: string, units: number): number {
  const p = PRODUCT_BY_ID.get(productId);
  if (!p || units <= 0) return 0;
  return addExp(s.suppliers[p.cat], units, supplierExpToNext);
}

/** Chance per morning that a supplier sends a few free units. */
export function giftChance(level: number): number {
  return Math.min(0.25, 0.03 * Math.log(Math.max(1, level)));
}

// ---------- equipment ----------

export const equipExpToNext = (lv: number) => 15 + 10 * (lv - 1);

export function equipSpeed(level: number): number {
  return 1 + 0.08 * Math.log(Math.max(1, level));
}

export function equipTier(level: number): number {
  return level >= 30 ? 2 : level >= 8 ? 1 : 0;
}

export function gainEquipment(s: GameState, kind: EquipKind, amount: number): number {
  return addExp(s.equipment[kind], amount, equipExpToNext);
}

// ---------- cat ----------

export const catExpToNext = (lv: number) => 20 + 12 * (lv - 1);
export const PETS_PER_DAY = 5;

/** Extra visit chance for cat-loving regulars. */
export function catAppeal(level: number, mood: number): number {
  return 0.03 * Math.log(Math.max(1, level)) * (0.5 + mood / 200);
}

export function catLover(npcIndex: number): boolean {
  return npcIndex % 4 === 1;
}

export function gainCat(s: GameState, amount: number): number {
  return addExp(s.cat, amount, catExpToNext);
}

/** Regulars who visit: the expansion roster plus friends introduced by close regulars. */
export function rosterSize(s: GameState): number {
  return Math.min(NPCS.length, LEVELS[s.level].roster + s.friends + streetFx(s.street).roster);
}
