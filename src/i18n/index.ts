import { en, type Key } from './locales/en';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import enNames from './generated/en.json';
import zhNames from './generated/zh.json';
import jaNames from './generated/ja.json';
import koNames from './generated/ko.json';
import { CASH, CASH_OF_LOCALE, type CashId, type CashSet } from '../game/rules';

export type { Key };

interface Names {
  product: Record<string, string>;
  npc: Record<string, string>;
  staff: Record<string, string>;
}

interface Locale {
  code: string;
  label: string;
  ui: Record<Key, string>;
  names: Names;
}

/** To add a language: create locales/<code>.ts typed as Record<Key, string>, generate names, and register it here. */
export const LOCALES: Locale[] = [
  { code: 'en', label: 'English', ui: en, names: enNames },
  { code: 'zh', label: '中文', ui: zh, names: zhNames },
  { code: 'ja', label: '日本語', ui: ja, names: jaNames },
  { code: 'ko', label: '한국어', ui: ko, names: koNames },
];

const STORAGE_KEY = 'grocery.locale';
let current: Locale = LOCALES[0];
const listeners: (() => void)[] = [];

function initial(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const found = LOCALES.find((l) => l.code === saved);
    if (found) return found;
  } catch {
    // storage unavailable
  }
  return fromSystem() ?? LOCALES[0];
}

/** First visit: the first of the system's preferred languages we support, e.g. zh-TW → zh, ja-JP → ja. */
function fromSystem(): Locale | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of prefs) {
    const code = tag?.toLowerCase().split('-')[0];
    const found = LOCALES.find((l) => l.code === code);
    if (found) return found;
  }
  return undefined;
}
current = initial();

export function locale(): string {
  return current.code;
}

export function setLocale(code: string): void {
  const found = LOCALES.find((l) => l.code === code);
  if (!found) return;
  current = found;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage unavailable
  }
  document.documentElement.lang = code;
  for (const l of listeners) l();
}

export function onLocaleChange(fn: () => void): void {
  listeners.push(fn);
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = current.ui[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function productName(id: string): string {
  return current.names.product[id] ?? enNames.product[id as keyof typeof enNames.product] ?? id;
}

export function npcName(id: string): string {
  return current.names.npc[id] ?? id;
}

export function staffName(index: number): string {
  return current.names.staff[`s${index}`] ?? `#${index}`;
}

/** Symbol, display multiplier and decimals per language. No exchange rates: a price is the same number, yen ×100 and won ×1000. */
const MONEY: Record<string, [string, number, number]> = { en: ['$', 1, 2], zh: ['¥', 1, 2], ja: ['¥', 100, 0], ko: ['₩', 1000, 0] };

export function money(v: number): string {
  const sign = v < 0 ? '-' : '';
  const [sym, k, d] = MONEY[current.code] ?? MONEY.en;
  return `${sign}${sym}${(Math.abs(v) * k).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** How deli food is weighed: by the pound, the jin (500 g), the gram, or the geun (600 g for meat). Weights are kept in pounds. */
const WEIGHT: Record<string, { label: string; lb: number; digits: number; orders: number[] }> = {
  en: { label: 'lb', lb: 1, digits: 2, orders: [0.25, 0.5, 0.5, 0.75, 1] },
  zh: { label: '斤', lb: 1.10231, digits: 2, orders: [0.2, 0.3, 0.5, 0.5, 1] },
  ja: { label: 'g', lb: 1 / 453.592, digits: 0, orders: [100, 200, 200, 300, 400] },
  ko: { label: '근', lb: 1.32277, digits: 2, orders: [0.25, 0.5, 0.5, 1] },
};

function weightUnit() {
  return WEIGHT[current.code] ?? WEIGHT.en;
}

/** A weight in pounds, shown in the local unit. */
export function weight(lb: number, withUnit = true): string {
  const u = weightUnit();
  const v = (lb / u.lb).toFixed(u.digits);
  return withUnit ? `${v} ${u.label}` : v;
}

/** Round amounts people ask for at the deli counter, in pounds. */
export function deliOrderSizes(): number[] {
  const u = weightUnit();
  return u.orders.map((v) => v * u.lb);
}

/** Notes and coins people pay with in the current language. */
export function cashSet(): CashSet {
  return CASH[CASH_OF_LOCALE[current.code] ?? 'usd'];
}

/** Face value of a note or coin, as printed on the drawer. */
export function cashLabel(cash: CashId, v: number): string {
  if (cash === 'usd') return v >= 100 ? `$${v / 100}` : `${v}¢`;
  if (cash === 'cny') return `¥${v / 100}`;
  if (cash === 'jpy') return `¥${v}`;
  return `₩${v * 10}`;
}
