// Economy check: a simple automatic player runs the store for many days and prints the money,
// reputation and size curves. Run with `npm run economy`; not part of `npm test`.
import { it } from 'vitest';
import { FIXTURES, LEVELS, PRODUCTS, type FixtureKind } from '../src/game/defs';
import { branchBlocker, chainIncome, checkChallenge, openBranch, progressOf, recordDay, spoil, storeLayout } from '../src/game/chain';
import { canPlace } from '../src/game/layout';
import { isUnlocked, profit } from '../src/game/progress';
import { Sim } from '../src/game/sim';
import { freshSkills, newGame, type GameState } from '../src/game/state';

const DAYS = Number(process.env.DAYS ?? 120);

function runDay(s: GameState): Sim {
  const sim = new Sim(s);
  sim.startDay();
  for (let n = 0; !sim.done && n < 200000; n++) {
    sim.tickReal(0.08);
    sim.update(0.2);
  }
  sim.endDayCosts();
  sim.stats.spoiled = spoil(s);
  sim.stats.chain = chainIncome(s);
  s.money += sim.stats.chain;
  recordDay(s, sim.stats);
  s.history.push(sim.stats);
  if (s.history.length > 30) s.history.shift();
  s.day += 1;
  return sim;
}

/** Places one more fixture of the given kind with the most profitable unlocked products not yet shown. */
function addFixture(s: GameState, kind: FixtureKind): boolean {
  const layout = storeLayout(s);
  const placed = s.fixtures.filter((f) => f.placed);
  const shown = new Set(placed.flatMap((f) => f.slots.map((x) => x.product)));
  const choices = PRODUCTS.filter((p) => p.store === FIXTURES[kind].store && !shown.has(p.id) && isUnlocked(p.id, s.products))
    .sort((a, b) => profit(b) - profit(a));
  if (choices.length < 2) return false;
  for (let y = 1; y < layout.h - 3; y++) {
    for (let x = 1; x < layout.w - 2; x++) {
      const f = { kind, x, y, vertical: false };
      if (!canPlace(layout, placed, f)) continue;
      s.money -= FIXTURES[kind].price;
      s.fixtures.push({
        id: s.nextId++, kind, x, y, vertical: false, placed: true,
        slots: [{ product: choices[0].id, stock: 0 }, { product: choices[1].id, stock: 0 }],
      });
      return true;
    }
  }
  return false;
}

function night(s: GameState): string[] {
  const done: string[] = [];
  const next = LEVELS[s.level + 1];
  if (next && s.money >= next.cost * 1.3) {
    s.money -= next.cost;
    s.level += 1;
    const layout = storeLayout(s);
    const kept: GameState['fixtures'] = [];
    for (const f of s.fixtures) if (f.placed && canPlace(layout, kept, f)) kept.push(f);
    for (const f of s.fixtures) f.placed = kept.includes(f);
    done.push(`expand→${s.level}`);
  }
  const finished = checkChallenge(s);
  if (finished) done.push(`challenge ${finished} done`);
  if (!branchBlocker(s)) {
    openBranch(s);
    done.push(`branch ${s.branch} (${s.stores[s.active].challenge})`);
  }
  const kinds: FixtureKind[] = ['shelf', 'fridge', 'shelf', 'freezer', 'produce'];
  const reserve = 800 + (LEVELS[s.level + 1]?.cost ?? 0) * 0.5;
  for (let i = 0; i < 2 && s.money > reserve; i++) {
    if (!addFixture(s, kinds[(s.day + i) % kinds.length])) break;
  }
  const wages = s.staff.reduce((a, x) => a + x.wage, 0);
  const avgRev = s.history.slice(-3).reduce((a, d) => a + d.revenue, 0) / Math.max(1, Math.min(3, s.history.length));
  if (s.staff.length < s.level + 1 && s.money > 2000 && wages + 60 < avgRev * 0.25) {
    s.staff.push({ id: s.nextId++, name: s.staff.length, look: s.staff.length, wage: 50, role: 'auto', skills: freshSkills({ checkout: 3, restock: 3 }), hiredDay: s.day, trait: null });
    done.push('hire');
  }
  return done;
}

it('economy curve', () => {
  const s = newGame(2024);
  const rows: string[] = [];
  const events: string[] = [];
  let minMoney = Infinity;
  for (let d = 1; d <= DAYS; d++) {
    const had = s.collections.length;
    const sim = runDay(s);
    for (const c of s.collections.slice(had)) events.push(`day ${d}: collection ${c}`);
    minMoney = Math.min(minMoney, s.money);
    const st = sim.stats;
    const flow = st.revenue - st.restock - st.wages - st.rent;
    const ev = night(s);
    const big = ev.filter((e) => e !== 'hire');
    if (big.length) events.push(`day ${d}: ${big.join(', ')}`);
    if (d <= 5 || d % 10 === 0) {
      rows.push([d, s.active, s.level, Math.round(s.money), Math.round(st.revenue), Math.round(flow), st.customers, st.angry ?? 0, s.reputation.level, s.staff.length, s.fixtures.filter((f) => f.placed).length, Math.round(progressOf(s).value)].map(String).join('\t'));
    }
  }
  console.log(['day', 'store', 'size', 'money', 'revenue', 'cashflow', 'cust', 'upset', 'rep', 'staff', 'fixtures', 'challenge'].join('\t'));
  console.log(rows.join('\n'));
  console.log(`\nlowest money: ${Math.round(minMoney)}\n${events.join('\n')}`);
  const p = progressOf(s);
  console.log(`running ${s.stores[s.active].challenge}: ${Math.round(p.value)} / ${p.target}`);
});
