import { drawSprite, drawText, rect, textWidth } from '../core/assets';
import { Rng } from '../core/rng';
import { sfx } from '../core/audio';
import { cashLabel, money, t } from '../i18n';
import { CASH, greedy, isBill, roundCash, sum, type CashPayment, type CashSet } from '../game/rules';
import { accuracyLabel, inRect, MiniGame, panel, type MiniResult } from './base';

/** Cash on the counter, positioned by its center and rotated by rot radians. */
interface Piece {
  v: number;
  bill: boolean;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

function extents(p: Piece): [number, number] {
  const c = Math.abs(Math.cos(p.rot));
  const s = Math.abs(Math.sin(p.rot));
  return [(p.w / 2) * c + (p.h / 2) * s, (p.w / 2) * s + (p.h / 2) * c];
}

function hitPiece(p: Piece, x: number, y: number): boolean {
  const dx = x - p.cx;
  const dy = y - p.cy;
  if (!p.bill) return dx * dx + dy * dy <= (p.w / 2) * (p.w / 2);
  const c = Math.cos(-p.rot);
  const s = Math.sin(-p.rot);
  return Math.abs(dx * c - dy * s) <= p.w / 2 && Math.abs(dx * s + dy * c) <= p.h / 2;
}

function overlap(a: Piece, b: Piece): number {
  const [ax, ay] = extents(a);
  const [bx, by] = extents(b);
  return Math.max(0, ax + bx + 2 - Math.abs(a.cx - b.cx)) * Math.max(0, ay + by + 2 - Math.abs(a.cy - b.cy));
}

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
  private cash: CashSet;

  constructor(total: number, private payment: CashPayment, seed: number) {
    super('checkout.title', 'checkout.hint');
    this.cash = CASH[payment.cash];
    this.due = roundCash(total, this.cash);
    this.rng = new Rng(seed);
    this.confirm('checkout.give', () => this.give());
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

  /** Center-weighted placement; the spread widens on retries to avoid overlaps. */
  private scatter(values: number[]): void {
    const c = this.counter;
    const midX = c.x + c.w / 2;
    const midY = c.y + c.h / 2;
    const centered = () => (this.rng.next() + this.rng.next()) - 1;
    for (const v of values) {
      const [, , w, hh] = rect(this.sprite(v));
      const bill = isBill(this.cash, v);
      const rot = bill ? this.rng.range(-0.55, 0.55) : this.rng.range(-0.6, 0.6);
      let best: Piece | null = null;
      let bestScore = Infinity;
      for (let i = 0; i < 60; i++) {
        const spread = Math.min(1, 0.45 + i * 0.02);
        const p: Piece = { v, bill, w, h: hh, rot, cx: midX + centered() * (c.w / 2) * spread, cy: midY + centered() * (c.h / 2) * spread };
        this.clamp(p);
        const score = this.pieces.reduce((a, o) => a + overlap(p, o), 0);
        if (score < bestScore) {
          best = p;
          bestScore = score;
        }
        if (score === 0) break;
      }
      this.pieces.push(best!);
    }
  }

  private clamp(p: Piece): void {
    const c = this.counter;
    const [ex, ey] = extents(p);
    p.cx = Math.max(c.x + ex, Math.min(c.x + c.w - ex, p.cx));
    p.cy = Math.max(c.y + ey, Math.min(c.y + c.h - ey, p.cy));
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
    this.finish({ accuracy, seconds: this.elapsed, manual: true, amount: change }, accuracyLabel(accuracy));
  }

  private short(): void {
    const missing = this.due - this.paid();
    if (missing <= 0) {
      this.mistakes += 1;
      this.say(t('checkout.shortWrong'), 'bad');
      return;
    }
    this.scatter(greedy(missing, [...this.cash.drawer.slice().reverse(), ...this.cash.coins]));
    this.say(t('checkout.added'));
  }

  private sprite(v: number): string {
    return `cash_${this.cash.id}_${v}`;
  }

  /** Note slots across the top of the drawer, coin cups below; mirrors drawer() in tools/gen_mini.py. */
  private drawerSlots(): { v: number; r: { x: number; y: number; w: number; h: number } }[] {
    const d = this.drawerR;
    const row = (n: number, max: number) => {
      const w = Math.min(max, Math.floor((288 - 4 * (n - 1)) / n));
      return { w, x0: d.x + Math.floor((d.w - (n * w + (n - 1) * 4)) / 2) };
    };
    const b = row(this.cash.drawer.length, 52);
    const out = this.cash.drawer.map((v, i) => ({ v, r: { x: b.x0 + i * (b.w + 4), y: d.y + 6, w: b.w, h: 47 } }));
    const coins = this.cash.coins.slice().reverse();
    const c = row(coins.length, 70);
    coins.forEach((v, i) => out.push({ v, r: { x: c.x0 + i * (c.w + 4), y: d.y + 58, w: c.w, h: 33 } }));
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
      const [, , w, hh] = rect(this.sprite(v));
      if (isBill(this.cash, v)) {
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
      if (hitPiece(p, x, y)) {
        this.pieces.splice(i, 1);
        this.pieces.push(p);
        this.drag = { p, dx: x - p.cx, dy: y - p.cy };
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
        sfx('coin');
        this.tray.sort((a, b) => b - a);
        return;
      }
    }
  }

  protected pointerMove(x: number, y: number): void {
    if (!this.drag) return;
    this.drag.p.cx = x - this.drag.dx;
    this.drag.p.cy = y - this.drag.dy;
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

    const amount = money(this.due / 100);
    const lw = Math.max(textWidth(amount, 2) + 12, 90);
    const lx = Math.floor((vw - lw) / 2);
    panel(ctx, lx, 4, lw, 22, '#203020');
    drawText(ctx, amount, lx + (lw - textWidth(amount, 2)) / 2, 7, '#8ef08a', 2);

    for (const p of this.pieces) {
      ctx.save();
      ctx.translate(Math.round(p.cx), Math.round(p.cy));
      ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(40, 20, 10, 0.25)';
      if (p.bill) ctx.fillRect(-p.w / 2 + 2, -p.h / 2 + 2, p.w, p.h);
      drawSprite(ctx, this.sprite(p.v), -p.w / 2, -p.h / 2);
      ctx.restore();
    }

    drawSprite(ctx, 'tray', this.trayR.x, this.trayR.y);
    for (const it of this.trayItems()) drawSprite(ctx, this.sprite(it.v), it.x, it.y);
    const ts = money(sum(this.tray) / 100);
    drawText(ctx, ts, this.trayR.x + this.trayR.w + 6, this.trayR.y + 4, '#f0e0a0');

    drawSprite(ctx, `drawer_${this.cash.id}`, this.drawerR.x, this.drawerR.y);
    for (const s of this.drawerSlots()) {
      const name = this.sprite(s.v);
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.r.x + 1, s.r.y + 1, s.r.w - 2, s.r.h - 2);
      ctx.clip();
      if (isBill(this.cash, s.v)) {
        const [, , w] = rect(name);
        const x = s.r.w > w ? s.r.x + (s.r.w - w) / 2 : s.r.x - 4;
        for (let k = 0; k < 3; k++) drawSprite(ctx, name, x + k, s.r.y + 12 + k * 2);
        drawText(ctx, cashLabel(this.cash.id, s.v), s.r.x + 4, s.r.y + 3, '#f0f0f0');
      } else {
        const [, , w, hh] = rect(name);
        const n = s.r.w < 60 ? 3 : 4;
        for (let k = 0; k < n; k++) drawSprite(ctx, name, s.r.x + s.r.w / 2 - w / 2 - (n - 1) * 3.5 + k * 7, s.r.y + s.r.h / 2 - hh / 2 + (k % 2) * 2);
        drawText(ctx, cashLabel(this.cash.id, s.v), s.r.x + 3, s.r.y + 2, '#f0f0f0');
      }
      ctx.restore();
    }
  }
}

export type { MiniResult };
