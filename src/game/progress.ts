import { locale } from '../i18n';
import { CATEGORIES, offeredIn, PRODUCT_BY_ID, PRODUCTS, type Category, type ProductDef } from './defs';
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

/** Selling every product in a category at least once raises its prices for good. */
export const COLLECTION_BONUS = 0.03;

export function collectionCount(cat: Category, products: Record<string, ProductProgress>): number {
  return unlockOrder(cat).filter((id) => products[id]?.sold > 0).length;
}

export function collectionMult(cat: Category, done: Category[]): number {
  return done.includes(cat) ? 1 + COLLECTION_BONUS : 1;
}

export function profit(p: ProductDef): number {
  return p.price - p.cost;
}

const ladders = new Map<string, Record<Category, string[]>>();

/**
 * Per category, cheapest-profit products unlock first; starters are always open.
 * Each language has its own ladder: the shared products plus that language's local ones, mixed in by profit.
 */
export function unlockOrder(cat: Category): string[] {
  const lang = locale();
  let ladder = ladders.get(lang);
  if (!ladder) {
    ladder = {} as Record<Category, string[]>;
    for (const c of CATEGORIES) {
      ladder[c] = PRODUCTS.filter((p) => p.cat === c && offeredIn(p, lang))
        .sort((a, b) => Number(STARTERS.includes(b.id)) - Number(STARTERS.includes(a.id)) || profit(a) - profit(b))
        .map((p) => p.id);
    }
    ladders.set(lang, ladder);
  }
  return ladder[cat];
}

export function baseUnlocked(cat: Category): number {
  return Math.max(3, Math.ceil(unlockOrder(cat).length * 0.35));
}

/** Earned levels in a category: sum of (level - 1) across its products. */
export function categoryLevels(cat: Category, products: Record<string, ProductProgress>): number {
  let n = 0;
  for (const id of unlockOrder(cat)) n += (products[id]?.level ?? 1) - 1;
  return n;
}

export const LEVELS_PER_UNLOCK = 2;

export function unlockedCount(cat: Category, products: Record<string, ProductProgress>): number {
  return Math.min(unlockOrder(cat).length, baseUnlocked(cat) + Math.floor(categoryLevels(cat, products) / LEVELS_PER_UNLOCK));
}

export function unlockIndex(id: string): number {
  const p = PRODUCT_BY_ID.get(id)!;
  return unlockOrder(p.cat).indexOf(id);
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
