import { t, type Key } from '../i18n';
import { h } from '../ui/dom';
import { sfx } from '../core/audio';

export interface MiniResult {
  accuracy: number;
  seconds: number;
  manual: true;
  /** cumulative quantity for achievements (change cents, pieces, pounds, trays, steps, items) */
  amount?: number;
}

/**
 * Full-screen overlay. The canvas renders at a low virtual resolution and is
 * upscaled by an integer factor so pixel art stays crisp on any screen.
 */
export abstract class MiniGame<R = MiniResult> {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  footer: HTMLElement;
  private confirmSlot: HTMLElement;
  msg: HTMLElement;
  timerEl: HTMLElement;
  head: HTMLElement;
  private sub: HTMLElement;
  vw = 320;
  vh = 240;
  scale = 1;
  elapsed = 0;
  private raf = 0;
  private last = 0;
  private resolve!: (r: R | null) => void;
  private ro: ResizeObserver;
  private stage: HTMLElement;
  private msgTimer = 0;
  protected ended = false;

  constructor(title: Key, hint: Key) {
    this.canvas = h('canvas', { class: 'mini-canvas' }) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.msg = h('div', { class: 'mini-msg' });
    this.timerEl = h('div', { class: 'mini-timer' });
    this.footer = h('div', { class: 'mini-footer' });
    this.confirmSlot = h('div', { class: 'mini-confirm' });
    this.stage = h('div', { class: 'mini-stage' }, [this.canvas, this.msg]);
    const leave = h('button', { class: 'btn ghost', onclick: () => this.close(null) }, [t('mini.leave')]);
    this.sub = h('span', { class: 'mini-sub' });
    this.head = h('div', { class: 'mini-head' }, [
      h('div', { class: 'mini-title' }, [h('span', {}, [t(title), this.sub]), this.timerEl]),
      h('div', { class: 'mini-hint' }, [t(hint)]),
    ]);
    this.root = h('div', { class: 'mini' }, [
      this.head,
      this.stage,
      h('div', { class: 'mini-bottom' }, [leave, this.footer, this.confirmSlot]),
    ]);
    this.ro = new ResizeObserver(() => this.resize());
    const pd = (e: PointerEvent) => {
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      const [x, y] = this.toVirtual(e);
      this.pointerDown(x, y);
    };
    const pm = (e: PointerEvent) => {
      const [x, y] = this.toVirtual(e);
      this.pointerMove(x, y);
    };
    const pu = (e: PointerEvent) => {
      const [x, y] = this.toVirtual(e);
      this.pointerUp(x, y);
    };
    this.canvas.addEventListener('pointerdown', pd);
    this.canvas.addEventListener('pointermove', pm);
    this.canvas.addEventListener('pointerup', pu);
    this.canvas.addEventListener('pointercancel', pu);
  }

  open(parent: HTMLElement): Promise<R | null> {
    parent.appendChild(this.root);
    this.ro.observe(this.stage);
    this.resize();
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (!this.ended) {
        this.elapsed += dt;
        this.timerEl.textContent = t('mini.time', { s: this.elapsed.toFixed(1) });
      }
      this.update(dt);
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      this.render(this.ctx);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    return new Promise((res) => (this.resolve = res));
  }

  protected close(r: R | null): void {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.root.remove();
    this.resolve(r);
  }

  /** Shows the verdict briefly, then closes. */
  protected finish(r: R, label: Key): void {
    this.ended = true;
    sfx(label === 'mini.wrong' ? 'error' : 'level');
    this.say(t(label), 'big');
    setTimeout(() => this.close(r), 750);
  }

  protected subtitle(text: string): void {
    this.sub.textContent = text;
  }

  protected say(text: string, cls = ''): void {
    if (cls === 'bad') sfx('error');
    this.msg.textContent = text;
    this.msg.className = `mini-msg show ${cls}`;
    clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => (this.msg.className = 'mini-msg'), 1600);
  }

  protected button(label: Key | string, onClick: () => void, cls = 'btn'): HTMLButtonElement {
    const text = label.includes('.') ? t(label as Key) : label;
    const b = h('button', { class: cls, onclick: () => !this.ended && onClick() }, [text]) as HTMLButtonElement;
    this.footer.appendChild(b);
    return b;
  }

  /** The finishing action of a mini-game; always sits in the same bottom-right slot. */
  protected confirm(label: Key, onClick: () => void): HTMLButtonElement {
    const b = this.button(label, onClick, 'btn primary');
    this.confirmSlot.appendChild(b);
    return b;
  }

  private resize(): void {
    const r = this.stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const dw = Math.max(1, Math.floor(r.width * dpr));
    const dh = Math.max(1, Math.floor(r.height * dpr));
    this.scale = Math.max(1, Math.floor(Math.min(dw / this.minW(), dh / this.minH())));
    this.canvas.width = dw;
    this.canvas.height = dh;
    this.canvas.style.width = `${dw / dpr}px`;
    this.canvas.style.height = `${dh / dpr}px`;
    this.vw = Math.floor(dw / this.scale);
    this.vh = Math.floor(dh / this.scale);
    this.layout();
  }

  private toVirtual(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * (this.canvas.width / this.scale), ((e.clientY - r.top) / r.height) * (this.canvas.height / this.scale)];
  }

  protected minW(): number {
    return 240;
  }

  protected minH(): number {
    return 240;
  }

  protected abstract layout(): void;
  protected abstract render(ctx: CanvasRenderingContext2D): void;
  protected update(_dt: number): void {}
  protected pointerDown(_x: number, _y: number): void {}
  protected pointerMove(_x: number, _y: number): void {}
  protected pointerUp(_x: number, _y: number): void {}
}

export function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, fill = '#2e2a36', edge = '#18141e'): void {
  ctx.fillStyle = edge;
  ctx.fillRect(x - 1, y - 1, w + 2, hh + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, hh);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x, y, w, 1);
}

export function accuracyLabel(acc: number): Key {
  return acc >= 0.95 ? 'mini.perfect' : acc > 0 ? 'mini.good' : 'mini.wrong';
}
