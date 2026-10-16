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

export const BILLS = [10000, 5000, 2000, 1000, 500, 100];
export const DRAWER_BILLS = [100, 500, 1000, 2000, 5000];
export const COINS = [25, 10, 5];
export const ALL_DENOMS = [...BILLS, ...COINS];

/** Pennies are no longer minted; cash totals round to the nearest nickel. */
export function roundCash(cents: number): number {
  return Math.round(cents / 5) * 5;
}

export function sum(pieces: number[]): number {
  return pieces.reduce((a, b) => a + b, 0);
}

export function greedy(cents: number, denoms = ALL_DENOMS): number[] {
  const out: number[] = [];
  let left = cents;
  for (const d of denoms) {
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
}

export interface CashProfile {
  exact: number;
  miscount: number;
}

export function makeCashPayment(total: number, rng: Rng, profile: CashProfile): CashPayment {
  const due = roundCash(total);
  let pieces: number[];
  const counting = rng.next() < profile.exact;
  if (!counting) {
    const options: number[][] = [];
    const single = BILLS.slice().reverse().find((b) => b >= due);
    if (single) options.push([single]);
    const dollars = Math.ceil(due / 100) * 100;
    options.push(greedy(dollars, BILLS));
    const five = Math.ceil(due / 500) * 500;
    options.push(greedy(five, BILLS));
    if (due > 2000) options.push(greedy(Math.ceil(due / 2000) * 2000, BILLS));
    pieces = rng.pick(options);
  } else {
    const cents = due % 100;
    const dollarsPart = due - cents;
    if (cents === 0 || rng.next() < 0.5) {
      pieces = [...greedy(dollarsPart, BILLS), ...greedy(cents, COINS)];
    } else {
      // hands over extra coins so change comes back in whole dollars
      const bills = greedy(Math.ceil(due / 500) * 500, BILLS);
      const extra = greedy(cents, COINS);
      pieces = sum(bills) - due >= 100 ? [...bills, ...extra] : [...greedy(dollarsPart + 100, BILLS), ...extra];
    }
  }
  const intended = sum(pieces);
  if (counting && rng.next() < profile.miscount && pieces.length > 1) {
    const small = pieces.filter((p) => p < 100);
    if (small.length && rng.next() < 0.6) {
      pieces.splice(pieces.indexOf(rng.pick(small)), 1);
    } else {
      pieces.push(rng.pick(COINS));
    }
  }
  return { pieces, intended };
}

export function changeDue(pieces: number[], total: number): number {
  return sum(pieces) - roundCash(total);
}
