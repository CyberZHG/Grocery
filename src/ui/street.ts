import { locale, money, t, type Key } from '../i18n';
import type { Game } from '../game/game';
import { saveGame } from '../game/state';
import { BUILDING_REGION, BUILDINGS, levelCost, MAX_BUILDING_LEVEL, type BuildingId } from '../game/street';
import { spriteIcon } from './achievements';
import type { UI } from './app';
import { chainPanel } from './chain';
import { h } from './dom';
import { expandPanel } from './panels';

let selected = 0;

/** What a building does at a given level, in words. */
export function buildingEffect(id: BuildingId, level: number): string {
  const l = level;
  const v: Record<BuildingId, [number, number]> = {
    park: [20 * l, 2 * l], bus: [6 * l, 0], apartments: [10 * l, 0], school: [15 * l, 15 * l], office: [20 * l, 10 * l],
    clinic: [20 * l, 15 * l], arcade: [5 * l, 4 * l], parking: [6 * l, 0], gym: [12 * l, 0], tower: [10 * l, 3 * l],
    plaza: [20 * l, 0], market: [20 * l, 10 * l], bathhouse: [12 * l, 30 * l], netcafe: [15 * l, 30 * l],
  };
  const [a, b] = v[id];
  return t(`bld.${id}.fx` as Key, { a, b });
}

/** Lots around the store: build, upgrade or clear them. Changes take effect from the next day. */
export function streetPanel(g: Game, ui: UI): HTMLElement {
  const s = g.state;
  const street = s.street;
  const cell = (i: number) => {
    const lot = street[i];
    return h('button', { class: `lot${selected === i ? ' active' : ''}`, onclick: () => { selected = i; ui.rerenderPanel?.(); } }, [
      spriteIcon(lot ? `bld_${lot.id}` : 'bld_empty', 1.25),
      h('span', { class: 'lot-lv' }, [lot ? '★'.repeat(lot.level) : '']),
    ]);
  };
  const map = h('div', { class: 'street' }, [
    cell(0), cell(1), h('div', { class: 'lot store' }, [spriteIcon('bld_store', 1.25), h('span', { class: 'lot-lv' }, [t('street.you')])]), cell(2), cell(3),
    h('div', { class: 'road' }),
    cell(4), cell(5), cell(6), cell(7), cell(8),
  ]);
  const detail = h('div', { class: 'stack' });
  const lot = street[selected];
  if (lot) {
    const next = lot.level < MAX_BUILDING_LEVEL ? levelCost(lot.id, lot.level + 1) : 0;
    detail.append(
      h('h3', {}, [`${t(`bld.${lot.id}.name` as Key)} ${'★'.repeat(lot.level)}`]),
      h('p', {}, [buildingEffect(lot.id, lot.level)]),
      next
        ? h('button', {
            class: 'btn primary', disabled: s.money < next,
            onclick: () => {
              s.money -= next;
              lot.level += 1;
              saveGame(s);
              g.checkAchievements();
              ui.refresh();
              ui.rerenderPanel?.();
            },
          }, [t('street.upgrade', { v: money(next), fx: buildingEffect(lot.id, lot.level + 1) })])
        : h('p', { class: 'muted' }, [t('street.max')]),
      h('button', {
        class: 'btn small warn',
        onclick: () => ui.confirm(t('street.clearConfirm', { name: t(`bld.${lot.id}.name` as Key) }), () => {
          street[selected] = null;
          saveGame(s);
          ui.rerenderPanel?.();
        }),
      }, [t('street.clear')]),
    );
  } else {
    const used = new Set(street.filter((x) => x).map((x) => x!.id));
    detail.append(h('h3', {}, [t('street.empty')]));
    const opts = h('div', { class: 'bld-opts' });
    for (const id of BUILDINGS) {
      if (used.has(id) || (BUILDING_REGION[id] && BUILDING_REGION[id] !== locale())) continue;
      const cost = levelCost(id, 1);
      opts.append(h('button', {
        class: 'bld-opt', disabled: s.money < cost,
        onclick: () => {
          s.money -= cost;
          street[selected] = { id, level: 1 };
          saveGame(s);
          g.checkAchievements();
          ui.refresh();
          ui.rerenderPanel?.();
        },
      }, [
        spriteIcon(`bld_${id}`, 1),
        h('div', { class: 'stack' }, [
          h('strong', {}, [`${t(`bld.${id}.name` as Key)} · ${money(cost)}`]),
          h('span', { class: 'muted' }, [buildingEffect(id, 1)]),
        ]),
      ]));
    }
    detail.append(opts);
  }
  return h('div', { class: 'stack' }, [h('p', { class: 'muted' }, [t('street.hint')]), map, detail]);
}

let growTab: 'expand' | 'street' | 'chain' = 'expand';

/** The Expand panel: store size, the street outside, and the chain. */
export function growPanel(g: Game, ui: UI): HTMLElement {
  const body = h('div');
  const tabs = h('div', { class: 'tabs' });
  const show = () => {
    tabs.replaceChildren(...(['expand', 'chain', 'street'] as const).map((k) =>
      h('button', { class: `btn small${growTab === k ? ' active' : ''}`, onclick: () => ((growTab = k), show()) }, [t(`grow.${k}` as Key)])));
    body.replaceChildren(growTab === 'street' ? streetPanel(g, ui) : growTab === 'chain' ? chainPanel(g, ui) : expandPanel(g, ui));
  };
  show();
  return h('div', { class: 'stack' }, [tabs, body]);
}
