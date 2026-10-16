import { LOCALES, locale, money, onLocaleChange, setLocale, t, type Key } from '../i18n';
import { NIGHT_SECONDS } from '../game/defs';
import type { Game } from '../game/game';
import type { DayStats } from '../game/state';
import { BuildMode } from './build';
import { clear, h } from './dom';
import { expandPanel, regularsPanel, reportPanel, staffPanel } from './panels';

const base = import.meta.env.BASE_URL;

export function productIcon(index: number, scale = 1): HTMLElement {
  const s = 32 * scale;
  return h('div', {
    class: 'sprite',
    style: {
      width: `${s}px`, height: `${s}px`,
      backgroundImage: `url(${base}assets/products.png?v=${__BUILD__})`,
      backgroundSize: `${640 * scale}px auto`,
      backgroundPosition: `-${(index % 20) * s}px -${Math.floor(index / 20) * s}px`,
    },
  });
}

export function charIcon(row: number, scale = 1): HTMLElement {
  return h('div', {
    class: 'sprite',
    style: {
      width: `${32 * scale}px`, height: `${40 * scale}px`,
      backgroundImage: `url(${base}assets/chars.png?v=${__BUILD__})`,
      backgroundSize: `${288 * scale}px auto`,
      backgroundPosition: `0 -${(row * 48 + 2) * scale}px`,
    },
  });
}

export class UI {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  game!: Game;
  private top: HTMLElement;
  private bottom: HTMLElement;
  private toasts: HTMLElement;
  private dayEl: HTMLElement;
  private timeEl: HTMLElement;
  private moneyEl: HTMLElement;
  private controls: HTMLElement;
  private nightBar: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private buildMode: BuildMode | null = null;
  private lastSig = '';

  constructor(root: HTMLElement) {
    this.canvas = h('canvas', { class: 'world' });
    this.dayEl = h('div', { class: 'hud-day' });
    this.timeEl = h('div', { class: 'hud-time' });
    this.moneyEl = h('div', { class: 'hud-money' });
    this.controls = h('div', { class: 'hud-controls' });
    this.nightBar = h('div', { class: 'night-bar' }, [h('div', { class: 'fill' })]);
    this.top = h('div', { class: 'hud' }, [
      h('div', { class: 'hud-left' }, [this.dayEl, this.timeEl]),
      this.moneyEl,
      this.controls,
      this.nightBar,
    ]);
    this.bottom = h('div', { class: 'bar' });
    this.toasts = h('div', { class: 'toasts' });
    this.overlay = h('div', { class: 'overlay' });
    root.append(this.canvas, this.top, this.bottom, this.toasts, this.overlay);
    onLocaleChange(() => {
      this.refresh();
      this.buildMode?.render();
    });
  }

  attach(game: Game): void {
    this.game = game;
    this.refresh();
  }

  insets(): [number, number] {
    return [this.top.offsetHeight + 4, this.bottom.offsetHeight + 4];
  }

  /** Rebuilds controls that depend on phase or language. */
  refresh(): void {
    if (!this.game) return;
    this.lastSig = '';
    const g = this.game;
    clear(this.controls);
    if (g.phase === 'day') {
      const speeds: [number, string][] = [[0, '❚❚'], [1, '▶'], [2, '▶▶'], [4, '▶▶▶']];
      for (const [s, label] of speeds) {
        this.controls.append(h('button', {
          class: 'btn small speed', 'data-speed': s, title: s === 0 ? t('hud.pause') : `${s}x`,
          onclick: () => {
            if (s === 0) g.userPaused = !g.userPaused;
            else {
              g.speed = s;
              g.userPaused = false;
            }
            this.lastSig = '';
          },
        }, [label]));
      }
    } else {
      this.controls.append(h('button', { class: 'btn small primary', onclick: () => g.startDay() }, [t('hud.skip')]));
    }
    this.controls.append(h('button', { class: 'btn small icon', title: t('hud.menu'), onclick: () => this.showMenu() }, ['☰']));
    if (!this.buildMode) this.renderBar();
    requestAnimationFrame(() => g.cam.auto && g.fit());
  }

  private renderBar(): void {
    const g = this.game;
    clear(this.bottom);
    const night = g.phase === 'night';
    const btn = (key: Key, fn: () => void, enabled = true) =>
      h('button', { class: 'btn bar-btn', disabled: !enabled, onclick: fn }, [t(key)]);
    if (night) this.bottom.append(btn('bar.build', () => this.openBuild(null)));
    this.bottom.append(
      btn('bar.staff', () => this.openPanel('staff.title', () => staffPanel(g, this))),
      btn('bar.customers', () => this.openPanel('npc.title', () => regularsPanel(g))),
    );
    if (night) {
      this.bottom.append(btn('bar.expand', () => this.openPanel('expand.title', () => expandPanel(g, this))));
      if (g.state.history.length) this.bottom.append(btn('bar.report', () => this.showReport(g.state.history[g.state.history.length - 1])));
    }
  }

  tick(): void {
    const g = this.game;
    const night = g.phase === 'night';
    const sig = [g.phase, g.state.day, g.timeLabel(), Math.round(g.state.money * 100), g.speed, g.userPaused, night ? Math.ceil(g.nightLeft) : 0, g.paused(), g.sim.closing].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.dayEl.textContent = t('hud.day', { n: g.state.day });
    if (night) {
      this.timeEl.textContent = g.paused() ? t('hud.paused') : t('hud.opensIn', { s: Math.max(0, Math.ceil(g.nightLeft)) });
    } else {
      this.timeEl.textContent = g.sim.closing ? `${g.timeLabel()} · ${t('hud.closing')}` : g.timeLabel();
    }
    this.moneyEl.textContent = money(g.state.money);
    this.moneyEl.classList.toggle('neg', g.state.money < 0);
    this.top.classList.toggle('is-night', night);
    (this.nightBar.firstChild as HTMLElement).style.width = `${night ? (g.nightLeft / NIGHT_SECONDS) * 100 : 0}%`;
    this.controls.querySelectorAll<HTMLElement>('.speed').forEach((b) => {
      const s = Number(b.dataset.speed);
      b.classList.toggle('active', s === 0 ? g.userPaused : !g.userPaused && g.speed === s);
    });
  }

  toast(text: string): void {
    const el = h('div', { class: 'toast' }, [text]);
    this.toasts.append(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  }

  modal(title: string, body: HTMLElement, footer: HTMLElement[] = [], wide = false): () => void {
    this.closeModal();
    const close = () => this.closeModal();
    const el = h('div', { class: 'modal-back', onclick: (e: Event) => e.target === el && close() }, [
      h('div', { class: `modal${wide ? ' wide' : ''}` }, [
        h('div', { class: 'modal-head' }, [h('h2', {}, [title]), h('button', { class: 'btn small icon', onclick: close, title: t('common.close') }, ['✕'])]),
        h('div', { class: 'modal-body' }, [body]),
        footer.length ? h('div', { class: 'modal-foot' }, footer) : null,
      ]),
    ]);
    this.overlay.append(el);
    this.modalEl = el;
    return close;
  }

  closeModal(): void {
    if (!this.modalEl) return;
    this.modalEl.remove();
    this.modalEl = null;
  }

  closeAll(): void {
    this.closeModal();
    this.closeBuild();
  }

  openPanel(title: Key, build: () => HTMLElement): void {
    const holder = h('div');
    const render = () => {
      clear(holder);
      holder.append(build());
    };
    render();
    this.modal(t(title), holder, [], true);
    this.rerenderPanel = render;
  }

  rerenderPanel: (() => void) | null = null;

  showReport(s: DayStats): void {
    this.modal(t('report.title', { n: s.day }), reportPanel(s), [
      h('button', { class: 'btn primary', onclick: () => this.closeModal() }, [t('common.continue')]),
    ]);
  }

  confirm(text: string, onYes: () => void): void {
    this.modal(t('common.confirm'), h('p', {}, [text]), [
      h('button', { class: 'btn ghost', onclick: () => this.closeModal() }, [t('common.cancel')]),
      h('button', { class: 'btn warn', onclick: () => { this.closeModal(); onYes(); } }, [t('common.confirm')]),
    ]);
  }

  private showMenu(): void {
    const langs = h('div', { class: 'row wrap' }, LOCALES.map((l) =>
      h('button', { class: `btn${l.code === locale() ? ' primary' : ''}`, onclick: () => { setLocale(l.code); this.showMenu(); } }, [l.label]),
    ));
    const body = h('div', { class: 'stack' }, [
      h('p', { class: 'muted' }, [t('menu.about')]),
      h('h3', {}, [t('menu.language')]),
      langs,
      h('button', { class: 'btn warn', onclick: () => this.confirm(t('menu.newConfirm'), () => this.game.newGame()) }, [t('menu.newGame')]),
    ]);
    this.modal(t('menu.title'), body);
  }

  openBuild(select: number | null): void {
    if (this.game.phase !== 'night') return;
    if (!this.buildMode) {
      this.buildMode = new BuildMode(this.game, this, this.bottom, () => this.closeBuild());
    }
    this.buildMode.select(select);
  }

  closeBuild(): void {
    if (!this.buildMode) return;
    this.buildMode.dispose();
    this.buildMode = null;
    this.renderBar();
    requestAnimationFrame(() => this.game.cam.auto && this.game.fit());
  }

  reportStats(): DayStats | undefined {
    const hist = this.game.state.history;
    return hist[hist.length - 1];
  }
}
