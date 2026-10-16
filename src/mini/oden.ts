import { drawSprite, drawText } from '../core/assets';
import { t } from '../i18n';
import { sfx } from '../core/audio';
import { ODEN_ITEMS, type OdenItem } from '../game/defs';
import { accuracyLabel, inRect, MiniGame, panel } from './base';

/** Where the n-th item sits in the box, filling the front middle first; drawn back to front. */
const BOX_SLOTS: [number, number][] = [
  [50, 9], [32, 9], [68, 9], [41, -1], [59, -1], [14, 8], [86, 8], [23, -1], [77, -1], [8, 0], [92, 0], [50, -9],
];

export class OdenGame extends MiniGame {
  private cup: OdenItem[] = [];
  private pot = { x: 0, y: 0 };
  private cupR = { x: 0, y: 0, w: 128, h: 92 };
  private order: [OdenItem, number][];
  private mistakes = 0;

  constructor(items: Partial<Record<OdenItem, number>>) {
    super('oden.title', 'oden.hint');
    this.order = Object.entries(items).map(([k, v]) => [k as OdenItem, v ?? 0]);
    this.confirm('oden.serve', () => this.serve());
  }

  protected minW(): number {
    return 252;
  }

  protected minH(): number {
    return 300;
  }

  protected layout(): void {
    const { vw, vh } = this;
    const y = Math.max(62, 62 + Math.floor((vh - 62 - 228) / 2));
    this.pot = { x: Math.floor((vw - 240) / 2), y };
    this.cupR = { x: Math.floor((vw - 128) / 2), y: Math.min(vh - 94, y + 128), w: 128, h: 92 };
  }

  private cell(i: number): { x: number; y: number; w: number; h: number } {
    const col = i % 5;
    const row = Math.floor(i / 5);
    return { x: this.pot.x + 4 + col * 46, y: this.pot.y + 4 + row * 56, w: 46, h: 56 };
  }

  private serve(): void {
    const counts = new Map<OdenItem, number>();
    for (const c of this.cup) counts.set(c, (counts.get(c) ?? 0) + 1);
    const ok = this.order.every(([k, n]) => counts.get(k) === n) && this.cup.length === this.order.reduce((a, [, n]) => a + n, 0);
    if (!ok) {
      this.mistakes += 1;
      this.say(t('mini.wrong'), 'bad');
      if (this.mistakes >= 3) this.finish({ accuracy: 0, seconds: this.elapsed, manual: true }, 'mini.wrong');
      return;
    }
    const accuracy = this.mistakes === 0 ? 1 : 0.5;
    this.finish({ accuracy, seconds: this.elapsed, manual: true, amount: this.cup.length }, accuracyLabel(accuracy));
  }

  protected pointerDown(x: number, y: number): void {
    if (this.ended) return;
    for (let i = 0; i < ODEN_ITEMS.length; i++) {
      if (inRect(x, y, this.cell(i))) {
        if (this.cup.length < 12) this.cup.push(ODEN_ITEMS[i]);
        sfx('pop');
        return;
      }
    }
    if (inRect(x, y, { x: this.cupR.x - 10, y: this.cupR.y - 16, w: this.cupR.w + 20, h: this.cupR.h + 16 })) this.cup.pop();
  }

  protected render(ctx: CanvasRenderingContext2D): void {
    const { vw, vh } = this;
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(0, 0, vw, vh);
    const bw = this.order.length * 58 + 12;
    const bx = Math.floor((vw - bw) / 2);
    const by = 8;
    panel(ctx, bx, by, bw, 46, '#f4f2ee', '#3a3440');
    ctx.fillStyle = '#f4f2ee';
    ctx.fillRect(vw / 2 - 4, by + 46, 8, 5);
    this.order.forEach(([k, n], i) => {
      drawSprite(ctx, `oden_${k}`, bx + 8 + i * 58, by + 9);
      drawText(ctx, `x${n}`, bx + 38 + i * 58, by + 20, '#2a2430');
    });
    drawSprite(ctx, 'oden_pot', this.pot.x, this.pot.y);
    for (let i = 0; i < ODEN_ITEMS.length; i++) {
      const c = this.cell(i);
      drawSprite(ctx, `oden_${ODEN_ITEMS[i]}`, c.x + 4, c.y + 6);
      drawSprite(ctx, `oden_${ODEN_ITEMS[i]}`, c.x + 14, c.y + 22);
      ctx.fillStyle = 'rgba(176, 112, 44, 0.45)';
      ctx.fillRect(c.x + 2, c.y + 42, c.w - 4, 10);
    }
    const t = this.elapsed;
    for (let i = 0; i < 5; i++) {
      const sx = this.pot.x + 20 + i * 48;
      const sy = this.pot.y - 6 - ((t * 10 + i * 7) % 14);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(sx, sy, 2, 2);
    }
    const c = this.cupR;
    drawSprite(ctx, 'oden_box_back', c.x, c.y);
    this.cup
      .map((k, i) => ({ k, s: BOX_SLOTS[i] }))
      .sort((a, b) => a.s[1] - b.s[1])
      .forEach(({ k, s }) => drawSprite(ctx, `oden_${k}`, c.x + s[0], c.y + s[1]));
    drawSprite(ctx, 'oden_box_front', c.x, c.y);
  }
}
