import { t } from '../i18n';
import type { GameState } from './state';

export function storeName(s: GameState): string {
  return s.storeName.trim() || t('store.defaultName');
}

export function catName(s: GameState): string {
  return s.catName.trim() || t('store.catDefault');
}
