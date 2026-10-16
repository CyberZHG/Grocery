import { drawSprite } from '../core/assets';
import { Rng } from '../core/rng';
import { sfx } from '../core/audio';
import { t } from '../i18n';
import type { Bread, BreadQuality } from '../game/defs';
import { inRect, MiniGame, panel, type MiniResult } from './base';

export type TrayQuality = BreadQuality | 'burnt' | 'raw';

interface Tray {
  p: number;
  rate: number;
  pulled: TrayQuality | null;
}

const GOLD: [number, number] = [0.85, 0.97];

function quality(p: number): TrayQuality {
  if (p < 0.7) return 'raw';
  if (p < GOLD[0]) return 'good';
  if (p <= GOLD[1]) return 'golden';
  if (p <= 1.08) return 'good';
  return 'burnt';
}

const SCORE: Record<TrayQuality, number> = { golden: 1, good: 0.6, raw: 0, burnt: 0 };

export interface BakeResult extends MiniResult {
  trays: TrayQuality[];
}

/** Doneness stops the bread sprite cross-fades through while baking. */
const LOOK: [number, TrayQuality][] = [[0.35, 'raw'], [0.72, 'good'], [0.86, 'golden'], [0.98, 'golden'], [1.2, 'burnt']];

const ZONES: [number, string][] = [[0.7, '#e8dcc0'], [GOLD[0], '#d8984a'], [GOLD[1], '#f0c040'], [1.08, '#d8984a'], [1.25, '#4a3028']];

export class BakeryGame extends MiniGame<BakeResult> {
  private trays: Tray[];
  private top = 0;
  private rowH = 56;
  private inner = { x: 0, y: 0, w: 0, h: 0 };
  private frame = { x: 0, y: 0, w: 0, h: 0 };

  constructor(private bread: Bread, seed: number) {
    super('bakery.title', 'bakery.hint');
    const rng = new Rng(seed);
    this.subtitle(t(`bakery.${bread}`));
    this.trays = Array.from({ length: 4 }, () => ({ p: rng.range(0.15, 0.4), rate: rng.range(0.07, 0.13), pulled: null }));
  }

  protected minW(): number {
    return 240;
  }

  protected minH(): number {
    return 230;
  }

  protected layout(): void {
    const w = Math.min(this.vw - 12, 560);
    this.rowH = Math.min(72, Math.floor((this.vh - 12 - 12 - 20) / 4));
    const h = this.rowH * 4 + 20 + 12;
    this.frame = { x: Math.floor((this.vw - w) / 2), y: Math.floor((this.vh - h) / 2), w, h };
    this.inner = { x: this.frame.x + 6, y: this.frame.y + 6, w: w - 12, h: h - 12 };
    this.top = this.inner.y + 10;
  }

  private rowRect(i: number) {
    return { x: this.inner.x, y: this.top + i * this.rowH, w: this.inner.w, h: this.rowH };
  }

  private sheetRect(i: number) {
    const r = this.rowRect(i);
    return { x: r.x + 10, y: r.y + r.h - 16, w: r.w - 20 - 60 };
  }

  protected update(dt: number): void {
    if (this.ended) return;
    for (const tr of this.trays) if (!tr.pulled) tr.p += tr.rate * dt;
    for (const tr of this.trays) if (!tr.pulled && tr.p > 1.25) tr.pulled = 'burnt';
    if (this.trays.every((tr) => tr.pulled)) {
      const trays = this.trays.map((tr) => tr.pulled!);
      const accuracy = trays.reduce((a, q) => a + SCORE[q], 0) / trays.length;
      this.finish({ accuracy, seconds: this.elapsed, manual: true, trays, amount: trays.length }, accuracy >= 0.95 ? 'mini.perfect' : accuracy > 0.3 ? 'mini.good' : 'mini.wrong');
    }
  }

  protected pointerDown(x: number, y: number): void {
    this.trays.forEach((tr, i) => {
      if (!tr.pulled && inRect(x, y, this.rowRect(i))) {
        tr.pulled = quality(tr.p);
        sfx('pop');
        this.say(t(`bakery.${tr.pulled}`), tr.pulled === 'golden' ? 'good' : tr.pulled === 'good' ? '' : 'bad');
      }
    });
  }

  private drawBread(ctx: CanvasRenderingContext2D, tr: Tray, x: number, y: number): void {
    const name = (q: TrayQuality) => `bread_${this.bread}_${q}`;
    if (tr.pulled) {
      drawSprite(ctx, name(tr.pulled), x, y);
      return;
    }
    let i = 0;
    while (i < LOOK.length - 1 && tr.p >= LOOK[i + 1][0]) i++;
    if (i >= LOOK.length - 1 || tr.p < LOOK[0][0]) {
      drawSprite(ctx, name(tr.p < LOOK[0][0] ? 'raw' : 'burnt'), x, y);
      return;
    }
    const [p0, a] = LOOK[i];
    const [p1, b] = LOOK[i + 1];
    drawSprite(ctx, name(a), x, y);
    if (a === b) return;
    ctx.globalAlpha = (tr.p - p0) / (p1 - p0);
    drawSprite(ctx, name(b), x, y);
    ctx.globalAlpha = 1;
  }

  private drawOven(ctx: CanvasRenderingContext2D): void {
    const f = this.frame;
    const n = this.inner;
    ctx.fillStyle = '#14101a';
    ctx.fillRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);
    ctx.fillStyle = '#9aa0ac';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = '#b8bcc8';
    ctx.fillRect(f.x, f.y, f.w, 2);
    ctx.fillStyle = '#6a6e7a';
    ctx.fillRect(f.x, f.y + f.h - 2, f.w, 2);
    ctx.fillStyle = '#14101a';
    ctx.fillRect(n.x - 1, n.y - 1, n.w + 2, n.h + 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(n.x, n.y, n.w, n.h);
    ctx.clip();
    for (let y = n.y; y < n.y + n.h; y += 32) for (let x = n.x; x < n.x + n.w; x += 32) drawSprite(ctx, 'oven_wall', x, y);
    const pulse = 0.75 + 0.25 * Math.sin(this.elapsed * 4);
    ctx.globalAlpha = pulse;
    for (let x = n.x; x < n.x + n.w; x += 32) {
      drawSprite(ctx, 'oven_coil', x, n.y + 2);
      drawSprite(ctx, 'oven_coil', x, n.y + n.h - 8);
    }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, n.y, 0, n.y + n.h);
    g.addColorStop(0, `rgba(240,128,48,${0.16 * pulse})`);
    g.addColorStop(0.5, 'rgba(240,128,48,0.03)');
    g.addColorStop(1, `rgba(240,128,48,${0.16 * pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(n.x, n.y, n.w, n.h);
    ctx.restore();
  }

  private drawGauge(ctx: CanvasRenderingContext2D, tr: Tray, x: number, y: number): void {
    panel(ctx, x, y, 52, 16, '#9aa0ac', '#14101a');
    if (tr.pulled) {
      const stars = tr.pulled === 'golden' ? 2 : tr.pulled === 'good' ? 1 : 0;
      for (let k = 0; k < 2; k++) drawSprite(ctx, k < stars ? 'star_on' : 'star_off', x + 16 + k * 12, y + 4);
      return;
    }
    const bx = x + 3;
    const by = y + 5;
    const scale = 46 / 1.25;
    let from = 0;
    for (const [to, color] of ZONES) {
      ctx.fillStyle = color;
      ctx.fillRect(bx + Math.round(from * scale), by, Math.round(to * scale) - Math.round(from * scale), 6);
      from = to;
    }
    const pos = Math.min(45, Math.round(tr.p * scale));
    ctx.fillStyle = '#14101a';
    ctx.fillRect(bx + pos - 1, by - 3, 4, 12);
    ctx.fillStyle = '#f8f4ec';
    ctx.fillRect(bx + pos, by - 2, 2, 10);
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#3a3036';
    ctx.fillRect(0, 0, vw, vh);
    this.drawOven(ctx);
    this.trays.forEach((tr, i) => {
      const r = this.rowRect(i);
      const sh = this.sheetRect(i);
      const drop = tr.pulled ? 3 : 0;
      drawSprite(ctx, 'oven_rail', r.x, sh.y + 4);
      drawSprite(ctx, 'oven_rail', r.x + r.w - 8, sh.y + 4, true);
      ctx.fillStyle = '#6a6e7a';
      ctx.fillRect(r.x + 8, sh.y + 6, r.w - 16, 1);
      const sy = sh.y + drop;
      drawSprite(ctx, 'bake_sheet_end', sh.x - 4, sy);
      for (let x = sh.x; x < sh.x + sh.w; x += 32) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(sh.x, sy, sh.w, 14);
        ctx.clip();
        drawSprite(ctx, 'bake_sheet', x, sy);
        ctx.restore();
      }
      drawSprite(ctx, 'bake_sheet_end', sh.x + sh.w, sy, true);
      const step = 38;
      const cols = Math.max(1, Math.min(10, Math.floor((sh.w - 6) / step)));
      const pad = Math.floor((sh.w - (cols - 1) * step - 40) / 2);
      const rows = r.h >= 54 ? [{ dx: step / 2, dy: -32, n: cols - 1 }, { dx: 0, dy: -20, n: cols }] : [{ dx: 0, dy: -22, n: cols }];
      for (const row of rows) {
        for (let k = 0; k < row.n; k++) this.drawBread(ctx, tr, sh.x + pad + row.dx + k * step, sy + 8 + row.dy);
      }
      if (!tr.pulled && tr.p > 0.6) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let k = 0; k < cols; k += 2) {
          const ph = (this.elapsed * 12 + k * 5 + i * 3) % 16;
          ctx.fillRect(sh.x + pad + 18 + k * step + (ph > 8 ? 1 : 0), sy - 26 - ph, 2, 2);
        }
      }
      if (tr.pulled === 'raw' || tr.pulled === 'burnt') {
        ctx.fillStyle = 'rgba(20,16,26,0.35)';
        ctx.fillRect(sh.x - 4, r.y, sh.w + 8, r.h);
      }
      this.drawGauge(ctx, tr, r.x + r.w - 62, sh.y - 8);
    });
  }
}
