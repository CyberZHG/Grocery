import { Rng } from '../core/rng';
import { PRODUCT_BY_ID, type Category, type StationKind } from './defs';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'hot';
export type HolidayId = 'newyear' | 'superbowl' | 'valentine' | 'july4' | 'halloween' | 'thanksgiving' | 'christmas';

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

export function holidayOf(day: number): HolidayId | null {
  const d = dateOf(day);
  if (d.month === 1 && d.dom === 1) return 'newyear';
  if (d.month === 2 && nthWeekday(d, 2, 0)) return 'superbowl';
  if (d.month === 2 && d.dom === 14) return 'valentine';
  if (d.month === 7 && d.dom === 4) return 'july4';
  if (d.month === 10 && d.dom === 31) return 'halloween';
  if (d.month === 11 && nthWeekday(d, 4, 4)) return 'thanksgiving';
  if (d.month === 12 && (d.dom === 24 || d.dom === 25)) return 'christmas';
  return null;
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
const HOLIDAY_TRAFFIC: Record<HolidayId, number> = {
  newyear: 1.1, superbowl: 1.2, valentine: 1.1, july4: 1.25, halloween: 1.15, thanksgiving: 1.3, christmas: 1.3,
};

export function trafficMult(seed: number, day: number): number {
  const h = holidayOf(day);
  return TRAFFIC[weatherOf(seed, day)] * (h ? HOLIDAY_TRAFFIC[h] : 1);
}

type Mult = Partial<Record<Category, number>>;

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
const HOLIDAY_CAT: Record<HolidayId, Mult> = {
  newyear: { beverages: 1.5, snacks: 1.4 },
  superbowl: { snacks: 2, beverages: 1.8 },
  valentine: { candy: 2.2, bakery: 1.3 },
  july4: { meat: 1.6, beverages: 1.6, snacks: 1.4 },
  halloween: { candy: 3 },
  thanksgiving: { produce: 1.4, bakery: 1.5, pantry: 1.4, meat: 1.3 },
  christmas: { bakery: 1.8, candy: 1.6, dairy: 1.3, beverages: 1.3 },
};
const HOLIDAY_ITEMS: Record<HolidayId, Record<string, number>> = {
  newyear: { cola_2l: 2, orange_soda_2l: 2, sparkling_water: 1.6 },
  superbowl: { chicken_wings: 2.5, tortilla_chips: 2.5, salsa: 2.5, potato_chips: 2, cheese_puffs: 2 },
  valentine: { chocolate_bar: 2.5, dark_chocolate: 2.5, strawberries: 2.5, peanut_butter_cups: 2 },
  july4: { hot_dogs: 3, hot_dog_buns: 3, hamburger_buns: 3, ground_beef: 2.5, watermelon: 3 },
  halloween: { popcorn: 2, marshmallows: 2 },
  thanksgiving: { sweet_potato: 3, turkey_slices: 2.5, rotisserie_chicken: 2.5, flour: 2, sugar: 2 },
  christmas: { sandwich_cookies: 2.5, choc_chip_cookies: 2.5, eggs_dozen: 1.8, milk_whole: 1.6, croissants: 2 },
};

/** Demand multiplier for a product on a given day (season x weather x holiday). */
export function demandMult(seed: number, day: number, productId: string): number {
  const p = PRODUCT_BY_ID.get(productId);
  if (!p) return 1;
  const d = dateOf(day);
  const w = weatherOf(seed, day);
  const h = holidayOf(day);
  let m = (SEASON_CAT[d.season][p.cat] ?? 1) * (WEATHER_CAT[w][p.cat] ?? 1);
  if (h) m *= (HOLIDAY_CAT[h][p.cat] ?? 1) * (HOLIDAY_ITEMS[h][productId] ?? 1);
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
  const h = holidayOf(day);
  const holiday = h === 'christmas' || h === 'thanksgiving' ? (kind === 'bakery' ? 1.5 : 1) : 1;
  return season * (STATION_WEATHER[weatherOf(seed, day)][kind] ?? 1) * holiday;
}

/** Categories and items that stand out on a day, for the forecast hint. */
export function highlights(seed: number, day: number): Category[] {
  const out = new Set<Category>();
  const w = weatherOf(seed, day);
  const h = holidayOf(day);
  for (const [c, m] of Object.entries(WEATHER_CAT[w])) if ((m ?? 1) > 1.15) out.add(c as Category);
  if (h) for (const [c, m] of Object.entries(HOLIDAY_CAT[h])) if ((m ?? 1) > 1.15) out.add(c as Category);
  return [...out];
}

/** Holiday decorations go up three days before and come down the day after. */
export function decorHoliday(day: number): HolidayId | null {
  for (let i = -1; i <= 3; i++) {
    const h = holidayOf(day + i);
    if (h) return h;
  }
  return null;
}
