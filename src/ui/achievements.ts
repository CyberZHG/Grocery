import { rect } from '../core/assets';
import { money, t, weight, type Key } from '../i18n';
import { ACH_CATEGORIES, ACH_TOTAL, ACHIEVEMENTS, achValue, categoryOpen, isRevealed, ROMAN, unlockedCount, type AchievementDef } from '../game/achievements';
import type { GameState } from '../game/state';
import { h } from './dom';

const base = import.meta.env.BASE_URL;

export function spriteIcon(name: string, scale = 1): HTMLElement {
  const [x, y, w, hh] = rect(name);
  return h('div', {
    class: 'sprite',
    style: {
      width: `${w * scale}px`, height: `${hh * scale}px`,
      backgroundImage: `url(${base}assets/atlas.png?v=${__BUILD__})`,
      backgroundSize: `${1024 * scale}px auto`,
      backgroundPosition: `-${x * scale}px -${y * scale}px`,
    },
  });
}

export function achName(a: AchievementDef): string {
  const single = ACHIEVEMENTS.filter((x) => x.cat === a.cat).length === 1;
  return single ? t(`ach.cat.${a.cat}` as Key) : `${t(`ach.cat.${a.cat}` as Key)} ${ROMAN[a.tier - 1]}`;
}

export function formatAch(a: AchievementDef, v: number): string {
  if (a.format === 'money') return money(v);
  if (a.format === 'cents') return money(v / 100);
  if (a.format === 'pounds') return weight(v);
  return Math.floor(v).toLocaleString('en-US');
}

export function achDesc(a: AchievementDef): string {
  return t(`ach.desc.${a.cat}` as Key, { v: formatAch(a, a.target) });
}

export function achievementsPanel(s: GameState): HTMLElement {
  const out = h('div', { class: 'stack' }, [
    h('div', { class: 'ach-summary' }, [spriteIcon('trophy', 2), h('strong', {}, [t('ach.count', { n: unlockedCount(s), total: ACH_TOTAL })])]),
  ]);
  for (const cat of ACH_CATEGORIES) {
    const list = ACHIEVEMENTS.filter((a) => a.cat === cat && (!a.secret || s.achievements[a.id]));
    if (!list.length) continue;
    const grid = h('div', { class: 'ach-grid' });
    for (const a of list) {
      if (!isRevealed(s, a)) {
        grid.append(h('div', { class: 'ach hidden' }, [
          spriteIcon('trophy'),
          h('div', { class: 'ach-text' }, [
            h('strong', {}, ['???']),
            h('span', { class: 'muted' }, [t(categoryOpen(s, a.cat) ? 'ach.hiddenTier' : a.cat.startsWith('ch_') ? 'ach.hiddenBranch' : 'ach.hiddenStation')]),
          ]),
        ]));
        continue;
      }
      const done = s.achievements[a.id];
      const v = Math.min(achValue(s, a), a.target);
      grid.append(h('div', { class: `ach${done ? ' done' : ''}` }, [
        spriteIcon('trophy'),
        h('div', { class: 'ach-text' }, [
          h('strong', {}, [achName(a)]),
          h('span', { class: 'muted' }, [achDesc(a)]),
          done
            ? h('span', { class: 'ach-day' }, [t('ach.when', { n: done })])
            : h('div', { class: 'ach-prog' }, [
                h('div', { class: 'meter' }, [h('div', { class: 'fill', style: { width: `${(v / a.target) * 100}%` } })]),
                h('span', { class: 'muted' }, [`${formatAch(a, v)} / ${formatAch(a, a.target)}`]),
              ]),
        ]),
      ]));
    }
    out.append(h('h3', {}, [categoryOpen(s, cat) ? t(`ach.cat.${cat}` as Key) : '???']), grid);
  }
  return out;
}
