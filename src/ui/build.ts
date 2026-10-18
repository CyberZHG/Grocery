import { getPrefs, setPrefs } from '../core/prefs';
import { locale, money, productName, t, type Key } from '../i18n';
import { CAFE_TOYS, CATEGORIES, DECOR_KINDS, DECOR_PRICE, DECOR_REGION, DECOR_UNLOCK, FIXTURES, TABLE_PRICE, TOY_PRICE, type CafeToy, NPCS, offeredIn, PRODUCT_BY_ID, PRODUCTS, type Category, type DecorKind, type FixtureKind, type ProductDef } from '../game/defs';
import { rosterSize } from '../game/growth';
import { categoryLevels, collectionMult, isUnlocked, levelsNeeded, MAX_PRODUCT_LEVEL, priceMult, productExpToNext, unlockIndex } from '../game/progress';
import { autoArrange, autoStock, fixturesNeeded, type StockMode } from '../game/arrange';
import { activeSlot, autoUnlocked, inCafe } from '../game/chain';
import type { Game } from '../game/game';
import { canPlace, checkPlan, counterShape, counterSpec, planOf, queueDirs, type CounterInfo, type CounterPos, type FixturePlacement, type QueueDir } from '../game/layout';
import { saveGame, stash, type FixtureState, type GameState } from '../game/state';
import type { Hit } from '../render/world';
import type { UI } from './app';
import { productIcon } from './app';
import { clear, h } from './dom';

const KINDS: FixtureKind[] = ['shelf', 'produce', 'freezer', 'fridge'];

function decorPrice(decor: string): number {
  if (decor === 'table') return TABLE_PRICE;
  if (decor.startsWith('toy_')) return TOY_PRICE[decor.slice(4) as CafeToy];
  return DECOR_PRICE[decor as DecorKind] ?? FIXTURES.decor.price;
}

function counterLabel(c: Pick<CounterInfo, 'kind' | 'station'>): string {
  if (c.kind === 'register') return t('equip.register');
  if (c.kind === 'card') return t('counter.card');
  if (c.kind === 'bagging') return t('station.bagging');
  return t(`station.${c.station}` as Key);
}

function stowedLabel(id: string): string {
  return counterLabel(counterSpec(id));
}

function fixtureLabel(f: FixtureState): string {
  if (f.kind !== 'decor') return t(`fixture.${f.kind}` as Key);
  if (f.decor === 'table') return t('cafe.table');
  if (f.decor?.startsWith('toy_')) return t(`toy.${f.decor.slice(4)}` as Key);
  return t(`decor.${f.decor}` as Key);
}

export class BuildMode {
  private selected: number | null = null;
  private placing: FixtureState | null = null;
  /** The fixture being placed was just bought, so cancelling refunds it instead of storing it. */
  private fresh = false;
  private undoStack: string[] = [];
  private clip: { store: string; products: (string | null)[] } | null = null;
  private drag: { id: number; dx: number; dy: number; x: number; y: number } | null = null;
  /** counter picked for moving, and one being dragged */
  private counter: string | null = null;
  private cdrag: { id: string; dx: number; dy: number; pos: CounterPos } | null = null;
  /** a put-away counter waiting for a spot on the floor */
  private unstowing: { id: string; q: QueueDir } | null = null;
  private el: HTMLElement;

  constructor(private game: Game, private ui: UI, private host: HTMLElement, private onDone: () => void) {
    this.el = h('div', { class: 'build' });
    clear(host);
    host.append(this.el);
    game.build = { selected: null, ghost: null };
    game.onBuildTap = (x, y, hit) => this.tap(x, y, hit);
    game.onBuildHover = (x, y) => this.hover(x, y);
    game.onBuildDrag = {
      start: (x, y, hit, touch) => this.dragStart(hit, touch, x, y),
      move: (x, y) => this.dragMove(x, y),
      end: (_x, _y, commit) => this.dragEnd(commit),
    };
    this.render();
  }

  dispose(): void {
    if (this.placing) this.cancelPlacing();
    this.game.build = null;
    this.game.onBuildTap = null;
    this.game.onBuildHover = null;
    this.game.onBuildDrag = null;
    clear(this.host);
    saveGame(this.game.state);
  }

  select(id: number | null): void {
    this.selected = id;
    this.counter = null;
    this.placing = null;
    this.unstowing = null;
    this.sync();
  }

  private selectCounter(id: string | null): void {
    this.counter = id;
    this.selected = null;
    this.placing = null;
    this.sync();
  }

  private counterInfo(id: string | null): CounterInfo | undefined {
    return this.game.sim.layout.counters.find((c) => c.id === id);
  }

  /** The plan with one counter somewhere else, if everything still fits and can be reached. */
  private counterPlan(id: string, pos: CounterPos) {
    const plan = planOf(this.game.sim.layout, this.state.plan?.stowed);
    plan.counters[id] = pos;
    const ok = checkPlan(this.state.level, activeSlot(this.state).layout, plan, this.state.fixtures.filter((f) => f.placed));
    return ok ? plan : null;
  }

  /** Puts a counter at a new spot, keeping its line's direction if it can, otherwise the first one that works. */
  private moveCounter(id: string, x: number, y: number): boolean {
    const c = this.counterInfo(id);
    if (!c) return false;
    const dirs = queueDirs(c.kind, this.game.sim.layout.mirrored);
    for (const q of [c.pos.q, ...dirs.filter((d) => d !== c.pos.q)]) {
      const plan = this.counterPlan(id, { x, y, q });
      if (plan) {
        this.applyPlan(plan);
        return true;
      }
    }
    return false;
  }

  /** Swings the line round to the next direction that has room. */
  private turnQueue(id: string): void {
    const c = this.counterInfo(id);
    if (!c) return;
    const dirs = queueDirs(c.kind, this.game.sim.layout.mirrored);
    const i = dirs.indexOf(c.pos.q);
    for (let k = 1; k < dirs.length; k++) {
      const plan = this.counterPlan(id, { ...c.pos, q: dirs[(i + k) % dirs.length] });
      if (plan) {
        this.applyPlan(plan);
        return;
      }
    }
    this.ui.toast(t('build.invalid'));
  }

  private applyPlan(plan: NonNullable<GameState['plan']>): void {
    this.snapshot();
    this.state.plan = plan;
    this.game.rebuild();
    this.sync();
  }

  private get state() {
    return this.game.state;
  }

  private sync(): void {
    if (this.game.build) {
      this.game.build.selected = this.selected;
      this.game.build.counter = this.counter;
      if (!this.placing) this.game.build.ghost = null;
      if (!this.unstowing && !this.cdrag) this.game.build.counterGhost = null;
    }
    this.render();
  }

  private others(except: number): FixturePlacement[] {
    return this.state.fixtures.filter((f) => f.placed && f.id !== except);
  }

  private valid(f: FixturePlacement & { id: number }): boolean {
    return canPlace(this.game.sim.layout, this.others(f.id), f);
  }

  private hover(wx: number, wy: number): void {
    if (this.unstowing) {
      this.unstowGhost(wx, wy);
      return;
    }
    const target = this.placing ?? (this.selected !== null ? this.state.fixtures.find((f) => f.id === this.selected) : null);
    if (!target || !this.game.build) return;
    const c = this.game.cell(wx, wy);
    if (!this.placing) return;
    const g = { ...target, x: c.x, y: c.y };
    this.game.build.ghost = { kind: target.kind, x: c.x, y: c.y, vertical: target.vertical, ok: this.valid(g), decor: target.decor };
  }

  private tap(wx: number, wy: number, hit: Hit | null): void {
    const c = this.game.cell(wx, wy);
    if (this.unstowing) {
      this.putBack(c.x, c.y);
      return;
    }
    if (this.placing) {
      const f = this.placing;
      const cand = { ...f, x: c.x, y: c.y };
      if (this.valid(cand)) {
        this.snapshot();
        Object.assign(f, { x: c.x, y: c.y, placed: true });
        delete f.at;
        this.placing = null;
        this.fresh = false;
        this.selected = f.id;
        this.game.rebuild();
        this.sync();
      } else {
        if (this.game.build) this.game.build.ghost = { kind: f.kind, x: c.x, y: c.y, vertical: f.vertical, ok: false, decor: f.decor };
        this.ui.toast(t('build.invalid'));
      }
      return;
    }
    if (hit?.action.type === 'counter') {
      if (hit.action.id !== this.counter) this.selectCounter(hit.action.id);
      return;
    }
    if (this.counter !== null && !(hit && (hit.action.type === 'slot' || hit.action.type === 'fixture'))) {
      const cur = this.counterInfo(this.counter);
      if (cur && !(c.x === cur.pos.x && c.y === cur.pos.y) && !this.moveCounter(this.counter, c.x, c.y)) this.ui.toast(t('build.invalid'));
      return;
    }
    if (hit && (hit.action.type === 'slot' || hit.action.type === 'fixture')) {
      const id = hit.action.fixture;
      if (id !== this.selected) {
        this.select(id);
        return;
      }
      if (hit.action.type === 'slot') this.pick(id, hit.action.slot);
      return;
    }
    if (this.selected !== null) {
      const f = this.state.fixtures.find((x) => x.id === this.selected)!;
      if (c.x === f.x && c.y === f.y) return;
      if (this.valid({ ...f, x: c.x, y: c.y })) {
        this.snapshot();
        f.x = c.x;
        f.y = c.y;
        delete f.at;
        this.game.rebuild();
        this.sync();
      } else {
        this.ui.toast(t('build.invalid'));
      }
    }
  }

  /** Mouse drags any fixture; on touch only the selected one, so a swipe elsewhere still pans. */
  private dragStart(hit: Hit | null, touch: boolean, wx = 0, wy = 0): boolean {
    if (!this.placing && hit?.action.type === 'counter') {
      const c = this.counterInfo(hit.action.id);
      if (!c || (touch && c.id !== this.counter)) return false;
      const cell = this.game.cell(wx, wy);
      this.cdrag = { id: c.id, dx: cell.x - c.pos.x, dy: cell.y - c.pos.y, pos: { ...c.pos } };
      return true;
    }
    if (this.placing || !hit || (hit.action.type !== 'slot' && hit.action.type !== 'fixture')) return false;
    const id = hit.action.fixture;
    const f = this.state.fixtures.find((x) => x.id === id);
    if (!f || !f.placed || (touch && id !== this.selected)) return false;
    const i = hit.action.type === 'slot' ? hit.action.slot : 0;
    this.drag = { id, dx: f.vertical ? 0 : i, dy: f.vertical ? i : 0, x: f.x, y: f.y };
    return true;
  }

  private dragMove(wx: number, wy: number): void {
    const cd = this.cdrag;
    if (cd) {
      const c = this.counterInfo(cd.id);
      if (!c || !this.game.build) return;
      const cell = this.game.cell(wx, wy);
      cd.pos = { x: cell.x - cd.dx, y: cell.y - cd.dy, q: c.pos.q };
      const ok = !!this.counterPlan(cd.id, cd.pos);
      this.game.build.counterGhost = { info: counterShape(c, cd.pos, this.game.sim.layout.mirrored), ok };
      return;
    }
    const d = this.drag;
    const f = d && this.state.fixtures.find((x) => x.id === d.id);
    if (!d || !f || !this.game.build) return;
    const c = this.game.cell(wx, wy);
    d.x = c.x - d.dx;
    d.y = c.y - d.dy;
    this.game.build.hidden = f.id;
    this.game.build.ghost = { kind: f.kind, x: d.x, y: d.y, vertical: f.vertical, ok: this.valid({ ...f, x: d.x, y: d.y }), decor: f.decor, slots: f.slots };
  }

  private dragEnd(commit: boolean): void {
    const cd = this.cdrag;
    if (cd) {
      this.cdrag = null;
      if (this.game.build) this.game.build.counterGhost = null;
      const c = this.counterInfo(cd.id);
      if (!commit || !c) return;
      this.counter = cd.id;
      this.selected = null;
      if ((cd.pos.x !== c.pos.x || cd.pos.y !== c.pos.y) && !this.moveCounter(cd.id, cd.pos.x, cd.pos.y)) this.ui.toast(t('build.invalid'));
      this.sync();
      return;
    }
    const d = this.drag;
    this.drag = null;
    if (this.game.build) {
      this.game.build.hidden = null;
      this.game.build.ghost = null;
    }
    const f = d && this.state.fixtures.find((x) => x.id === d.id);
    if (!d || !f || !commit) return;
    this.selected = f.id;
    if (d.x !== f.x || d.y !== f.y) {
      if (this.valid({ ...f, x: d.x, y: d.y })) {
        this.snapshot();
        f.x = d.x;
        f.y = d.y;
        delete f.at;
        this.game.rebuild();
      } else {
        this.ui.toast(t('build.invalid'));
      }
    }
    this.sync();
  }

  /** Steps back one level: drag, placement, then selection. False when there is nothing left to cancel. */
  cancel(): boolean {
    if (this.game.cancelDrag()) return true;
    if (this.unstowing) {
      this.unstowing = null;
      this.sync();
      return true;
    }
    if (this.placing) {
      this.cancelPlacing();
      return true;
    }
    if (this.selected !== null || this.counter !== null) {
      this.select(null);
      return true;
    }
    return false;
  }

  /** Snapshot of fixtures and money taken before every edit, so mistakes can be undone. */
  snapshot(): void {
    this.undoStack.push(JSON.stringify({ fixtures: this.state.fixtures, money: this.state.money, nextId: this.state.nextId, inventory: this.state.inventory, plan: this.state.plan }));
    if (this.undoStack.length > 40) this.undoStack.shift();
  }

  private cancelPlacing(): void {
    if (this.fresh) {
      // the purchase snapshot is still on top: rolling back refunds it
      this.fresh = false;
      this.undo();
      return;
    }
    this.placing = null;
    this.sync();
  }

  private undo(): void {
    const raw = this.undoStack.pop();
    if (!raw) return;
    const s = JSON.parse(raw) as { fixtures: FixtureState[]; money: number; nextId: number; inventory: Record<string, number>; plan: GameState['plan'] };
    this.state.fixtures = s.fixtures;
    this.state.plan = s.plan;
    this.state.inventory = s.inventory;
    this.state.money = s.money;
    this.state.nextId = s.nextId;
    this.placing = null;
    this.fresh = false;
    if (this.selected !== null && !s.fixtures.some((f) => f.id === this.selected)) this.selected = null;
    this.game.rebuild();
    this.sync();
  }

  private copy(f: FixtureState): void {
    this.clip = { store: FIXTURES[f.kind].store, products: f.slots.map((s) => s.product) };
    this.ui.toast(t('build.copied'));
    this.render();
  }

  private paste(f: FixtureState): void {
    const c = this.clip;
    if (!c || c.store !== FIXTURES[f.kind].store) return;
    this.snapshot();
    f.slots.forEach((s, i) => {
      const id = c.products[i] ?? null;
      if (s.product === id) return;
      if (s.product) stash(this.state, s.product, s.stock);
      s.product = id;
      s.stock = 0;
    });
    this.game.rebuild();
    this.game.restockNow();
    this.render();
  }

  private buy(kind: FixtureKind, decor?: string): void {
    const price = decor ? decorPrice(decor) : FIXTURES[kind].price;
    if (this.state.money < price) {
      this.ui.toast(t('build.noMoney'));
      return;
    }
    this.snapshot();
    this.state.money -= price;
    const f: FixtureState = {
      id: this.state.nextId++, kind, x: 0, y: 0, vertical: false, placed: false,
      slots: [{ product: null, stock: 0 }, { product: null, stock: 0 }],
      decor,
    };
    this.state.fixtures.push(f);
    this.startPlacing(f);
    this.fresh = true;
  }

  private startPlacing(f: FixtureState): void {
    this.placing = f;
    this.fresh = false;
    this.selected = null;
    this.unstowing = null;
    this.sync();
  }

  private rotate(f: FixtureState): void {
    if (f.kind === 'decor') return;
    const cand = { ...f, vertical: !f.vertical };
    if (!f.placed) {
      f.vertical = !f.vertical;
      this.render();
      return;
    }
    if (this.valid(cand)) {
      this.snapshot();
      f.vertical = !f.vertical;
      this.game.rebuild();
      this.sync();
    } else {
      this.ui.toast(t('build.invalid'));
    }
  }

  private sell(f: FixtureState): void {
    this.snapshot();
    const refund = this.refundValue(f);
    this.state.money += refund;
    for (const s of f.slots) if (s.product) stash(this.state, s.product, s.stock);
    this.state.fixtures = this.state.fixtures.filter((x) => x.id !== f.id);
    this.selected = null;
    this.placing = null;
    this.game.rebuild();
    this.sync();
  }

  private refundValue(f: FixtureState): number {
    return (f.decor ? decorPrice(f.decor) : FIXTURES[f.kind].price) * 0.5;
  }

  private pick(fixtureId: number, slot: number): void {
    const f = this.state.fixtures.find((x) => x.id === fixtureId);
    if (!f) return;
    openPicker(this.game, this.ui, f, slot, () => {
      this.game.rebuild();
      this.render();
    }, () => this.snapshot());
  }

  render(): void {
    clear(this.el);
    const st = this.state;
    const head = h('div', { class: 'build-head' }, [
      h('div', { class: 'build-hint' }, [t(this.placing ? 'build.placeHint' : 'build.hint')]),
      h('button', { class: 'btn small ghost', disabled: !this.undoStack.length, onclick: () => this.undo() }, [t('build.undo')]),
      // with a fixture in hand, Done steps back to the build menu; from the menu it leaves build mode
      h('button', { class: 'btn small primary', onclick: () => (this.cancel() ? undefined : this.onDone()) }, [t('common.done')]),
    ]);
    this.el.append(head);
    if (this.placing) {
      const f = this.placing;
      this.el.append(h('div', { class: 'row' }, [
        h('span', { class: 'tag' }, [fixtureLabel(f)]),
        h('button', { class: 'btn small', onclick: () => this.rotate(f) }, [t('build.rotate')]),
        h('button', { class: 'btn small ghost', onclick: () => this.cancelPlacing() }, [t('common.cancel')]),
      ]));
      return;
    }
    const back = this.unstowing;
    if (back) {
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [stowedLabel(back.id)]),
        h('span', { class: 'muted' }, [t('build.unstowHint')]),
        h('button', { class: 'btn small', onclick: () => this.turnBack() }, [t('build.turnQueue')]),
        h('button', { class: 'btn small ghost', onclick: () => this.cancel() }, [t('common.cancel')]),
      ]));
      return;
    }
    const counter = this.counterInfo(this.counter);
    if (counter) {
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [counterLabel(counter)]),
        h('span', { class: 'muted' }, [t('build.counterHint')]),
        h('button', { class: 'btn small', onclick: () => this.turnQueue(counter.id) }, [t('build.turnQueue')]),
        h('button', { class: 'btn small', onclick: () => this.stow(counter.id) }, [t('build.stow')]),
      ]));
      return;
    }
    const sel = this.selected !== null ? st.fixtures.find((f) => f.id === this.selected) : null;
    if (sel && sel.kind === 'decor') {
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [fixtureLabel(sel)]),
        h('button', { class: 'btn small warn', onclick: () => this.sell(sel) }, [t('build.sell', { v: money(this.refundValue(sel)) })]),
      ]));
      return;
    }
    if (sel) {
      const slots = sel.slots.map((s, i) => h('button', { class: 'slot-btn', onclick: () => this.pick(sel.id, i) }, [
        s.product ? productIcon(PRODUCT_BY_ID.get(s.product)!.index) : h('div', { class: 'slot-empty' }, ['+']),
        h('div', { class: 'slot-label' }, [
          h('small', {}, [t('build.slot', { n: i + 1 })]),
          h('span', {}, [s.product ? productName(s.product) : t('build.empty')]),
        ]),
      ]));
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [`${t(`fixture.${sel.kind}` as Key)} · ${t(`storage.${FIXTURES[sel.kind].store}` as Key)}`]),
        ...slots,
        h('button', { class: 'btn small', onclick: () => this.rotate(sel) }, [t('build.rotate')]),
        h('button', { class: 'btn small', onclick: () => this.copy(sel) }, [t('build.copy')]),
        h('button', { class: 'btn small', disabled: !this.clip || this.clip.store !== FIXTURES[sel.kind].store, onclick: () => this.paste(sel) }, [t('build.paste')]),
        h('button', { class: 'btn small warn', onclick: () => this.sell(sel) }, [t('build.sell', { v: money(this.refundValue(sel)) })]),
      ]));
      return;
    }
    if (inCafe(st)) {
      // the cafe sells no groceries: tables and cat toys only
      const owned = new Set(st.fixtures.map((f) => f.decor));
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [t('build.buy')]),
        h('button', { class: 'btn small', disabled: st.money < TABLE_PRICE, onclick: () => this.buy('decor', 'table') }, [`${t('cafe.table')} ${money(TABLE_PRICE)}`]),
      ]));
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [t('cafe.toys', { n: CAFE_TOYS.filter((k) => owned.has(`toy_${k}`)).length, total: CAFE_TOYS.length })]),
        ...CAFE_TOYS.map((k) => h('button', {
          class: `btn small${owned.has(`toy_${k}`) ? ' active' : ''}`, disabled: st.money < TOY_PRICE[k],
          onclick: () => this.buy('decor', `toy_${k}`),
        }, [`${t(`toy.${k}` as Key)} ${money(TOY_PRICE[k])}`])),
      ]));
      this.stowedRow();
      this.storedRow();
      return;
    }
    const shop = KINDS.map((k) => h('button', { class: 'btn small', disabled: st.money < FIXTURES[k].price, onclick: () => this.buy(k) }, [
      `${t(`fixture.${k}` as Key)} ${money(FIXTURES[k].price)}`,
    ]));
    this.autoRow();
    this.el.append(h('div', { class: 'row wrap' }, [h('span', { class: 'tag' }, [t('build.buy')]), ...shop]));
    const rep = st.reputation.level;
    this.el.append(h('div', { class: 'row wrap' }, [
      h('span', { class: 'tag' }, [t('build.decor')]),
      ...DECOR_KINDS.filter((k) => !DECOR_REGION[k] || DECOR_REGION[k]!.includes(locale())).map((k) => {
        const open = rep >= DECOR_UNLOCK[k];
        return h('button', { class: 'btn small', disabled: !open || st.money < DECOR_PRICE[k], onclick: () => this.buy('decor', k) }, [
          open ? `${t(`decor.${k}` as Key)} ${money(DECOR_PRICE[k])}` : `${t(`decor.${k}` as Key)} · ${t('reno.needs', { n: DECOR_UNLOCK[k] })}`,
        ]);
      }),
    ]));
    this.stowedRow();
    this.storedRow();
  }

  private stowedRow(): void {
    const away = this.state.plan?.stowed ?? [];
    if (!away.length) return;
    this.el.append(h('div', { class: 'row wrap' }, [
      h('span', { class: 'tag' }, [t('build.stowed')]),
      ...[...new Set(away.map(stowedLabel))].map((label) => {
        const ids = away.filter((id) => stowedLabel(id) === label);
        return h('button', { class: 'btn small', onclick: () => this.unstow(ids[0]) }, [ids.length > 1 ? `${label} ×${ids.length}` : label]);
      }),
    ]));
  }

  private stow(id: string): void {
    const l = this.game.sim.layout;
    const c = this.counterInfo(id);
    if (!c) return;
    if ((c.kind === 'register' || c.kind === 'card') && l.registers.length <= 1) {
      this.ui.toast(t('build.lastTill'));
      return;
    }
    const plan = planOf(l);
    delete plan.counters[id];
    plan.stowed = [...(this.state.plan?.stowed ?? []), id];
    this.counter = null;
    this.applyPlan(plan);
  }

  /** Picks a put-away counter up; the next tap on the floor sets it down. */
  private unstow(id: string): void {
    this.unstowing = { id, q: queueDirs(counterSpec(id).kind, this.game.sim.layout.mirrored)[0] };
    this.counter = null;
    this.selected = null;
    this.placing = null;
    this.sync();
  }

  /** The plan with a put-away counter back out at this spot, if everything still fits and can be reached. */
  private backPlan(id: string, pos: CounterPos) {
    const plan = planOf(this.game.sim.layout, (this.state.plan?.stowed ?? []).filter((x) => x !== id));
    plan.counters[id] = pos;
    return checkPlan(this.state.level, activeSlot(this.state).layout, plan, this.state.fixtures.filter((f) => f.placed)) ? plan : null;
  }

  private unstowGhost(wx: number, wy: number): void {
    const u = this.unstowing;
    if (!u || !this.game.build) return;
    const c = this.game.cell(wx, wy);
    const pos = { x: c.x, y: c.y, q: u.q };
    this.game.build.counterGhost = { info: counterShape(counterSpec(u.id), pos, this.game.sim.layout.mirrored), ok: !!this.backPlan(u.id, pos) };
  }

  /** Sets the counter down here, its line the chosen way if there's room, otherwise the first way that works. */
  private putBack(x: number, y: number): void {
    const u = this.unstowing!;
    const dirs = queueDirs(counterSpec(u.id).kind, this.game.sim.layout.mirrored);
    for (const q of [u.q, ...dirs.filter((d) => d !== u.q)]) {
      const plan = this.backPlan(u.id, { x, y, q });
      if (plan) {
        this.unstowing = null;
        this.counter = u.id;
        this.applyPlan(plan);
        return;
      }
    }
    if (this.game.build) this.game.build.counterGhost = { info: counterShape(counterSpec(u.id), { x, y, q: u.q }, this.game.sim.layout.mirrored), ok: false };
    this.ui.toast(t('build.invalid'));
  }

  private turnBack(): void {
    const u = this.unstowing;
    if (!u) return;
    const dirs = queueDirs(counterSpec(u.id).kind, this.game.sim.layout.mirrored);
    u.q = dirs[(dirs.indexOf(u.q) + 1) % dirs.length];
    const g = this.game.build?.counterGhost;
    if (g) this.game.build!.counterGhost = { info: counterShape(counterSpec(u.id), { ...g.info.pos, q: u.q }, this.game.sim.layout.mirrored), ok: !!this.backPlan(u.id, { ...g.info.pos, q: u.q }) };
  }

  private autoRow(): void {
    if (!autoUnlocked(this.state)) return;
    const modes: [StockMode, Key][] = [['profit', 'build.fillProfit'], ['high', 'build.fillHigh'], ['low', 'build.fillLow']];
    this.el.append(h('div', { class: 'row wrap' }, [
      h('button', { class: 'btn small', onclick: () => this.tidy() }, [t('build.tidy')]),
      h('span', { class: 'tag' }, [t('build.fill')]),
      ...modes.map(([m, k]) => h('button', { class: 'btn small', onclick: () => this.fill(m) }, [t(k)])),
    ]));
  }

  private tidy(): void {
    const st = this.state;
    // half the cash at most, so there's money left to stock them
    const lang = locale();
    const cap = fixturesNeeded(st, (p) => offeredIn(p, lang));
    const res = autoArrange(this.game.sim.layout, st.fixtures, st.money / 2, Object.fromEntries(KINDS.map((k) => [k, FIXTURES[k].price])), cap);
    this.snapshot();
    for (const f of st.fixtures) {
      if (!res.stored.includes(f.id)) continue;
      f.placed = false;
      delete f.at;
      for (const sl of f.slots) {
        if (sl.product) stash(st, sl.product, sl.stock);
        sl.stock = 0;
      }
    }
    for (const f of st.fixtures) {
      const p = res.spots.get(f.id);
      if (!p) continue;
      Object.assign(f, p, { placed: true });
      delete f.at;
    }
    let spent = 0;
    for (const { kind, ...p } of res.bought) {
      spent += FIXTURES[kind].price;
      st.fixtures.push({ id: st.nextId++, kind, ...p, placed: true, slots: [{ product: null, stock: 0 }, { product: null, stock: 0 }] });
    }
    st.money -= spent;
    if (res.bought.length) this.ui.toast(t('build.tidyBought', { n: res.bought.length, v: money(spent) }));
    if (res.stored.length) this.ui.toast(t('build.tidyStored', { n: res.stored.length }));
    this.game.rebuild();
    this.game.restockNow();
    this.sync();
  }

  private fill(mode: StockMode): void {
    this.snapshot();
    const lang = locale();
    const n = autoStock(this.state, mode, (p) => offeredIn(p, lang));
    if (!n) this.undoStack.pop();
    this.ui.toast(t('build.fillDone', { n }));
    this.game.rebuild();
    this.game.restockNow();
    this.render();
  }

  private storedRow(): void {
    const groups = new Map<string, FixtureState[]>();
    for (const f of this.state.fixtures) {
      if (f.placed) continue;
      const k = `${f.kind}:${f.decor ?? ''}`;
      groups.set(k, [...(groups.get(k) ?? []), f]);
    }
    if (!groups.size) return;
    this.el.append(h('div', { class: 'row wrap' }, [
      h('span', { class: 'tag' }, [t('build.storage')]),
      ...[...groups.values()].map((group) => h('button', { class: 'btn small', onclick: () => this.startPlacing(group[0]) }, [
        group.length > 1 ? `${fixtureLabel(group[0])} ×${group.length}` : fixtureLabel(group[0]),
      ])),
    ]));
  }
}

function fans(cat: Category, id: string, roster: number): number {
  let n = 0;
  for (let i = 0; i < roster; i++) {
    const npc = NPCS[i];
    if (npc.likes.includes(cat) || npc.favs.includes(id)) n += 1;
  }
  return n;
}

type SortKey = 'default' | 'profit' | 'margin' | 'level';

export function openPicker(game: Game, ui: UI, f: FixtureState, slot: number, onPick: () => void, beforeChange?: () => void): void {
  const store = FIXTURES[f.kind].store;
  const roster = rosterSize(game.state);
  const prog = game.state.products;
  const inStore = new Set(game.state.fixtures.filter((x) => x.placed).flatMap((x) => x.slots.map((s) => s.product)));
  let cat: Category | 'all' = 'all';
  let query = '';
  const SORTS: SortKey[] = ['default', 'profit', 'margin', 'level'];
  let sort: SortKey = SORTS.find((k) => k === getPrefs().productSort) ?? 'default';
  const grid = h('div', { class: 'picker-grid' });
  const lang = locale();
  const offered = (p: ProductDef) => p.store === store && offeredIn(p, lang);
  const cats = CATEGORIES.filter((c) => PRODUCTS.some((p) => p.cat === c && offered(p)));
  const chips = h('div', { class: 'chips' });
  const renderChips = () => {
    clear(chips);
    for (const c of ['all', ...cats] as const) {
      chips.append(h('button', { class: `chip${cat === c ? ' active' : ''}`, onclick: () => { cat = c; renderChips(); renderGrid(); } }, [
        c === 'all' ? t('picker.all') : t(`cat.${c}` as Key),
      ]));
    }
  };
  const choose = (id: string | null) => {
    beforeChange?.();
    const s = f.slots[slot];
    if (s.product && s.product !== id) stash(game.state, s.product, s.stock);
    if (s.product !== id) s.stock = 0;
    s.product = id;
    ui.closeModal();
    onPick();
    game.restockNow();
  };
  const priceAt = (p: ProductDef) => p.price * priceMult(prog[p.id].level) * collectionMult(p.cat, game.state.collections);
  const metric = (p: ProductDef): number => {
    if (sort === 'profit') return priceAt(p) - p.cost;
    if (sort === 'margin') return (priceAt(p) - p.cost) / priceAt(p);
    if (sort === 'level') return prog[p.id].level + prog[p.id].exp / 1000;
    return -CATEGORIES.indexOf(p.cat) * 1000 - unlockIndex(p.id);
  };
  const card = (p: ProductDef): HTMLElement => {
    const pr = prog[p.id];
    const price = priceAt(p);
    const margin = ((price - p.cost) / price) * 100;
    const here = inStore.has(p.id);
    return h('button', { class: `pcard${f.slots[slot].product === p.id ? ' active' : ''}`, onclick: () => choose(p.id) }, [
      h('div', { class: `pin${here ? '' : ' off'}` }, [t(here ? 'picker.inStore' : 'picker.notInStore')]),
      productIcon(p.index, 2),
      h('div', { class: 'pname' }, [productName(p.id)]),
      h('div', { class: 'pmeta' }, [`${money(price)} · ${margin.toFixed(0)}%`]),
      h('div', { class: 'pprofit' }, [t('picker.profit', { v: money(price - p.cost) })]),
      h('div', { class: 'plevel' }, [t('picker.levelBonus', { n: pr.level, p: Math.round((priceMult(pr.level) - 1) * 100) })]),
      h('div', { class: 'meter' }, [h('div', { class: 'fill', style: { width: `${pr.level >= MAX_PRODUCT_LEVEL ? 100 : (pr.exp / productExpToNext(pr.level)) * 100}%` } })]),
      h('div', { class: 'pfans' }, [t('picker.fans', { n: fans(p.cat, p.id, roster) })]),
      game.state.inventory[p.id] ? h('div', { class: 'pstored' }, [t('picker.stored', { n: game.state.inventory[p.id] })]) : null,
    ]);
  };
  // quick picks: most profitable not yet stocked, most wanted, most wanted not yet stocked
  const candidates = PRODUCTS.filter((p) => offered(p) && isUnlocked(p.id, prog));
  const byFans = candidates.slice().sort((a, b) => fans(b.cat, b.id, roster) - fans(a.cat, a.id, roster));
  const recs: [Key, ProductDef[]][] = [
    ['picker.recStored', candidates.filter((p) => game.state.inventory[p.id] && !inStore.has(p.id)).sort((a, b) => game.state.inventory[b.id] - game.state.inventory[a.id]).slice(0, 4)],
    ['picker.recProfitNew', candidates.filter((p) => !inStore.has(p.id)).sort((a, b) => priceAt(b) - b.cost - (priceAt(a) - a.cost)).slice(0, 4)],
    ['picker.recWanted', byFans.slice(0, 4)],
    ['picker.recWantedNew', byFans.filter((p) => !inStore.has(p.id)).slice(0, 4)],
  ];
  const recEl = h('details', { class: 'recs', open: true }, [
    h('summary', {}, [t('picker.recs')]),
    ...recs.filter(([, list]) => list.length).map(([k, list]) => h('div', { class: 'stack' }, [h('h3', {}, [t(k)]), h('div', { class: 'rec-row' }, list.map(card))])),
  ]);
  const renderGrid = () => {
    clear(grid);
    const q = query.trim().toLowerCase();
    const list = PRODUCTS.filter((p) => offered(p) && (cat === 'all' || p.cat === cat) && (!q || productName(p.id).toLowerCase().includes(q) || p.id.includes(q)));
    const open = list.filter((p) => isUnlocked(p.id, prog)).sort((a, b) => metric(b) - metric(a));
    const locked = list.filter((p) => !isUnlocked(p.id, prog)).sort((a, b) => levelsNeeded(a.id) - levelsNeeded(b.id));
    for (const p of open) grid.append(card(p));
    for (const p of locked) {
      const need = levelsNeeded(p.id) - categoryLevels(p.cat, prog);
      grid.append(h('div', { class: 'pcard locked' }, [
        h('div', { class: 'pin off' }, [t('picker.locked')]),
        productIcon(p.index, 2),
        h('div', { class: 'pname' }, [productName(p.id)]),
        h('div', { class: 'pmeta' }, [`${money(p.price)} · ${(((p.price - p.cost) / p.price) * 100).toFixed(0)}%`]),
        h('div', { class: 'pfans' }, [t('picker.needs', { n: Math.max(1, need), cat: t(`cat.${p.cat}` as Key) })]),
      ]));
    }
  };
  const search = h('input', { class: 'search', placeholder: t('picker.search'), oninput: (e: Event) => { query = (e.target as HTMLInputElement).value; renderGrid(); } });
  const sortSel = h('select', { class: 'select', onchange: (e: Event) => { sort = (e.target as HTMLSelectElement).value as SortKey; setPrefs({ productSort: sort }); renderGrid(); } }, [
    h('option', { value: 'default', selected: sort === 'default' }, [t('picker.sortDefault')]),
    h('option', { value: 'profit', selected: sort === 'profit' }, [t('picker.sortProfit')]),
    h('option', { value: 'margin', selected: sort === 'margin' }, [t('picker.sortMargin')]),
    h('option', { value: 'level', selected: sort === 'level' }, [t('picker.sortLevel')]),
  ]);
  renderChips();
  renderGrid();
  const body = h('div', { class: 'stack' }, [
    h('div', { class: 'muted' }, [`${t(`storage.${store}` as Key)} · ${t('build.restockNote')}`]),
    recEl,
    h('div', { class: 'row' }, [search, h('label', { class: 'row' }, [h('span', { class: 'muted' }, [t('picker.sort')]), sortSel])]),
    chips,
    grid,
  ]);
  ui.modal(t('picker.title'), body, [h('button', { class: 'btn ghost', onclick: () => choose(null) }, [t('picker.clear')])], true);
}
