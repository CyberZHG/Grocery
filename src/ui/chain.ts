import { money, t, type Key } from '../i18n';
import {
  BRANCH_COST, BRANCH_REP, branchBlocker, CHALLENGE_BY_ID, CHALLENGES, doneCount, MANAGER_SHARE, progressOf, STORE_BONUS, storeIncome,
} from '../game/chain';
import type { Game } from '../game/game';
import { slotName } from '../game/names';
import type { UI } from './app';
import { h } from './dom';

function goalText(g: Game, i: number): string {
  const def = CHALLENGE_BY_ID.get(g.state.stores[i].challenge)!;
  return t(`challenge.${def.id}.goal` as Key, { n: def.target.toLocaleString('en-US'), v: money(def.target), rep: BRANCH_REP });
}

function progressLabel(g: Game, i: number): string {
  const def = CHALLENGE_BY_ID.get(g.state.stores[i].challenge)!;
  const p = progressOf(g.state, i);
  if (def.goal === 'expand') return `${Math.round(p.ratio * 100)}%`;
  const f = (n: number) => (def.goal === 'revenue' ? money(n) : Math.floor(n).toLocaleString('en-US'));
  return `${f(Math.min(p.value, p.target))} / ${f(p.target)}`;
}

/** One store's challenge: restrictions, goal with progress, and reward. */
export function challengeCard(g: Game, i: number): HTMLElement {
  const slot = g.state.stores[i];
  const id = slot.challenge;
  const p = progressOf(g.state, i);
  return h('div', { class: `challenge${slot.done ? ' done' : ''}` }, [
    id !== 'main'
      ? h('div', { class: 'kv' }, [
          h('span', {}, [t('chain.rules')]),
          h('span', { class: slot.done ? 'struck' : '' }, [t(`challenge.${id}.rules` as Key)]),
        ])
      : null,
    h('div', { class: 'kv' }, [
      h('span', {}, [t('chain.peaks')]),
      h('span', {}, [CHALLENGE_BY_ID.get(id)!.peaks.map(([m]) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`).join(' · ')]),
    ]),
    h('div', { class: 'kv' }, [h('span', {}, [t('chain.goal')]), h('span', {}, [goalText(g, i)])]),
    h('div', { class: 'ach-prog' }, [
      h('div', { class: 'meter' }, [h('div', { class: 'fill', style: { width: `${p.ratio * 100}%` } })]),
      h('span', { class: 'muted' }, [slot.done ? t('chain.done') : progressLabel(g, i)]),
    ]),
    h('div', { class: 'kv' }, [
      h('span', {}, [t('chain.reward')]),
      h('span', {}, [`${t('chain.bonus', { p: Math.round(STORE_BONUS * 100) })} ${t(`challenge.${id}.reward` as Key)}`]),
    ]),
  ]);
}

export function chainPanel(g: Game, ui: UI): HTMLElement {
  const s = g.state;
  const night = g.phase === 'night';
  const out = h('div', { class: 'stack' }, [
    h('h3', {}, [t('chain.title'), h('span', { class: 'col-done' }, [t('chain.count', { n: doneCount(s), total: CHALLENGES.length })])]),
    h('p', { class: 'muted' }, [t('chain.hint', { p: Math.round(STORE_BONUS * 100), s: Math.round(MANAGER_SHARE * 100) })]),
  ]);
  s.stores.forEach((slot, i) => {
    const here = i === s.active;
    const head = h('div', { class: 'row chain-head' }, [
      h('strong', {}, [`${i === 0 ? t('chain.main') : t('chain.branch', { n: i })} · ${slotName(s, i)}`]),
      here
        ? h('span', { class: 'tag' }, [t('chain.current')])
        : h('button', {
            class: 'btn small', disabled: !night,
            onclick: () => {
              g.switchStore(i);
              ui.closeModal();
              ui.refresh();
              ui.toast(t('chain.switched', { name: slotName(g.state, i) }));
            },
          }, [t('chain.switch')]),
    ]);
    const income = here ? null : h('div', { class: 'muted' }, [t('chain.income', { v: money(storeIncome(slot)) })]);
    out.append(h('div', { class: 'card stack' }, [head, income, challengeCard(g, i)]));
  });
  const k = s.stores.length;
  const block = branchBlocker(s);
  if (block === 'max') {
    out.append(h('p', { class: 'muted' }, [t('chain.max')]));
  } else {
    const next = CHALLENGES[k];
    out.append(
      h('h3', {}, [t('chain.next', { name: t(`challenge.${next.id}.name` as Key) })]),
      h('p', { class: 'muted' }, [t(`challenge.${next.id}.rules` as Key)]),
      h('p', { class: 'muted' }, [t('chain.needs', { n: k, done: doneCount(s), v: money(BRANCH_COST[k - 1]) })]),
      h('button', {
        class: 'btn primary', disabled: !!block || !night,
        onclick: () => ui.confirm(t('chain.confirm', { name: t(`challenge.${next.id}.name` as Key) }), () => {
          g.openBranch();
          ui.closeModal();
          ui.refresh();
          ui.toast(t('chain.opened', { name: slotName(g.state, g.state.active) }));
        }),
      }, [t('chain.open', { v: money(BRANCH_COST[k - 1]) })]),
    );
  }
  if (!night) out.append(h('p', { class: 'muted' }, [t('common.nightOnly')]));
  return out;
}
