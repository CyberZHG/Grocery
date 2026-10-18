import { CAT_COATS, FIXTURES, LEVELS, SKILLS, STORE_STYLE, type Category, type Skill } from './defs';
import { CAT_SKILLS, catExpToNext, catSkillExpToNext, EQUIPMENT, equipExpToNext, rackExpToNext, RACKS, repExpToNext, type CatSkill, type EquipKind, type RackKind } from './growth';
import { addExp, skillExpToNext, type Leveled } from './rules';
import { buildLayout, canPlace, planOf, type FixturePlacement, type Layout, type LayoutVariant } from './layout';
import { newGame, stash, STORE_KEYS, totalLevels, type DayStats, type FixtureState, type GameState, type StaffState, type StoreData, type StoreSlot } from './state';

export type ChallengeId = 'main' | 'rush' | 'fresh' | 'oldtown' | 'school' | 'suburb' | 'cafe';

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
  rent: number;
}

const NO_RULES: Rules = { patience: 1, traffic: 1, budget: 1, cash: null, walk: 1, spill: 1, spoil: 0, rent: 1 };

/** A busy period: center in game minutes, share of the day's visitors, and how far it spreads either side. */
export type Peak = [minute: number, share: number, spread: number];

type Goal = 'expand' | 'calm' | 'fresh' | 'cash' | 'cleaned' | 'revenue' | 'none';

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

/** A new store's own look counts as bought, so it can be reused elsewhere. */
function ownStyle(s: GameState, style: { floor: string; wall: string; sign: string }): void {
  for (const key of [`floor:${style.floor}`, `wall:${style.wall}`, `sign:${style.sign}`]) if (!s.owned.includes(key)) s.owned.push(key);
}

/** The cat cafe: a store with no challenge, opened once every challenge is done; late morning and afternoon tea are busiest. */
export const CAFE_PEAKS: Peak[] = [[630, 0.35, 120], [930, 0.45, 120]];

export function isCafe(slot: StoreSlot): boolean {
  return slot.challenge === 'cafe';
}

export function inCafe(s: GameState): boolean {
  return isCafe(activeSlot(s));
}

export const BRANCH_REP = 20;
/** Cost of opening each branch in turn. */
export const BRANCH_COST = [40000, 60000, 90000, 130000, 180000];
/** Each finished store raises prices in every store. */
export const STORE_BONUS = 0.02;
/** Stores you are not running earn this share of their recent daily profit; a good manager raises it. */
export const MANAGER_SHARE = 0.5;
export const MAX_MANAGER_SHARE = 0.9;
/** The main store's advanced tiers: total takings, with rent going up each tier. */
export const MAIN_TIER_TARGET = 200000;

const FRESH: Category[] = ['produce', 'dairy', 'meat'];
export function isFresh(cat: Category): boolean {
  return FRESH.includes(cat);
}

export function activeSlot(s: GameState): StoreSlot {
  return s.stores[s.active];
}

/** The store's floor plan; its counters' places are saved the first time, so later expansions build around them. */
export function storeLayout(s: GameState, level = s.level): Layout {
  const l = buildLayout(level, activeSlot(s).layout, s.plan, s.fixtures.filter((f) => f.placed));
  if (level === s.level) s.plan = planOf(l);
  return l;
}

export function peaksOf(s: GameState): Peak[] {
  return inCafe(s) ? CAFE_PEAKS : CHALLENGE_BY_ID.get(activeSlot(s).challenge)!.peaks;
}

/** Challenges finished at this store, counting each advanced tier. */
export function completions(slot: StoreSlot): number {
  return isCafe(slot) ? 0 : (slot.tier ?? 0) + (slot.done ? 1 : 0);
}

/** Each advanced tier pushes the store's restrictions further from normal. */
export function rulesOf(s: GameState): Rules {
  const slot = activeSlot(s);
  if (slot.done || isCafe(slot)) return NO_RULES;
  const n = slot.tier ?? 0;
  const base = { ...NO_RULES, ...CHALLENGE_BY_ID.get(slot.challenge)!.rules };
  if (!n) return base;
  const k = 1 + 0.25 * n;
  const push = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, 1 + (v - 1) * k));
  return {
    patience: push(base.patience, 0.25, 3),
    traffic: push(base.traffic, 0.25, 3),
    budget: push(base.budget, 0.4, 4),
    cash: base.cash === null ? null : Math.min(1, base.cash + 0.03 * n),
    walk: push(base.walk, 0.4, 1),
    spill: push(base.spill, 1, 12),
    spoil: base.spoil ? Math.min(0.6, base.spoil + 0.08 * n) : 0,
    rent: slot.challenge === 'main' ? 1 + 0.25 * n : 1,
  };
}

/** What the store is working toward at its current tier. */
export function goalOf(slot: StoreSlot): { goal: Goal; target: number } {
  if (isCafe(slot)) return { goal: 'none', target: 0 };
  const def = CHALLENGE_BY_ID.get(slot.challenge)!;
  const n = slot.tier ?? 0;
  if (slot.challenge === 'main') return n ? { goal: 'revenue', target: Math.round(MAIN_TIER_TARGET * (1 + 0.75 * (n - 1))) } : { goal: 'expand', target: 1 };
  return { goal: def.goal, target: Math.round(def.target * (1 + 0.75 * n)) };
}

/** Takes on the next, harder tier of a finished challenge. */
export function startNextTier(s: GameState, i: number): void {
  const slot = s.stores[i];
  if (!slot.done) return;
  slot.tier = (slot.tier ?? 0) + 1;
  slot.done = false;
  slot.progress = 0;
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
    const c = completions(slot);
    if (!c) continue;
    // each advanced tier adds a little more, with diminishing steps: 1, 1/2, 1/3, ...
    let x = 0;
    for (let k = 1; k < c; k++) x += 1 / k;
    p.price += STORE_BONUS * (1 + 0.25 * x);
    switch (slot.challenge) {
      case 'main': p.price += 0.01 * x; break;
      case 'rush': p.service = 1.12 + 0.03 * x; break;
      case 'fresh': for (const k of FRESH) p.cat[k] = (p.cat[k] ?? 0) + 0.05 + 0.015 * x; break;
      case 'oldtown': p.affinity = 1.2 + 0.05 * x; break;
      case 'school':
        p.spill = 0.6 / (1 + 0.1 * x);
        for (const k of ['candy', 'snacks'] as Category[]) p.cat[k] = (p.cat[k] ?? 0) + 0.04 + 0.01 * x;
        break;
      case 'suburb': p.budget = 1.08 + 0.02 * x; break;
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
  const def = goalOf(slot);
  if (def.goal === 'none') return { value: 0, target: 0, ratio: 0 };
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
  if (slot.done || isCafe(slot)) return;
  switch (goalOf(slot).goal) {
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
  if (slot.done || isCafe(slot)) return null;
  const def = goalOf(slot);
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

/** Share of profit a store keeps while you're away: 50% on its own, up to 90% under a seasoned manager. */
export function managerShare(slot: StoreSlot, staff: StaffState[]): number {
  const m = slot.manager != null ? staff.find((x) => x.id === slot.manager) : undefined;
  if (!m) return MANAGER_SHARE;
  const skill = Math.min(1, totalLevels(m) / 120);
  return Math.min(MAX_MANAGER_SHARE, MANAGER_SHARE + 0.37 * skill + (m.trait ? 0.03 : 0));
}

/** What one inactive store earns per day. */
export function storeIncome(slot: StoreSlot): number {
  const hist = slot.saved?.history.slice(-7) ?? [];
  if (!hist.length) return 0;
  const avg = hist.reduce((a, d) => a + dailyProfit(d), 0) / hist.length;
  return Math.max(0, Math.round(avg * managerShare(slot, slot.saved!.staff)));
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
  return s.stores.filter((x) => completions(x) > 0).length;
}

/** Advanced tiers finished across the chain. */
export function tiersDone(s: GameState): number {
  return s.stores.reduce((a, x) => a + Math.max(0, completions(x) - 1), 0);
}

/** Why the next branch can't open yet, or null when it can. */
/** Stores counted toward opening branches; the cafe isn't one of them. */
export function branchCount(s: GameState): number {
  return s.stores.filter((x) => !isCafe(x)).length;
}

export function branchBlocker(s: GameState): 'max' | 'challenge' | 'money' | null {
  const k = branchCount(s);
  if (k >= CHALLENGES.length) return 'max';
  if (doneCount(s) < k) return 'challenge';
  if (s.money < BRANCH_COST[k - 1]) return 'money';
  return null;
}

/** Opens the next branch and moves the owner there. Starter fixtures that don't fit its plan go to storage. */
export function openBranch(s: GameState): void {
  const k = branchCount(s);
  const def = CHALLENGES[k];
  s.money -= BRANCH_COST[k - 1];
  const best = Math.max(s.reputation.level, ...s.stores.map((x) => x.saved?.reputation.level ?? 0));
  const fresh = newGame((s.seed * 31 + k * 7 + 11) % 1e9);
  const coats = new Set([s.catCoat, ...s.stores.map((x) => x.saved?.catCoat)]);
  s.stores[s.active].saved = takeOut(s);
  s.stores.push({ challenge: def.id, layout: def.layout, done: false, progress: 0, saved: null });
  s.active = s.stores.length - 1;
  s.branch += 1;
  putIn(s, {
    ...takeOut(fresh),
    reputation: { level: Math.max(1, Math.floor(best / 4)), exp: 0 },
    catCoat: CAT_COATS.find((c) => !coats.has(c)) ?? fresh.catCoat,
    openedDay: s.day,
    style: { ...STORE_STYLE[def.id] },
  });
  ownStyle(s, STORE_STYLE[def.id]);
  const layout = storeLayout(s);
  for (const f of s.fixtures) {
    f.id = s.nextId++;
    if (layout.mirrored) f.x = layout.w - f.x - (f.vertical || f.kind === 'decor' ? 1 : 2);
  }
  fitFixtures(s);
}

/** Opens the cat cafe once every store's challenge is done; true if it just opened. Twelve tables, a few plants and lamps, and two toys come with it. */
export function ensureCafe(s: GameState): boolean {
  if (s.stores.some(isCafe) || !CHALLENGES.every((c) => s.stores.some((x) => x.challenge === c.id && completions(x) > 0))) return false;
  const fresh = newGame((s.seed * 17 + 101) % 1e9);
  const coats = new Set([s.catCoat, ...s.stores.map((x) => x.saved?.catCoat)]);
  const layout = buildLayout(0, 'cafe');
  const fixtures: FixtureState[] = [];
  const add = (decor: string, spots: [number, number][]) => {
    for (const [x, y] of spots) {
      const f: FixtureState = { id: s.nextId++, kind: 'decor', x, y, vertical: false, placed: true, decor, slots: [{ product: null, stock: 0 }, { product: null, stock: 0 }] };
      if (canPlace(layout, fixtures, f)) {
        fixtures.push(f);
        return;
      }
    }
  };
  // seating on the left in even rows, a play corner for the cats on the right, the aisle to the coffee bar kept clear
  for (const y of [3, 6, 9]) for (const x of [5, 8, 11, 14]) add('table', [[x, y], [x, y + 1]]);
  for (const [d, x, y] of [['plant_small', 4, 1], ['flowers', 9, 1], ['flowers', 13, 1], ['plant_small', 18, 1], ['magazine', 17, 6], ['lamp', 3, 6], ['lamp', 17, 10], ['plant_small', 21, 12], ['cactus', 31, 12]] as [string, number, number][]) add(d, [[x, y]]);
  add('toy_box', [[25, 8], [25, 9], [24, 8]]);
  add('toy_ball', [[28, 10], [27, 10], [28, 9]]);
  const best = Math.max(s.reputation.level, ...s.stores.map((x) => x.saved?.reputation.level ?? 0));
  ownStyle(s, STORE_STYLE.cafe);
  s.stores.push({
    challenge: 'cafe', layout: 'cafe', done: false, progress: 0,
    saved: {
      ...takeOut(fresh), fixtures, openedDay: s.day,
      style: { ...STORE_STYLE.cafe },
      reputation: { level: Math.max(1, Math.floor(best / 4)), exp: 0 },
      catCoat: CAT_COATS.find((c) => !coats.has(c)) ?? fresh.catCoat,
    },
  });
  return true;
}

/**
 * After a layout change, fixtures in the way are shifted to the nearest free spot (turning them if that helps),
 * keeping their products and stock. Only when nothing fits anywhere do they go to storage.
 */
export function fitFixtures(s: GameState): { shifted: number; stored: number } {
  const layout = storeLayout(s);
  const kept: FixturePlacement[] = [];
  const blocked: FixtureState[] = [];
  for (const f of s.fixtures) {
    if (!f.placed) continue;
    if (canPlace(layout, kept, f)) kept.push(f);
    else blocked.push(f);
  }
  let shifted = 0;
  let stored = 0;
  for (const f of blocked) {
    const spot = nearestSpot(layout, kept, f);
    if (spot) {
      Object.assign(f, spot);
      kept.push(f);
      shifted += 1;
      continue;
    }
    f.placed = false;
    for (const sl of f.slots) {
      if (sl.product) stash(s, sl.product, sl.stock);
      sl.stock = 0;
    }
    stored += 1;
  }
  return { shifted, stored };
}

function nearestSpot(layout: Layout, kept: FixturePlacement[], f: FixtureState): { x: number; y: number; vertical: boolean } | null {
  const turns = f.kind === 'decor' ? [f.vertical] : [f.vertical, !f.vertical];
  const cands: { x: number; y: number; vertical: boolean; d: number }[] = [];
  for (let y = 0; y < layout.h; y++) {
    for (let x = 0; x < layout.w; x++) {
      for (const vertical of turns) cands.push({ x, y, vertical, d: Math.abs(x - f.x) + Math.abs(y - f.y) + (vertical === f.vertical ? 0 : 0.5) });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) {
    if (canPlace(layout, kept, { kind: f.kind, x: c.x, y: c.y, vertical: c.vertical })) return { x: c.x, y: c.y, vertical: c.vertical };
  }
  return null;
}

/** Auto layout and stocking open once Branch 3 does. */
export function autoUnlocked(s: GameState): boolean {
  return branchCount(s) >= 4;
}

/** Share of the running store's daily experience that every other store picks up. */
export const AWAY_EXP = 0.1;

/** Experience totals of the running store, taken when a day starts. Staff skills are the average per person. */
export interface ExpMark {
  rep: number;
  equip: Record<EquipKind, number>;
  racks: Record<RackKind, number>;
  cat: number;
  catSkills: Record<CatSkill, number>;
  staff: Record<Skill, number>;
}

function totalExp(l: Leveled, toNext: (lv: number) => number): number {
  let t = l.exp;
  for (let i = 1; i < l.level; i++) t += toNext(i);
  return t;
}

export function markExp(s: GameState): ExpMark {
  const per = <K extends string>(keys: readonly K[], f: (k: K) => number) => Object.fromEntries(keys.map((k) => [k, f(k)])) as Record<K, number>;
  return {
    rep: totalExp(s.reputation, repExpToNext),
    equip: per(EQUIPMENT, (k) => totalExp(s.equipment[k], equipExpToNext)),
    racks: per(RACKS, (k) => totalExp(s.racks[k], rackExpToNext)),
    cat: totalExp(s.cat, catExpToNext),
    catSkills: per(CAT_SKILLS, (k) => totalExp(s.cat.skills[k], catSkillExpToNext)),
    staff: per(SKILLS, (k) => (s.staff.length ? s.staff.reduce((a, st) => a + totalExp(st.skills[k], skillExpToNext), 0) / s.staff.length : 0)),
  };
}

/** Every other store gains a little of what the running store gained today. */
export function shareExp(s: GameState, before: ExpMark): void {
  const now = markExp(s);
  const gain = (a: number, b: number) => Math.max(0, a - b) * AWAY_EXP;
  s.stores.forEach((slot, i) => {
    const d = slot.saved;
    if (i === s.active || !d) return;
    addExp(d.reputation, gain(now.rep, before.rep), repExpToNext);
    for (const k of EQUIPMENT) addExp(d.equipment[k], gain(now.equip[k], before.equip[k]), equipExpToNext);
    for (const k of RACKS) addExp(d.racks[k], gain(now.racks[k], before.racks[k]), rackExpToNext);
    addExp(d.cat, gain(now.cat, before.cat), catExpToNext);
    for (const k of CAT_SKILLS) addExp(d.cat.skills[k], gain(now.catSkills[k], before.catSkills[k]), catSkillExpToNext);
    for (const st of d.staff) for (const k of SKILLS) addExp(st.skills[k], gain(now.staff[k], before.staff[k]), skillExpToNext);
  });
}
