import { drawSprite, drawText, rect, textWidth } from '../core/assets';
import { Rng } from '../core/rng';
import { t } from '../i18n';
import { COINS, DRAWER_BILLS, greedy, roundCash, sum, type CashPayment } from '../game/rules';
import { accuracyLabel, inRect, MiniGame, panel, type MiniResult } from './base';

interface Piece {
  v: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const pieceSprite = (v: number) => (v >= 100 ? `bill${v / 100}` : `coin${v}`);

export class CheckoutGame extends MiniGame {
  private pieces: Piece[] = [];
  private tray: number[] = [];
  private drag: { p: Piece; dx: number; dy: number } | null = null;
  private due: number;
  private mistakes = 0;
  private counter = { x: 0, y: 0, w: 0, h: 0 };
  private trayR = { x: 0, y: 0, w: 140, h: 56 };
  private drawerR = { x: 0, y: 0, w: 300, h: 96 };
  private placedOnce = false;
  private rng: Rng;

  constructor(total: number, private payment: CashPayment, seed: number) {
    super('checkout.title', 'checkout.hint');
    this.due = roundCash(total);
    this.rng = new Rng(seed);
    this.button('checkout.give', () => this.give());
    this.button('checkout.short', () => this.short(), 'btn warn');
    this.button('checkout.reset', () => (this.tray = []), 'btn ghost');
  }

  protected minW(): number {
    return 308;
  }

  protected minH(): number {
    return 300;
  }

  protected layout(): void {
    const { vw, vh } = this;
    this.drawerR = { x: Math.floor((vw - 300) / 2), y: vh - 100, w: 300, h: 96 };
    this.trayR = { x: Math.floor((vw - 140) / 2), y: this.drawerR.y - 62, w: 140, h: 56 };
    this.counter = { x: 4, y: 30, w: vw - 8, h: this.trayR.y - 36 };
    if (!this.placedOnce) {
      this.placedOnce = true;
      this.scatter(this.payment.pieces);
    } else {
      for (const p of this.pieces) this.clamp(p);
    }
  }

  private scatter(values: number[]): void {
    const c = this.counter;
    for (const v of values) {
      const [, , w, hh] = rect(pieceSprite(v));
      let best: Piece = { v, x: c.x + 4, y: c.y + 4, w, h: hh };
      for (let i = 0; i < 40; i++) {
        const p = { v, w, h: hh, x: c.x + 4 + this.rng.next() * Math.max(1, c.w - w - 8), y: c.y + 4 + this.rng.next() * Math.max(1, c.h - hh - 8) };
        best = p;
        if (!this.pieces.some((o) => p.x < o.x + o.w + 2 && o.x < p.x + p.w + 2 && p.y < o.y + o.h + 2 && o.y < p.y + p.h + 2)) break;
      }
      best.x = Math.round(best.x);
      best.y = Math.round(best.y);
      this.pieces.push(best);
    }
  }

  private clamp(p: Piece): void {
    const c = this.counter;
    p.x = Math.max(c.x, Math.min(c.x + c.w - p.w, p.x));
    p.y = Math.max(c.y, Math.min(c.y + c.h - p.h, p.y));
  }

  private paid(): number {
    return sum(this.pieces.map((p) => p.v));
  }

  private give(): void {
    const change = this.paid() - this.due;
    if (change < 0 || sum(this.tray) !== change) {
      this.mistakes += 1;
      this.say(t('checkout.retry'), 'bad');
      return;
    }
    const accuracy = this.mistakes === 0 ? 1 : this.mistakes === 1 ? 0.5 : 0.25;
    this.finish({ accuracy, seconds: this.elapsed, manual: true }, accuracyLabel(accuracy));
  }

  private short(): void {
    const missing = this.due - this.paid();
    if (missing <= 0) {
      this.mistakes += 1;
      this.say(t('checkout.shortWrong'), 'bad');
      return;
    }
    this.scatter(greedy(missing, [...DRAWER_BILLS.slice().reverse(), ...COINS]));
    this.say(t('checkout.added'));
  }

  private drawerSlots(): { v: number; r: { x: number; y: number; w: number; h: number } }[] {
    const d = this.drawerR;
    const out = DRAWER_BILLS.map((v, i) => ({ v, r: { x: d.x + 6 + i * 56, y: d.y + 6, w: 52, h: 47 } }));
    COINS.slice().reverse().forEach((v, i) => out.push({ v, r: { x: d.x + 6 + (i + 1) * 74, y: d.y + 58, w: 70, h: 33 } }));
    return out;
  }

  private trayItems(): { v: number; x: number; y: number; w: number; h: number; i: number }[] {
    const out: { v: number; x: number; y: number; w: number; h: number; i: number }[] = [];
    const r = this.trayR;
    let bx = r.x + 6;
    let by = r.y + 6;
    let cx = r.x + 6;
    const cy = r.y + r.h - 22;
    this.tray.forEach((v, i) => {
      const [, , w, hh] = rect(pieceSprite(v));
      if (v >= 100) {
        out.push({ v, x: bx, y: by, w, h: hh, i });
        bx += 8;
        by += 1;
      } else {
        out.push({ v, x: cx, y: cy, w, h: hh, i });
        cx += w - 4;
      }
    });
    return out;
  }

  protected pointerDown(x: number, y: number): void {
    if (this.ended) return;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (inRect(x, y, p)) {
        this.pieces.splice(i, 1);
        this.pieces.push(p);
        this.drag = { p, dx: x - p.x, dy: y - p.y };
        return;
      }
    }
    const items = this.trayItems();
    for (let i = items.length - 1; i >= 0; i--) {
      if (inRect(x, y, items[i])) {
        this.tray.splice(items[i].i, 1);
        return;
      }
    }
    for (const s of this.drawerSlots()) {
      if (inRect(x, y, s.r)) {
        this.tray.push(s.v);
        this.tray.sort((a, b) => b - a);
        return;
      }
    }
  }

  protected pointerMove(x: number, y: number): void {
    if (!this.drag) return;
    this.drag.p.x = Math.round(x - this.drag.dx);
    this.drag.p.y = Math.round(y - this.drag.dy);
    this.clamp(this.drag.p);
  }

  protected pointerUp(): void {
    this.drag = null;
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#3a3240';
    ctx.fillRect(0, 0, vw, vh);
    const c = this.counter;
    const [, , cw, ch] = rect('counter_wood');
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, c.y, c.w, c.h);
    ctx.clip();
    for (let y = c.y; y < c.y + c.h; y += ch) for (let x = c.x; x < c.x + c.w; x += cw) drawSprite(ctx, 'counter_wood', x, y);
    ctx.restore();
    ctx.strokeStyle = '#5a3a28';
    ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);

    const amount = `$${(this.due / 100).toFixed(2)}`;
    const lw = Math.max(textWidth(amount, 2) + 12, 90);
    const lx = Math.floor((vw - lw) / 2);
    panel(ctx, lx, 4, lw, 22, '#203020');
    drawText(ctx, amount, lx + (lw - textWidth(amount, 2)) / 2, 7, '#8ef08a', 2);

    for (const p of this.pieces) drawSprite(ctx, pieceSprite(p.v), p.x, p.y);

    drawSprite(ctx, 'tray', this.trayR.x, this.trayR.y);
    for (const it of this.trayItems()) drawSprite(ctx, pieceSprite(it.v), it.x, it.y);
    const ts = `$${(sum(this.tray) / 100).toFixed(2)}`;
    drawText(ctx, ts, this.trayR.x + this.trayR.w + 6, this.trayR.y + 4, '#f0e0a0');

    drawSprite(ctx, 'drawer', this.drawerR.x, this.drawerR.y);
    for (const s of this.drawerSlots()) {
      const name = pieceSprite(s.v);
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.r.x + 1, s.r.y + 1, s.r.w - 2, s.r.h - 2);
      ctx.clip();
      if (s.v >= 100) {
        for (let k = 0; k < 3; k++) drawSprite(ctx, name, s.r.x - 4 + k, s.r.y + 12 + k * 2);
        drawText(ctx, `$${s.v / 100}`, s.r.x + 4, s.r.y + 3, '#f0f0f0');
      } else {
        const [, , w, hh] = rect(name);
        for (let k = 0; k < 4; k++) drawSprite(ctx, name, s.r.x + s.r.w / 2 - w / 2 - 12 + k * 7, s.r.y + s.r.h / 2 - hh / 2 + (k % 2) * 2);
        drawText(ctx, `${s.v}¢`, s.r.x + 3, s.r.y + 2, '#f0f0f0');
      }
      ctx.restore();
    }
  }
}

export type { MiniResult };
