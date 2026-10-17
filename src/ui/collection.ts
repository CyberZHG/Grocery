import { locale, productName, t, type Key } from '../i18n';
import { CATEGORIES, offeredIn, PRODUCT_BY_ID, PRODUCTS } from '../game/defs';
import { COLLECTION_BONUS, collectionCount, isUnlocked, unlockOrder } from '../game/progress';
import type { GameState } from '../game/state';
import { achievementsPanel } from './achievements';
import { productIcon } from './app';
import { h } from './dom';

let tab: 'ach' | 'col' = 'ach';

export function trophiesPanel(s: GameState): HTMLElement {
  const body = h('div');
  const tabs = h('div', { class: 'tabs' });
  const show = () => {
    tabs.replaceChildren(
      h('button', { class: `btn small${tab === 'ach' ? ' active' : ''}`, onclick: () => ((tab = 'ach'), show()) }, [t('ach.title')]),
      h('button', { class: `btn small${tab === 'col' ? ' active' : ''}`, onclick: () => ((tab = 'col'), show()) }, [t('col.tab')]),
    );
    body.replaceChildren(tab === 'ach' ? achievementsPanel(s) : collectionPanel(s));
  };
  show();
  return h('div', { class: 'stack' }, [tabs, body]);
}

function collectionPanel(s: GameState): HTMLElement {
  // regional specialties of other languages only show once they've been sold
  const lang = locale();
  const shown = PRODUCTS.filter((p) => offeredIn(p, lang) || s.products[p.id]?.sold > 0);
  // this language's specialties sit in the category grids; ones sold in another language are listed apart
  const regional = shown.filter((p) => p.region && p.region !== lang);
  const total = shown.filter((p) => s.products[p.id]?.sold > 0).length;
  const pct = Math.round(COLLECTION_BONUS * 100);
  const info = h('div', { class: 'col-info muted' }, [t('col.hint', { p: pct })]);
  const out = h('div', { class: 'stack' }, [
    h('div', { class: 'ach-summary' }, [h('strong', {}, [t('col.count', { n: total, total: shown.length })])]),
    info,
  ]);
  for (const cat of CATEGORIES) {
    const ids = unlockOrder(cat);
    const done = s.collections.includes(cat);
    const grid = h('div', { class: 'col-grid' });
    for (const id of ids) {
      const p = PRODUCT_BY_ID.get(id)!;
      const sold = s.products[id]?.sold ?? 0;
      const open = isUnlocked(id, s.products);
      const state = sold > 0 ? 'sold' : open ? 'open' : 'locked';
      const text = sold > 0 ? t('col.sold', { name: productName(id), n: sold.toLocaleString('en-US') }) : open ? t('col.notYet', { name: productName(id) }) : t('col.locked');
      grid.append(h('button', {
        class: `col-cell ${state}`, title: text,
        onclick: () => {
          info.textContent = text;
          info.classList.remove('muted');
        },
      }, [productIcon(p.index), h('span', {}, [sold > 0 ? short(sold) : ''])]));
    }
    out.append(
      h('h3', {}, [
        `${t(`cat.${cat}` as Key)} ${collectionCount(cat, s.products)} / ${ids.length}`,
        done ? h('span', { class: 'col-done' }, [t('col.bonus', { p: pct })]) : null,
      ]),
      grid,
    );
  }
  if (regional.length) {
    const grid = h('div', { class: 'col-grid' });
    for (const p of regional) {
      const sold = s.products[p.id]?.sold ?? 0;
      const text = sold > 0 ? t('col.sold', { name: productName(p.id), n: sold.toLocaleString('en-US') }) : t('col.notYet', { name: productName(p.id) });
      grid.append(h('button', {
        class: `col-cell ${sold > 0 ? 'sold' : 'open'}`, title: text,
        onclick: () => {
          info.textContent = text;
          info.classList.remove('muted');
        },
      }, [productIcon(p.index), h('span', {}, [sold > 0 ? short(sold) : ''])]));
    }
    out.append(h('h3', {}, [t('col.regional')]), h('p', { class: 'muted' }, [t('col.regionalHint')]), grid);
  }
  return out;
}

function short(n: number): string {
  if (n >= 1e6) return `${Math.floor(n / 1e5) / 10}M`;
  if (n >= 1e4) return `${Math.floor(n / 1e3)}k`;
  return `${n}`;
}
