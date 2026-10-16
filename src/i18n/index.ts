import { en, type Key } from './locales/en';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import enNames from './generated/en.json';
import zhNames from './generated/zh.json';
import jaNames from './generated/ja.json';
import koNames from './generated/ko.json';

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
  return LOCALES[0];
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

export function money(v: number): string {
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
