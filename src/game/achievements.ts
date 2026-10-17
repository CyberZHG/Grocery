import { CHALLENGES, doneCount, type ChallengeId } from './chain';
import { LEVELS } from './defs';
import type { GameState, MiniKind } from './state';

export type AchCategory =
  | 'expand' | 'revenue' | 'savings' | 'days' | 'customers' | 'friends' | 'unlocks' | 'hires' | 'reputation' | 'catLevel' | 'gifts' | 'introduced' | 'goals' | 'branches' | 'challenges'
  | 'ch_rush' | 'ch_fresh' | 'ch_oldtown' | 'ch_school' | 'ch_suburb'
  | 'checkout' | 'change' | 'oden' | 'odenItems' | 'deli' | 'deliPounds'
  | 'bakery' | 'trays' | 'coffee' | 'coffeeSteps' | 'bagging' | 'bagItems';

export type AchFormat = 'count' | 'money' | 'cents' | 'pounds';

export interface AchievementDef {
  id: string;
  cat: AchCategory;
  tier: number;
  target: number;
  format: AchFormat;
}

interface CategoryDef {
  cat: AchCategory;
  tiers: number[];
  format: AchFormat;
  value: (s: GameState) => number;
}

/** Size and reputation count the best store in the chain. */
export function bestLevel(s: GameState): number {
  return Math.max(s.level, ...s.stores.map((x) => x.saved?.level ?? 0));
}

function bestReputation(s: GameState): number {
  return Math.max(s.reputation.level, ...s.stores.map((x) => x.saved?.reputation.level ?? 0));
}

const challengeDone = (id: ChallengeId) => (s: GameState) => (s.stores.some((x) => x.challenge === id && x.done) ? 1 : 0);

const manual = (k: MiniKind) => (s: GameState) => s.lifetime.manual[k];
const amount = (k: MiniKind) => (s: GameState) => s.lifetime.amount[k];

/** Mini-game achievements only count completions and totals, never speed or accuracy. */
const CATEGORIES: CategoryDef[] = [
  { cat: 'expand', tiers: [1, 2, 3, 4, 5], format: 'count', value: bestLevel },
  { cat: 'revenue', tiers: [1000, 10000, 50000, 200000, 1000000], format: 'money', value: (s) => s.lifetime.revenue },
  { cat: 'savings', tiers: [5000, 25000, 100000], format: 'money', value: (s) => s.money },
  { cat: 'days', tiers: [3, 7, 30, 100, 365], format: 'count', value: (s) => s.day - 1 },
  { cat: 'customers', tiers: [100, 1000, 5000, 20000], format: 'count', value: (s) => s.lifetime.customers },
  { cat: 'friends', tiers: [1, 10, 50], format: 'count', value: (s) => Object.values(s.npcs).filter((n) => n.fond.level >= 10).length },
  { cat: 'unlocks', tiers: [5, 20, 50, 100], format: 'count', value: (s) => s.lifetime.unlocks },
  { cat: 'hires', tiers: [1, 3, 6], format: 'count', value: (s) => s.lifetime.hires },
  { cat: 'reputation', tiers: [5, 10, 25, 50], format: 'count', value: bestReputation },
  { cat: 'catLevel', tiers: [3, 10, 25], format: 'count', value: (s) => Math.max(s.cat.level, ...s.stores.map((x) => x.saved?.cat.level ?? 0)) },
  { cat: 'gifts', tiers: [5, 25, 100], format: 'count', value: (s) => Object.values(s.gifts).reduce((a, b) => a + b, 0) },
  { cat: 'introduced', tiers: [1, 10, 30], format: 'count', value: (s) => s.friends },
  { cat: 'goals', tiers: [1, 5, 10], format: 'count', value: (s) => s.goals.completed },
  { cat: 'branches', tiers: [1, 3, 5], format: 'count', value: (s) => s.branch },
  { cat: 'challenges', tiers: [1, 3, 6], format: 'count', value: doneCount },
  ...CHALLENGES.filter((c) => c.id !== 'main').map((c): CategoryDef => ({ cat: `ch_${c.id}` as AchCategory, tiers: [1], format: 'count', value: challengeDone(c.id) })),
  { cat: 'checkout', tiers: [1, 10, 50, 100], format: 'count', value: manual('checkout') },
  { cat: 'change', tiers: [1000, 10000, 30000, 50000], format: 'cents', value: amount('checkout') },
  { cat: 'oden', tiers: [1, 10, 50, 100], format: 'count', value: manual('oden') },
  { cat: 'odenItems', tiers: [20, 100, 300], format: 'count', value: amount('oden') },
  { cat: 'deli', tiers: [1, 10, 50, 100], format: 'count', value: manual('deli') },
  { cat: 'deliPounds', tiers: [5, 20, 50], format: 'pounds', value: amount('deli') },
  { cat: 'bakery', tiers: [1, 10, 50, 100], format: 'count', value: manual('bakery') },
  { cat: 'trays', tiers: [20, 100, 300], format: 'count', value: amount('bakery') },
  { cat: 'coffee', tiers: [1, 10, 50, 100], format: 'count', value: manual('coffee') },
  { cat: 'coffeeSteps', tiers: [20, 100, 300], format: 'count', value: amount('coffee') },
  { cat: 'bagging', tiers: [1, 10, 50, 100], format: 'count', value: manual('bagging') },
  { cat: 'bagItems', tiers: [30, 150, 500], format: 'count', value: amount('bagging') },
];

const VALUE = new Map(CATEGORIES.map((c) => [c.cat, c.value]));

export const ACHIEVEMENTS: AchievementDef[] = CATEGORIES.flatMap((c) =>
  c.tiers.map((target, i) => ({ id: `${c.cat}_${i + 1}`, cat: c.cat, tier: i + 1, target, format: c.format })),
);

export const ACH_CATEGORIES = CATEGORIES.map((c) => c.cat);

export function achValue(s: GameState, a: AchievementDef): number {
  return VALUE.get(a.cat)!(s);
}

export function unlockedCount(s: GameState): number {
  return ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
}

/** Marks newly reached achievements and returns them. */
export function checkAchievements(s: GameState): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    if (achValue(s, a) >= a.target) {
      s.achievements[a.id] = s.day;
      out.push(a);
    }
  }
  return out;
}

const STATION_OF: Partial<Record<AchCategory, string>> = {
  oden: 'oden', odenItems: 'oden', deli: 'deli', deliPounds: 'deli', bakery: 'bakery', trays: 'bakery',
  coffee: 'coffee', coffeeSteps: 'coffee', bagging: 'bagging', bagItems: 'bagging',
};

/** Whether the category's mini-game exists yet in this store. */
export function categoryOpen(s: GameState, cat: AchCategory): boolean {
  if (cat.startsWith('ch_')) return s.stores.some((x) => `ch_${x.challenge}` === cat);
  const st = STATION_OF[cat];
  if (!st) return true;
  const lv = LEVELS[bestLevel(s)];
  return st === 'bagging' ? lv.bagging : (lv.stations as string[]).includes(st);
}

/** Achievements reveal one tier at a time, and only after their mini-game is unlocked. */
export function isRevealed(s: GameState, a: AchievementDef): boolean {
  if (s.achievements[a.id]) return true;
  if (!categoryOpen(s, a.cat)) return false;
  return a.tier === 1 || !!s.achievements[`${a.cat}_${a.tier - 1}`];
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
