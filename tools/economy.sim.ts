// Economy check: a simple automatic player runs the store for many days and prints the money,
// reputation and size curves. Run with `npm run economy`; not part of `npm test`.
import { it } from 'vitest';
import { FIXTURES, LEVELS, PRODUCTS, type FixtureKind } from '../src/game/defs';
import { buildLayout, canPlace } from '../src/game/layout';
import { isUnlocked, profit } from '../src/game/progress';
import { Sim } from '../src/game/sim';
import { freshSkills, newGame, type GameState } from '../src/game/state';

const DAYS = Number(process.env.DAYS ?? 120);
const BRANCH_REP = 20;
const BRANCH_MONEY = 50000;

function runDay(s: GameState): Sim {
  const sim = new Sim(s);
  sim.startDay();
  for (let n = 0; !sim.done && n < 200000; n++) {
    sim.tickReal(0.08);
    sim.update(0.2);
  }
  sim.endDayCosts();
  s.history.push(sim.stats);
  if (s.history.length > 30) s.history.shift();
  s.day += 1;
  return sim;
}

/** Places one more fixture of the given kind with the most profitable unlocked products not yet shown. */
function addFixture(s: GameState, kind: FixtureKind): boolean {
  const layout = buildLayout(s.level, s.branch % 2 === 1);
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
    const layout = buildLayout(s.level, s.branch % 2 === 1);
    const kept: GameState['fixtures'] = [];
    for (const f of s.fixtures) if (f.placed && canPlace(layout, kept, f)) kept.push(f);
    for (const f of s.fixtures) f.placed = kept.includes(f);
    done.push(`expand→${s.level}`);
  }
  if (!next && s.reputation.level >= BRANCH_REP && s.money >= BRANCH_MONEY) {
    const old = s;
    const fresh = newGame(old.seed + 1);
    Object.assign(s, {
      ...fresh, branch: old.branch + 1, money: fresh.money + Math.round(old.money * 0.1), owner: old.owner, staff: old.staff,
      products: old.products, npcs: old.npcs, reputation: { level: Math.max(1, Math.floor(old.reputation.level / 4)), exp: 0 },
      day: old.day, openedDay: old.day, lifetime: old.lifetime,
    });
    done.push(`branch ${s.branch}`);
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
    const sim = runDay(s);
    minMoney = Math.min(minMoney, s.money);
    const st = sim.stats;
    const flow = st.revenue - st.restock - st.wages - st.rent;
    const ev = night(s);
    const big = ev.filter((e) => e !== 'hire');
    if (big.length) events.push(`day ${d}: ${big.join(', ')}`);
    if (d <= 5 || d % 10 === 0) {
      rows.push([d, s.branch, s.level, Math.round(s.money), Math.round(st.revenue), Math.round(flow), st.customers, s.reputation.level, s.staff.length, s.fixtures.filter((f) => f.placed).length].map(String).join('\t'));
    }
  }
  console.log(['day', 'branch', 'size', 'money', 'revenue', 'cashflow', 'cust', 'rep', 'staff', 'fixtures'].join('\t'));
  console.log(rows.join('\n'));
  console.log(`\nlowest money: ${Math.round(minMoney)}\n${events.join('\n')}`);
});
