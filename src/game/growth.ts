import { CATEGORIES, PRODUCT_BY_ID, type Category, type ProductDef } from './defs';
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

export function freshGrowth(): Pick<GameState, 'reputation' | 'suppliers' | 'equipment' | 'cat'> {
  const suppliers = {} as Record<Category, Leveled>;
  for (const c of CATEGORIES) suppliers[c] = { level: 1, exp: 0 };
  const equipment = {} as Record<EquipKind, Leveled>;
  for (const e of EQUIPMENT) equipment[e] = { level: 1, exp: 0 };
  return { reputation: { level: 1, exp: 0 }, suppliers, equipment, cat: { level: 1, exp: 0, mood: 60, pets: 0, petDay: 0, fedDay: 0 } };
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
