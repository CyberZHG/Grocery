import { Rng } from '../core/rng';
import { money, npcName, productName, staffName, t, type Key } from '../i18n';
import { highlights, holidayOf, upcomingHoliday, weatherOf } from './calendar';
import { growthName } from '../ui/store';
import { BakeryGame } from '../mini/bakery';
import { BaggingGame } from '../mini/bagging';
import { CheckoutGame } from '../mini/checkout';
import { CoffeeGame } from '../mini/coffee';
import { DeliGame } from '../mini/deli';
import { OdenGame } from '../mini/oden';
import { T, worldBounds, WorldRenderer, type BuildView, type Hit, type HitAction } from '../render/world';
import type { UI } from '../ui/app';
import { DAY_END, DAY_START, MIDNIGHT, NIGHT_SECONDS, SEC_PER_MIN, SKILLS, STAFF_LOOKS, TRAITS, unlockedSkills, type Category, type Skill } from './defs';
import { BATCH, Sim, type Line } from './sim';
import { checkAchievements } from './achievements';
import { catName, slotName } from './names';
import { chainIncome, checkChallenge, ensureCafe, fitFixtures, inCafe, openBranch as openChainBranch, recordDay, spoil, STORE_BONUS, storeLayout, switchStore as switchChainStore } from './chain';
import { sfx } from '../core/audio';
import { fitGoals, progressGoals, refreshGoals, type GoalKind, type GoalScope } from './goals';
import { COLLECTION_BONUS } from './progress';
import { capacityOf, gainReputation } from './growth';
import { eventText, goalText } from '../ui/goals';
import type { AwaySummary } from '../ui/app';
import { achName } from '../ui/achievements';
import { freshSkills, loadGame, totalLevels, unlockedBreads, newGame, saveGame, type DayStats, type GameState, type MiniKind, type StaffState } from './state';

export type Phase = 'day' | 'night';

interface Camera {
  x: number;
  y: number;
  zoom: number;
  auto: boolean;
}

export interface BuildDrag {
  /** Returns true when the press grabbed a fixture. */
  start(wx: number, wy: number, hit: Hit | null, touch: boolean): boolean;
  move(wx: number, wy: number): void;
  end(wx: number, wy: number, commit: boolean): void;
}

export class Game {
  state: GameState;
  sim!: Sim;
  phase: Phase = 'night';
  speed = 1;
  userPaused = false;
  nightPaused = false;
  nightLeft = NIGHT_SECONDS;
  miniOpen = false;
  build: BuildView | null = null;
  onBuildTap: ((x: number, y: number, hit: Hit | null) => void) | null = null;
  onBuildHover: ((x: number, y: number) => void) | null = null;
  onBuildDrag: BuildDrag | null = null;
  renderer = new WorldRenderer();
  cam: Camera = { x: 0, y: 0, zoom: 2, auto: true };
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private last = 0;
  private achTimer = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>();
  private panned = false;
  private pinchDist = 0;
  /** A build-mode press that landed on a fixture: moving it drags the fixture instead of the camera. */
  private drag: { armed: boolean; moving: boolean } | null = null;

  constructor(readonly ui: UI) {
    this.canvas = ui.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.state = loadGame() ?? newGame();
    // floor plans can gain counters between versions; anything now in the way goes to storage
    const fit = fitFixtures(this.state);
    const away = this.catchUp();
    this.enterNight(false);
    if (away) requestAnimationFrame(() => this.ui.showAway(away));
    requestAnimationFrame(() => this.toastFit(fit));
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---------- phases ----------

  private makeSim(): void {
    this.sim = new Sim(this.state);
    this.sim.on((e) => {
      if (e.type === 'closed') this.endDay();
      else if (e.type === 'growth') this.ui.toast(t('toast.growth', { name: growthName(e.what), n: e.level }));
      else if (e.type === 'gift') this.ui.toast(t('toast.gift', { name: productName(e.id), n: e.units, v: money(e.value) }));
      else if (e.type === 'gifts') this.ui.toast(t('toast.gifts', { n: e.units, v: money(e.value) }));
      else if (e.type === 'reliefGift') this.ui.toast(t('toast.reliefGift', { n: e.units, v: money(e.value) }));
      else if (e.type === 'productLevel') this.ui.toast(t('toast.productLevel', { name: productName(e.id), n: e.level }), 'productLevel');
      else if (e.type === 'unlock') this.ui.toast(t('toast.unlock', { name: productName(e.id) }));
      else if (e.type === 'collection') this.ui.toast(t('toast.collection', { cat: t(`cat.${e.cat}` as Key), p: Math.round(COLLECTION_BONUS * 100) }));
      else if (e.type === 'npcLevel') this.ui.toast(t('toast.npcLevel', { name: npcName(e.npc), n: e.level }), 'npcLevel');
      else if (e.type === 'npcGift') this.ui.toast(t('toast.npcGift', { name: npcName(e.npc), gift: t(`gift.${e.kind}` as Key) }));
      else if (e.type === 'friend') this.ui.toast(t('toast.friend', { name: npcName(e.by), friend: npcName(e.friend) }));
      else if (e.type === 'sold') this.goal('sellCat', e.qty, e.cat);
      else if (e.type === 'served') this.goal('customers');
      else if (e.type === 'event') this.ui.toast(eventText(e.event));
      else if (e.type === 'tourArrived') this.ui.toast(t('event.tourArrived'));
      else if (e.type === 'guestCat') {
        const g = this.sim.guest!;
        this.ui.toast(t('toast.guestCat', { store: slotName(this.state, e.store), name: g.name.trim() || t('store.catDefault') }));
      }
      else if (e.type === 'staffLevel') {
        const name = e.staff < 0 ? t('staff.owner') : staffName(this.state.staff.find((s) => s.id === e.staff)?.name ?? 0);
        this.ui.toast(t('toast.staffLevel', { name, skill: t(`skill.${e.skill}`), n: e.level }), 'staffLevel');
        if (e.skill === 'bakery') this.checkBreads();
      }
    });
  }

  enterNight(showReport: boolean): void {
    this.phase = 'night';
    this.nightLeft = NIGHT_SECONDS;
    this.nightPaused = false;
    this.makeSim();
    this.state.nightRestock += this.sim.restockAll();
    if (!this.state.candidates.length) this.state.candidates = this.makeCandidates();
    refreshGoals(this.state.goals, this.state.seed, this.state.day, this.state.level, this.goalScope());
    this.checkChain();
    this.checkAchievements();
    this.forecast();
    saveGame(this.state);
    this.ui.refresh();
    if (showReport && this.state.history.length) this.ui.showReport(this.state.history[this.state.history.length - 1]);
  }

  startDay(): void {
    if (this.phase === 'day') return;
    this.ui.closeAll();
    this.state.candidates = [];
    this.makeSim();
    this.sim.startDay();
    this.sim.stats.restock += this.state.nightRestock;
    this.state.nightRestock = 0;
    this.phase = 'day';
    this.userPaused = false;
    this.ui.refresh();
  }

  private endDay(): void {
    this.sim.endDayCosts();
    this.closeBooks(this.sim.stats);
    const found = this.sim.stats.treasure;
    if (found) this.ui.toast(t('toast.treasure', { name: catName(this.state), item: t(`treasure.${found}` as Key) }));
    this.state.history.push(this.sim.stats);
    if (this.state.history.length > 30) this.state.history.shift();
    this.state.day += 1;
    this.enterNight(true);
  }

  rebuild(): void {
    this.makeSim();
    if (this.cam.auto) this.fit();
  }

  paused(): boolean {
    if (this.miniOpen) return true;
    return this.phase === 'day' ? this.userPaused : !!this.build || this.nightPaused;
  }

  // ---------- staff ----------

  makeCandidates(): StaffState[] {
    const rng = new Rng((this.state.seed ^ (this.state.day * 104729)) | 0);
    const used = new Set([...this.state.staff, ...this.state.former].map((s) => s.name));
    const out: StaffState[] = [];
    const open: Skill[] = unlockedSkills(this.state.level).filter((s) => s !== 'clean');
    if (inCafe(this.state) && !open.includes('coffee')) open.push('coffee');
    const takenLooks = new Set([...this.state.staff, ...this.state.former].map((s) => s.look));
    const looks = rng.shuffle([...Array(STAFF_LOOKS).keys()].filter((l) => !takenLooks.has(l)));
    for (let i = 0; i < Math.min(3, looks.length); i++) {
      const look = looks[i];
      let name = look * 2 + rng.int(0, 1);
      if (used.has(name)) name = look * 2 + ((name + 1) % 2);
      used.add(name);
      const levels: Partial<Record<Skill, number>> = {};
      const focus = rng.pick(open);
      for (const s of SKILLS) {
        if (!open.includes(s)) continue;
        levels[s] = 1 + (rng.chance(0.3) ? rng.int(1, 2) : 0) + (s === focus ? rng.int(1, 4) + this.state.level : 0);
      }
      const skills = freshSkills(levels);
      const total = totalLevels({ skills });
      const traits = TRAITS.filter((tr) => open.includes(tr.skill));
      const trait = rng.chance(0.5) ? rng.pick(traits).id : null;
      out.push({
        id: this.state.nextId++, name, look, wage: 35 + total * 5 + (trait ? 8 : 0) + rng.int(0, 8),
        role: 'auto', skills, hiredDay: this.state.day, trait, baseLevels: total,
      });
    }
    return out;
  }

  hire(c: StaffState): void {
    this.state.lifetime.hires += 1;
    this.state.candidates = this.state.candidates.filter((x) => x.id !== c.id);
    c.hiredDay = this.state.day;
    this.state.staff.push(c);
    saveGame(this.state);
    this.ui.refresh();
    this.checkBreads();
  }

  fire(id: number): void {
    const s = this.state.staff.find((x) => x.id === id);
    if (!s) return;
    this.state.staff = this.state.staff.filter((x) => x.id !== id);
    this.state.former.push(s);
    saveGame(this.state);
    this.ui.refresh();
  }

  rehire(id: number): void {
    const s = this.state.former.find((x) => x.id === id);
    if (!s) return;
    this.state.former = this.state.former.filter((x) => x.id !== id);
    s.hiredDay = this.state.day;
    this.state.staff.push(s);
    saveGame(this.state);
    this.ui.refresh();
  }

  /** At night shelves refill right away so the layout shows real products. */
  restockNow(): void {
    if (this.phase !== 'night') return;
    this.state.nightRestock += this.sim.restockAll();
    saveGame(this.state);
  }

  // ---------- loop ----------

  frame(now: number, draw = true): void {
    // Background tabs tick rarely; catch up in small steps so the store keeps running.
    let left = this.last ? Math.min(120, (now - this.last) / 1000) : 0;
    this.last = now;
    let simulated = 0;
    while (left > 0) {
      const dt = Math.min(0.1, left);
      left -= dt;
      if (this.paused()) break;
      simulated += dt;
      if (this.phase === 'day') {
        this.sim.speed = this.speed;
        this.sim.tickReal(dt);
        for (let i = 0; i < this.speed; i++) this.sim.update(dt / SEC_PER_MIN);
      } else {
        this.nightLeft -= dt;
        if (this.nightLeft <= 0) this.startDay();
      }
    }
    this.achTimer += simulated;
    if (this.achTimer > 1) {
      this.achTimer = 0;
      this.checkAchievements();
    }
    if (!draw) return;
    this.render(Math.min(0.1, simulated));
    this.ui.tick();
    this.ui.updatePrompts(this.phase === 'day' && !this.miniOpen ? this.renderer.prompts : []);
  }

  // ---------- view ----------

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    if (this.cam.auto) this.fit();
  }

  private viewport(): { top: number; bottom: number } {
    const dpr = window.devicePixelRatio || 1;
    const [top, bottom] = this.ui.insets();
    return { top: top * dpr, bottom: bottom * dpr };
  }

  fit(): void {
    const b = worldBounds(this.sim.layout);
    const vp = this.viewport();
    const availH = this.canvas.height - vp.top - vp.bottom;
    const z = Math.max(0.25, Math.floor(Math.min(this.canvas.width / b.w, availH / b.h) * 4) / 4);
    this.cam = {
      zoom: z,
      x: b.x + b.w / 2 - this.canvas.width / z / 2,
      y: b.y + b.h / 2 - (vp.top + availH / 2) / z,
      auto: true,
    };
  }

  private render(dt: number): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1e1a24';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Snap the camera to whole device pixels so tiles don't seam.
    const z = this.cam.zoom;
    ctx.setTransform(z, 0, 0, z, Math.round(-this.cam.x * z), Math.round(-this.cam.y * z));
    ctx.imageSmoothingEnabled = false;
    this.renderer.night = this.phase === 'night' && !this.build;
    this.renderer.draw(ctx, this.sim, dt, this.build);
  }

  toWorld(clientX: number, clientY: number): [number, number] {
    const dpr = window.devicePixelRatio || 1;
    return [(clientX * dpr) / this.cam.zoom + this.cam.x, (clientY * dpr) / this.cam.zoom + this.cam.y];
  }

  private zoomAt(clientX: number, clientY: number, factor: number): void {
    const [wx, wy] = this.toWorld(clientX, clientY);
    const z = Math.max(0.25, Math.min(8, Math.round(this.cam.zoom * factor * 4) / 4));
    const dpr = window.devicePixelRatio || 1;
    this.cam.zoom = z;
    this.cam.x = wx - (clientX * dpr) / z;
    this.cam.y = wy - (clientY * dpr) / z;
    this.cam.auto = false;
  }

  private bindInput(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (this.pointers.size === 1) {
        this.panned = false;
        this.drag = null;
        if (this.onBuildDrag && !this.miniOpen) {
          const [wx, wy] = this.toWorld(e.clientX, e.clientY);
          if (this.onBuildDrag.start(wx, wy, this.hitAt(wx, wy), e.pointerType !== 'mouse')) this.drag = { armed: true, moving: false };
        }
      }
      if (this.pointers.size === 2) {
        this.cancelDrag();
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        this.panned = true;
      }
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) {
        if (this.onBuildHover && e.pointerType === 'mouse') {
          const [wx, wy] = this.toWorld(e.clientX, e.clientY);
          this.onBuildHover(wx, wy);
        }
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      if (this.pointers.size === 2) {
        p.x = e.clientX;
        p.y = e.clientY;
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0 && Math.abs(d / this.pinchDist - 1) > 0.15) {
          this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d > this.pinchDist ? 1.25 : 0.8);
          this.pinchDist = d;
        }
        return;
      }
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) this.panned = true;
      if (this.drag) {
        if (this.panned) {
          this.drag.moving = true;
          const [wx, wy] = this.toWorld(e.clientX, e.clientY);
          this.onBuildDrag?.move(wx, wy);
        }
        p.x = e.clientX;
        p.y = e.clientY;
        return;
      }
      if (this.panned) {
        this.cam.x -= ((e.clientX - p.x) * dpr) / this.cam.zoom;
        this.cam.y -= ((e.clientY - p.y) * dpr) / this.cam.zoom;
        this.cam.auto = false;
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    const up = (e: PointerEvent) => {
      const had = this.pointers.has(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (had && this.drag?.moving) {
        const [wx, wy] = this.toWorld(e.clientX, e.clientY);
        this.drag = null;
        this.onBuildDrag?.end(wx, wy, e.type === 'pointerup');
        return;
      }
      if (had && this.drag) {
        this.drag = null;
        this.onBuildDrag?.end(0, 0, false);
      }
      if (had && !this.panned && this.pointers.size === 0 && e.type === 'pointerup') this.tap(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.25 : 0.8);
    }, { passive: false });
  }

  /** Drops a fixture drag in progress; true if there was one. */
  cancelDrag(): boolean {
    if (!this.drag) return false;
    const moving = this.drag.moving;
    this.drag = null;
    this.panned = true;
    this.onBuildDrag?.end(0, 0, false);
    return moving;
  }

  private hitAt(wx: number, wy: number): Hit | null {
    const hits = this.renderer.hits;
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (wx >= h.x && wy >= h.y && wx < h.x + h.w && wy < h.y + h.h) {
        if (h.action.type === 'line' || h.action.type === 'oven' || h.action.type === 'spill' || h.action.type === 'cat') return h;
      }
    }
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (wx >= h.x && wy >= h.y && wx < h.x + h.w && wy < h.y + h.h) return h;
    }
    return null;
  }

  private tap(clientX: number, clientY: number): void {
    if (this.miniOpen) return;
    const [wx, wy] = this.toWorld(clientX, clientY);
    const hit = this.hitAt(wx, wy);
    if (this.onBuildTap) {
      this.onBuildTap(wx, wy, hit);
      return;
    }
    if (!hit) return;
    const a = hit.action;
    if (a.type === 'cat' && a.guest) {
      sfx('meow');
      a.guest.bubble = { icon: 'b_heart', until: this.sim.clock + 2 };
      return;
    }
    if (a.type === 'cat') {
      sfx('meow');
      if (this.sim.petCat()) this.goal('petCat');
      else this.ui.toast(t('toast.catEnough'));
      return;
    }
    if (a.type === 'spill') {
      if (this.sim.cleanSpill(a.id)) {
        sfx('pop');
        this.goal('clean');
      }
      return;
    }
    if (this.phase === 'day') {
      if (a.type === 'line' || a.type === 'oven') this.serve(a);
      else if (a.type === 'customer') {
        const c = a.customer;
        const st = this.state.npcs[c.npc.id];
        this.ui.toast(`${npcName(c.npc.id)} · ${t('common.level', { n: st.level })} · ${t('npc.affinity')} ${t('common.level', { n: st.fond.level })}`);
      } else if (a.type === 'slot') {
        const f = this.sim.fixture(a.fixture);
        if (f && f.slots[a.slot].product && f.slots[a.slot].stock < capacityOf(this.state, f.kind)) {
          this.sim.prioritize(a.fixture, a.slot);
          this.goal('priority');
          this.ui.toast(t('toast.restockSoon', { name: productName(f.slots[a.slot].product!) }));
        }
      }
    } else if (a.type === 'slot' || a.type === 'fixture') {
      this.ui.openBuild(a.type === 'slot' ? a.fixture : a.fixture);
    }
  }

  serve(a: HitAction): void {
    if (this.miniOpen || this.phase !== 'day') return;
    if (a.type === 'line') void this.serveLine(a.line);
    else if (a.type === 'oven') void this.serveOven();
  }

  toClient(wx: number, wy: number): [number, number] {
    const dpr = window.devicePixelRatio || 1;
    return [((wx - this.cam.x) * this.cam.zoom) / dpr, ((wy - this.cam.y) * this.cam.zoom) / dpr];
  }

  cell(wx: number, wy: number): { x: number; y: number } {
    return { x: Math.floor(wx / T), y: Math.floor(wy / T) };
  }

  // ---------- manual service ----------

  private async serveLine(line: Line): Promise<void> {
    const c = line.front();
    if (!c) return;
    const seed = (this.state.seed + c.id * 31 + Math.floor(this.sim.clock)) | 0;
    let game;
    if (line.kind === 'register') {
      if (!c.cash || !c.payment) return;
      game = new CheckoutGame(Math.round(c.total() * 100), c.payment, seed);
    } else if (line.kind === 'bagging') {
      const ids = c.basket.filter((b) => b.kind === 'product').flatMap((b) => Array(b.qty).fill(b.id) as string[]);
      game = new BaggingGame(ids);
    } else {
      const o = c.order;
      if (!o) return;
      if (o.kind === 'oden') game = new OdenGame(o.items);
      else if (o.kind === 'deli') game = new DeliGame(o.meat, o.pounds, seed);
      else game = new CoffeeGame(o.drink);
    }
    this.miniOpen = true;
    const r = await game.open(this.ui.overlay);
    this.miniOpen = false;
    if (r && line.front() === c) {
      const kind: MiniKind = line.kind === 'register' ? 'checkout' : line.kind === 'bagging' ? 'bagging' : c.order?.kind ?? 'oden';
      this.sim.manualLine(line, r);
      this.sim.watchLearn(this.sim.lineSkill(line), line.staffSpot);
      this.recordMini(kind, r.amount ?? 0);
    }
  }

  /** Night tip about tomorrow's weather and an upcoming holiday, so the player can restock ahead. */
  private forecast(): void {
    const day = this.state.day;
    const w = weatherOf(this.state.seed, day);
    const cats = highlights(this.state.seed, day).map((c) => t(`cat.${c}` as Key));
    const hol = holidayOf(day);
    let text = t('forecast.tomorrow', { w: t(`weather.${w}` as Key) });
    if (hol) text += ` · ${t(`holiday.${hol}` as Key)}`;
    if (cats.length) text += ` · ${t('forecast.demand', { list: cats.join(t('common.sep')) })}`;
    this.ui.toast(text);
    const soon = upcomingHoliday(day, 3);
    if (soon && soon.inDays > 0 && !hol) this.ui.toast(t('forecast.holiday', { n: soon.inDays + 1, name: t(`holiday.${soon.id}` as Key) }));
  }

  private recordMini(kind: MiniKind, amount: number): void {
    this.state.lifetime.manual[kind] += 1;
    this.state.lifetime.amount[kind] += amount;
    this.goal('manualAny');
    this.goal(kind === 'checkout' ? 'manualCheckout' : kind);
    this.checkAchievements();
  }

  goal(kind: GoalKind, amount = 1, cat?: Category): void {
    for (const g of progressGoals(this.state.goals, kind, amount, cat)) {
      this.state.money += g.reward;
      gainReputation(this.state, 20);
      sfx('fanfare');
      this.ui.toast(t('goal.done', { name: goalText(g), v: money(g.reward) }));
    }
  }

  /** Simulates days that passed while the page was closed (autopilot, capped at a week). */
  private catchUp(): AwaySummary | null {
    const elapsed = (Date.now() - (this.state.savedAt ?? Date.now())) / 1000;
    const dayReal = (DAY_END - DAY_START) * SEC_PER_MIN + NIGHT_SECONDS;
    const days = Math.min(7, Math.floor(elapsed / dayReal));
    if (days < 1) return null;
    const s = this.state;
    const before = { money: s.money, rep: s.reputation.level, cat: s.cat.level, friends: s.friends, gifts: Object.values(s.gifts).reduce((a, b) => a + b, 0) };
    let revenue = 0;
    let customers = 0;
    for (let d = 0; d < days; d++) {
      const sim = new Sim(s);
      sim.speed = 4;
      s.nightRestock += sim.restockAll();
      sim.startDay();
      sim.stats.restock += s.nightRestock;
      s.nightRestock = 0;
      let steps = 0;
      while (!sim.done && steps < 40000) {
        // offline days skip the manual-service windows entirely
        sim.tickReal(10);
        sim.update(1);
        steps += 1;
      }
      sim.endDayCosts();
      this.closeBooks(sim.stats);
      checkChallenge(s);
      s.history.push(sim.stats);
      if (s.history.length > 30) s.history.shift();
      revenue += sim.stats.revenue;
      customers += sim.stats.customers;
      s.day += 1;
      s.candidates = [];
    }
    checkAchievements(s);
    return {
      days, revenue, customers, money: s.money - before.money, rep: [before.rep, s.reputation.level], cat: [before.cat, s.cat.level],
      friends: s.friends - before.friends, gifts: Object.values(s.gifts).reduce((a, b) => a + b, 0) - before.gifts,
    };
  }

  /** Opens the next branch and starts running it. */
  openBranch(): void {
    openChainBranch(this.state);
    this.afterStoreChange();
  }

  switchStore(i: number): void {
    switchChainStore(this.state, i);
    this.afterStoreChange();
  }

  private goalScope(): GoalScope {
    const l = storeLayout(this.state);
    return { stations: l.stations.map((x) => x.kind), bagging: !!l.bagging, shop: !inCafe(this.state) };
  }

  private afterStoreChange(): void {
    this.state.candidates = [];
    fitGoals(this.state.goals, this.state.seed, this.state.day, this.goalScope());
    this.toastFit(fitFixtures(this.state));
    this.checkAchievements();
    saveGame(this.state);
    this.enterNight(false);
    this.fit();
  }

  toastFit(fit: { shifted: number; stored: number }): void {
    if (fit.shifted) this.ui.toast(t('expand.shifted', { n: fit.shifted }));
    if (fit.stored) this.ui.toast(t('expand.moved'));
  }

  /** Finishes the running store's challenge once its goal is met. */
  checkChain(): void {
    if (ensureCafe(this.state)) {
      sfx('fanfare');
      this.ui.toast(t('cafe.opened'), 'ach', 'trophy');
    }
    const id = checkChallenge(this.state);
    if (!id) return;
    sfx('fanfare');
    this.ui.toast(t('chain.finished', { name: t(`challenge.${id}.name` as Key), p: Math.round(STORE_BONUS * 100) }), 'ach', 'trophy');
    this.checkAchievements();
    this.makeSim();
  }

  /** Spoilage, the other stores' income and challenge progress, folded into a finished day. */
  private closeBooks(st: DayStats): void {
    st.spoiled = spoil(this.state);
    st.chain = chainIncome(this.state);
    this.state.money += st.chain;
    recordDay(this.state, st);
  }

  /** Announces breads that a higher bakery skill has just unlocked. */
  checkBreads(): void {
    const list = unlockedBreads(this.state);
    for (const b of list.slice(this.state.breadsSeen)) this.ui.toast(t('toast.breadUnlock', { name: t(`bakery.${b}`) }));
    this.state.breadsSeen = Math.max(this.state.breadsSeen, list.length);
  }

  checkAchievements(): void {
    const got = checkAchievements(this.state);
    if (got.length === 1) this.ui.toast(t('ach.unlocked', { name: achName(got[0]) }), undefined, 'trophy');
    else if (got.length > 1) {
      const names = got.slice(0, 2).map(achName).join(', ') + (got.length > 2 ? ', …' : '');
      this.ui.toast(t('ach.unlockedMany', { n: got.length, names }), 'ach', 'trophy');
    }
  }

  /** Replaces the running game with an imported save. */
  loadState(s: GameState): void {
    this.state = s;
    saveGame(s);
    this.enterNight(false);
    this.fit();
  }

  private async serveOven(): Promise<void> {
    const o = this.sim.oven;
    if (o.phase !== 'baking' && o.phase !== 'ready') return;
    this.miniOpen = true;
    const r = await new BakeryGame(o.bread, (this.state.seed + Math.floor(this.sim.clock)) | 0).open(this.ui.overlay);
    this.miniOpen = false;
    if (r) {
      this.sim.manualOven(r.trays);
      this.recordMini('bakery', r.amount ?? 0);
    }
  }

  timeLabel(): string {
    const m = Math.floor(this.phase === 'day' ? Math.min(MIDNIGHT, this.sim.clock) : DAY_START);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  newGame(): void {
    this.state = newGame();
    saveGame(this.state);
    this.enterNight(false);
    this.fit();
  }
}

export { BATCH };
