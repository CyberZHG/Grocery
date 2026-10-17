import { drawSprite, drawText } from '../core/assets';
import { sfx } from '../core/audio';
import { locale, t, type Key } from '../i18n';
import { COFFEE_STEPS, STEP_REGION, type CoffeeStep, type DrinkDef } from '../game/defs';
import { accuracyLabel, inRect, MiniGame, panel } from './base';

const LAYER: Record<CoffeeStep, string> = {
  espresso: '#4a2a18', milk: '#efe6d8', foam: '#fbfaf6', ice: '#c8e8f8', water: '#a8c8d8',
  vanilla: '#f0e0a0', caramel: '#c87a30', chocolate: '#5a3020', whip: '#ffffff',
  tea: '#a8582a', matcha: '#7aa84a', dalgona: '#d8a050',
};

/** The ingredient buttons: the shared nine plus this language's own. */
const steps = (): CoffeeStep[] => COFFEE_STEPS.filter((s) => !STEP_REGION[s] || STEP_REGION[s] === locale());

export class CoffeeGame extends MiniGame {
  private phase: 'memo' | 'make' = 'memo';
  private memoLeft: number;
  private memoTotal: number;
  private made: CoffeeStep[] = [];
  private mistakes = 0;
  private shake = 0;
  private pour = 0;
  private goBtn: HTMLButtonElement;

  constructor(private drink: DrinkDef) {
    super('coffee.title', 'coffee.hint');
    this.memoTotal = this.memoLeft = 1.2 + 0.6 * drink.steps.length;
    this.button('coffee.restart', () => (this.made = []), 'btn ghost');
    this.goBtn = this.confirm('coffee.go', () => this.startMaking());
    this.subtitle(t(`drink.${drink.id}` as Key));
  }

  protected minW(): number {
    return 240;
  }

  protected minH(): number {
    return 280;
  }

  protected layout(): void {}

  private startMaking(): void {
    this.phase = 'make';
    this.memoLeft = 0;
    this.goBtn.disabled = true;
  }

  private cells(): { s: CoffeeStep; x: number; y: number; w: number; h: number }[] {
    const cols = this.vw >= 220 ? 5 : 3;
    const size = 40;
    const gw = cols * size;
    const all = steps();
    const rows = Math.ceil(all.length / cols);
    const x0 = Math.floor((this.vw - gw) / 2);
    const y0 = this.vh - rows * size - 6;
    return all.map((s, i) => ({ s, x: x0 + (i % cols) * size, y: y0 + Math.floor(i / cols) * size, w: size - 2, h: size - 2 }));
  }

  protected update(dt: number): void {
    if (this.phase === 'memo') {
      this.memoLeft -= dt;
      if (this.memoLeft <= 0) this.startMaking();
    }
    this.shake = Math.max(0, this.shake - dt * 4);
    this.pour = Math.max(0, this.pour - dt);
  }

  protected pointerDown(x: number, y: number): void {
    if (this.phase !== 'make' || this.ended) return;
    const c = this.cells().find((c) => inRect(x, y, c));
    if (!c) return;
    const expect = this.drink.steps[this.made.length];
    if (c.s !== expect) {
      this.mistakes += 1;
      this.made = [];
      this.shake = 1;
      this.say(t('mini.wrong'), 'bad');
      if (this.mistakes >= 3) this.finish({ accuracy: 0, seconds: this.elapsed, manual: true }, 'mini.wrong');
      return;
    }
    this.made.push(c.s);
    this.pour = 0.4;
    sfx('steam');
    if (this.made.length === this.drink.steps.length) {
      const accuracy = this.mistakes === 0 ? 1 : this.mistakes === 1 ? 0.6 : 0.3;
      this.finish({ accuracy, seconds: this.elapsed, manual: true, amount: this.drink.steps.length }, accuracyLabel(accuracy));
    }
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    const steps = this.drink.steps;
    const cells0 = this.cells();
    const cupY0 = Math.max(66, Math.floor((66 + cells0[0].y) / 2 - 36));
    const counterY = cupY0 + 76;
    for (let y = 0; y < counterY; y += 32) for (let x = 0; x < vw; x += 32) drawSprite(ctx, 'cafe_wall', x, y);
    for (let y = counterY + 20; y < vh; y += 32) for (let x = 0; x < vw; x += 32) drawSprite(ctx, 'cafe_panel', x, y);
    for (let x = 0; x < vw; x += 32) drawSprite(ctx, 'cafe_counter', x, counterY);
    // a menu board and a shelf of beans and cups on the wall, where there's room beside the machine
    if (vw >= 300) {
      drawSprite(ctx, 'cafe_menu', Math.max(6, Math.floor(vw / 2) - 140), cupY0 - 4);
      drawSprite(ctx, 'cafe_shelf', Math.min(vw - 82, Math.floor(vw / 2) + 66), cupY0 - 2);
    }
    drawSprite(ctx, 'cafe_head', Math.floor(vw / 2) - 56, cupY0 - 36);
    drawSprite(ctx, 'cafe_tray', Math.floor(vw / 2) - 40, counterY - 6);
    const rw = steps.length * 38 + 10;
    const rx = Math.floor((vw - rw) / 2);
    panel(ctx, rx, 6, rw, 50, '#f4f2ee', '#3a3440');
    steps.forEach((s, i) => {
      const x = rx + 8 + i * 38;
      drawText(ctx, `${i + 1}`, x + 13, 9, '#5a5060');
      if (this.phase === 'memo' || i < this.made.length) {
        drawSprite(ctx, `cf_${s}`, x, 20);
      } else {
        ctx.fillStyle = '#d8d4dc';
        ctx.fillRect(x + 4, 22, 26, 28);
        drawText(ctx, '?', x + 14, 32, '#8a8094');
      }
    });
    if (this.phase === 'memo') {
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(rx, 58, Math.round(rw * (this.memoLeft / this.memoTotal)), 3);
    }
    const cupX = Math.floor(vw / 2 - 28) + Math.round(Math.sin(this.shake * 30) * 3 * this.shake);
    const cells = this.cells();
    const cupY = Math.max(66, Math.floor((66 + cells[0].y) / 2 - 36));
    const fillTop = cupY + 10;
    const fillBottom = cupY + 70;
    const per = (fillBottom - fillTop) / Math.max(4, steps.length);
    this.made.forEach((s, i) => {
      const y1 = Math.round(fillBottom - per * (i + 1));
      for (let y = y1; y < Math.round(fillBottom - per * i); y++) {
        const k = (y - (cupY + 8)) / 63;
        const l = Math.round(cupX + 5 + 6 * k);
        const r = Math.round(cupX + 50 - 6 * k);
        ctx.fillStyle = LAYER[s];
        ctx.fillRect(l, y, r - l, 1);
      }
      if (s === 'ice') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cupX + 18, y1 + 2, 4, 4);
        ctx.fillRect(cupX + 32, y1 + 4, 4, 4);
      }
    });
    if (this.pour > 0 && this.made.length) {
      ctx.fillStyle = LAYER[this.made[this.made.length - 1]];
      const top = cupY - 2;
      const bottom = Math.round(fillBottom - per * this.made.length);
      ctx.fillRect(Math.floor(vw / 2) - 4, top, 2, bottom - top);
      ctx.fillRect(Math.floor(vw / 2) + 2, top, 2, bottom - top);
    }
    drawSprite(ctx, 'coffee_cup', cupX, cupY);
    for (const c of cells) {
      panel(ctx, c.x, c.y, c.w, c.h, this.phase === 'make' ? '#4a3a34' : '#3a302c', '#1a1210');
      drawSprite(ctx, `cf_${c.s}`, c.x + 3, c.y + 3);
    }
  }
}
