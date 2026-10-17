import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { addExp, npcExpToNext, affinityValue, budgetMult, changeAffinity, MAX_LEVEL, changeDue, makeCashPayment, roundCash, serviceReward, skillExpToNext, skillSpeed, sum } from '../src/game/rules';

describe('skill speed', () => {
  it('grows with diminishing returns', () => {
    expect(skillSpeed(1)).toBe(1);
    const d1 = skillSpeed(5) - skillSpeed(1);
    const d2 = skillSpeed(25) - skillSpeed(21);
    expect(d2).toBeLessThan(d1 / 3);
    expect(skillSpeed(50)).toBeLessThan(2);
    expect(skillSpeed(999)).toBeLessThan(2.1);
  });

  it('never lowers a level or exp', () => {
    const s = { level: 4, exp: 3 };
    expect(addExp(s, -50, npcExpToNext)).toBe(0);
    expect(s).toEqual({ level: 4, exp: 3 });
  });

  it('caps at level 999', () => {
    const s = { level: 998, exp: 0 };
    addExp(s, 1e9, skillExpToNext);
    expect(s.level).toBe(MAX_LEVEL);
    expect(addExp(s, 1e9, skillExpToNext)).toBe(0);
    expect(budgetMult(999)).toBeLessThan(5);
  });

  it('levels up across thresholds', () => {
    const s = { level: 1, exp: 0 };
    const gained = addExp(s, skillExpToNext(1) + skillExpToNext(2) + 1, skillExpToNext);
    expect(gained).toBe(2);
    expect(s.level).toBe(3);
    expect(s.exp).toBe(1);
  });
});

describe('affinity levels', () => {
  it('starts at the old baseline and saturates', () => {
    expect(affinityValue(1)).toBeCloseTo(30);
    expect(affinityValue(10)).toBeGreaterThan(60);
    expect(affinityValue(999)).toBeLessThan(90);
  });

  it('gains levels and never loses them', () => {
    const f = { level: 1, exp: 0 };
    changeAffinity(f, 20);
    const lv = f.level;
    expect(lv).toBeGreaterThan(2);
    changeAffinity(f, -1000);
    expect(f.level).toBe(lv);
    expect(f.exp).toBe(0);
  });
});

describe('cash', () => {
  it('rounds to the nearest nickel', () => {
    expect(roundCash(1347)).toBe(1345);
    expect(roundCash(1348)).toBe(1350);
    expect(roundCash(1342)).toBe(1340);
  });

  it('mostly pays enough and never uses pennies', () => {
    const rng = new Rng(42);
    let short = 0;
    for (let i = 0; i < 2000; i++) {
      const total = rng.int(50, 12000);
      const p = makeCashPayment(total, rng, { exact: 0.4, miscount: 0.15 });
      expect(p.pieces.every((v) => v !== 1)).toBe(true);
      expect(p.intended).toBeGreaterThanOrEqual(roundCash(total));
      if (changeDue(p.pieces, total) < 0) short += 1;
    }
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThan(200);
  });

  it('intended payment matches pieces without miscount', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 500; i++) {
      const p = makeCashPayment(rng.int(100, 9000), rng, { exact: 0.5, miscount: 0 });
      expect(sum(p.pieces)).toBe(p.intended);
    }
  });
});

describe('service reward', () => {
  it('rewards fast accurate manual service more than auto', () => {
    const auto = serviceReward({ accuracy: 1, seconds: 0, manual: false }, 5, 25);
    const fast = serviceReward({ accuracy: 1, seconds: 4, manual: true }, 5, 25);
    const slow = serviceReward({ accuracy: 1, seconds: 30, manual: true }, 5, 25);
    expect(fast.mult).toBeGreaterThan(slow.mult);
    expect(slow.mult).toBeGreaterThan(auto.mult);
    expect(fast.affinity).toBeGreaterThan(auto.affinity);
  });
});

describe('cash in every currency', () => {
  it('pays with real notes and coins, mostly enough, and counts right without miscount', async () => {
    const { CASH, denoms } = await import('../src/game/rules');
    for (const cash of Object.values(CASH)) {
      const rng = new Rng(11);
      const valid = new Set(denoms(cash));
      let short = 0;
      for (let i = 0; i < 1500; i++) {
        const total = rng.int(50, 12000);
        const p = makeCashPayment(total, rng, { exact: 0.4, miscount: 0.15 }, cash);
        expect(p.cash).toBe(cash.id);
        expect(p.pieces.every((v) => valid.has(v)), cash.id).toBe(true);
        expect(p.intended).toBeGreaterThanOrEqual(roundCash(total, cash));
        if (changeDue(p.pieces, total, cash) < 0) short += 1;
        const q = makeCashPayment(total, rng, { exact: 0.5, miscount: 0 }, cash);
        expect(sum(q.pieces)).toBe(q.intended);
      }
      expect(short, cash.id).toBeLessThan(150);
      // change can always be made from the drawer
      for (let c = cash.step; c < 10000; c += cash.step) expect(sum(greedyChange(c, [...cash.drawer].reverse(), cash.coins)), `${cash.id} ${c}`).toBe(c);
    }
  });
});

function greedyChange(c: number, notes: number[], coins: number[]): number[] {
  const out: number[] = [];
  let left = c;
  for (const d of [...notes, ...coins]) while (left >= d) (out.push(d), (left -= d));
  return out;
}

describe('regional products', () => {
  it('a hundred per language, kept out of other languages’ unlock ladders', async () => {
    const { PRODUCTS, CATEGORIES, offeredIn } = await import('../src/game/defs');
    const { unlockOrder } = await import('../src/game/progress');
    const regional = PRODUCTS.filter((p) => p.region);
    for (const lang of ['zh', 'ja', 'ko']) expect(regional.filter((p) => p.region === lang).length, lang).toBe(100);
    // tests play in English: the ladder holds only the shared products
    const ladder = new Set(CATEGORIES.flatMap((c) => unlockOrder(c)));
    for (const p of regional) {
      expect(ladder.has(p.id)).toBe(false);
      expect(offeredIn(p, p.region!)).toBe(true);
      expect(offeredIn(p, 'en')).toBe(false);
    }
  });
});

describe('local flavor', () => {
  it('holidays only boost real products, and each language has its own calendar', async () => {
    const { HOLIDAYS, dateOf } = await import('../src/game/calendar');
    const { PRODUCT_BY_ID } = await import('../src/game/defs');
    for (const [lang, list] of Object.entries(HOLIDAYS)) {
      for (const h of list) for (const id of Object.keys(h.items)) expect(PRODUCT_BY_ID.has(id), `${lang} ${h.id} ${id}`).toBe(true);
      // every holiday falls on some day of the year, and no two on the same day
      const days = new Map<number, string>();
      for (let d = 1; d <= 365; d++) {
        const hits = list.filter((h) => h.on(dateOf(d)));
        expect(hits.length, `${lang} day ${d}`).toBeLessThanOrEqual(1);
        if (hits[0]) days.set(d, hits[0].id);
      }
      expect(new Set(days.values()).size, lang).toBe(list.length);
    }
  });

  it('keeps everyone’s favorite bread among the breads every language has', async () => {
    const { favBread, BREAD_REGION, NPCS } = await import('../src/game/defs');
    for (const n of NPCS) expect(BREAD_REGION[favBread(n.index)]).toBeUndefined();
  });

  it('prices and unlocks every renovation style', async () => {
    const { FLOOR_STYLES, WALL_STYLES, SIGN_STYLES, STYLE_PRICE, STYLE_UNLOCK } = await import('../src/game/defs');
    expect(STYLE_PRICE.floor.length).toBe(FLOOR_STYLES.length);
    expect(STYLE_PRICE.wall.length).toBe(WALL_STYLES.length);
    expect(STYLE_PRICE.sign.length).toBe(SIGN_STYLES.length);
    expect(STYLE_UNLOCK.floor.length).toBe(FLOOR_STYLES.length);
    expect(STYLE_UNLOCK.wall.length).toBe(WALL_STYLES.length);
    expect(STYLE_UNLOCK.sign.length).toBe(SIGN_STYLES.length);
  });
});

describe('local buildings', () => {
  it('boost real products and add busy hours that fit in the day', async () => {
    const { streetFx, BUILDINGS, BUILDING_REGION } = await import('../src/game/street');
    const { PRODUCT_BY_ID, DAY_START, LAST_ENTRY } = await import('../src/game/defs');
    expect(new Set(Object.values(BUILDING_REGION))).toEqual(new Set(['zh', 'ja', 'ko']));
    const fx = streetFx(BUILDINGS.map((id) => ({ id, level: 3 })));
    for (const id of Object.keys(fx.items)) expect(PRODUCT_BY_ID.has(id), id).toBe(true);
    for (const [at, share] of fx.peaks) {
      expect(at).toBeGreaterThan(DAY_START);
      expect(at).toBeLessThan(LAST_ENTRY);
      expect(share).toBeLessThan(0.2);
    }
  });
});
