import { Rng } from '../core/rng';
import { npcName, productName, staffName, t } from '../i18n';
import { BakeryGame } from '../mini/bakery';
import { BaggingGame } from '../mini/bagging';
import { CheckoutGame } from '../mini/checkout';
import { CoffeeGame } from '../mini/coffee';
import { DeliGame } from '../mini/deli';
import { OdenGame } from '../mini/oden';
import { T, worldBounds, WorldRenderer, type BuildView, type Hit, type HitAction } from '../render/world';
import type { UI } from '../ui/app';
import { DAY_START, FIXTURES, LEVELS, NIGHT_SECONDS, SEC_PER_MIN, SKILLS, STAFF_LOOKS, TRAITS, type Skill } from './defs';
import { BATCH, Sim, type Line } from './sim';
import { checkAchievements } from './achievements';
import { achName } from '../ui/achievements';
import { freshSkills, loadGame, newGame, saveGame, type GameState, type MiniKind, type StaffState } from './state';

export type Phase = 'day' | 'night';

interface Camera {
  x: number;
  y: number;
  zoom: number;
  auto: boolean;
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
  renderer = new WorldRenderer();
  cam: Camera = { x: 0, y: 0, zoom: 2, auto: true };
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private last = 0;
  private achTimer = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>();
  private panned = false;
  private pinchDist = 0;

  constructor(readonly ui: UI) {
    this.canvas = ui.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.state = loadGame() ?? newGame();
    this.enterNight(false);
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---------- phases ----------

  private makeSim(): void {
    this.sim = new Sim(this.state);
    this.sim.on((e) => {
      if (e.type === 'closed') this.endDay();
      else if (e.type === 'productLevel') this.ui.toast(t('toast.productLevel', { name: productName(e.id), n: e.level }));
      else if (e.type === 'unlock') this.ui.toast(t('toast.unlock', { name: productName(e.id) }));
      else if (e.type === 'npcLevel') this.ui.toast(t('toast.npcLevel', { name: npcName(e.npc), n: e.level }));
      else if (e.type === 'staffLevel') {
        const name = e.staff < 0 ? t('staff.owner') : staffName(this.state.staff.find((s) => s.id === e.staff)?.name ?? 0);
        this.ui.toast(t('toast.staffLevel', { name, skill: t(`skill.${e.skill}`), n: e.level }));
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
    this.checkAchievements();
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
    const lv = LEVELS[this.state.level];
    const open: Skill[] = ['restock', 'checkout', 'walk', ...lv.stations];
    if (lv.bagging) open.push('bagging');
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
      const total = Object.values(skills).reduce((a, b) => a + b.level - 1, 0);
      const traits = TRAITS.filter((tr) => open.includes(tr.skill));
      const trait = rng.chance(0.5) ? rng.pick(traits).id : null;
      out.push({
        id: this.state.nextId++, name, look, wage: 35 + total * 5 + (trait ? 8 : 0) + rng.int(0, 8),
        role: 'auto', skills, hiredDay: this.state.day, trait,
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
    this.renderer.draw(ctx, this.sim, dt, this.build);
    if (this.phase === 'night') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(20, 24, 60, 0.28)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
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
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (this.pointers.size === 1) this.panned = false;
      if (this.pointers.size === 2) {
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
      if (had && !this.panned && this.pointers.size === 0 && e.type === 'pointerup') this.tap(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.25 : 0.8);
    }, { passive: false });
  }

  private hitAt(wx: number, wy: number): Hit | null {
    const hits = this.renderer.hits;
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (wx >= h.x && wy >= h.y && wx < h.x + h.w && wy < h.y + h.h) {
        if (h.action.type === 'line' || h.action.type === 'oven') return h;
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
    if (this.phase === 'day') {
      if (a.type === 'line' || a.type === 'oven') this.serve(a);
      else if (a.type === 'customer') {
        const c = a.customer;
        const st = this.state.npcs[c.npc.id];
        this.ui.toast(`${npcName(c.npc.id)} · ${t('common.level', { n: st.level })} · ${t('npc.affinity')} ${Math.round(st.affinity)}`);
      } else if (a.type === 'slot') {
        const f = this.sim.fixture(a.fixture);
        if (f && f.slots[a.slot].product && f.slots[a.slot].stock < FIXTURES[f.kind].capacity) {
          this.sim.prioritize(a.fixture, a.slot);
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
      this.sim.manualLine(line, r);
      const kind: MiniKind = line.kind === 'register' ? 'checkout' : line.kind === 'bagging' ? 'bagging' : c.order?.kind ?? 'oden';
      this.recordMini(kind, r.amount ?? 0);
    }
  }

  private recordMini(kind: MiniKind, amount: number): void {
    this.state.lifetime.manual[kind] += 1;
    this.state.lifetime.amount[kind] += amount;
    this.checkAchievements();
  }

  checkAchievements(): void {
    for (const a of checkAchievements(this.state)) this.ui.toast(t('ach.unlocked', { name: achName(a) }));
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
    const m = Math.floor(this.phase === 'day' ? this.sim.clock : DAY_START);
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
