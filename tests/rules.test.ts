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
