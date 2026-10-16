import { CATEGORIES, PRODUCT_BY_ID, PRODUCTS, type Category, type ProductDef } from './defs';
import { MAX_LEVEL, type Leveled } from './rules';

export const MAX_PRODUCT_LEVEL = MAX_LEVEL;
export const STARTERS = [
  'apple_red', 'banana', 'potato_chips', 'cola', 'corn_flakes', 'white_bread', 'milk_whole', 'eggs_dozen',
  'instant_ramen', 'peanut_butter', 'pepperoni_pizza', 'ice_cream_vanilla',
];

export interface ProductProgress extends Leveled {
  sold: number;
}

export function productExpToNext(level: number): number {
  return level >= MAX_PRODUCT_LEVEL ? Infinity : 10 + 6 * (level - 1);
}

/** About +7% at level 10 and +21% at level 999. */
export function priceMult(level: number): number {
  return 1 + 0.03 * Math.log(Math.max(1, Math.min(level, MAX_PRODUCT_LEVEL)));
}

export function profit(p: ProductDef): number {
  return p.price - p.cost;
}

/** Per category, cheapest-profit products unlock first; starters are always open. */
export const UNLOCK_ORDER = {} as Record<Category, string[]>;
for (const c of CATEGORIES) {
  UNLOCK_ORDER[c] = PRODUCTS.filter((p) => p.cat === c)
    .sort((a, b) => Number(STARTERS.includes(b.id)) - Number(STARTERS.includes(a.id)) || profit(a) - profit(b))
    .map((p) => p.id);
}

export function baseUnlocked(cat: Category): number {
  return Math.max(3, Math.ceil(UNLOCK_ORDER[cat].length * 0.35));
}

/** Earned levels in a category: sum of (level - 1) across its products. */
export function categoryLevels(cat: Category, products: Record<string, ProductProgress>): number {
  let n = 0;
  for (const id of UNLOCK_ORDER[cat]) n += (products[id]?.level ?? 1) - 1;
  return n;
}

export const LEVELS_PER_UNLOCK = 2;

export function unlockedCount(cat: Category, products: Record<string, ProductProgress>): number {
  return Math.min(UNLOCK_ORDER[cat].length, baseUnlocked(cat) + Math.floor(categoryLevels(cat, products) / LEVELS_PER_UNLOCK));
}

export function unlockIndex(id: string): number {
  const p = PRODUCT_BY_ID.get(id)!;
  return UNLOCK_ORDER[p.cat].indexOf(id);
}

export function isUnlocked(id: string, products: Record<string, ProductProgress>): boolean {
  const p = PRODUCT_BY_ID.get(id)!;
  return unlockIndex(id) < unlockedCount(p.cat, products);
}

/** Category levels required to unlock a product. */
export function levelsNeeded(id: string): number {
  const p = PRODUCT_BY_ID.get(id)!;
  return Math.max(0, (unlockIndex(id) - baseUnlocked(p.cat) + 1) * LEVELS_PER_UNLOCK);
}

export function freshProducts(): Record<string, ProductProgress> {
  const out: Record<string, ProductProgress> = {};
  for (const p of PRODUCTS) out[p.id] = { level: 1, exp: 0, sold: 0 };
  return out;
}
