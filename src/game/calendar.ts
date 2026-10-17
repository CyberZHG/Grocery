import { Rng } from '../core/rng';
import { locale } from '../i18n';
import { PRODUCT_BY_ID, type Category, type StationKind } from './defs';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'hot';
export type HolidayId =
  | 'newyear' | 'superbowl' | 'valentine' | 'july4' | 'halloween' | 'thanksgiving' | 'christmas'
  | 'cn_newyear' | 'spring' | 'lantern' | 'dragonboat' | 'midautumn' | 'national' | 'singles'
  | 'shogatsu' | 'whiteday' | 'goldenweek' | 'obon'
  | 'seollal' | 'blackday' | 'chuseok' | 'pepero';

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** Day 1 is March 1st, a Saturday. */
const START_DOY = 59;
const START_WEEKDAY = 6;

export interface CalDate {
  month: number;
  dom: number;
  weekday: number;
  season: Season;
}

export function dateOf(day: number): CalDate {
  let doy = (START_DOY + day - 1) % 365;
  let month = 0;
  while (doy >= MONTH_DAYS[month]) {
    doy -= MONTH_DAYS[month];
    month += 1;
  }
  const weekday = (START_WEEKDAY + day - 1) % 7;
  const season: Season = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  return { month: month + 1, dom: doy + 1, weekday, season };
}

/** n-th weekday (0 = Sunday) of a month, e.g. 4th Thursday of November. */
function nthWeekday(d: CalDate, n: number, weekday: number): boolean {
  return d.weekday === weekday && Math.ceil(d.dom / 7) === n;
}

type Mult = Partial<Record<Category, number>>;

interface HolidayDef {
  id: HolidayId;
  on: (d: CalDate) => boolean;
  traffic: number;
  cat: Mult;
  items: Record<string, number>;
  bakery?: number;
}

const on = (month: number, ...doms: number[]) => (d: CalDate) => d.month === month && doms.includes(d.dom);
/** Lunar dates are pinned to a typical solar day, since the game's year doesn't change. */
const lunarNewYear = (d: CalDate) => (d.month === 1 && d.dom === 31) || (d.month === 2 && d.dom <= 2);

const VALENTINE: HolidayDef = { id: 'valentine', on: on(2, 14), traffic: 1.1, cat: { candy: 2.2, bakery: 1.3 }, items: { chocolate_bar: 2.5, dark_chocolate: 2.5, strawberries: 2.5, peanut_butter_cups: 2 } };
const WHITEDAY: HolidayDef = { id: 'whiteday', on: on(3, 14), traffic: 1.1, cat: { candy: 2, bakery: 1.3 }, items: { marshmallows: 2.5, sandwich_cookies: 2, choc_chip_cookies: 2 } };
const HALLOWEEN: HolidayDef = { id: 'halloween', on: on(10, 31), traffic: 1.15, cat: { candy: 3 }, items: { popcorn: 2, marshmallows: 2 } };
const CHRISTMAS: HolidayDef = {
  id: 'christmas', on: on(12, 24, 25), traffic: 1.3, cat: { bakery: 1.8, candy: 1.6, dairy: 1.3, beverages: 1.3 },
  items: { sandwich_cookies: 2.5, choc_chip_cookies: 2.5, eggs_dozen: 1.8, milk_whole: 1.6, croissants: 2 }, bakery: 1.5,
};

/** Each language plays with the holidays its players know. */
export const HOLIDAYS: Record<string, HolidayDef[]> = {
  en: [
    { id: 'newyear', on: on(1, 1), traffic: 1.1, cat: { beverages: 1.5, snacks: 1.4 }, items: { cola_2l: 2, orange_soda_2l: 2, sparkling_water: 1.6 } },
    { id: 'superbowl', on: (d) => d.month === 2 && nthWeekday(d, 2, 0), traffic: 1.2, cat: { snacks: 2, beverages: 1.8 }, items: { chicken_wings: 2.5, tortilla_chips: 2.5, salsa: 2.5, potato_chips: 2, cheese_puffs: 2 } },
    VALENTINE,
    { id: 'july4', on: on(7, 4), traffic: 1.25, cat: { meat: 1.6, beverages: 1.6, snacks: 1.4 }, items: { hot_dogs: 3, hot_dog_buns: 3, hamburger_buns: 3, ground_beef: 2.5, watermelon: 3 } },
    HALLOWEEN,
    { id: 'thanksgiving', on: (d) => d.month === 11 && nthWeekday(d, 4, 4), traffic: 1.3, cat: { produce: 1.4, bakery: 1.5, pantry: 1.4, meat: 1.3 }, items: { sweet_potato: 3, turkey_slices: 2.5, rotisserie_chicken: 2.5, flour: 2, sugar: 2 }, bakery: 1.5 },
    CHRISTMAS,
  ],
  zh: [
    { id: 'cn_newyear', on: on(1, 1), traffic: 1.1, cat: { beverages: 1.4, snacks: 1.3 }, items: {} },
    { id: 'spring', on: lunarNewYear, traffic: 1.35, cat: { snacks: 1.6, candy: 1.8, beverages: 1.5, meat: 1.4, frozen: 1.4 }, items: { dumplings: 3, guodanpi: 2.5, tanghulu: 2.5, tangyuan: 2 } },
    VALENTINE,
    { id: 'lantern', on: on(2, 15), traffic: 1.15, cat: { frozen: 1.3, candy: 1.3 }, items: { tangyuan: 5, tanghulu: 2 } },
    { id: 'dragonboat', on: on(6, 10), traffic: 1.15, cat: { frozen: 1.3 }, items: { zongzi: 5, eggs_dozen: 1.5 } },
    { id: 'midautumn', on: on(9, 20), traffic: 1.25, cat: { bakery: 1.6, produce: 1.3 }, items: { mooncake: 6, grapes_red: 1.8 }, bakery: 1.3 },
    { id: 'national', on: on(10, 1, 2, 3), traffic: 1.3, cat: { snacks: 1.5, beverages: 1.5 }, items: { latiao: 2, soy_milk: 1.5 } },
    { id: 'singles', on: on(11, 11), traffic: 1.15, cat: { household: 1.5, personal: 1.5, snacks: 1.3 }, items: {} },
    CHRISTMAS,
  ],
  ja: [
    { id: 'shogatsu', on: on(1, 1, 2, 3), traffic: 1.2, cat: { beverages: 1.4, pantry: 1.3, snacks: 1.3 }, items: { miso: 2, onigiri: 2 } },
    VALENTINE,
    WHITEDAY,
    { id: 'goldenweek', on: on(5, 3, 4, 5), traffic: 1.25, cat: { snacks: 1.4, beverages: 1.5 }, items: { onigiri: 2.5, ramune: 2, dango: 2 } },
    { id: 'obon', on: on(8, 13, 14, 15), traffic: 1.2, cat: { beverages: 1.4, produce: 1.3 }, items: { ramune: 2.5, watermelon: 2.5 } },
    HALLOWEEN,
    { ...CHRISTMAS, cat: { bakery: 2, meat: 1.6, candy: 1.4 }, items: { rotisserie_chicken: 4, chicken_wings: 2.5, strawberries: 2 }, bakery: 1.6 },
  ],
  ko: [
    { id: 'seollal', on: lunarNewYear, traffic: 1.3, cat: { meat: 1.5, produce: 1.4, beverages: 1.3 }, items: { sikhye: 3, yakgwa: 3, dumplings: 2.5 } },
    VALENTINE,
    WHITEDAY,
    { id: 'blackday', on: on(4, 14), traffic: 1.05, cat: { pantry: 1.3 }, items: { ramyeon: 2.5, instant_ramen: 2 } },
    { id: 'chuseok', on: on(9, 19, 20, 21), traffic: 1.3, cat: { meat: 1.5, produce: 1.5 }, items: { sikhye: 3, yakgwa: 3 } },
    { id: 'pepero', on: on(11, 11), traffic: 1.15, cat: { candy: 2.5, snacks: 1.4 }, items: { pretzels: 2.5, chocolate_bar: 2 } },
    CHRISTMAS,
  ],
};

function holidays(): HolidayDef[] {
  return HOLIDAYS[locale()] ?? HOLIDAYS.en;
}

function holidayDef(day: number): HolidayDef | null {
  const d = dateOf(day);
  return holidays().find((h) => h.on(d)) ?? null;
}

export function holidayOf(day: number): HolidayId | null {
  return holidayDef(day)?.id ?? null;
}

/** The next holiday within `within` days after `day`, if any. */
export function upcomingHoliday(day: number, within: number): { id: HolidayId; inDays: number } | null {
  for (let i = 1; i <= within; i++) {
    const h = holidayOf(day + i);
    if (h) return { id: h, inDays: i };
  }
  return null;
}

const WEATHER_ODDS: Record<Season, [Weather, number][]> = {
  spring: [['sunny', 0.45], ['cloudy', 0.3], ['rain', 0.25]],
  summer: [['hot', 0.35], ['sunny', 0.4], ['rain', 0.15], ['cloudy', 0.1]],
  autumn: [['sunny', 0.4], ['cloudy', 0.3], ['rain', 0.3]],
  winter: [['snow', 0.3], ['cloudy', 0.35], ['sunny', 0.25], ['rain', 0.1]],
};

/** Deterministic per save and day, so the forecast shown at night is what actually happens. */
export function weatherOf(seed: number, day: number): Weather {
  const rng = new Rng((seed * 31 + day * 7577) | 0);
  rng.next();
  const odds = WEATHER_ODDS[dateOf(day).season];
  let r = rng.next();
  for (const [w, p] of odds) {
    r -= p;
    if (r <= 0) return w;
  }
  return odds[0][0];
}

const TRAFFIC: Record<Weather, number> = { sunny: 1.05, cloudy: 1, rain: 0.85, snow: 0.75, hot: 0.95 };
export function trafficMult(seed: number, day: number): number {
  return TRAFFIC[weatherOf(seed, day)] * (holidayDef(day)?.traffic ?? 1);
}

const SEASON_CAT: Record<Season, Mult> = {
  spring: { produce: 1.1 },
  summer: { beverages: 1.2, frozen: 1.3, produce: 1.1 },
  autumn: { bakery: 1.1, pantry: 1.1 },
  winter: { frozen: 0.8, pantry: 1.15, bakery: 1.1, breakfast: 1.1 },
};
const WEATHER_CAT: Record<Weather, Mult> = {
  sunny: {},
  cloudy: {},
  rain: { snacks: 1.2, pantry: 1.2, frozen: 0.9 },
  snow: { pantry: 1.3, breakfast: 1.2, frozen: 0.8, beverages: 0.9 },
  hot: { beverages: 1.6, frozen: 1.6, candy: 0.9 },
};
/** Demand multiplier for a product on a given day (season x weather x holiday). */
export function demandMult(seed: number, day: number, productId: string): number {
  const p = PRODUCT_BY_ID.get(productId);
  if (!p) return 1;
  const d = dateOf(day);
  const w = weatherOf(seed, day);
  const h = holidayDef(day);
  let m = (SEASON_CAT[d.season][p.cat] ?? 1) * (WEATHER_CAT[w][p.cat] ?? 1);
  if (h) m *= (h.cat[p.cat] ?? 1) * (h.items[productId] ?? 1);
  return m;
}

const STATION_WEATHER: Record<Weather, Partial<Record<StationKind, number>>> = {
  sunny: {},
  cloudy: {},
  rain: { oden: 1.3, coffee: 1.3 },
  snow: { oden: 1.6, coffee: 1.4, bakery: 1.2 },
  hot: { oden: 0.6, coffee: 1.1 },
};

export function stationMult(seed: number, day: number, kind: StationKind): number {
  const d = dateOf(day);
  const season = d.season === 'winter' ? { oden: 1.3, bakery: 1.2 }[kind as 'oden' | 'bakery'] ?? 1 : 1;
  const holiday = kind === 'bakery' ? holidayDef(day)?.bakery ?? 1 : 1;
  return season * (STATION_WEATHER[weatherOf(seed, day)][kind] ?? 1) * holiday;
}

/** Categories and items that stand out on a day, for the forecast hint. */
export function highlights(seed: number, day: number): Category[] {
  const out = new Set<Category>();
  const w = weatherOf(seed, day);
  const h = holidayDef(day);
  for (const [c, m] of Object.entries(WEATHER_CAT[w])) if ((m ?? 1) > 1.15) out.add(c as Category);
  if (h) for (const [c, m] of Object.entries(h.cat)) if ((m ?? 1) > 1.15) out.add(c as Category);
  return [...out];
}

export type CartKind = 'sweet_potato' | 'tanghulu' | 'bungeoppang';
const CARTS: Record<string, CartKind[]> = { zh: ['sweet_potato', 'tanghulu'], ja: ['sweet_potato'], ko: ['bungeoppang', 'sweet_potato'] };

/** On about half of the winter days a street-food stall sets up outside; it draws a few more people. */
export function streetCart(seed: number, day: number): CartKind | null {
  const kinds = CARTS[locale()];
  if (!kinds || dateOf(day).season !== 'winter') return null;
  const rng = new Rng((seed * 13 + day * 4099) | 0);
  rng.next();
  return rng.next() < 0.5 ? rng.pick(kinds) : null;
}

/** Holiday decorations go up three days before and come down the day after. */
export function decorHoliday(day: number): HolidayId | null {
  for (let i = -1; i <= 3; i++) {
    const h = holidayOf(day + i);
    if (h) return h;
  }
  return null;
}
