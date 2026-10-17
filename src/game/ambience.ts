import { Rng } from '../core/rng';
import { dateOf, weatherOf } from './calendar';
import { DAY_START } from './defs';
import type { Layout } from './layout';

/** Wall columns with a window, matching how the renderer lays out the back wall. */
export function windowColumns(l: Layout): number[] {
  const out: number[] = [];
  for (let x = 0; x < l.w; x++) if (x % 5 === 3 && x !== l.stockDoor.x) out.push(x);
  return out;
}

export interface SunPatch {
  /** window column */
  x: number;
  /** how far the patch leans across the floor, in tiles per tile of depth */
  lean: number;
  /** 0..1, brightest at midday */
  strength: number;
}

/** Sunlight through the back windows, on sunny and hot days: it leans one way in the morning and the other way later. */
export function sunPatches(l: Layout, seed: number, day: number, clock: number): SunPatch[] {
  const w = weatherOf(seed, day);
  if (w !== 'sunny' && w !== 'hot') return [];
  if (clock < DAY_START || clock > 17.5 * 60) return [];
  const u = (clock - DAY_START) / (17.5 * 60 - DAY_START);
  const strength = Math.sin(u * Math.PI) * (w === 'hot' ? 1 : 0.85);
  const lean = 1.4 - u * 2.8;
  return windowColumns(l).map((x) => ({ x, lean, strength }));
}

/** Floor tiles a sun patch lands on, nearest the window first. */
export function sunTiles(l: Layout, p: SunPatch): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 1; y <= 3; y++) {
    const x = Math.round(p.x + p.lean * (y - 0.5));
    if (x >= 0 && x < l.w) out.push({ x, y });
  }
  return out;
}

export type ChalkKind = 'hopscotch' | 'flower' | 'sun' | 'cat' | 'heart';
const CHALK: ChalkKind[] = ['hopscotch', 'flower', 'sun', 'cat', 'heart'];

export interface Chalk {
  kind: ChalkKind;
  /** sidewalk column */
  x: number;
  /** days since it was drawn: older drawings are fainter */
  age: number;
}

/**
 * Kids chalk on the sidewalk on some school-day afternoons. A drawing lasts a couple of days,
 * fading, and the first rain or snow washes it away.
 */
export function chalkDrawings(l: Layout, seed: number, day: number, clock: number): Chalk[] {
  const out: Chalk[] = [];
  for (let d = day - 2; d <= day; d++) {
    if (d < 1) continue;
    const wd = dateOf(d).weekday;
    if (wd === 0 || wd === 6) continue;
    const rng = new Rng((seed * 23 + d * 6151) | 0);
    rng.next();
    if (rng.next() > 0.35) continue;
    if (weatherOf(seed, d) === 'rain' || weatherOf(seed, d) === 'snow') continue;
    if (d === day && clock < 15.5 * 60) continue;
    let washed = false;
    for (let k = d + 1; k <= day; k++) if (weatherOf(seed, k) === 'rain' || weatherOf(seed, k) === 'snow') washed = true;
    if (washed) continue;
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const x = rng.int(0, Math.max(0, l.w - 3));
      // keep the entrance clear of doodles
      if (x >= l.entrance - 2 && x <= l.entrance + 1) continue;
      out.push({ kind: rng.pick(CHALK), x, age: day - d });
    }
  }
  return out;
}
