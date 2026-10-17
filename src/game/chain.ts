import { CAT_COATS, FIXTURES, LEVELS, type Category } from './defs';
import { buildLayout, canPlace, type FixturePlacement, type Layout, type LayoutVariant } from './layout';
import { newGame, stash, STORE_KEYS, type DayStats, type GameState, type StoreData, type StoreSlot } from './state';

export type ChallengeId = 'main' | 'rush' | 'fresh' | 'oldtown' | 'school' | 'suburb';

/** Restrictions a branch runs under until its challenge is done. */
export interface Rules {
  patience: number;
  traffic: number;
  budget: number;
  /** share of customers paying cash, or null for each regular's own habit */
  cash: number | null;
  walk: number;
  spill: number;
  /** share of unsold produce and chilled stock thrown out each night */
  spoil: number;
}

const NO_RULES: Rules = { patience: 1, traffic: 1, budget: 1, cash: null, walk: 1, spill: 1, spoil: 0 };

/** A busy period: center in game minutes, share of the day's visitors, and how far it spreads either side. */
export type Peak = [minute: number, share: number, spread: number];

type Goal = 'expand' | 'calm' | 'fresh' | 'cash' | 'cleaned' | 'revenue';

export interface ChallengeDef {
  id: ChallengeId;
  layout: LayoutVariant;
  rules: Partial<Rules>;
  /** when this store's customers come; the rest arrive evenly through the day */
  peaks: Peak[];
  goal: Goal;
  target: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'main', layout: 'base', rules: {}, peaks: [[690, 0.45, 220], [1050, 0.45, 220]], goal: 'expand', target: 1 },
  { id: 'rush', layout: 'mirror', rules: { patience: 0.6, traffic: 1.3 }, peaks: [[510, 0.4, 50], [1080, 0.45, 50]], goal: 'calm', target: 4000 },
  { id: 'fresh', layout: 'pillars', rules: { spoil: 0.25 }, peaks: [[555, 0.5, 90], [990, 0.3, 120]], goal: 'fresh', target: 6000 },
  { id: 'oldtown', layout: 'side', rules: { cash: 0.9, walk: 0.7, patience: 1.3 }, peaks: [[510, 0.35, 60], [840, 0.4, 150]], goal: 'cash', target: 2500 },
  { id: 'school', layout: 'pillars_mirror', rules: { spill: 4, budget: 0.75 }, peaks: [[490, 0.25, 25], [930, 0.5, 60]], goal: 'cleaned', target: 250 },
  { id: 'suburb', layout: 'side_mirror', rules: { traffic: 0.55, budget: 1.8 }, peaks: [[780, 0.45, 200], [1110, 0.3, 90]], goal: 'revenue', target: 150000 },
];
export const CHALLENGE_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export const BRANCH_REP = 20;
/** Cost of opening each branch in turn. */
export const BRANCH_COST = [40000, 60000, 90000, 130000, 180000];
/** Each finished store raises prices in every store. */
export const STORE_BONUS = 0.02;
/** Stores you are not running earn this share of their recent daily profit. */
export const MANAGER_SHARE = 0.5;

const FRESH: Category[] = ['produce', 'dairy', 'meat'];
export function isFresh(cat: Category): boolean {
  return FRESH.includes(cat);
}

export function activeSlot(s: GameState): StoreSlot {
  return s.stores[s.active];
}

export function storeLayout(s: GameState, level = s.level): Layout {
  return buildLayout(level, activeSlot(s).layout);
}

export function peaksOf(s: GameState): Peak[] {
  return CHALLENGE_BY_ID.get(activeSlot(s).challenge)!.peaks;
}

export function rulesOf(s: GameState): Rules {
  const slot = activeSlot(s);
  if (slot.done) return NO_RULES;
  return { ...NO_RULES, ...CHALLENGE_BY_ID.get(slot.challenge)!.rules };
}

/** Rewards from finished challenges; they apply in every store. */
export interface Perks {
  price: number;
  cat: Partial<Record<Category, number>>;
  service: number;
  affinity: number;
  spill: number;
  budget: number;
}

export function perksOf(s: GameState): Perks {
  const p: Perks = { price: 0, cat: {}, service: 1, affinity: 1, spill: 1, budget: 1 };
  for (const slot of s.stores) {
    if (!slot.done) continue;
    p.price += STORE_BONUS;
    switch (slot.challenge) {
      case 'rush': p.service = 1.12; break;
      case 'fresh': for (const c of FRESH) p.cat[c] = (p.cat[c] ?? 0) + 0.05; break;
      case 'oldtown': p.affinity = 1.2; break;
      case 'school':
        p.spill = 0.6;
        for (const c of ['candy', 'snacks'] as Category[]) p.cat[c] = (p.cat[c] ?? 0) + 0.04;
        break;
      case 'suburb': p.budget = 1.08; break;
    }
  }
  return p;
}

export function chainPriceMult(p: Perks, cat: Category): number {
  return 1 + p.price + (p.cat[cat] ?? 0);
}

/** Every challenge counts up over many days, so a store left on autopilot gets there too. */
/** 0..1 progress toward the active store's challenge, plus the raw value. */
export function progressOf(s: GameState, i = s.active): { value: number; target: number; ratio: number } {
  const slot = s.stores[i];
  const def = CHALLENGE_BY_ID.get(slot.challenge)!;
  if (def.goal === 'expand') {
    const data = i === s.active ? s : slot.saved!;
    const max = LEVELS.length - 1;
    const ratio = slot.done ? 1 : (Math.min(data.level, max) / max) * 0.5 + (Math.min(data.reputation.level, BRANCH_REP) / BRANCH_REP) * 0.5;
    return { value: ratio, target: 1, ratio };
  }
  const value = slot.done ? Math.max(slot.progress, def.target) : slot.progress;
  return { value, target: def.target, ratio: Math.min(1, value / def.target) };
}

/** Folds a finished day into the active store's challenge. */
export function recordDay(s: GameState, st: DayStats): void {
  const slot = activeSlot(s);
  if (slot.done) return;
  switch (CHALLENGE_BY_ID.get(slot.challenge)!.goal) {
    case 'calm': slot.progress += st.customers - (st.angry ?? 0); break;
    case 'fresh': slot.progress += st.fresh ?? 0; break;
    case 'cash': slot.progress += st.cash ?? 0; break;
    case 'cleaned': slot.progress += st.cleaned ?? 0; break;
    case 'revenue': slot.progress += Math.round(st.revenue); break;
  }
}

/** Marks the active store's challenge done when its goal is met; returns it if it just finished. */
export function checkChallenge(s: GameState): ChallengeId | null {
  const slot = activeSlot(s);
  if (slot.done) return null;
  const def = CHALLENGE_BY_ID.get(slot.challenge)!;
  const met = def.goal === 'expand'
    ? s.level >= LEVELS.length - 1 && s.reputation.level >= BRANCH_REP
    : slot.progress >= def.target;
  if (!met) return null;
  slot.done = true;
  return slot.challenge;
}

/** Throws out part of the unsold fresh stock at the end of a day; returns units lost. */
export function spoil(s: GameState): number {
  const share = rulesOf(s).spoil;
  if (!share) return 0;
  let lost = 0;
  for (const f of s.fixtures) {
    if (!f.placed || (FIXTURES[f.kind].store !== 'produce' && FIXTURES[f.kind].store !== 'fridge')) continue;
    for (const sl of f.slots) {
      const n = Math.floor(sl.stock * share);
      sl.stock -= n;
      lost += n;
    }
  }
  return lost;
}

function dailyProfit(d: DayStats): number {
  return d.revenue - d.goodsCost - d.wages - d.rent;
}

/** What one inactive store earns per day under its manager. */
export function storeIncome(slot: StoreSlot): number {
  const hist = slot.saved?.history.slice(-7) ?? [];
  if (!hist.length) return 0;
  const avg = hist.reduce((a, d) => a + dailyProfit(d), 0) / hist.length;
  return Math.max(0, Math.round(avg * MANAGER_SHARE));
}

export function chainIncome(s: GameState): number {
  return s.stores.reduce((a, slot, i) => a + (i === s.active ? 0 : storeIncome(slot)), 0);
}

function takeOut(s: GameState): StoreData {
  return Object.fromEntries(STORE_KEYS.map((k) => [k, s[k]])) as unknown as StoreData;
}

function putIn(s: GameState, d: StoreData): void {
  Object.assign(s, d);
}

/** Makes store i the one being run; the current store keeps its data in its slot. */
export function switchStore(s: GameState, i: number): void {
  if (i === s.active || !s.stores[i]?.saved) return;
  s.stores[s.active].saved = takeOut(s);
  const d = s.stores[i].saved!;
  s.stores[i].saved = null;
  s.active = i;
  putIn(s, d);
}

export function doneCount(s: GameState): number {
  return s.stores.filter((x) => x.done).length;
}

/** Why the next branch can't open yet, or null when it can. */
export function branchBlocker(s: GameState): 'max' | 'challenge' | 'money' | null {
  const k = s.stores.length;
  if (k >= CHALLENGES.length) return 'max';
  if (doneCount(s) < k) return 'challenge';
  if (s.money < BRANCH_COST[k - 1]) return 'money';
  return null;
}

/** Opens the next branch and moves the owner there. Starter fixtures that don't fit its plan go to storage. */
export function openBranch(s: GameState): void {
  const k = s.stores.length;
  const def = CHALLENGES[k];
  s.money -= BRANCH_COST[k - 1];
  const best = Math.max(s.reputation.level, ...s.stores.map((x) => x.saved?.reputation.level ?? 0));
  const fresh = newGame((s.seed * 31 + k * 7 + 11) % 1e9);
  const coats = new Set([s.catCoat, ...s.stores.map((x) => x.saved?.catCoat)]);
  s.stores[s.active].saved = takeOut(s);
  s.stores.push({ challenge: def.id, layout: def.layout, done: false, progress: 0, saved: null });
  s.active = k;
  s.branch += 1;
  putIn(s, {
    ...takeOut(fresh),
    reputation: { level: Math.max(1, Math.floor(best / 4)), exp: 0 },
    catCoat: CAT_COATS.find((c) => !coats.has(c)) ?? fresh.catCoat,
    openedDay: s.day,
  });
  const layout = storeLayout(s);
  for (const f of s.fixtures) {
    f.id = s.nextId++;
    if (layout.mirrored) f.x = layout.w - f.x - (f.vertical || f.kind === 'decor' ? 1 : 2);
  }
  fitFixtures(s);
}

/** After a layout change, fixtures that no longer fit go to storage with their stock; returns how many moved. */
export function fitFixtures(s: GameState): number {
  const layout = storeLayout(s);
  const kept: FixturePlacement[] = [];
  let moved = 0;
  for (const f of s.fixtures) {
    if (!f.placed) continue;
    if (canPlace(layout, kept, f)) kept.push(f);
    else {
      f.placed = false;
      for (const sl of f.slots) {
        if (sl.product) stash(s, sl.product, sl.stock);
        sl.stock = 0;
      }
      moved += 1;
    }
  }
  return moved;
}
