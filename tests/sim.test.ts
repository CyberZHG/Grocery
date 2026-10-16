import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/defs';
import { buildLayout, canPlace } from '../src/game/layout';
import { Sim } from '../src/game/sim';
import { newGame, type GameState } from '../src/game/state';

function runDay(state: GameState): Sim {
  const sim = new Sim(state);
  sim.startDay();
  let steps = 0;
  while (!sim.done && steps < 200000) {
    sim.update(0.1);
    steps += 1;
  }
  return sim;
}

describe('layout', () => {
  it('starting fixtures are valid', () => {
    const s = newGame(1);
    const layout = buildLayout(0);
    const placed = s.fixtures.filter((f) => f.placed);
    placed.forEach((f, i) => {
      expect(canPlace(layout, placed.filter((_, j) => j !== i), f)).toBe(true);
    });
  });

  it('every level builds without overlapping reserved areas', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const l = buildLayout(i);
      expect(l.registers.length).toBe(LEVELS[i].registers);
      expect(l.entrance).toBeGreaterThan(l.registers.length * 4 + (l.bagging ? 3 : -1));
    }
  });
});

describe('simulation', () => {
  it('runs a full day and closes', () => {
    const s = newGame(123);
    const sim = runDay(s);
    expect(sim.done).toBe(true);
    expect(sim.clock).toBeLessThan(24 * 60);
    expect(sim.stats.customers).toBeGreaterThan(10);
    expect(sim.stats.revenue).toBeGreaterThan(50);
  });

  it('runs a fully expanded store with staff for several days', () => {
    const s = newGame(9);
    s.level = LEVELS.length - 1;
    s.money = 100000;
    for (let d = 0; d < 3; d++) {
      const sim = runDay(s);
      expect(sim.done).toBe(true);
      sim.endDayCosts();
      s.day += 1;
    }
  });
});
