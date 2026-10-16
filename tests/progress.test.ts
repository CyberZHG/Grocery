import { describe, expect, it } from 'vitest';
import { CATEGORIES, PRODUCT_BY_ID } from '../src/game/defs';
import { freshProducts, isUnlocked, levelsNeeded, priceMult, profit, STARTERS, UNLOCK_ORDER, unlockedCount } from '../src/game/progress';

describe('product progression', () => {
  it('starters are unlocked from the beginning', () => {
    const prog = freshProducts();
    for (const id of STARTERS) expect(isUnlocked(id, prog)).toBe(true);
  });

  it('higher-profit products unlock later', () => {
    for (const c of CATEGORIES) {
      const order = UNLOCK_ORDER[c].filter((id) => !STARTERS.includes(id));
      for (let i = 1; i < order.length; i++) {
        expect(profit(PRODUCT_BY_ID.get(order[i])!)).toBeGreaterThanOrEqual(profit(PRODUCT_BY_ID.get(order[i - 1])!));
      }
    }
  });

  it('category levels unlock the next product', () => {
    const prog = freshProducts();
    const order = UNLOCK_ORDER.meat;
    const before = unlockedCount('meat', prog);
    const next = order[before];
    expect(isUnlocked(next, prog)).toBe(false);
    prog[order[0]].level += levelsNeeded(next);
    expect(isUnlocked(next, prog)).toBe(true);
  });

  it('levels raise price only slightly', () => {
    expect(priceMult(1)).toBe(1);
    expect(priceMult(10)).toBeLessThan(1.08);
    expect(priceMult(999)).toBeLessThan(1.22);
  });
});
