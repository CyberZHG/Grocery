export interface Prefs {
  /** stop the night countdown at the start of every night */
  nightPause: boolean;
  /** last sort picked in the product picker and the regulars list */
  productSort: string;
  npcSort: string;
}

const KEY = 'grocery.prefs';
let prefs: Prefs = { nightPause: false, productSort: 'default', npcSort: 'affinity' };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) prefs = { ...prefs, ...JSON.parse(raw) };
} catch {
  // storage unavailable
}

export function getPrefs(): Prefs {
  return { ...prefs };
}

export function setPrefs(patch: Partial<Prefs>): void {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable
  }
}
