import { branchBlocker, branchCount, inCafe, isCafe } from '../game/chain';
import { LEVELS } from '../game/defs';
import type { GameState } from '../game/state';

/** This store's challenge has just been completed. */
export function goalNotices(s: GameState): string[] {
  const slot = s.stores[s.active];
  return slot && !isCafe(slot) && slot.done ? [`done:${s.active}:${slot.tier ?? 0}`] : [];
}

/** The store can grow: enough money for the next size. */
export function expandNotices(s: GameState): string[] {
  const next = LEVELS[s.level + 1];
  return next && !inCafe(s) && s.money >= next.cost ? [`expand:${s.active}:${s.level + 1}`] : [];
}

/** A new branch can be opened, or a finished challenge can move on to its next tier. */
export function chainNotices(s: GameState): string[] {
  const out = branchBlocker(s) === null ? [`branch:${branchCount(s)}`] : [];
  s.stores.forEach((slot, i) => {
    if (!isCafe(slot) && slot.done) out.push(`tier:${i}:${slot.tier ?? 0}`);
  });
  return out;
}

export function unseen(s: GameState, keys: string[]): boolean {
  return keys.some((k) => !s.noticed.includes(k));
}

export function markSeen(s: GameState, keys: string[]): void {
  for (const k of keys) if (!s.noticed.includes(k)) s.noticed.push(k);
  // only the newest few matter; keep the save small
  if (s.noticed.length > 200) s.noticed.splice(0, s.noticed.length - 200);
}
