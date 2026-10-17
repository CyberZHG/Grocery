import productsJson from '../data/products.json';
import npcsJson from '../data/npcs.json';

export type Category =
  | 'produce' | 'dairy' | 'meat' | 'frozen' | 'bakery' | 'snacks'
  | 'candy' | 'beverages' | 'breakfast' | 'pantry' | 'household' | 'personal';
export type Storage = 'shelf' | 'produce' | 'fridge' | 'freezer';
export type StationKind = 'oden' | 'deli' | 'bakery' | 'coffee';

export const CATEGORIES: Category[] = [
  'produce', 'dairy', 'meat', 'frozen', 'bakery', 'snacks',
  'candy', 'beverages', 'breakfast', 'pantry', 'household', 'personal',
];

export interface ProductDef {
  id: string;
  index: number;
  cat: Category;
  store: Storage;
  price: number;
  cost: number;
  /** bag cells w, h and weight class (0 fragile, 1 light, 2 normal, 3 heavy) */
  bag: [number, number, number];
}

export const PRODUCTS: ProductDef[] = (productsJson as Omit<ProductDef, 'index'>[]).map((p, index) => ({ ...p, index }));
export const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export interface NpcDef {
  id: string;
  index: number;
  kind: 'adult' | 'kid' | 'elder';
  likes: Category[];
  favs: string[];
  stations: Record<StationKind, number>;
  budget: number;
  cash: number;
  exact: number;
  miscount: number;
  patience: number;
}

export const NPCS: NpcDef[] = (npcsJson as Omit<NpcDef, 'index'>[]).map((n, index) => ({ ...n, index }));

/** chars.png rows: 0 owner, 1..12 staff looks, then NPCs */
export const OWNER_ROW = 0;
export const STAFF_ROW0 = 1;
export const STAFF_LOOKS = 12;
export const NPC_ROW0 = STAFF_ROW0 + STAFF_LOOKS;

export type FixtureKind = 'shelf' | 'produce' | 'fridge' | 'freezer' | 'decor';

export interface FixtureDef {
  kind: FixtureKind;
  store: Storage;
  price: number;
  capacity: number;
}

export const FIXTURES: Record<FixtureKind, FixtureDef> = {
  shelf: { kind: 'shelf', store: 'shelf', price: 150, capacity: 12 },
  produce: { kind: 'produce', store: 'produce', price: 180, capacity: 10 },
  fridge: { kind: 'fridge', store: 'fridge', price: 450, capacity: 8 },
  freezer: { kind: 'freezer', store: 'freezer', price: 500, capacity: 8 },
  decor: { kind: 'decor', store: 'shelf', price: 40, capacity: 0 },
};

export interface LevelDef {
  w: number;
  h: number;
  registers: number;
  /** card-only express counters */
  cards: number;
  stations: StationKind[];
  bagging: boolean;
  cost: number;
  roster: number;
  rent: number;
}

export const LEVELS: LevelDef[] = [
  { w: 14, h: 10, registers: 1, cards: 0, stations: [], bagging: false, cost: 0, roster: 60, rent: 30 },
  { w: 18, h: 12, registers: 2, cards: 0, stations: ['oden'], bagging: false, cost: 1500, roster: 80, rent: 80 },
  { w: 22, h: 13, registers: 2, cards: 1, stations: ['oden', 'deli'], bagging: false, cost: 4500, roster: 100, rent: 130 },
  { w: 26, h: 14, registers: 2, cards: 1, stations: ['oden', 'deli', 'bakery'], bagging: false, cost: 12000, roster: 120, rent: 190 },
  { w: 30, h: 15, registers: 3, cards: 1, stations: ['oden', 'deli', 'bakery', 'coffee'], bagging: false, cost: 25000, roster: 140, rent: 260 },
  { w: 34, h: 16, registers: 3, cards: 2, stations: ['oden', 'deli', 'bakery', 'coffee'], bagging: true, cost: 45000, roster: 160, rent: 340 },
];

export type Skill =
  | 'restock' | 'checkout' | 'walk' | 'clean' | 'greet' | 'upsell' | 'storage' | 'display' | 'petcare'
  | 'oden' | 'deli' | 'bakery' | 'coffee' | 'bagging';
export const SKILLS: Skill[] = ['restock', 'checkout', 'walk', 'clean', 'greet', 'upsell', 'storage', 'display', 'petcare', 'oden', 'deli', 'bakery', 'coffee', 'bagging'];
/** Skills every store has from the start. */
export const BASE_SKILLS: Skill[] = ['restock', 'checkout', 'walk', 'clean', 'greet', 'upsell', 'storage', 'display', 'petcare'];

export const ODEN_ITEMS = ['egg', 'daikon', 'konjac', 'chikuwa', 'fishball', 'tofu', 'kelp', 'tendon', 'mochi', 'sausage'] as const;
export type OdenItem = (typeof ODEN_ITEMS)[number];
export const ODEN_PRICE: Record<OdenItem, number> = {
  egg: 1.25, daikon: 1.25, konjac: 1.0, chikuwa: 1.5, fishball: 1.75, tofu: 1.5, kelp: 1.0, tendon: 2.25, mochi: 2.0, sausage: 1.75,
};
export const ODEN_COST_RATIO = 0.35;

export const MEATS = ['turkey', 'ham', 'roastbeef', 'salami', 'swiss'] as const;
export type Meat = (typeof MEATS)[number];
export const MEAT_PRICE_LB: Record<Meat, number> = { turkey: 11.99, ham: 9.99, roastbeef: 13.99, salami: 12.49, swiss: 10.49 };
export const MEAT_COST_RATIO = 0.55;

export const BREADS = ['croissant', 'baguette', 'muffin', 'cinnamon', 'melonpan', 'bagel', 'pretzel', 'anpan'] as const;
export type Bread = (typeof BREADS)[number];
/** Team bakery skill level needed before a bread can be baked. */
export const BREAD_UNLOCK: Record<Bread, number> = {
  croissant: 1, baguette: 1, muffin: 1, cinnamon: 1, melonpan: 3, bagel: 6, pretzel: 10, anpan: 15,
};
export const favBread = (npcIndex: number): Bread => BREADS[(npcIndex * 7 + 3) % BREADS.length];
export const BREAD_PRICE: Record<Bread, number> = {
  croissant: 2.75, baguette: 3.5, muffin: 2.5, cinnamon: 3.25, melonpan: 2.5, bagel: 2.25, pretzel: 3, anpan: 2.5,
};
export const BREAD_COST_RATIO = 0.3;
export type BreadQuality = 'good' | 'golden';

export const COFFEE_STEPS = ['espresso', 'milk', 'foam', 'ice', 'water', 'vanilla', 'caramel', 'chocolate', 'whip'] as const;
export type CoffeeStep = (typeof COFFEE_STEPS)[number];
export interface DrinkDef { id: string; steps: CoffeeStep[]; price: number }
export const DRINKS: DrinkDef[] = [
  { id: 'americano', steps: ['espresso', 'espresso', 'water'], price: 3.25 },
  { id: 'latte', steps: ['espresso', 'milk', 'foam'], price: 4.25 },
  { id: 'cappuccino', steps: ['espresso', 'foam', 'foam'], price: 4.25 },
  { id: 'mocha', steps: ['chocolate', 'espresso', 'milk', 'whip'], price: 4.95 },
  { id: 'iced_latte', steps: ['ice', 'espresso', 'milk'], price: 4.5 },
  { id: 'vanilla_latte', steps: ['vanilla', 'espresso', 'milk', 'foam'], price: 4.75 },
  { id: 'caramel_macchiato', steps: ['caramel', 'milk', 'espresso', 'caramel'], price: 5.25 },
  { id: 'iced_mocha', steps: ['ice', 'chocolate', 'espresso', 'milk', 'whip'], price: 5.45 },
];
export const COFFEE_COST_RATIO = 0.25;

export const DAY_START = 8 * 60;
export const DAY_END = 20 * 60;
export const LAST_ENTRY = 19 * 60 + 30;
/** real seconds per game minute at 1x */
export const SEC_PER_MIN = 0.4;
export const NIGHT_SECONDS = 15;
export const START_MONEY = 1000;

export interface TraitDef {
  id: string;
  skill: Skill;
  mult: number;
}

/** Innate staff traits: a small speed bonus on one kind of work. */
export const TRAITS: TraitDef[] = [
  { id: 'quick_hands', skill: 'checkout', mult: 1.15 },
  { id: 'strong_back', skill: 'restock', mult: 1.15 },
  { id: 'light_feet', skill: 'walk', mult: 1.1 },
  { id: 'oden_fan', skill: 'oden', mult: 1.2 },
  { id: 'steady_slicer', skill: 'deli', mult: 1.2 },
  { id: 'early_bird', skill: 'bakery', mult: 1.2 },
  { id: 'latte_art', skill: 'coffee', mult: 1.2 },
  { id: 'neat_packer', skill: 'bagging', mult: 1.2 },
  { id: 'tidy', skill: 'clean', mult: 1.25 },
  { id: 'warm_smile', skill: 'greet', mult: 1.25 },
  { id: 'smooth_talker', skill: 'upsell', mult: 1.25 },
  { id: 'organized', skill: 'storage', mult: 1.2 },
  { id: 'eye_for_detail', skill: 'display', mult: 1.25 },
  { id: 'cat_whisperer', skill: 'petcare', mult: 1.3 },
];
export const TRAIT_BY_ID = new Map(TRAITS.map((t) => [t.id, t]));

export function unlockedSkills(level: number): Skill[] {
  const lv = LEVELS[level];
  const out: Skill[] = [...BASE_SKILLS, ...lv.stations];
  if (lv.bagging) out.push('bagging');
  return out;
}

export const CAT_COATS = ['orange', 'black', 'white', 'calico', 'gray', 'tuxedo', 'shorthair', 'siamese'] as const;
export type CatCoat = (typeof CAT_COATS)[number];

export const DECOR_KINDS = ['plant_small', 'flowers', 'bench', 'cactus', 'lamp', 'gumball', 'magazine', 'cat_tower', 'aquarium'] as const;
export type DecorKind = (typeof DECOR_KINDS)[number];
/** Reputation level needed for each decor item and renovation style. */
export const DECOR_UNLOCK: Record<DecorKind, number> = {
  plant_small: 1, flowers: 2, bench: 5, cactus: 8, lamp: 4, gumball: 7, magazine: 10, cat_tower: 12, aquarium: 15,
};
export const DECOR_PRICE: Record<DecorKind, number> = {
  plant_small: 40, flowers: 60, bench: 120, cactus: 80, lamp: 600, gumball: 900, magazine: 1200, cat_tower: 300, aquarium: 3000,
};
export const FLOOR_STYLES = ['cream', 'wood', 'blue', 'terrazzo', 'mint'] as const;
export const WALL_STYLES = ['beige', 'mint', 'brick', 'navy'] as const;
export const SIGN_STYLES = ['wood', 'metal', 'chalk', 'neon'] as const;
export const STYLE_UNLOCK = {
  floor: [1, 3, 6, 10, 15],
  wall: [1, 4, 8, 12],
  sign: [1, 5, 10, 20],
};
/** One-time cost of each renovation style; the first of each is the default. */
export const STYLE_PRICE = {
  floor: [0, 1500, 3000, 5000, 8000],
  wall: [0, 2000, 4000, 7000],
  sign: [0, 2500, 6000, 12000],
};
export const CAT_ACCS = ['bell', 'bandana', 'bow', 'scarf', 'crown'] as const;
export type CatAcc = (typeof CAT_ACCS)[number];
export const CAT_ACC_PRICE: Record<CatAcc, number> = { bell: 500, bandana: 1200, bow: 2000, scarf: 4000, crown: 15000 };

/** Affinity levels at which a regular hands over a gift: postcard, sticker, craft, photo. */
export const GIFT_KINDS = ['postcard', 'sticker', 'craft', 'photo'] as const;
export const GIFT_LEVELS = [2, 5, 10, 20];
