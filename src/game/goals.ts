import { Rng } from '../core/rng';
import { CATEGORIES, LEVELS, type Category } from './defs';

export type GoalKind =
  | 'manualCheckout' | 'manualAny' | 'sellCat' | 'customers' | 'petCat' | 'priority' | 'clean'
  | 'oden' | 'deli' | 'coffee' | 'bakery' | 'bagging';

export interface Goal {
  kind: GoalKind;
  cat?: Category;
  target: number;
  progress: number;
  reward: number;
  done: boolean;
}

export interface GoalsState {
  day: number;
  daily: Goal[];
  week: number;
  weekly: Goal[];
  completed: number;
}

interface Template {
  kind: GoalKind;
  range: [number, number];
  needs?: 'oden' | 'deli' | 'coffee' | 'bakery' | 'bagging';
}

const TEMPLATES: Template[] = [
  { kind: 'manualCheckout', range: [2, 5] },
  { kind: 'manualAny', range: [3, 6] },
  { kind: 'sellCat', range: [12, 25] },
  { kind: 'customers', range: [18, 35] },
  { kind: 'petCat', range: [2, 4] },
  { kind: 'priority', range: [2, 4] },
  { kind: 'clean', range: [2, 4] },
  { kind: 'oden', range: [2, 4], needs: 'oden' },
  { kind: 'deli', range: [2, 4], needs: 'deli' },
  { kind: 'coffee', range: [2, 4], needs: 'coffee' },
  { kind: 'bakery', range: [1, 2], needs: 'bakery' },
  { kind: 'bagging', range: [2, 4], needs: 'bagging' },
];

/** What the store you're in can do: its counters, and whether it sells goods off shelves (the cat cafe doesn't). */
export interface GoalScope {
  stations: string[];
  bagging: boolean;
  shop: boolean;
}

/** Goals that need shelves: selling a category, putting a slot first, mopping up after shoppers. */
const SHOP_ONLY: GoalKind[] = ['sellCat', 'priority', 'clean'];

export function levelScope(level: number): GoalScope {
  const lv = LEVELS[level];
  return { stations: lv.stations, bagging: lv.bagging, shop: true };
}

export function goalPossible(kind: GoalKind, scope: GoalScope): boolean {
  const t = TEMPLATES.find((x) => x.kind === kind)!;
  if (!scope.shop && SHOP_ONLY.includes(kind)) return false;
  return !t.needs || (t.needs === 'bagging' ? scope.bagging : scope.stations.includes(t.needs));
}

function available(scope: GoalScope): Template[] {
  return TEMPLATES.filter((t) => goalPossible(t.kind, scope));
}

function make(rng: Rng, level: number, n: number, scale: number, rewardBase: number, scope: GoalScope): Goal[] {
  const pool = rng.shuffle(available(scope).slice());
  return pool.slice(0, n).map((t) => {
    const target = Math.round(rng.int(t.range[0], t.range[1]) * scale);
    const goal: Goal = { kind: t.kind, target, progress: 0, reward: Math.round(rewardBase * (1 + level * 0.5) * (0.8 + rng.next() * 0.4)), done: false };
    if (t.kind === 'sellCat') goal.cat = rng.pick(CATEGORIES);
    return goal;
  });
}

/** Rolls new daily goals each day and new weekly goals every 7 days. */
export function refreshGoals(g: GoalsState, seed: number, day: number, level: number, scope = levelScope(level)): void {
  if (g.day !== day) {
    g.day = day;
    g.daily = make(new Rng((seed * 13 + day * 977) | 0), level, 3, 1, 40, scope);
  }
  const week = Math.floor((day - 1) / 7);
  if (g.week !== week) {
    g.week = week;
    g.weekly = make(new Rng((seed * 17 + week * 7919) | 0), level, 2, 5, 250, scope);
  }
  fitGoals(g, seed, day, scope);
}

/** Unfinished goals this store can't do are swapped for ones it can, keeping their reward. */
export function fitGoals(g: GoalsState, seed: number, day: number, scope: GoalScope): void {
  const rng = new Rng((seed * 31 + day * 101) | 0);
  for (const [list, scale] of [[g.daily, 1], [g.weekly, 5]] as const) {
    list.forEach((goal, i) => {
      if (goal.done || goalPossible(goal.kind, scope)) return;
      const taken = new Set(list.map((x) => x.kind));
      const pool = available(scope).filter((t) => !taken.has(t.kind));
      if (!pool.length) return;
      const t = rng.pick(pool);
      const fresh: Goal = { kind: t.kind, target: Math.round(rng.int(t.range[0], t.range[1]) * scale), progress: 0, reward: goal.reward, done: false };
      if (t.kind === 'sellCat') fresh.cat = rng.pick(CATEGORIES);
      list[i] = fresh;
    });
  }
}

/** Advances matching goals; returns the goals completed by this event. */
export function progressGoals(g: GoalsState, kind: GoalKind, amount = 1, cat?: Category): Goal[] {
  const done: Goal[] = [];
  for (const goal of [...g.daily, ...g.weekly]) {
    if (goal.done || goal.kind !== kind || (goal.cat && goal.cat !== cat)) continue;
    goal.progress = Math.min(goal.target, goal.progress + amount);
    if (goal.progress >= goal.target) {
      goal.done = true;
      g.completed += 1;
      done.push(goal);
    }
  }
  return done;
}
