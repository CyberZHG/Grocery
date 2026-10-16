import { drawSprite, drawText } from '../core/assets';
import { t, type Key } from '../i18n';
import { COFFEE_STEPS, type CoffeeStep, type DrinkDef } from '../game/defs';
import { accuracyLabel, inRect, MiniGame, panel } from './base';

const LAYER: Record<CoffeeStep, string> = {
  espresso: '#4a2a18', milk: '#efe6d8', foam: '#fbfaf6', ice: '#c8e8f8', water: '#a8c8d8',
  vanilla: '#f0e0a0', caramel: '#c87a30', chocolate: '#5a3020', whip: '#ffffff',
};

export class CoffeeGame extends MiniGame {
  private phase: 'memo' | 'make' = 'memo';
  private memoLeft: number;
  private memoTotal: number;
  private made: CoffeeStep[] = [];
  private mistakes = 0;
  private shake = 0;
  private goBtn: HTMLButtonElement;

  constructor(private drink: DrinkDef) {
    super('coffee.title', 'coffee.hint');
    this.memoTotal = this.memoLeft = 1.2 + 0.6 * drink.steps.length;
    this.goBtn = this.button('coffee.go', () => this.startMaking());
    this.button('coffee.restart', () => (this.made = []), 'btn ghost');
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
    const rows = Math.ceil(COFFEE_STEPS.length / cols);
    const x0 = Math.floor((this.vw - gw) / 2);
    const y0 = this.vh - rows * size - 6;
    return COFFEE_STEPS.map((s, i) => ({ s, x: x0 + (i % cols) * size, y: y0 + Math.floor(i / cols) * size, w: size - 2, h: size - 2 }));
  }

  protected update(dt: number): void {
    if (this.phase === 'memo') {
      this.memoLeft -= dt;
      if (this.memoLeft <= 0) this.startMaking();
    }
    this.shake = Math.max(0, this.shake - dt * 4);
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
    if (this.made.length === this.drink.steps.length) {
      const accuracy = this.mistakes === 0 ? 1 : this.mistakes === 1 ? 0.6 : 0.3;
      this.finish({ accuracy, seconds: this.elapsed, manual: true }, accuracyLabel(accuracy));
    }
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#2e2420';
    ctx.fillRect(0, 0, vw, vh);
    const steps = this.drink.steps;
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
    drawSprite(ctx, 'coffee_cup', cupX, cupY);
    for (const c of cells) {
      panel(ctx, c.x, c.y, c.w, c.h, this.phase === 'make' ? '#4a3a34' : '#3a302c', '#1a1210');
      drawSprite(ctx, `cf_${c.s}`, c.x + 3, c.y + 3);
    }
  }
}
