import { t, type Key } from '../i18n';
import type { GameState } from './state';

export function storeName(s: GameState): string {
  return slotName(s, s.active);
}

/** A store's own name, or its challenge name for branches that haven't been renamed. */
export function slotName(s: GameState, i: number): string {
  const name = i === s.active ? s.storeName : s.stores[i].saved?.storeName ?? '';
  if (name.trim()) return name.trim();
  return i === 0 ? t('store.defaultName') : t(`challenge.${s.stores[i].challenge}.name` as Key);
}

export function catName(s: GameState): string {
  return s.catName.trim() || t('store.catDefault');
}
