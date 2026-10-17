import { money, staffName, t, type Key } from '../i18n';
import {
  BRANCH_COST, BRANCH_REP, branchBlocker, CHALLENGE_BY_ID, CHALLENGES, doneCount, goalOf, MANAGER_SHARE, managerShare, progressOf, STORE_BONUS, startNextTier, storeIncome,
} from '../game/chain';
import { saveGame, type StaffState } from '../game/state';
import type { Game } from '../game/game';
import { slotName } from '../game/names';
import type { UI } from './app';
import { h } from './dom';

function goalText(g: Game, i: number): string {
  const slot = g.state.stores[i];
  const { target } = goalOf(slot);
  const key = slot.challenge === 'main' && slot.tier ? 'challenge.main.goalTier' : `challenge.${slot.challenge}.goal`;
  return t(key as Key, { n: target.toLocaleString('en-US'), v: money(target), rep: BRANCH_REP });
}

function progressLabel(g: Game, i: number): string {
  const def = goalOf(g.state.stores[i]);
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
  const tier = slot.tier ?? 0;
  const rules = id !== 'main' ? t(`challenge.${id}.rules` as Key) : tier ? t('challenge.main.rulesTier', { r: (1 + 0.25 * tier).toFixed(2) }) : null;
  return h('div', { class: `challenge${slot.done ? ' done' : ''}` }, [
    tier ? h('span', { class: 'tag' }, [t('chain.tier', { n: tier + 1 })]) : null,
    rules
      ? h('div', { class: 'kv' }, [
          h('span', {}, [t('chain.rules')]),
          h('span', { class: slot.done ? 'struck' : '' }, [tier && id !== 'main' ? `${rules} ${t('chain.harder')}` : rules]),
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

/** Pick one of the store's own staff to run it while you're elsewhere. */
function managerRow(g: Game, i: number): HTMLElement {
  const s = g.state;
  const slot = s.stores[i];
  const staff: StaffState[] = i === s.active ? s.staff : slot.saved?.staff ?? [];
  const share = Math.round(managerShare(slot, staff) * 100);
  const sel = h('select', {
    class: 'select',
    onchange: (e: Event) => {
      const v = (e.target as HTMLSelectElement).value;
      slot.manager = v ? Number(v) : null;
      saveGame(s);
      hint.textContent = t('chain.managerHint', { p: Math.round(managerShare(slot, staff) * 100) });
    },
  }, [
    h('option', { value: '', selected: slot.manager == null }, [t('chain.noManager')]),
    ...staff.map((m) => h('option', { value: String(m.id), selected: slot.manager === m.id }, [staffName(m.name)])),
  ]);
  const hint = h('span', { class: 'muted' }, [t('chain.managerHint', { p: share })]);
  return h('div', { class: 'stack' }, [h('label', { class: 'row' }, [h('span', {}, [t('chain.manager')]), sel]), hint]);
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
    const next = slot.done
      ? h('button', {
          class: 'btn small', disabled: !night,
          onclick: () => {
            startNextTier(g.state, i);
            saveGame(g.state);
            if (i === g.state.active) g.rebuild();
            ui.rerenderPanel?.();
          },
        }, [t('chain.nextTier', { n: (slot.tier ?? 0) + 2 })])
      : null;
    out.append(h('div', { class: 'card stack' }, [head, income, challengeCard(g, i), managerRow(g, i), next, next ? h('span', { class: 'muted' }, [t('chain.nextTierHint')]) : null]));
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
