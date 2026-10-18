import { FIXTURES, PRODUCTS, type FixtureKind, type ProductDef } from './defs';
import { canPlace, type FixturePlacement, type Layout } from './layout';
import { collectionMult, isUnlocked, priceMult, productExpToNext } from './progress';
import { stash, type FixtureState, type GameState } from './state';

export type StockMode = 'profit' | 'high' | 'low';

const ORDER: FixtureKind[] = ['fridge', 'freezer', 'produce', 'shelf'];

type Spot = { x: number; y: number; vertical: boolean };
type Item = { id: number; kind: FixtureKind };

/**
 * Lines the fixtures up in rows facing aisles, with a cross aisle every three fixtures; each kind fills blocks of those rows. Decor stays put.
 * The rows are filled one kind at a time, always topping up the kind there are fewest of: owned fixtures first,
 * then new ones while money lasts, but never more of a kind than `cap` (enough slots for every product it can hold). Owned fixtures left over (the kinds there are too many of) go to storage.
 */
export function autoArrange(
  layout: Layout, fixtures: FixtureState[], money = 0, prices: Partial<Record<FixtureKind, number>> = {}, cap: Partial<Record<FixtureKind, number>> = {},
): { spots: Map<number, Spot>; bought: (Spot & { kind: FixtureKind })[]; stored: number[] } {
  const decor: FixturePlacement[] = fixtures.filter((f) => f.placed && f.kind === 'decor');
  const pattern: Spot[] = [];
  // block by block, so each kind ends up in one patch of the floor
  for (let b = 1; b + 1 < layout.w; b += 7) {
    for (let y = 0; y < layout.h; y += 2) {
      for (let x = b; x < b + 6 && x + 1 < layout.w - 1; x += 2) pattern.push({ x, y, vertical: false });
    }
  }
  const kept = [...decor];
  const fit = (kind: FixtureKind) => pattern.find((p) => canPlace(layout, kept, { kind, ...p }));
  let room = 0;
  for (let spot = fit('shelf'); spot; spot = fit('shelf')) {
    kept.push({ kind: 'shelf', ...spot });
    room += 1;
  }
  kept.length = decor.length;
  // placed ones before stored ones, so the fixtures on the floor stay when a kind is cut back
  const own = new Map(ORDER.map((k) => [k, fixtures.filter((f) => f.kind === k).sort((a, b) => Number(b.placed) - Number(a.placed) || a.id - b.id)]));
  const count = new Map(ORDER.map((k) => [k, 0]));
  const chosen: Item[] = [];
  const out = new Set<FixtureKind>();
  let next = -1;
  while (chosen.length < room) {
    const kind = ORDER.filter((k) => !out.has(k)).sort((a, b) => count.get(a)! - count.get(b)! || ORDER.indexOf(b) - ORDER.indexOf(a))[0];
    if (!kind) break;
    const mine = own.get(kind)!.shift();
    if (mine) chosen.push({ id: mine.id, kind });
    else if (prices[kind] !== undefined && prices[kind]! <= money && count.get(kind)! < (cap[kind] ?? Infinity)) {
      money -= prices[kind]!;
      chosen.push({ id: next--, kind });
    } else {
      out.add(kind);
      continue;
    }
    count.set(kind, count.get(kind)! + 1);
  }
  const spots = new Map<number, Spot>();
  const bought: (Spot & { kind: FixtureKind })[] = [];
  chosen.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || Number(a.id < 0) - Number(b.id < 0) || a.id - b.id);
  for (const f of chosen) {
    const spot = fit(f.kind);
    if (!spot) continue;
    kept.push({ kind: f.kind, ...spot });
    if (f.id < 0) bought.push({ kind: f.kind, ...spot });
    else spots.set(f.id, spot);
  }
  const stored = fixtures.filter((f) => f.placed && f.kind !== 'decor' && !spots.has(f.id)).map((f) => f.id);
  return { spots, bought, stored };
}

/**
 * Fills every slot with a different product, best first by the chosen measure, per storage type.
 * Slots already holding a chosen product keep it and its stock. Returns how many slots changed.
 */
export function autoStock(s: GameState, mode: StockMode, offered: (p: ProductDef) => boolean): number {
  const prog = s.products;
  const profit = (p: ProductDef) => p.price * priceMult(prog[p.id].level) * collectionMult(p.cat, s.collections) - p.cost;
  const level = (p: ProductDef) => {
    const next = productExpToNext(prog[p.id].level);
    return prog[p.id].level + (Number.isFinite(next) ? prog[p.id].exp / next : 0);
  };
  const score = (p: ProductDef) => (mode === 'profit' ? profit(p) : mode === 'high' ? level(p) : -level(p));
  let changed = 0;
  const placed = s.fixtures.filter((f) => f.placed && f.kind !== 'decor');
  for (const store of new Set(placed.map((f) => FIXTURES[f.kind].store))) {
    const slots = placed.filter((f) => FIXTURES[f.kind].store === store).flatMap((f) => f.slots);
    const picks = PRODUCTS.filter((p) => p.store === store && offered(p) && isUnlocked(p.id, prog))
      .sort((a, b) => score(b) - score(a) || profit(b) - profit(a))
      .slice(0, slots.length)
      .map((p) => p.id);
    const want = new Set(picks);
    const free = picks.filter((id) => !slots.some((sl) => sl.product === id));
    const seen = new Set<string>();
    for (const sl of slots) {
      if (sl.product && want.has(sl.product) && !seen.has(sl.product)) {
        seen.add(sl.product);
        continue;
      }
      const id = free.shift() ?? null;
      if (sl.product === id) continue;
      if (sl.product) stash(s, sl.product, sl.stock);
      sl.product = id;
      sl.stock = 0;
      changed += 1;
    }
  }
  return changed;
}

/** How many fixtures of each kind it takes to put every unlocked product of its storage on display once. */
export function fixturesNeeded(s: GameState, offered: (p: ProductDef) => boolean): Partial<Record<FixtureKind, number>> {
  const out: Partial<Record<FixtureKind, number>> = {};
  for (const k of ORDER) {
    const n = PRODUCTS.filter((p) => p.store === FIXTURES[k].store && offered(p) && isUnlocked(p.id, s.products)).length;
    out[k] = Math.ceil(n / 2);
  }
  return out;
}
