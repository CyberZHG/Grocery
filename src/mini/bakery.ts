import { drawSprite } from '../core/assets';
import { Rng } from '../core/rng';
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

export class BakeryGame extends MiniGame<BakeResult> {
  private trays: Tray[];
  private top = 0;
  private rowH = 48;

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
    this.rowH = Math.min(56, Math.floor((this.vh - 16) / 4));
    this.top = Math.floor((this.vh - this.rowH * 4) / 2);
  }

  private rowRect(i: number) {
    return { x: 8, y: this.top + i * this.rowH, w: this.vw - 16, h: this.rowH - 4 };
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
        this.say(t(`bakery.${tr.pulled}`), tr.pulled === 'golden' ? 'good' : tr.pulled === 'good' ? '' : 'bad');
      }
    });
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#3a3036';
    ctx.fillRect(0, 0, vw, vh);
    this.trays.forEach((tr, i) => {
      const r = this.rowRect(i);
      panel(ctx, r.x, r.y, r.w, r.h, tr.pulled ? '#3a3a44' : '#2a2026', '#14101a');
      if (!tr.pulled) {
        const glow = 0.18 + 0.08 * Math.sin(this.elapsed * 5 + i);
        ctx.fillStyle = `rgba(240, 128, 48, ${glow})`;
        ctx.fillRect(r.x + 1, r.y + r.h - 8, r.w - 2, 6);
      }
      const q = tr.pulled ?? quality(tr.p);
      const sprite = q === 'raw' ? 'raw' : q;
      const bw = Math.min(3, Math.floor((r.w - 70) / 40));
      for (let k = 0; k < bw; k++) drawSprite(ctx, `bread_${this.bread}_${sprite}`, r.x + 4 + k * 40, r.y + Math.max(0, (r.h - 32) / 2) - 2);
      const bx = r.x + r.w - 56;
      const by = r.y + Math.floor(r.h / 2) - 4;
      ctx.fillStyle = '#14101a';
      ctx.fillRect(bx, by, 50, 8);
      ctx.fillStyle = '#4a3a30';
      ctx.fillRect(bx + 1, by + 1, 48, 6);
      const scale = 48 / 1.25;
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(bx + 1 + Math.round(GOLD[0] * scale), by + 1, Math.round((GOLD[1] - GOLD[0]) * scale), 6);
      const pos = Math.min(48, Math.round(tr.p * scale));
      ctx.fillStyle = tr.pulled ? '#a8acb8' : '#f8f4ec';
      ctx.fillRect(bx + pos, by - 2, 2, 12);
    });
  }
}
