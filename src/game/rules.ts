import type { Rng } from '../core/rng';

export const MAX_LEVEL = 999;

/** Logarithmic: noticeable early, about 2x at level 999. */
export function skillSpeed(level: number): number {
  return 1 + 0.15 * Math.log(Math.max(1, level));
}

export function skillExpToNext(level: number): number {
  return 20 + 15 * (level - 1);
}

export function npcExpToNext(level: number): number {
  return 40 + 30 * (level - 1);
}

export function affinityExpToNext(level: number): number {
  return 10 + 5 * (level - 1);
}

/** Effective affinity on the old 0-100 scale: 30 at Lv 1, saturating near 84 at Lv 999. */
export function affinityValue(level: number): number {
  return 30 + 70 * (1 - 1 / (1 + Math.log(Math.max(1, level)) / 2));
}

/** Pleasant events add affinity exp; unpleasant ones only drain exp within the current level, never a level. */
export function changeAffinity(t: Leveled, delta: number): number {
  const amount = delta * 3;
  if (amount >= 0) return addExp(t, amount, affinityExpToNext);
  t.exp = Math.max(0, t.exp + amount);
  return 0;
}

export function budgetMult(level: number): number {
  return 1 + 0.5 * Math.log(Math.max(1, level));
}

export interface Leveled {
  level: number;
  exp: number;
}

/** Returns number of levels gained. */
export function addExp(t: Leveled, amount: number, toNext: (lv: number) => number): number {
  let gained = 0;
  // Levels and exp only ever go up through this path.
  if (t.level >= MAX_LEVEL || !(amount > 0)) return 0;
  t.exp += amount;
  while (t.level < MAX_LEVEL && t.exp >= toNext(t.level)) {
    t.exp -= toNext(t.level);
    t.level += 1;
    gained += 1;
  }
  if (t.level >= MAX_LEVEL) t.exp = 0;
  return gained;
}

export interface ServiceResult {
  /** 0..1, 0 when wrong */
  accuracy: number;
  seconds: number;
  manual: boolean;
}

/** Manual service rewards: accurate and fast gives up to 1.6x exp and +4 affinity. */
export function serviceReward(r: ServiceResult, fast: number, slow: number): { mult: number; affinity: number } {
  if (!r.manual) return { mult: 1, affinity: 0.5 };
  if (r.accuracy <= 0) return { mult: 0.8, affinity: -1 };
  const speed = Math.min(1, Math.max(0, (slow - r.seconds) / (slow - fast)));
  const q = r.accuracy * (0.4 + 0.6 * speed);
  return { mult: 1 + 0.6 * q, affinity: 1 + 3 * q };
}

export function waitPenalty(waitMinutes: number, patience: number): { mult: number; affinity: number } {
  const grace = 8 * patience;
  const over = Math.max(0, waitMinutes - grace);
  const mult = Math.max(0.5, 1 - over / 40);
  const affinity = over <= 0 ? 0 : over < 10 ? -1 : over < 25 ? -2 : -4;
  return { mult, affinity };
}

// ---------- cash ----------

export type CashId = 'usd' | 'cny' | 'jpy' | 'krw';

/**
 * Notes and coins in cents of the game's dollar. Prices stay the same number in every currency;
 * yen show it ×100 (a yen is a cent) and won ×1000 (a won is a tenth of a cent).
 */
export interface CashSet {
  id: CashId;
  bills: number[];
  coins: number[];
  /** notes kept in the register drawer for change */
  drawer: number[];
  /** cash totals round to this */
  step: number;
  /** the smallest amount people think of as "whole": a dollar, a yuan, a hundred yen, a thousand won */
  unit: number;
  /** amounts people round up to when they don't count exactly */
  payUps: number[];
  /** how much more or less often than usual people pay cash here */
  share: number;
}

export const CASH: Record<CashId, CashSet> = {
  usd: { id: 'usd', bills: [10000, 5000, 2000, 1000, 500, 100], coins: [25, 10, 5], drawer: [100, 500, 1000, 2000, 5000], step: 5, unit: 100, payUps: [100, 500, 2000], share: 1 },
  cny: { id: 'cny', bills: [10000, 5000, 2000, 1000, 500], coins: [100, 50, 10], drawer: [500, 1000, 2000, 5000], step: 10, unit: 100, payUps: [100, 1000, 5000], share: 0.35 },
  jpy: { id: 'jpy', bills: [10000, 5000, 1000], coins: [500, 100, 50, 10, 5, 1], drawer: [1000, 5000], step: 1, unit: 100, payUps: [100, 1000, 5000], share: 1.6 },
  krw: { id: 'krw', bills: [5000, 1000, 500, 100], coins: [50, 10, 5, 1], drawer: [100, 500, 1000], step: 1, unit: 100, payUps: [100, 500, 1000], share: 0.3 },
};

export const CASH_OF_LOCALE: Record<string, CashId> = { en: 'usd', zh: 'cny', ja: 'jpy', ko: 'krw' };

export function denoms(cash: CashSet): number[] {
  return [...cash.bills, ...cash.coins].sort((a, b) => b - a);
}

export function isBill(cash: CashSet, v: number): boolean {
  return cash.bills.includes(v);
}

/** US pennies are no longer minted and yuan go down to the jiao; cash totals round to what can be paid. */
export function roundCash(cents: number, cash = CASH.usd): number {
  return Math.round(cents / cash.step) * cash.step;
}

export function sum(pieces: number[]): number {
  return pieces.reduce((a, b) => a + b, 0);
}

export function greedy(cents: number, list = denoms(CASH.usd)): number[] {
  const out: number[] = [];
  let left = cents;
  for (const d of list) {
    while (left >= d) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}

export interface CashPayment {
  pieces: number[];
  /** what the customer believes they handed over */
  intended: number;
  cash: CashId;
}

export interface CashProfile {
  exact: number;
  miscount: number;
}

export function makeCashPayment(total: number, rng: Rng, profile: CashProfile, cash = CASH.usd): CashPayment {
  const due = roundCash(total, cash);
  const all = denoms(cash);
  const { unit, payUps } = cash;
  let pieces: number[];
  const counting = rng.next() < profile.exact;
  if (!counting) {
    const options: number[][] = [];
    const single = cash.bills.slice().reverse().find((b) => b >= due);
    if (single) options.push([single]);
    options.push(greedy(Math.ceil(due / payUps[0]) * payUps[0], all));
    options.push(greedy(Math.ceil(due / payUps[1]) * payUps[1], all));
    if (due > payUps[2]) options.push(greedy(Math.ceil(due / payUps[2]) * payUps[2], all));
    pieces = rng.pick(options);
  } else {
    const small = due % unit;
    const whole = due - small;
    if (small === 0 || rng.next() < 0.5) {
      pieces = [...greedy(whole, all), ...greedy(small, cash.coins)];
    } else {
      // hands over extra coins so change comes back in whole units
      const notes = greedy(Math.ceil(due / (unit * 5)) * unit * 5, all);
      const extra = greedy(small, cash.coins);
      pieces = sum(notes) - due >= unit ? [...notes, ...extra] : [...greedy(whole + unit, all), ...extra];
    }
  }
  const intended = sum(pieces);
  if (counting && rng.next() < profile.miscount && pieces.length > 1) {
    const small = pieces.filter((p) => !isBill(cash, p));
    if (small.length && rng.next() < 0.6) {
      pieces.splice(pieces.indexOf(rng.pick(small)), 1);
    } else {
      pieces.push(rng.pick(cash.coins.filter((c) => c < unit)));
    }
  }
  return { pieces, intended, cash: cash.id };
}

export function changeDue(pieces: number[], total: number, cash = CASH.usd): number {
  return sum(pieces) - roundCash(total, cash);
}
