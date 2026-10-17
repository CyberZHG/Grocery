import { drawSprite, drawText, textWidth } from '../core/assets';
import { Rng } from '../core/rng';
import { sfx } from '../core/audio';
import { locale, t, weight } from '../i18n';
import type { Meat } from '../game/defs';
import { MiniGame, panel } from './base';

const SLICE_EVERY = 0.3;

export class DeliGame extends MiniGame {
  private holding = false;
  private acc = 0;
  private weight = 0;
  /** Slices fly in an arc from the blade to the scale; `t` runs 0..1 over the flight. */
  private slices: { x0: number; y0: number; x1: number; y1: number; t: number; landed: boolean }[] = [];
  private spin = 0;
  private rng: Rng;
  private slicer = { x: 0, y: 0 };
  private scaleR = { x: 0, y: 0 };
  private mistakes = 0;

  constructor(private meat: Meat, private target: number, seed: number) {
    super('deli.title', 'deli.hint');
    this.rng = new Rng(seed);
    this.subtitle(t(`deli.${meat}`));
    const hold = this.button('deli.hold', () => {}, 'btn hold');
    hold.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hold.setPointerCapture(e.pointerId);
      this.start();
    });
    const stop = () => this.stop();
    hold.addEventListener('pointerup', stop);
    hold.addEventListener('pointercancel', stop);
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    this.confirm('deli.wrap', () => this.wrap());
  }

  protected minW(): number {
    return 260;
  }

  protected minH(): number {
    return 230;
  }

  protected layout(): void {
    const { vw, vh } = this;
    const wide = vw >= 270;
    this.slicer = { x: Math.max(4, Math.floor(vw / 2 - (wide ? 130 : 120))), y: Math.floor(vh / 2 - 40) };
    this.scaleR = { x: Math.min(vw - 104, this.slicer.x + 150), y: this.slicer.y + 70 };
  }

  private start(): void {
    if (this.ended) return;
    this.holding = true;
    this.acc = SLICE_EVERY * 0.5;
  }

  private stop(): void {
    this.holding = false;
  }

  protected pointerDown(): void {
    this.start();
  }

  protected pointerUp(): void {
    this.stop();
  }

  private wrap(): void {
    const diff = this.weight - this.target;
    if (diff < -0.06) {
      this.mistakes += 1;
      this.say(`${t('deli.target')} ${weight(this.target)}`, 'bad');
      return;
    }
    const a = Math.abs(diff);
    let accuracy = a <= 0.03 ? 1 : a <= 0.06 ? 0.8 : a <= 0.12 ? 0.5 : 0.2;
    if (this.mistakes) accuracy *= 0.8;
    this.finish({ accuracy, seconds: this.elapsed, manual: true, amount: this.weight }, accuracy >= 0.95 ? 'mini.perfect' : accuracy >= 0.5 ? 'mini.good' : 'mini.wrong');
  }

  protected update(dt: number): void {
    if (this.holding && !this.ended) {
      this.spin += dt * 30;
      this.acc += dt;
      while (this.acc >= SLICE_EVERY) {
        this.acc -= SLICE_EVERY;
        this.weight += this.rng.range(0.035, 0.055);
        sfx('slice');
        const n = this.slices.length;
        this.slices.push({
          x0: this.slicer.x + 74, y0: this.slicer.y + 42,
          x1: this.scaleR.x + 50 + this.rng.range(-8, 8), y1: this.scaleR.y + 2 - Math.min(16, n * 1.3),
          t: 0, landed: false,
        });
      }
    }
    for (const s of this.slices) {
      if (s.landed) continue;
      s.t = Math.min(1, s.t + dt / 0.55);
      if (s.t >= 1) s.landed = true;
    }
  }

  private slicePos(s: DeliGame['slices'][number]): [number, number] {
    const x = s.x0 + (s.x1 - s.x0) * s.t;
    const y = s.y0 + (s.y1 - s.y0) * s.t - 60 * Math.sin(Math.PI * s.t);
    return [x, y];
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#2e3640';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#d8dce4';
    ctx.fillRect(0, this.slicer.y + 96, vw, vh);
    ctx.fillStyle = '#b8bcc8';
    ctx.fillRect(0, this.slicer.y + 96, vw, 2);

    const tgt = weight(this.target);
    const tw = textWidth(tgt, 2) + 16;
    panel(ctx, Math.floor((vw - tw) / 2), 6, tw, 24, '#f4f2ee', '#3a3440');
    drawText(ctx, tgt, Math.floor((vw - tw) / 2) + 8, 10, '#2a2430', 2);

    const sx = this.slicer.x;
    const sy = this.slicer.y;
    if (locale() === 'zh') drawSprite(ctx, 'roast_window', Math.floor(vw / 2 - 140), Math.max(34, sy - 126));
    drawSprite(ctx, 'slicer', sx, sy);
    const cx = sx + 48;
    const cy = sy + 46;
    // at a roast-meat counter it's a cleaver on a board instead of a spinning blade
    const chop = locale() === 'zh';
    ctx.strokeStyle = 'rgba(80, 90, 110, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < (chop ? 0 : 3); i++) {
      const a = this.spin + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.round(cx + Math.cos(a) * 12) + 0.5, Math.round(cy + Math.sin(a) * 12) + 0.5);
      ctx.lineTo(Math.round(cx + Math.cos(a) * 30) + 0.5, Math.round(cy + Math.sin(a) * 30) + 0.5);
      ctx.stroke();
    }
    const push = this.holding ? Math.sin(this.spin * 0.6) * 2 : 0;
    drawSprite(ctx, `meat_${this.meat}`, sx + 80 + (chop ? 0 : push), sy + 20);
    if (chop) drawSprite(ctx, 'cleaver', sx + 54, sy + (this.holding && Math.sin(this.spin * 0.6) > 0 ? 16 : -6));

    drawSprite(ctx, 'scale', this.scaleR.x, this.scaleR.y);
    for (const s of this.slices) {
      const [x, y] = this.slicePos(s);
      if (s.landed) {
        drawSprite(ctx, `slice_${this.meat}`, Math.round(x - 15), Math.round(y - 10));
        continue;
      }
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y - 4));
      ctx.scale(1, Math.max(0.2, Math.abs(Math.cos(s.t * Math.PI * 3))));
      drawSprite(ctx, `slice_${this.meat}`, -15, -6);
      ctx.restore();
    }
    const wtxt = weight(this.weight, false);
    drawText(ctx, wtxt, this.scaleR.x + 50 - textWidth(wtxt, 2) / 2, this.scaleR.y + 30, '#8ef08a', 2);
  }
}
