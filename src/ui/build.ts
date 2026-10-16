import { money, productName, t, type Key } from '../i18n';
import { CATEGORIES, FIXTURES, LEVELS, NPCS, PRODUCT_BY_ID, PRODUCTS, type Category, type FixtureKind, type ProductDef } from '../game/defs';
import { categoryLevels, isUnlocked, levelsNeeded, MAX_PRODUCT_LEVEL, priceMult, productExpToNext, unlockIndex } from '../game/progress';
import type { Game } from '../game/game';
import { canPlace, type FixturePlacement } from '../game/layout';
import { saveGame, type FixtureState } from '../game/state';
import type { Hit } from '../render/world';
import type { UI } from './app';
import { productIcon } from './app';
import { clear, h } from './dom';

const KINDS: FixtureKind[] = ['shelf', 'produce', 'fridge', 'freezer'];

export class BuildMode {
  private selected: number | null = null;
  private placing: FixtureState | null = null;
  private el: HTMLElement;

  constructor(private game: Game, private ui: UI, private host: HTMLElement, private onDone: () => void) {
    this.el = h('div', { class: 'build' });
    clear(host);
    host.append(this.el);
    game.build = { selected: null, ghost: null };
    game.onBuildTap = (x, y, hit) => this.tap(x, y, hit);
    game.onBuildHover = (x, y) => this.hover(x, y);
    this.render();
  }

  dispose(): void {
    this.game.build = null;
    this.game.onBuildTap = null;
    this.game.onBuildHover = null;
    clear(this.host);
    saveGame(this.game.state);
  }

  select(id: number | null): void {
    this.selected = id;
    this.placing = null;
    this.sync();
  }

  private get state() {
    return this.game.state;
  }

  private sync(): void {
    if (this.game.build) {
      this.game.build.selected = this.selected;
      if (!this.placing) this.game.build.ghost = null;
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
    const target = this.placing ?? (this.selected !== null ? this.state.fixtures.find((f) => f.id === this.selected) : null);
    if (!target || !this.game.build) return;
    const c = this.game.cell(wx, wy);
    if (!this.placing) return;
    const g = { ...target, x: c.x, y: c.y };
    this.game.build.ghost = { kind: target.kind, x: c.x, y: c.y, vertical: target.vertical, ok: this.valid(g) };
  }

  private tap(wx: number, wy: number, hit: Hit | null): void {
    const c = this.game.cell(wx, wy);
    if (this.placing) {
      const f = this.placing;
      const cand = { ...f, x: c.x, y: c.y };
      if (this.valid(cand)) {
        Object.assign(f, { x: c.x, y: c.y, placed: true });
        this.placing = null;
        this.selected = f.id;
        this.game.rebuild();
        this.sync();
      } else {
        if (this.game.build) this.game.build.ghost = { kind: f.kind, x: c.x, y: c.y, vertical: f.vertical, ok: false };
        this.ui.toast(t('build.invalid'));
      }
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
        f.x = c.x;
        f.y = c.y;
        this.game.rebuild();
        this.sync();
      } else {
        this.ui.toast(t('build.invalid'));
      }
    }
  }

  private buy(kind: FixtureKind): void {
    const price = FIXTURES[kind].price;
    if (this.state.money < price) {
      this.ui.toast(t('build.noMoney'));
      return;
    }
    this.state.money -= price;
    const f: FixtureState = {
      id: this.state.nextId++, kind, x: 0, y: 0, vertical: false, placed: false,
      slots: [{ product: null, stock: 0 }, { product: null, stock: 0 }],
    };
    this.state.fixtures.push(f);
    this.startPlacing(f);
  }

  private startPlacing(f: FixtureState): void {
    this.placing = f;
    this.selected = null;
    this.sync();
  }

  private rotate(f: FixtureState): void {
    const cand = { ...f, vertical: !f.vertical };
    if (!f.placed) {
      f.vertical = !f.vertical;
      this.render();
      return;
    }
    if (this.valid(cand)) {
      f.vertical = !f.vertical;
      this.game.rebuild();
      this.sync();
    } else {
      this.ui.toast(t('build.invalid'));
    }
  }

  private sell(f: FixtureState): void {
    const refund = this.refundValue(f);
    this.state.money += refund;
    this.state.fixtures = this.state.fixtures.filter((x) => x.id !== f.id);
    this.selected = null;
    this.placing = null;
    this.game.rebuild();
    this.sync();
  }

  private refundValue(f: FixtureState): number {
    let v = FIXTURES[f.kind].price * 0.5;
    for (const s of f.slots) if (s.product) v += s.stock * PRODUCT_BY_ID.get(s.product)!.cost;
    return v;
  }

  private pick(fixtureId: number, slot: number): void {
    const f = this.state.fixtures.find((x) => x.id === fixtureId);
    if (!f) return;
    openPicker(this.game, this.ui, f, slot, () => {
      this.game.rebuild();
      this.render();
    });
  }

  render(): void {
    clear(this.el);
    const st = this.state;
    const head = h('div', { class: 'build-head' }, [
      h('div', { class: 'build-hint' }, [t(this.placing ? 'build.placeHint' : 'build.hint')]),
      h('button', { class: 'btn small primary', onclick: () => this.onDone() }, [t('common.done')]),
    ]);
    this.el.append(head);
    if (this.placing) {
      const f = this.placing;
      this.el.append(h('div', { class: 'row' }, [
        h('span', { class: 'tag' }, [t(`fixture.${f.kind}` as Key)]),
        h('button', { class: 'btn small', onclick: () => this.rotate(f) }, [t('build.rotate')]),
        h('button', { class: 'btn small ghost', onclick: () => { this.placing = null; this.sync(); } }, [t('common.cancel')]),
      ]));
      return;
    }
    const sel = this.selected !== null ? st.fixtures.find((f) => f.id === this.selected) : null;
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
        h('button', { class: 'btn small warn', onclick: () => this.sell(sel) }, [t('build.sell', { v: money(this.refundValue(sel)) })]),
      ]));
      return;
    }
    const shop = KINDS.map((k) => h('button', { class: 'btn small', disabled: st.money < FIXTURES[k].price, onclick: () => this.buy(k) }, [
      `${t(`fixture.${k}` as Key)} ${money(FIXTURES[k].price)}`,
    ]));
    this.el.append(h('div', { class: 'row wrap' }, [h('span', { class: 'tag' }, [t('build.buy')]), ...shop]));
    const stored = st.fixtures.filter((f) => !f.placed);
    if (stored.length) {
      this.el.append(h('div', { class: 'row wrap' }, [
        h('span', { class: 'tag' }, [t('build.storage')]),
        ...stored.map((f) => h('button', { class: 'btn small', onclick: () => this.startPlacing(f) }, [t(`fixture.${f.kind}` as Key)])),
      ]));
    }
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

export function openPicker(game: Game, ui: UI, f: FixtureState, slot: number, onPick: () => void): void {
  const store = FIXTURES[f.kind].store;
  const roster = LEVELS[game.state.level].roster;
  const prog = game.state.products;
  const inStore = new Set(game.state.fixtures.filter((x) => x.placed).flatMap((x) => x.slots.map((s) => s.product)));
  let cat: Category | 'all' = 'all';
  let query = '';
  let sort: SortKey = 'default';
  const grid = h('div', { class: 'picker-grid' });
  const cats = CATEGORIES.filter((c) => PRODUCTS.some((p) => p.cat === c && p.store === store));
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
    const s = f.slots[slot];
    if (s.product && s.product !== id && s.stock > 0) game.state.money += s.stock * PRODUCT_BY_ID.get(s.product)!.cost;
    if (s.product !== id) s.stock = 0;
    s.product = id;
    ui.closeModal();
    onPick();
    game.restockNow();
  };
  const priceAt = (p: ProductDef) => p.price * priceMult(prog[p.id].level);
  const metric = (p: ProductDef): number => {
    if (sort === 'profit') return priceAt(p) - p.cost;
    if (sort === 'margin') return (priceAt(p) - p.cost) / priceAt(p);
    if (sort === 'level') return prog[p.id].level + prog[p.id].exp / 1000;
    return -CATEGORIES.indexOf(p.cat) * 1000 - unlockIndex(p.id);
  };
  const renderGrid = () => {
    clear(grid);
    const q = query.trim().toLowerCase();
    const list = PRODUCTS.filter((p) => p.store === store && (cat === 'all' || p.cat === cat) && (!q || productName(p.id).toLowerCase().includes(q) || p.id.includes(q)));
    const open = list.filter((p) => isUnlocked(p.id, prog)).sort((a, b) => metric(b) - metric(a));
    const locked = list.filter((p) => !isUnlocked(p.id, prog)).sort((a, b) => levelsNeeded(a.id) - levelsNeeded(b.id));
    for (const p of open) {
      const pr = prog[p.id];
      const price = priceAt(p);
      const margin = ((price - p.cost) / price) * 100;
      const here = inStore.has(p.id);
      grid.append(h('button', { class: `pcard${f.slots[slot].product === p.id ? ' active' : ''}`, onclick: () => choose(p.id) }, [
        h('div', { class: `pin${here ? '' : ' off'}` }, [t(here ? 'picker.inStore' : 'picker.notInStore')]),
        productIcon(p.index, 2),
        h('div', { class: 'pname' }, [productName(p.id)]),
        h('div', { class: 'pmeta' }, [`${money(price)} · ${margin.toFixed(0)}%`]),
        h('div', { class: 'pprofit' }, [t('picker.profit', { v: money(price - p.cost) })]),
        h('div', { class: 'plevel' }, [t('picker.levelBonus', { n: pr.level, p: Math.round((priceMult(pr.level) - 1) * 100) })]),
        h('div', { class: 'meter' }, [h('div', { class: 'fill', style: { width: `${pr.level >= MAX_PRODUCT_LEVEL ? 100 : (pr.exp / productExpToNext(pr.level)) * 100}%` } })]),
        h('div', { class: 'pfans' }, [t('picker.fans', { n: fans(p.cat, p.id, roster) })]),
      ]));
    }
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
  const sortSel = h('select', { class: 'select', onchange: (e: Event) => { sort = (e.target as HTMLSelectElement).value as SortKey; renderGrid(); } }, [
    h('option', { value: 'default' }, [t('picker.sortDefault')]),
    h('option', { value: 'profit' }, [t('picker.sortProfit')]),
    h('option', { value: 'margin' }, [t('picker.sortMargin')]),
    h('option', { value: 'level' }, [t('picker.sortLevel')]),
  ]);
  renderChips();
  renderGrid();
  const body = h('div', { class: 'stack' }, [
    h('div', { class: 'muted' }, [`${t(`storage.${store}` as Key)} · ${t('build.restockNote')}`]),
    h('div', { class: 'row' }, [search, h('label', { class: 'row' }, [h('span', { class: 'muted' }, [t('picker.sort')]), sortSel])]),
    chips,
    grid,
  ]);
  ui.modal(t('picker.title'), body, [h('button', { class: 'btn ghost', onclick: () => choose(null) }, [t('picker.clear')])], true);
}
