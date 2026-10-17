import { describe, expect, it } from 'vitest';
import { LEVELS, NPCS } from '../src/game/defs';
import { progressGoals, refreshGoals } from '../src/game/goals';
import { buildLayout, canPlace, entryTile, Grid, LAYOUT_VARIANTS } from '../src/game/layout';
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
  it('every level of every floor plan stays fully reachable', () => {
    for (const v of LAYOUT_VARIANTS) {
      for (let i = 0; i < LEVELS.length; i++) {
        const l = buildLayout(i, v);
        const g = new Grid(l, []);
        const e = entryTile(l);
        const dist = g.flood(e.x, e.y);
        const ok = (p: { x: number; y: number }) => expect(dist[p.y * l.w + p.x], `${v} ${i}`).toBeGreaterThanOrEqual(0);
        for (const r of l.registers) {
          ok(r.cashier);
          ok(r.queue[r.queue.length - 1]);
        }
        for (const st of l.stations) {
          ok(st.staff);
          ok(st.queue[st.queue.length - 1]);
        }
        if (l.bagging) ok(l.bagging.staff);
        ok(l.stockDoor);
        if (v.endsWith('mirror')) expect(l.registers[0].x).toBeGreaterThan(l.w / 2);
        if (v.startsWith('pillars')) expect(l.pillars.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('mirrored starting fixtures are valid', () => {
    const s = newGame(3);
    const w = LEVELS[0].w;
    for (const f of s.fixtures) f.x = w - f.x - (f.vertical ? 1 : 2);
    const l = buildLayout(0, 'mirror');
    s.fixtures.forEach((f, i) => expect(canPlace(l, s.fixtures.filter((_, j) => j !== i), f)).toBe(true));
  });

  it('a mirrored store runs a full day', () => {
    const s = newGame(4);
    s.stores[0].layout = 'mirror';
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
    s.staff.push({ id: 90, name: 0, look: 0, wage: 50, role: 'auto', skills: freshSkills({ checkout: 5, clean: 3 }), hiredDay: 1, trait: 'tidy', baseLevels: 0 });
    // one level short of the third keepsake, so a good visit or two triggers a gift
    for (const n of Object.values(s.npcs)) n.fond = { level: 9, exp: 49 };
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

describe('bread unlocks and opening buzz', () => {
  it('more breads unlock as the team bakery skill grows', async () => {
    const { unlockedBreads } = await import('../src/game/state');
    const s = newGame(3);
    expect(unlockedBreads(s)).toHaveLength(4);
    s.owner.bakery.level = 10;
    expect(unlockedBreads(s)).toEqual(['croissant', 'baguette', 'muffin', 'cinnamon', 'melonpan', 'bagel', 'pretzel']);
  });

  it('a new store draws extra visitors that fade over two weeks', async () => {
    const { openingBuzz } = await import('../src/game/state');
    const s = newGame(3);
    expect(openingBuzz(s)).toBeCloseTo(0.5);
    s.day = 8;
    expect(openingBuzz(s)).toBeCloseTo(0.25);
    s.day = 20;
    expect(openingBuzz(s)).toBe(0);
  });
});

describe('spills and collection', () => {
  it('spills never land right above a fixture', () => {
    const s = newGame(5);
    for (let d = 0; d < 4; d++) {
      const sim = new Sim(s);
      sim.restockAll();
      sim.startDay();
      for (let n = 0; n < 40000 && !sim.done; n++) {
        sim.tickReal(0.04);
        sim.update(0.1);
        for (const sp of sim.spills) {
          if (sim.grid.inside(sp.x, sp.y + 1)) expect(sim.grid.walkable(sp.x, sp.y + 1)).toBe(true);
        }
      }
      sim.endDayCosts();
      s.day += 1;
    }
  });

  it('selling the last missing product completes a category and raises its prices', async () => {
    const { UNLOCK_ORDER, COLLECTION_BONUS } = await import('../src/game/progress');
    const s = newGame(3);
    const ids = UNLOCK_ORDER.dairy;
    for (const id of ids.slice(1)) s.products[id].sold = 1;
    const sim = new Sim(s);
    const before = sim.priceOf(ids[0]);
    const events: string[] = [];
    sim.on((e) => e.type === 'collection' && events.push(e.cat));
    (sim as unknown as { productSold(id: string, q: number): void }).productSold(ids[0], 1);
    expect(events).toEqual(['dairy']);
    expect(s.collections).toContain('dairy');
    expect(sim.priceOf(ids[0])).toBeCloseTo(before * (1 + COLLECTION_BONUS), 1);
  });
});

describe('storeroom', () => {
  it('stock taken off a shelf is reused later without paying again', async () => {
    const { stash } = await import('../src/game/state');
    const s = newGame(3);
    const sim = new Sim(s);
    sim.restockAll();
    const f = s.fixtures.find((x) => x.slots[0].product)!;
    const slot = f.slots[0];
    const id = slot.product!;
    const units = slot.stock;
    stash(s, id, slot.stock);
    slot.product = null;
    slot.stock = 0;
    expect(s.inventory[id]).toBe(units);
    const money = s.money;
    slot.product = id;
    new Sim(s).restockAll();
    expect(slot.stock).toBe(units);
    expect(s.money).toBe(money);
    expect(s.inventory[id]).toBeUndefined();
  });

  it('unsold stock and bread carry over into the night', () => {
    const s = newGame(4);
    const sim = runDay(s);
    expect(sim.done).toBe(true);
    const left = s.fixtures.flatMap((f) => f.slots.map((sl) => sl.stock));
    const bread = JSON.stringify(s.bakery);
    const stored = JSON.stringify(s.inventory);
    new Sim(s);
    expect(s.fixtures.flatMap((f) => f.slots.map((sl) => sl.stock))).toEqual(left);
    expect(JSON.stringify(s.bakery)).toBe(bread);
    expect(JSON.stringify(s.inventory)).toBe(stored);
  });
});

describe('service skills', () => {
  it('greeting, upselling, stockroom, display and cat care all get used in a day', () => {
    const s = newGame(6);
    s.money = 5000;
    s.cat.mood = 30;
    s.staff.push({ id: 91, name: 1, look: 1, wage: 50, role: 'auto', skills: freshSkills({ upsell: 200, display: 50, petcare: 50, storage: 100 }), hiredDay: 1, trait: null, baseLevels: 0 });
    const before = JSON.stringify(s.staff[0].skills);
    const sim = runDay(s);
    expect(sim.done).toBe(true);
    const all = [s.owner, s.staff[0].skills];
    for (const k of ['greet', 'upsell', 'storage', 'display', 'petcare'] as const) {
      expect(all.some((sk) => sk[k].exp > 0 || sk[k].level > 1), k).toBe(true);
    }
    expect(JSON.stringify(s.staff[0].skills)).not.toBe(before);
    expect(s.cat.mood).toBeGreaterThan(30);
  });

  it('with nobody in the store, half-empty shelves get topped up', () => {
    const s = newGame(6);
    const sim = new Sim(s);
    sim.restockAll();
    sim.startDay();
    sim.arrivals = [];
    const f = s.fixtures.find((x) => x.kind === 'shelf' && x.slots[0].product)!;
    f.slots[0].stock = 7;
    for (let i = 0; i < 600 && f.slots[0].stock === 7; i++) {
      sim.tickReal(0.04);
      sim.update(0.1);
    }
    expect(sim.customers.length).toBe(0);
    expect(f.slots[0].stock).toBe(12);
  });
});

describe('store chain', () => {
  const ready = () => {
    const s = newGame(12);
    s.level = LEVELS.length - 1;
    s.reputation.level = 20;
    s.money = 1e6;
    return s;
  };

  it('finishing the main store opens a branch, and switching back restores each store', async () => {
    const { branchBlocker, checkChallenge, openBranch, switchStore } = await import('../src/game/chain');
    const s = ready();
    expect(branchBlocker(s)).toBe('challenge');
    expect(checkChallenge(s)).toBe('main');
    expect(branchBlocker(s)).toBeNull();
    s.fixtures[0].slots[0].stock = 5;
    const mainFixtures = JSON.stringify(s.fixtures);
    openBranch(s);
    expect(s.active).toBe(1);
    expect(s.level).toBe(0);
    expect(s.stores[1].challenge).toBe('rush');
    expect(buildLayout(0, 'mirror').registers[0].x).toBe(new Sim(s).layout.registers[0].x);
    switchStore(s, 0);
    expect(s.level).toBe(LEVELS.length - 1);
    expect(JSON.stringify(s.fixtures)).toBe(mainFixtures);
    switchStore(s, 1);
    expect(s.level).toBe(0);
    expect(s.stores[0].saved?.level).toBe(LEVELS.length - 1);
  });

  it('a branch runs under its restrictions until its challenge is done', async () => {
    const { checkChallenge, openBranch, recordDay, rulesOf } = await import('../src/game/chain');
    const s = ready();
    checkChallenge(s);
    openBranch(s);
    expect(rulesOf(s).patience).toBeLessThan(1);
    const st = { ...runDay(s).stats, customers: 4100, angry: 50 };
    recordDay(s, st);
    expect(checkChallenge(s)).toBe('rush');
    expect(rulesOf(s).patience).toBe(1);
    expect(new Sim(s).perks.service).toBeGreaterThan(1);
  });

  it('finished challenges raise prices everywhere, with extra for the fresh market', async () => {
    const { STORE_BONUS } = await import('../src/game/chain');
    const s = newGame(3);
    const base = new Sim(s).priceOf('milk_whole');
    s.stores[0].done = true;
    s.stores.push({ challenge: 'fresh', layout: 'pillars', done: true, progress: 0, saved: null });
    const p = new Sim(s).priceOf('milk_whole');
    expect(p / base).toBeCloseTo(1 + 2 * STORE_BONUS + 0.05, 2);
  });

  it('stores you are not running earn part of their recent profit', async () => {
    const { chainIncome, checkChallenge, openBranch, MANAGER_SHARE } = await import('../src/game/chain');
    const s = ready();
    for (let d = 0; d < 3; d++) {
      s.history.push({ day: d, revenue: 1000, goodsCost: 400, wages: 100, rent: 100, restock: 0, customers: 50, manual: 0, levelUps: 0, avgAffinity: 0 });
    }
    checkChallenge(s);
    openBranch(s);
    expect(chainIncome(s)).toBe(400 * MANAGER_SHARE);
  });

  it('every branch runs a full day on its own floor plan', async () => {
    const { CHALLENGES, checkChallenge, openBranch, spoil } = await import('../src/game/chain');
    const s = ready();
    for (let k = 1; k < CHALLENGES.length; k++) {
      s.stores[s.active].done = true;
      if (k === 1) checkChallenge(s);
      openBranch(s);
      expect(s.stores[s.active].challenge).toBe(CHALLENGES[k].id);
      expect(new Set([s.catCoat, ...s.stores.map((x) => x.saved?.catCoat).filter(Boolean)]).size).toBe(k + 1);
      expect(s.fixtures.filter((f) => f.placed).length).toBeGreaterThan(2);
      const sim = runDay(s);
      expect(sim.done).toBe(true);
      expect(sim.stats.customers).toBeGreaterThan(0);
      if (CHALLENGES[k].id === 'fresh') {
        const f = s.fixtures.find((x) => x.placed && x.kind === 'fridge')!;
        f.slots[0].stock = 8;
        expect(spoil(s)).toBeGreaterThan(0);
        expect(f.slots[0].stock).toBe(6);
      }
    }
  });

  it('staff with nothing to do top up shelves even while customers shop', () => {
    const s = newGame(6);
    const sim = new Sim(s);
    sim.restockAll();
    sim.startDay();
    sim.arrivals = [];
    (sim as unknown as { spawn(n: unknown): void }).spawn(NPCS[0]);
    const c = sim.customers[0];
    c.targets = [];
    c.state = 'browse';
    c.timer = 1e9;
    const f = s.fixtures.find((x) => x.kind === 'shelf' && x.slots[0].product)!;
    f.slots[0].stock = 8;
    for (let i = 0; i < 800 && f.slots[0].stock === 8; i++) {
      sim.tickReal(0.04);
      sim.update(0.1);
    }
    expect(sim.customers.some((x) => x.state !== 'leave')).toBe(true);
    expect(f.slots[0].stock).toBe(12);
  });
});

describe('card-only counters', () => {
  it('appear with expansion and only serve card payers, faster than a regular register', () => {
    expect(buildLayout(1).registers.filter((r) => r.card)).toHaveLength(0);
    expect(buildLayout(2).registers.filter((r) => r.card)).toHaveLength(1);
    expect(buildLayout(5, 'side_mirror').registers.filter((r) => r.card)).toHaveLength(2);
    const s = newGame(9);
    s.level = 3;
    s.money = 1e5;
    s.staff.push({ id: 95, name: 2, look: 2, wage: 50, role: 'cashier', skills: freshSkills({ checkout: 5 }), hiredDay: 1, trait: null, baseLevels: 0 });
    const sim = new Sim(s);
    sim.restockAll();
    sim.startDay();
    const card = sim.registers.find((r) => r.card)!;
    let served = 0;
    let last = card.doneAt;
    for (let n = 0; n < 40000 && !sim.done; n++) {
      sim.tickReal(0.04);
      sim.update(0.1);
      for (const c of card.members) expect(c.cash).toBe(false);
      if (card.doneAt !== last) {
        served += 1;
        last = card.doneAt;
      }
    }
    expect(served).toBeGreaterThan(3);
    const durations = (sim as unknown as { autoDuration(l: unknown, c: unknown, w: unknown): number });
    const c = { itemCount: () => 5, cash: false } as never;
    const w = sim.workers[0];
    expect(durations.autoDuration(card, c, w)).toBeLessThan(durations.autoDuration(sim.registers[0], c, w));
  });
});

describe('raises', () => {
  it('wages grow with skill levels gained after hiring, more slowly over time', async () => {
    const { raiseOf, wageOf } = await import('../src/game/state');
    const st = { id: 1, name: 0, look: 0, wage: 50, role: 'auto' as const, skills: freshSkills({ checkout: 5 }), hiredDay: 1, trait: null, baseLevels: 4 };
    expect(wageOf(st)).toBe(50);
    st.skills.checkout.level = 9;
    expect(raiseOf(st)).toBe(8);
    st.skills.checkout.level = 105;
    expect(raiseOf(st)).toBe(40);
    const s = newGame(3);
    s.staff.push({ ...st });
    const sim = runDay(s);
    expect(sim.stats.wages).toBe(wageOf(s.staff[0]));
  });
});

describe('decorations and visiting cats', () => {
  const place = (s: GameState, decor: string) => {
    const l = buildLayout(s.level, s.stores[s.active].layout);
    const placed = s.fixtures.filter((f) => f.placed);
    for (let y = 1; y < l.h - 3; y++) {
      for (let x = 1; x < l.w - 1; x++) {
        const f = { kind: 'decor' as const, x, y, vertical: false };
        if (!canPlace(l, placed, f)) continue;
        s.fixtures.push({ id: s.nextId++, ...f, placed: true, decor, slots: [{ product: null, stock: 0 }, { product: null, stock: 0 }] });
        return;
      }
    }
    throw new Error(`no room for ${decor}`);
  };

  it('shoppers use decorations, staff take breaks on the bench, and the cat climbs its tower', () => {
    const s = newGame(21);
    s.level = 2;
    s.money = 1e5;
    for (const d of ['aquarium', 'gumball', 'magazine', 'bench', 'cat_tower']) place(s, d);
    s.staff.push({ id: 96, name: 3, look: 3, wage: 50, role: 'auto', skills: freshSkills(), hiredDay: 1, trait: null, baseLevels: 0 });
    const used = new Set<string>();
    let rested = false;
    let perched = false;
    for (let d = 0; d < 3; d++) {
      const sim = new Sim(s);
      const proto = sim as unknown as { useDecor(c: unknown, f: { decor: string }): void };
      const use = proto.useDecor.bind(sim);
      proto.useDecor = (c, f) => {
        used.add(f.decor);
        use(c, f);
      };
      sim.restockAll();
      sim.startDay();
      for (let n = 0; n < 40000 && !sim.done; n++) {
        sim.tickReal(0.04);
        sim.update(0.1);
        if (sim.workers.some((w) => w.boost > 1)) rested = true;
        if (sim.cat.perch) perched = true;
      }
      sim.endDayCosts();
      s.day += 1;
    }
    expect([...used].sort()).toEqual(['aquarium', 'bench', 'gumball', 'magazine']);
    expect(rested).toBe(true);
    expect(perched).toBe(true);
  });

  it('cats from other stores drop by and add their pull', async () => {
    const { checkChallenge, openBranch } = await import('../src/game/chain');
    const s = newGame(13);
    s.level = LEVELS.length - 1;
    s.reputation.level = 20;
    s.money = 1e6;
    s.cat.level = 20;
    checkChallenge(s);
    openBranch(s);
    let visits = 0;
    let seen = false;
    for (let d = 0; d < 8; d++) {
      const sim = new Sim(s);
      sim.restockAll();
      sim.startDay();
      if (sim.guest) {
        visits += 1;
        expect(sim.guest.coat).not.toBe(s.catCoat);
      }
      for (let n = 0; n < 40000 && !sim.done; n++) {
        sim.tickReal(0.04);
        sim.update(0.1);
        if (sim.guest?.agent) seen = true;
      }
      if (sim.guest) expect(sim.guest.agent === null || sim.closing).toBe(true);
      sim.endDayCosts();
      s.day += 1;
    }
    expect(visits).toBeGreaterThan(0);
    expect(seen).toBe(true);
  });
});

describe('life in the store', () => {
  it('shoppers, staff and the cat interact with each other through the day', () => {
    const s = newGame(31);
    s.level = 2;
    s.money = 1e5;
    for (let i = 0; i < 3; i++) s.staff.push({ id: 120 + i, name: i, look: i, wage: 50, role: 'auto', skills: freshSkills(), hiredDay: 1, trait: null, baseLevels: 0 });
    for (const n of Object.values(s.npcs)) n.fond = { level: 8, exp: 0 };
    const seen = new Set<string>();
    let flashes = 0;
    for (let d = 0; d < 2; d++) {
      const sim = new Sim(s);
      sim.restockAll();
      sim.startDay();
      for (let n = 0; n < 40000 && !sim.done; n++) {
        sim.tickReal(0.04);
        sim.update(0.1);
        for (const x of [...sim.customers, ...sim.workers, ...sim.cats()]) if (x.bubble) seen.add(x.bubble.icon);
        flashes += sim.flashes.length ? 1 : 0;
      }
      sim.endDayCosts();
      s.day += 1;
    }
    for (const icon of ['b_chat', 'b_laugh', 'b_wave', 'b_question']) expect(seen, icon).toContain(icon);
    expect(flashes).toBeGreaterThan(0);
  });

  it('a happy cat brings in treasures over time', () => {
    const s = newGame(5);
    s.cat.mood = 100;
    for (let d = 0; d < 30; d++) {
      const sim = new Sim(s);
      sim.restockAll();
      sim.startDay();
      sim.arrivals = [];
      for (let n = 0; n < 40000 && !sim.done; n++) sim.update(1);
      sim.endDayCosts();
      s.cat.mood = 100;
      s.day += 1;
    }
    expect(Object.values(s.catTreasures).reduce((a, b) => a + b, 0)).toBeGreaterThan(3);
  });

  it('on rainy days some shoppers buy umbrellas and track water in', async () => {
    const { weatherOf } = await import('../src/game/calendar');
    const s = newGame(8);
    while (weatherOf(s.seed, s.day) !== 'rain') s.day += 1;
    const sim = new Sim(s);
    sim.restockAll();
    sim.startDay();
    let puddles = 0;
    let umbrellas = 0;
    const counted = new Set<number>();
    for (let n = 0; n < 40000 && !sim.done; n++) {
      sim.tickReal(0.04);
      sim.update(0.1);
      for (const c of sim.customers) if (c.umbrella && !counted.has(c.id)) {
        counted.add(c.id);
        umbrellas += 1;
      }
      puddles = Math.max(puddles, sim.spills.filter((p) => p.kind === 'puddle' && p.y >= sim.layout.h - 5).length);
    }
    expect(umbrellas).toBeGreaterThan(5);
    expect(puddles).toBeGreaterThan(0);
  });
});

describe('endgame: street, managers and tiers', () => {
  it('buildings on the street change who comes and what they buy', async () => {
    const { rosterSize } = await import('../src/game/growth');
    const { streetFx, levelCost } = await import('../src/game/street');
    const s = newGame(3);
    const before = rosterSize(s);
    s.street[0] = { id: 'apartments', level: 2 };
    expect(rosterSize(s)).toBe(before + 20);
    s.street[1] = { id: 'bus', level: 3 };
    s.street[2] = { id: 'school', level: 1 };
    const fx = streetFx(s.street);
    expect(fx.traffic).toBeCloseTo(1.18);
    expect(fx.cat.candy).toBeCloseTo(1.15);
    expect(fx.kid).toBeCloseTo(1.15);
    expect(levelCost('bus', 3)).toBe(levelCost('bus', 1) * 9);
    const plain = newGame(3);
    let a = 0;
    let b = 0;
    for (let d = 0; d < 6; d++) {
      plain.day = s.day = 10 + d;
      const x = new Sim(plain);
      x.startDay();
      const y = new Sim(s);
      y.startDay();
      a += x.arrivals.length;
      b += y.arrivals.length;
    }
    expect(b).toBeGreaterThan(a);
  });

  it('a seasoned manager keeps more of an away store’s profit, up to 90%', async () => {
    const { managerShare, MANAGER_SHARE, MAX_MANAGER_SHARE } = await import('../src/game/chain');
    const slot = { challenge: 'rush' as const, layout: 'mirror' as const, done: false, progress: 0, saved: null, manager: 5 };
    const novice = { id: 5, name: 0, look: 0, wage: 50, role: 'auto' as const, skills: freshSkills(), hiredDay: 1, trait: null, baseLevels: 0 };
    expect(managerShare({ ...slot, manager: null }, [novice])).toBe(MANAGER_SHARE);
    expect(managerShare(slot, [novice])).toBe(MANAGER_SHARE);
    const veteran = { ...novice, skills: freshSkills({ checkout: 80, restock: 80 }), trait: 'tidy' };
    expect(managerShare(slot, [veteran])).toBe(MAX_MANAGER_SHARE);
  });

  it('advanced tiers bring back stronger restrictions and stack a shrinking reward', async () => {
    const { checkChallenge, completions, doneCount, goalOf, openBranch, perksOf, recordDay, rulesOf, startNextTier } = await import('../src/game/chain');
    const s = newGame(12);
    s.level = LEVELS.length - 1;
    s.reputation.level = 20;
    s.money = 1e6;
    checkChallenge(s);
    openBranch(s);
    const st = { ...runDay(s).stats, customers: 5000, angry: 0 };
    recordDay(s, st);
    checkChallenge(s);
    const base = goalOf(s.stores[1]).target;
    const p1 = perksOf(s).service;
    startNextTier(s, 1);
    expect(doneCount(s)).toBe(2);
    expect(rulesOf(s).patience).toBeLessThan(0.6);
    expect(goalOf(s.stores[1]).target).toBeGreaterThan(base);
    recordDay(s, { ...st, customers: 20000 });
    expect(checkChallenge(s)).toBe('rush');
    expect(completions(s.stores[1])).toBe(2);
    const p2 = perksOf(s).service;
    startNextTier(s, 1);
    recordDay(s, { ...st, customers: 50000 });
    checkChallenge(s);
    const p3 = perksOf(s).service;
    expect(p2).toBeGreaterThan(p1);
    expect(p3 - p2).toBeLessThan(p2 - p1);
    // the main store's tiers: higher rent, a takings goal
    startNextTier(s, 0);
    const { switchStore } = await import('../src/game/chain');
    switchStore(s, 0);
    expect(rulesOf(s).rent).toBe(1.25);
    expect(goalOf(s.stores[0]).goal).toBe('revenue');
  });
});

describe('expanding around existing fixtures', () => {
  it('fixtures in the way of new counters move to a free spot nearby, stock and all', async () => {
    const { fitFixtures } = await import('../src/game/chain');
    const s = newGame(3);
    s.level = 1;
    const next = buildLayout(2);
    const card = next.registers.find((r) => r.card)!;
    const q = card.queue[2];
    const f = { id: 99, kind: 'shelf' as const, x: q.x, y: q.y, vertical: true, placed: true, slots: [{ product: 'cola', stock: 9 }, { product: 'potato_chips', stock: 4 }] as GameState['fixtures'][0]['slots'] };
    expect(canPlace(buildLayout(1), s.fixtures.filter((x) => x.placed), f)).toBe(true);
    s.fixtures.push(f);
    s.level = 2;
    const fit = fitFixtures(s);
    expect(fit).toEqual({ shifted: 1, stored: 0 });
    expect(f.placed).toBe(true);
    expect(f.slots[0].stock).toBe(9);
    expect(Object.keys(s.inventory)).toHaveLength(0);
    const others = s.fixtures.filter((x) => x !== f && x.placed);
    expect(canPlace(next, others, f)).toBe(true);
  });
});

describe('cat stays in view', () => {
  it('a resting cat never settles right behind a fixture', () => {
    const s = newGame(17);
    s.level = 2;
    for (let d = 0; d < 3; d++) {
      const sim = new Sim(s);
      sim.restockAll();
      sim.startDay();
      for (let n = 0; n < 40000 && !sim.done; n++) {
        sim.tickReal(0.04);
        sim.update(0.1);
        const c = sim.cat;
        if (c.mode === 'walk' || c.perch || c.mover.path.length || n % 10) continue;
        const t = c.mover.tile;
        if (sim.grid.inside(t.x, t.y + 1)) expect(sim.grid.walkable(t.x, t.y + 1), `${t.x},${t.y}`).toBe(true);
      }
      sim.endDayCosts();
      s.day += 1;
    }
  });
});
