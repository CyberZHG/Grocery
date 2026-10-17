import { LOCALES, locale, money, onLocaleChange, setLocale, t, type Key } from '../i18n';
import { NIGHT_SECONDS } from '../game/defs';
import type { Game } from '../game/game';
import type { DayStats } from '../game/state';
import type { Prompt } from '../render/world';
import { spriteIcon } from './achievements';
import { trophiesPanel } from './collection';
import { audioSettings, setAudio, setMusic, sfx, unlockAudio } from '../core/audio';
import { goalsPanel } from './goals';
import { storePanel } from './store';
import { dateOf, holidayOf, weatherOf } from '../game/calendar';
import { BuildMode } from './build';
import { openShare } from './share';
import { decodeSave, encodeSave } from '../game/savecode';
import { chainNotices, expandNotices, goalNotices, markSeen, unseen } from './notices';
import { clear, h, ICON_MUTED, ICON_SOUND, ICON_STORE, pixelIcon } from './dom';
import { isCafe } from '../game/chain';
import { slotName } from '../game/names';
import { regularsPanel, reportPanel, staffPanel } from './panels';
import { growPanel } from './street';

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
      backgroundSize: `${48 * 32 * scale}px auto`,
      backgroundPosition: `0 -${(row * 48 + 2) * scale}px`,
    },
  });
}

export interface AwaySummary {
  days: number;
  revenue: number;
  customers: number;
  money: number;
  rep: [number, number];
  cat: [number, number];
  friends: number;
  gifts: number;
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
  private weatherEl: HTMLElement;
  private weatherSig = '';
  private controls: HTMLElement;
  private nightBar: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private buildMode: BuildMode | null = null;
  private lastSig = '';
  private promptLayer: HTMLElement;
  private promptEls = new Map<string, { el: HTMLButtonElement; bar: HTMLElement }>();

  constructor(root: HTMLElement) {
    // audio may only start after a user gesture; any button press also plays a soft click
    window.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    window.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn, .chip, .pcard, .slot-btn')) sfx('click');
    }, { capture: true });
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('contextmenu', (e) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      e.preventDefault();
      // a long press on touch screens also fires this; only a real right click cancels
      if ((e as PointerEvent).pointerType && (e as PointerEvent).pointerType !== 'mouse') return;
      this.cancel();
    });
    this.canvas = h('canvas', { class: 'world' });
    this.dayEl = h('div', { class: 'hud-day' });
    this.timeEl = h('div', { class: 'hud-time' });
    this.moneyEl = h('div', { class: 'hud-money' });
    this.weatherEl = h('div', { class: 'hud-weather' });
    this.controls = h('div', { class: 'hud-controls' });
    this.nightBar = h('div', { class: 'night-bar' }, [h('div', { class: 'fill' })]);
    this.top = h('div', { class: 'hud' }, [
      h('div', { class: 'hud-left' }, [this.dayEl, this.timeEl, this.weatherEl]),
      this.moneyEl,
      this.controls,
      this.nightBar,
    ]);
    this.bottom = h('div', { class: 'bar' });
    this.toasts = h('div', { class: 'toasts' });
    this.overlay = h('div', { class: 'overlay' });
    this.promptLayer = h('div', { class: 'prompts' });
    root.append(this.canvas, this.promptLayer, this.top, this.bottom, this.toasts, this.overlay);
    onLocaleChange(() => {
      this.refresh();
      this.buildMode?.render();
    });
  }

  private onKey(e: KeyboardEvent): void {
    const g = this.game;
    if (!g || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const click = (sel: string): boolean => {
      const b = document.querySelector<HTMLButtonElement>(sel);
      if (!b || b.disabled) return false;
      b.click();
      return true;
    };
    const mini = document.querySelector('.mini');
    let done = true;
    if (e.key === 'Escape') {
      done = this.cancel();
    } else if (e.key === 'Enter') {
      done = !!mini && click('.mini-confirm .btn');
    } else if (mini) {
      done = false;
    } else if (e.key === ' ') {
      if (g.phase === 'day') g.userPaused = !g.userPaused;
      else g.nightPaused = !g.nightPaused;
      this.lastSig = '';
    } else if (g.phase === 'day' && (e.key === '1' || e.key === '2' || e.key === '3')) {
      g.speed = [1, 2, 4][Number(e.key) - 1];
      g.userPaused = false;
      this.lastSig = '';
    } else done = false;
    if (done) e.preventDefault();
  }

  /** Esc and right click: close the mini-game or dialog, else step back in build mode. */
  private cancel(): boolean {
    if (document.querySelector('.mini')) {
      const b = document.querySelector<HTMLButtonElement>('.mini-bottom > .btn.ghost');
      if (b && !b.disabled) b.click();
      return true;
    }
    if (this.modalEl) {
      this.closeModal();
      return true;
    }
    if (this.buildMode) {
      if (!this.buildMode.cancel()) this.closeBuild();
      return true;
    }
    return false;
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
          class: 'btn small speed', 'data-speed': s, title: s === 0 ? `${t('hud.pause')} (Space)` : `${s}x (${[1, 2, 4].indexOf(s) + 1})`,
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
      this.controls.append(
        h('button', {
          class: 'btn small night-pause', title: t('hud.pause'),
          onclick: () => {
            g.nightPaused = !g.nightPaused;
            this.lastSig = '';
          },
        }, ['❚❚']),
        h('button', { class: 'btn small primary', onclick: () => g.startDay() }, [t('hud.skip')]),
      );
      // with more than one store, switching is a tap away at night
      if (g.state.stores.length > 1) {
        this.controls.append(h('button', { class: 'btn small icon-text', title: t('hud.stores'), onclick: () => this.showStores() }, [
          pixelIcon(ICON_STORE), h('span', { class: 'narrow-hide' }, [t('hud.stores')]),
        ]));
      }
    }
    const muted = audioSettings().muted;
    this.controls.append(
      h('button', {
        class: 'btn small icon', title: t('menu.sound'),
        onclick: () => {
          setAudio({ muted: !audioSettings().muted });
          this.refresh();
        },
      }, [pixelIcon(muted ? ICON_MUTED : ICON_SOUND)]),
      h('button', { class: 'btn small lang', title: t('menu.language'), onclick: () => this.showLanguages() }, [LOCALES.find((l) => l.code === locale())!.label]),
      h('button', { class: 'btn small icon', title: t('hud.menu'), onclick: () => this.showMenu() }, ['☰']),
    );
    const rain = weatherOf(g.state.seed, g.state.day) === 'rain';
    setMusic(g.phase === 'day' ? 'day' : 'night', rain);
    if (!this.buildMode) this.renderBar();
    requestAnimationFrame(() => g.cam.auto && g.fit());
  }

  /** Redraws the bottom bar, e.g. after a red-dot notice has been seen. */
  refreshBar(): void {
    if (!this.buildMode) this.renderBar();
  }

  private renderBar(): void {
    const g = this.game;
    clear(this.bottom);
    const night = g.phase === 'night';
    // At night, opening anything from the bottom bar pauses the countdown.
    const btn = (key: Key, fn: () => void, enabled = true, dot = false) =>
      h('button', {
        class: `btn bar-btn${dot ? ' has-dot' : ''}`, disabled: !enabled,
        onclick: () => {
          if (g.phase === 'night') g.nightPaused = true;
          fn();
        },
      }, [t(key)]);
    if (night) this.bottom.append(btn('bar.build', () => this.openBuild(null)));
    this.bottom.append(
      btn('bar.staff', () => this.openPanel('staff.title', () => staffPanel(g, this))),
      btn('bar.customers', () => this.openPanel('npc.title', () => regularsPanel(g))),
      btn('bar.goals', () => {
        markSeen(g.state, goalNotices(g.state));
        this.refreshBar();
        this.openPanel('goal.title', () => goalsPanel(g));
      }, true, unseen(g.state, goalNotices(g.state))),
      btn('bar.store', () => this.openPanel('store.title', () => storePanel(g, this))),
      btn('bar.achievements', () => this.openPanel('ach.title', () => trophiesPanel(g.state))),
    );
    if (night) {
      this.bottom.append(btn('bar.expand', () => this.openPanel('expand.title', () => growPanel(g, this)), true,
        unseen(g.state, [...expandNotices(g.state), ...chainNotices(g.state)])));
      if (g.state.history.length) this.bottom.append(btn('bar.report', () => this.showReport(g.state.history[g.state.history.length - 1])));
    }
  }

  tick(): void {
    const g = this.game;
    const night = g.phase === 'night';
    const sig = [g.phase, g.state.day, g.timeLabel(), Math.round(g.state.money * 100), g.speed, g.userPaused, night ? Math.ceil(g.nightLeft) : 0, g.paused(), g.nightPaused, g.sim.closing].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.dayEl.textContent = t('hud.day', { n: g.state.day });
    this.renderWeather(night);
    if (night) {
      this.timeEl.textContent = g.paused() ? t('hud.paused') : t('hud.opensIn', { s: Math.max(0, Math.ceil(g.nightLeft)) });
    } else {
      this.timeEl.textContent = g.sim.closing ? `${g.timeLabel()} · ${t('hud.closing')}` : g.timeLabel();
    }
    this.moneyEl.textContent = money(g.state.money);
    this.moneyEl.classList.toggle('neg', g.state.money < 0);
    this.top.classList.toggle('is-night', night);
    (this.nightBar.firstChild as HTMLElement).style.width = `${night ? (g.nightLeft / NIGHT_SECONDS) * 100 : 0}%`;
    const np = this.controls.querySelector<HTMLElement>('.night-pause');
    if (np) {
      np.classList.toggle('active', g.nightPaused);
      np.textContent = g.nightPaused ? '▶' : '❚❚';
      np.title = g.nightPaused ? t('hud.resume') : t('hud.pause');
    }
    this.controls.querySelectorAll<HTMLElement>('.speed').forEach((b) => {
      const s = Number(b.dataset.speed);
      b.classList.toggle('active', s === 0 ? g.userPaused : !g.userPaused && g.speed === s);
    });
  }

  /** Date and weather; at night it previews tomorrow, when the store opens next. */
  private renderWeather(night: boolean): void {
    const g = this.game;
    const day = g.state.day;
    const w = weatherOf(g.state.seed, day);
    const hol = holidayOf(day);
    const d = dateOf(day);
    const sig = `${day}|${night}|${locale()}`;
    if (sig === this.weatherSig) return;
    this.weatherSig = sig;
    const date = t('date.short', { m: t(`month.${d.month}` as Key), d: d.dom });
    clear(this.weatherEl);
    this.weatherEl.append(
      h('span', { class: 'muted' }, [night ? `${t('hud.tomorrow')} ${date}` : date]),
      spriteIcon(`w_${w}`),
      h('span', {}, [t(`weather.${w}` as Key)]),
    );
    if (hol) this.weatherEl.append(h('span', { class: 'holiday' }, [t(`holiday.${hol}` as Key)]));
    this.weatherEl.title = t(`weather.${w}` as Key);
  }

  /** DOM buttons above service bubbles so the manual option is visible and readable in any language. */
  updatePrompts(list: Prompt[]): void {
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.key);
      let item = this.promptEls.get(p.key);
      if (!item) {
        const bar = h('i', { class: 'prompt-bar' });
        const el = h('button', { class: 'prompt' }, [h('span', {}, ['']), bar]) as HTMLButtonElement;
        item = { el, bar };
        this.promptEls.set(p.key, item);
        this.promptLayer.append(el);
      }
      const { el, bar } = item;
      el.onclick = () => this.game.serve(p.action);
      const label = t(`prompt.${p.label}` as Key);
      const span = el.firstChild as HTMLElement;
      if (span.textContent !== label) span.textContent = label;
      const [x, y] = this.game.toClient(p.wx, p.wy);
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      bar.style.width = `${Math.round(p.ratio * 100)}%`;
      el.classList.toggle('waiting', p.ratio > 0);
    }
    for (const [k, item] of this.promptEls) {
      if (!seen.has(k)) {
        item.el.remove();
        this.promptEls.delete(k);
      }
    }
  }

  /** Toasts sharing a key replace each other instead of stacking up. */
  /** A message at the top right; `icon` is a sprite shown before the text, e.g. a trophy for achievements. */
  toast(text: string, key?: string, icon?: string): void {
    const old = key ? ([...this.toasts.children] as HTMLElement[]).find((e) => e.dataset.key === key) : undefined;
    old?.remove();
    const el = h('div', { class: `toast${icon ? ' with-icon' : ''}` }, [icon ? spriteIcon(icon, 1) : null, h('span', {}, [text])]);
    if (key) el.dataset.key = key;
    this.toasts.append(el);
    // a desktop screen has room for a longer stack than a phone
    const max = window.matchMedia('(max-width: 560px)').matches ? 3 : 6;
    while (this.toasts.children.length > max) this.toasts.firstChild!.remove();
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

  /** Pick the store to run tonight; the same as Expand → Chain, without the details. */
  private showStores(): void {
    const g = this.game;
    const s = g.state;
    const list = h('div', { class: 'stack' }, s.stores.map((slot, i) => {
      const here = i === s.active;
      const label = isCafe(slot) ? slotName(s, i) : `${i === 0 ? t('chain.main') : t('chain.branch', { n: i })} · ${slotName(s, i)}`;
      return h('button', {
        class: `btn${here ? ' primary' : ''}`, disabled: here,
        onclick: () => {
          g.switchStore(i);
          this.closeModal();
          this.refresh();
          this.toast(t('chain.switched', { name: slotName(s, i) }));
        },
      }, [here ? `${label} · ${t('chain.current')}` : label]);
    }));
    this.modal(t('hud.stores'), list);
  }

  private showLanguages(): void {
    const langs = h('div', { class: 'stack' }, LOCALES.map((l) =>
      h('button', { class: `btn${l.code === locale() ? ' primary' : ''}`, onclick: () => { setLocale(l.code); this.closeModal(); } }, [l.label]),
    ));
    this.modal(t('menu.language'), langs);
  }

  private audioControls(): HTMLElement {
    const a = audioSettings();
    const range = (key: 'master' | 'music' | 'sfx') => h('input', {
      type: 'range', min: 0, max: 1, step: 0.05, value: String(a[key]),
      oninput: (e: Event) => setAudio({ [key]: Number((e.target as HTMLInputElement).value) }),
    });
    const toggle = (key: 'musicOn' | 'sfxOn', label: Key, vol: 'music' | 'sfx') => h('div', { class: 'row slider' }, [
      h('label', { class: 'row' }, [
        h('input', { type: 'checkbox', checked: a[key], onchange: (e: Event) => setAudio({ [key]: (e.target as HTMLInputElement).checked }) }),
        h('span', {}, [t(label)]),
      ]),
      range(vol),
    ]);
    return h('div', { class: 'stack' }, [
      h('div', { class: 'row slider' }, [
        h('label', { class: 'row' }, [
          h('input', { type: 'checkbox', checked: !a.muted, onchange: (e: Event) => { setAudio({ muted: !(e.target as HTMLInputElement).checked }); this.refresh(); } }),
          h('span', {}, [t('menu.soundOn')]),
        ]),
        range('master'),
      ]),
      toggle('musicOn', 'menu.music', 'music'),
      toggle('sfxOn', 'menu.sfx', 'sfx'),
    ]);
  }

  showAway(a: AwaySummary): void {
    const row = (k: Key, v: string) => h('div', { class: 'kv' }, [h('span', {}, [t(k)]), h('strong', {}, [v])]);
    const body = h('div', { class: 'report' }, [
      h('p', {}, [t('away.intro', { n: a.days })]),
      row('report.revenue', money(a.revenue)),
      row('away.money', money(a.money)),
      row('report.customers', String(a.customers)),
      row('store.reputation', `Lv ${a.rep[0]} → ${a.rep[1]}`),
      row('store.catName', `Lv ${a.cat[0]} → ${a.cat[1]}`),
      row('away.friends', String(a.friends)),
      row('away.gifts', String(a.gifts)),
    ]);
    this.modal(t('away.title'), body, [h('button', { class: 'btn primary', onclick: () => this.closeModal() }, [t('common.continue')])]);
  }

  private showMenu(): void {
    const g = this.game;
    const langs = h('div', { class: 'row wrap' }, LOCALES.map((l) =>
      h('button', { class: `btn${l.code === locale() ? ' primary' : ''}`, onclick: () => { setLocale(l.code); this.showMenu(); } }, [l.label]),
    ));
    const body = h('div', { class: 'stack' }, [
      h('p', { class: 'muted' }, [t('menu.about')]),
      h('h3', {}, [t('menu.language')]),
      langs,
      h('h3', {}, [t('menu.sound')]),
      this.audioControls(),
      h('h3', { class: 'keys-help' }, [t('menu.keys')]),
      h('p', { class: 'muted keys-help' }, [t('menu.keysHelp')]),
      h('h3', {}, [t('menu.data')]),
      h('div', { class: 'row wrap' }, [
        h('button', { class: 'btn primary', onclick: () => void openShare(g, this) }, [t('menu.share')]),
        h('button', { class: 'btn', onclick: () => void this.showExport() }, [t('menu.export')]),
        h('button', { class: 'btn', onclick: () => this.showImport() }, [t('menu.import')]),
      ]),
      h('button', { class: 'btn warn', onclick: () => this.confirm(t('menu.newConfirm'), () => this.game.newGame()) }, [t('menu.newGame')]),
    ]);
    this.modal(t('menu.title'), body);
  }

  private async showExport(): Promise<void> {
    const code = await encodeSave(this.game.state);
    const area = h('textarea', { class: 'code', readOnly: true, rows: 6 }, [code]) as HTMLTextAreaElement;
    const copy = h('button', {
      class: 'btn primary',
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          area.select();
          document.execCommand('copy');
        }
        this.toast(t('save.copied'));
      },
    }, [t('save.copy')]);
    const download = h('button', {
      class: 'btn',
      onclick: () => {
        const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
        const a = h('a', { href: url, download: `grocery-day${this.game.state.day}.txt` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    }, [t('save.download')]);
    this.modal(t('save.exportTitle'), h('div', { class: 'stack' }, [h('p', { class: 'muted' }, [t('save.exportHint')]), area]), [download, copy]);
  }

  private showImport(): void {
    const area = h('textarea', { class: 'code', rows: 6, placeholder: 'GROCERY1.…' }) as HTMLTextAreaElement;
    const file = h('input', {
      type: 'file', accept: '.txt,text/plain', class: 'file',
      onchange: async (e: Event) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (f) area.value = (await f.text()).trim();
      },
    });
    const load = h('button', {
      class: 'btn primary',
      onclick: async () => {
        const s = await decodeSave(area.value);
        if (!s) {
          this.toast(t('save.invalid'));
          return;
        }
        this.confirm(t('save.confirm', { day: s.day, money: money(s.money) }), () => {
          this.game.loadState(s);
          this.toast(t('save.loaded'));
        });
      },
    }, [t('save.load')]);
    this.modal(t('save.importTitle'), h('div', { class: 'stack' }, [
      h('p', { class: 'muted' }, [t('save.importHint')]),
      area,
      h('label', { class: 'row' }, [h('span', {}, [t('save.file')]), file]),
    ]), [load]);
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
