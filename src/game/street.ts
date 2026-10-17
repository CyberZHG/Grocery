import type { Category, StationKind } from './defs';

/** Buildings that can go up on the lots around a store; each one changes who comes and what they buy. */
export type BuildingId = 'park' | 'bus' | 'apartments' | 'school' | 'office' | 'clinic' | 'arcade' | 'parking' | 'gym' | 'tower';

export interface Lot {
  id: BuildingId;
  level: number;
}

export const LOTS = 9;
export const MAX_BUILDING_LEVEL = 3;

/** Price of the first level; each further level costs three times the one before. */
export const BUILDING_PRICE: Record<BuildingId, number> = {
  bus: 20000, park: 30000, school: 60000, gym: 70000, apartments: 80000,
  clinic: 90000, office: 120000, parking: 150000, arcade: 250000, tower: 500000,
};
export const BUILDINGS = Object.keys(BUILDING_PRICE) as BuildingId[];

export function levelCost(id: BuildingId, level: number): number {
  return BUILDING_PRICE[id] * 3 ** (level - 1);
}

export interface StreetFx {
  traffic: number;
  roster: number;
  budget: number;
  rep: number;
  kid: number;
  elder: number;
  cat: Partial<Record<Category, number>>;
  station: Partial<Record<StationKind, number>>;
}

export function emptyStreet(): (Lot | null)[] {
  return Array(LOTS).fill(null);
}

export function streetFx(street: (Lot | null)[] | undefined): StreetFx {
  const fx: StreetFx = { traffic: 1, roster: 0, budget: 1, rep: 1, kid: 1, elder: 1, cat: {}, station: {} };
  const cat = (c: Category, v: number) => (fx.cat[c] = (fx.cat[c] ?? 1) + v);
  const station = (k: StationKind, v: number) => (fx.station[k] = (fx.station[k] ?? 1) + v);
  for (const lot of street ?? []) {
    if (!lot) continue;
    const l = lot.level;
    switch (lot.id) {
      case 'park': fx.kid += 0.2 * l; fx.traffic += 0.02 * l; break;
      case 'bus': fx.traffic += 0.06 * l; break;
      case 'apartments': fx.roster += 10 * l; break;
      case 'school': fx.kid += 0.15 * l; cat('candy', 0.15 * l); cat('snacks', 0.15 * l); break;
      case 'office': station('coffee', 0.2 * l); station('deli', 0.2 * l); cat('beverages', 0.1 * l); break;
      case 'clinic': fx.elder += 0.2 * l; cat('personal', 0.15 * l); break;
      case 'arcade': fx.traffic += 0.05 * l; fx.budget += 0.04 * l; break;
      case 'parking': fx.budget += 0.06 * l; break;
      case 'gym': cat('produce', 0.12 * l); cat('beverages', 0.12 * l); break;
      case 'tower': fx.rep += 0.1 * l; fx.traffic += 0.03 * l; break;
    }
  }
  return fx;
}
