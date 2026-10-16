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

function available(level: number): Template[] {
  const lv = LEVELS[level];
  return TEMPLATES.filter((t) => !t.needs || (t.needs === 'bagging' ? lv.bagging : (lv.stations as string[]).includes(t.needs)));
}

function make(rng: Rng, level: number, n: number, scale: number, rewardBase: number): Goal[] {
  const pool = rng.shuffle(available(level).slice());
  return pool.slice(0, n).map((t) => {
    const target = Math.round(rng.int(t.range[0], t.range[1]) * scale);
    const goal: Goal = { kind: t.kind, target, progress: 0, reward: Math.round(rewardBase * (1 + level * 0.5) * (0.8 + rng.next() * 0.4)), done: false };
    if (t.kind === 'sellCat') goal.cat = rng.pick(CATEGORIES);
    return goal;
  });
}

/** Rolls new daily goals each day and new weekly goals every 7 days. */
export function refreshGoals(g: GoalsState, seed: number, day: number, level: number): void {
  if (g.day !== day) {
    g.day = day;
    g.daily = make(new Rng((seed * 13 + day * 977) | 0), level, 3, 1, 40);
  }
  const week = Math.floor((day - 1) / 7);
  if (g.week !== week) {
    g.week = week;
    g.weekly = make(new Rng((seed * 17 + week * 7919) | 0), level, 2, 5, 250);
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
