import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/defs';
import { progressGoals, refreshGoals } from '../src/game/goals';
import { buildLayout, canPlace, entryTile, Grid } from '../src/game/layout';
import { Sim } from '../src/game/sim';
import { freshSkills, newGame, type GameState } from '../src/game/state';

function runDay(s: GameState): Sim {
  const sim = new Sim(s);
  sim.restockAll();
  sim.startDay();
  let n = 0;
  while (!sim.done && n < 40000) {
    sim.tickReal(0.04);
    sim.update(0.1);
    n++;
  }
  sim.endDayCosts();
  s.day += 1;
  return sim;
}

describe('mirrored branch layout', () => {
  it('every level stays fully reachable when mirrored', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const l = buildLayout(i, true);
      const g = new Grid(l, []);
      const e = entryTile(l);
      const dist = g.flood(e.x, e.y);
      for (const r of l.registers) expect(dist[r.cashier.y * l.w + r.cashier.x]).toBeGreaterThanOrEqual(0);
      expect(dist[l.stockDoor.y * l.w + l.stockDoor.x]).toBeGreaterThanOrEqual(0);
      expect(l.registers[0].x).toBeGreaterThan(l.w / 2);
    }
  });

  it('mirrored starting fixtures are valid', () => {
    const s = newGame(3);
    const w = LEVELS[0].w;
    for (const f of s.fixtures) f.x = w - f.x - (f.vertical ? 1 : 2);
    const l = buildLayout(0, true);
    s.fixtures.forEach((f, i) => expect(canPlace(l, s.fixtures.filter((_, j) => j !== i), f)).toBe(true));
  });

  it('a mirrored store runs a full day', () => {
    const s = newGame(4);
    s.branch = 1;
    const w = LEVELS[0].w;
    for (const f of s.fixtures) f.x = w - f.x - (f.vertical ? 1 : 2);
    const sim = runDay(s);
    expect(sim.done).toBe(true);
    expect(sim.stats.revenue).toBeGreaterThan(0);
  });
});

describe('goals', () => {
  it('rolls daily and weekly goals and completes them', () => {
    const s = newGame(5);
    refreshGoals(s.goals, s.seed, 1, 0);
    expect(s.goals.daily).toHaveLength(3);
    expect(s.goals.weekly).toHaveLength(2);
    const g = s.goals.daily[0];
    const done = progressGoals(s.goals, g.kind, g.target, g.cat);
    expect(done).toContain(g);
    expect(s.goals.completed).toBeGreaterThanOrEqual(1);
  });
});

describe('long run with staff', () => {
  it('friends, gifts, spills and cleaning all happen without stalls', () => {
    const s = newGame(8);
    s.level = 2;
    s.money = 20000;
    s.staff.push({ id: 90, name: 0, look: 0, wage: 50, role: 'auto', skills: freshSkills({ checkout: 5, clean: 3 }), hiredDay: 1, trait: 'tidy' });
    for (const n of Object.values(s.npcs)) n.fond = { level: 6, exp: 20 };
    let spills = 0;
    for (let d = 0; d < 20; d++) {
      const sim = runDay(s);
      expect(sim.done).toBe(true);
      spills += sim.spills.length;
    }
    expect(s.friends).toBeGreaterThan(0);
    expect(Object.values(s.gifts).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(s.staff[0].skills.clean.level + s.owner.clean.level).toBeGreaterThan(2);
    expect(spills).toBeLessThan(100);
  });
});

describe('safety net when broke', () => {
  it('waives rent and suppliers send stock when funds hit zero', () => {
    const s = newGame(11);
    s.money = -50;
    for (const f of s.fixtures) for (const sl of f.slots) sl.stock = 0;
    const sim = new Sim(s);
    sim.startDay();
    expect(sim.stats.restock).toBeLessThanOrEqual(0);
    expect(s.fixtures.some((f) => f.slots.some((sl) => sl.stock > 0))).toBe(true);
    s.money = -10;
    sim.endDayCosts();
    expect(sim.stats.rent).toBe(0);
    expect(sim.stats.rentWaived).toBe(true);
  });
});

describe('agents keep their own tiles', () => {
  it('standing agents rarely share a tile', () => {
    const s = newGame(5);
    const sim = new Sim(s);
    sim.restockAll();
    sim.startDay();
    let samples = 0;
    let shared = 0;
    for (let n = 0; n < 40000 && !sim.done; n++) {
      sim.tickReal(0.04);
      sim.update(0.1);
      if (n % 20) continue;
      const still = [...sim.customers.map((c) => c.mover), ...sim.workers.map((w) => w.mover), sim.cat.mover]
        .filter((m) => m.path.length === 0 && m.y < sim.layout.h)
        .map((m) => `${m.tile.x},${m.tile.y}`);
      samples += still.length;
      shared += still.length - new Set(still).size;
    }
    expect(samples).toBeGreaterThan(100);
    expect(shared / samples).toBeLessThan(0.02);
  });
});
