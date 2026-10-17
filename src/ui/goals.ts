import { money, t, type Key } from '../i18n';
import type { Game } from '../game/game';
import type { Goal } from '../game/goals';
import type { DayEvent } from '../game/sim';
import { slotName } from '../game/names';
import { challengeCard } from './chain';
import { h } from './dom';

export function goalText(g: Goal): string {
  return t(`goal.${g.kind}` as Key, { n: g.target, cat: g.cat ? t(`cat.${g.cat}` as Key) : '' });
}

export function eventText(e: DayEvent): string {
  if (e.kind === 'late') return t('event.late', { cat: t(`cat.${e.cat}` as Key) });
  return t(`event.${e.kind}` as Key);
}

function goalRow(g: Goal): HTMLElement {
  return h('div', { class: `goal${g.done ? ' done' : ''}` }, [
    h('span', { class: 'goal-check' }, [g.done ? '✓' : '']),
    h('div', { class: 'goal-text' }, [
      h('span', {}, [goalText(g)]),
      h('div', { class: 'meter' }, [h('div', { class: 'fill', style: { width: `${(g.progress / g.target) * 100}%` } })]),
    ]),
    h('span', { class: 'goal-num' }, [`${g.progress}/${g.target}`]),
    h('span', { class: 'goal-reward' }, [money(g.reward)]),
  ]);
}

export function goalsPanel(g: Game): HTMLElement {
  const s = g.state.goals;
  return h('div', { class: 'stack' }, [
    h('h3', {}, [t('chain.thisStore', { name: slotName(g.state, g.state.active) })]),
    h('div', { class: 'card' }, [challengeCard(g, g.state.active)]),
    h('p', { class: 'muted' }, [t('goal.hint')]),
    h('h3', {}, [t('goal.daily')]),
    h('div', { class: 'card' }, s.daily.map(goalRow)),
    h('h3', {}, [t('goal.weekly')]),
    h('div', { class: 'card' }, s.weekly.map(goalRow)),
    h('p', { class: 'muted' }, [t('goal.completed', { n: s.completed })]),
  ]);
}
