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
  /** a regional specialty: offered for new shelves only while playing in this language */
  region?: string;
}

export function offeredIn(p: { region?: string }, lang: string): boolean {
  return !p.region || p.region === lang;
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

/** chars.png rows: 0 owner, 1..24 staff looks, then NPCs */
export const OWNER_ROW = 0;
export const STAFF_ROW0 = 1;
export const STAFF_LOOKS = 24;
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

export const BREADS = [
  'croissant', 'baguette', 'muffin', 'cinnamon', 'melonpan', 'bagel', 'pretzel', 'anpan',
  'eggtart', 'pineapple_bun', 'curry_bread', 'cream_bread', 'soboro', 'kkwabaegi',
] as const;
export type Bread = (typeof BREADS)[number];
/** Regional breads are only baked while playing in that language. */
export const BREAD_REGION: Partial<Record<Bread, string>> = {
  eggtart: 'zh', pineapple_bun: 'zh', curry_bread: 'ja', cream_bread: 'ja', soboro: 'ko', kkwabaegi: 'ko',
};
/** Team bakery skill level needed before a bread can be baked. */
export const BREAD_UNLOCK: Record<Bread, number> = {
  croissant: 1, baguette: 1, muffin: 1, cinnamon: 1, melonpan: 3, bagel: 6, pretzel: 10, anpan: 15,
  eggtart: 2, pineapple_bun: 5, curry_bread: 2, cream_bread: 5, soboro: 2, kkwabaegi: 5,
};
/** Everyone's favorite is one of the breads every language has. */
export const favBread = (npcIndex: number): Bread => BREADS[(npcIndex * 7 + 3) % 8];
export const BREAD_PRICE: Record<Bread, number> = {
  croissant: 2.75, baguette: 3.5, muffin: 2.5, cinnamon: 3.25, melonpan: 2.5, bagel: 2.25, pretzel: 3, anpan: 2.5,
  eggtart: 2.25, pineapple_bun: 2.5, curry_bread: 2.75, cream_bread: 2.25, soboro: 2.25, kkwabaegi: 2,
};
export const BREAD_COST_RATIO = 0.3;
export type BreadQuality = 'good' | 'golden';

export const COFFEE_STEPS = ['espresso', 'milk', 'foam', 'ice', 'water', 'vanilla', 'caramel', 'chocolate', 'whip', 'tea', 'matcha', 'dalgona'] as const;
export type CoffeeStep = (typeof COFFEE_STEPS)[number];
/** The last three steps belong to one language each. */
export const STEP_REGION: Partial<Record<CoffeeStep, string>> = { tea: 'zh', matcha: 'ja', dalgona: 'ko' };
export interface DrinkDef { id: string; steps: CoffeeStep[]; price: number; region?: string }
export const DRINKS: DrinkDef[] = [
  { id: 'americano', steps: ['espresso', 'espresso', 'water'], price: 3.25 },
  { id: 'latte', steps: ['espresso', 'milk', 'foam'], price: 4.25 },
  { id: 'cappuccino', steps: ['espresso', 'foam', 'foam'], price: 4.25 },
  { id: 'mocha', steps: ['chocolate', 'espresso', 'milk', 'whip'], price: 4.95 },
  { id: 'iced_latte', steps: ['ice', 'espresso', 'milk'], price: 4.5 },
  { id: 'vanilla_latte', steps: ['vanilla', 'espresso', 'milk', 'foam'], price: 4.75 },
  { id: 'caramel_macchiato', steps: ['caramel', 'milk', 'espresso', 'caramel'], price: 5.25 },
  { id: 'iced_mocha', steps: ['ice', 'chocolate', 'espresso', 'milk', 'whip'], price: 5.45 },
  { id: 'milk_tea', steps: ['tea', 'milk'], price: 3.75, region: 'zh' },
  { id: 'yuanyang', steps: ['tea', 'espresso', 'milk'], price: 4.5, region: 'zh' },
  { id: 'matcha_latte', steps: ['matcha', 'milk', 'foam'], price: 4.75, region: 'ja' },
  { id: 'iced_matcha', steps: ['ice', 'matcha', 'milk'], price: 4.95, region: 'ja' },
  { id: 'dalgona', steps: ['ice', 'milk', 'dalgona'], price: 5.25, region: 'ko' },
  { id: 'iced_americano', steps: ['ice', 'espresso', 'espresso', 'water'], price: 3.5, region: 'ko' },
];
export const COFFEE_COST_RATIO = 0.25;

export const DAY_START = 8 * 60;
export const DAY_END = 20 * 60;
export const LAST_ENTRY = 19 * 60 + 30;
export const MIDNIGHT = 24 * 60;
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

export const CAT_TREASURES = ['leaf', 'feather', 'bottlecap', 'button', 'ribbon', 'pebble', 'flower', 'sock', 'mouse', 'bell', 'acorn', 'shell'] as const;
export const UMBRELLA_COLORS = ['red', 'blue', 'yellow'] as const;
export const UMBRELLA_PRICE = 8;
export const CAT_COATS = ['orange', 'black', 'white', 'calico', 'gray', 'tuxedo', 'shorthair', 'siamese'] as const;
export type CatCoat = (typeof CAT_COATS)[number];

export const DECOR_KINDS = [
  'plant_small', 'flowers', 'bench', 'cactus', 'lamp', 'gumball', 'magazine', 'cat_tower', 'aquarium',
  'maneki', 'lantern_stand', 'lucky_bamboo', 'daruma', 'bonsai', 'onggi', 'hanji_lamp',
] as const;
export type DecorKind = (typeof DECOR_KINDS)[number];
/** Regional decorations are only sold while playing in one of these languages. */
export const DECOR_REGION: Partial<Record<DecorKind, string[]>> = {
  maneki: ['zh', 'ja'], lantern_stand: ['zh'], lucky_bamboo: ['zh'], daruma: ['ja'], bonsai: ['ja'], onggi: ['ko'], hanji_lamp: ['ko'],
};
/** Reputation level needed for each decor item and renovation style. */
export const DECOR_UNLOCK: Record<DecorKind, number> = {
  plant_small: 1, flowers: 2, bench: 5, cactus: 8, lamp: 4, gumball: 7, magazine: 10, cat_tower: 12, aquarium: 15,
  maneki: 3, lantern_stand: 2, lucky_bamboo: 1, daruma: 2, bonsai: 4, onggi: 3, hanji_lamp: 4,
};
export const DECOR_PRICE: Record<DecorKind, number> = {
  plant_small: 40, flowers: 60, bench: 120, cactus: 80, lamp: 600, gumball: 900, magazine: 1200, cat_tower: 300, aquarium: 3000,
  maneki: 500, lantern_stand: 200, lucky_bamboo: 90, daruma: 150, bonsai: 400, onggi: 250, hanji_lamp: 600,
};
/** How a cat plays with a toy; the renderer animates each style. */
export type ToyPlay = 'chase' | 'bat' | 'scratch' | 'nap' | 'hide' | 'perch' | 'kick';

export const CAFE_TOYS = [
  'ball', 'pingpong', 'bellball', 'laser', 'mouse', 'wand', 'fishing', 'ribbon', 'spring', 'dangle',
  'post', 'board', 'bed', 'hammock', 'cushion', 'tunnel', 'box', 'tower', 'window', 'kicker',
] as const;
export type CafeToy = (typeof CAFE_TOYS)[number];

export const TOY_PLAY: Record<CafeToy, ToyPlay> = {
  ball: 'chase', pingpong: 'chase', bellball: 'chase', laser: 'chase', mouse: 'chase',
  wand: 'bat', fishing: 'bat', ribbon: 'bat', spring: 'bat', dangle: 'bat',
  post: 'scratch', board: 'scratch', bed: 'nap', hammock: 'nap', cushion: 'nap',
  tunnel: 'hide', box: 'hide', tower: 'perch', window: 'perch', kicker: 'kick',
};

export const TOY_PRICE: Record<CafeToy, number> = {
  box: 300, pingpong: 400, ball: 500, mouse: 600, bellball: 800, kicker: 900, ribbon: 1000, wand: 1200,
  laser: 1500, fishing: 1500, cushion: 1500, board: 1800, spring: 2000, dangle: 2500, bed: 3000,
  post: 4000, tunnel: 5000, hammock: 6000, window: 8000, tower: 12000,
};
/** Animation frames per toy (sprites toyf_<toy>_<n>), mirroring TOY_FRAMES in tools/gen_cafe.py. */
export const TOY_FRAME_COUNT: Partial<Record<CafeToy, number>> = {
  ball: 4, bellball: 3, pingpong: 3, mouse: 3, kicker: 3, wand: 4, fishing: 4, ribbon: 4, spring: 4, dangle: 4, hammock: 2, box: 2, cushion: 2, bed: 2,
};

/** Small toys that actually roll around: their spot changes as cats bat them and shoppers kick them. */
export const ROLLING_TOYS = ['toy_ball', 'toy_pingpong', 'toy_bellball', 'toy_mouse'];
export function isRolling(decor: string | undefined): boolean {
  return !!decor && ROLLING_TOYS.includes(decor);
}

/** Customers can play with these themselves, drawing a cat over. */
export const HAND_TOYS: CafeToy[] = ['wand', 'fishing', 'ribbon', 'laser'];
export const TABLE_PRICE = 400;

/** Each store opens with its own look (keyed by its challenge); it can still be renovated like any other. */
export const STORE_STYLE: Record<string, { floor: string; wall: string; sign: string }> = {
  main: { floor: 'cream', wall: 'beige', sign: 'wood' },
  rush: { floor: 'terrazzo', wall: 'tile', sign: 'neon' },
  fresh: { floor: 'checker', wall: 'green', sign: 'awning' },
  oldtown: { floor: 'parquet', wall: 'plaster', sign: 'red' },
  school: { floor: 'lino', wall: 'pastel', sign: 'crayon' },
  suburb: { floor: 'concrete', wall: 'metal', sign: 'metal' },
  cafe: { floor: 'wood', wall: 'mint', sign: 'chalk' },
};
export const FLOOR_STYLES = ['cream', 'wood', 'blue', 'terrazzo', 'mint', 'checker', 'parquet', 'lino', 'concrete', 'flagstone', 'rushmat', 'oilpaper'] as const;
export const WALL_STYLES = ['beige', 'mint', 'brick', 'navy', 'tile', 'green', 'plaster', 'pastel', 'metal', 'vermilion', 'screens', 'beams'] as const;
export const SIGN_STYLES = ['wood', 'metal', 'chalk', 'neon', 'awning', 'red', 'crayon', 'plaque', 'curtain', 'celadon'] as const;
export const STYLE_UNLOCK = {
  floor: [1, 3, 6, 10, 15, 18, 22, 26, 30, 12, 12, 12],
  wall: [1, 4, 8, 12, 14, 16, 18, 20, 22, 12, 12, 12],
  sign: [1, 5, 10, 20, 22, 25, 28, 12, 12, 12],
};
/** One-time cost of each renovation style; the first of each is the default. */
export const STYLE_PRICE = {
  floor: [0, 1500, 3000, 5000, 8000, 6000, 9000, 6000, 7000, 8000, 8000, 8000],
  wall: [0, 2000, 4000, 7000, 6000, 6000, 9000, 6000, 7000, 9000, 9000, 9000],
  sign: [0, 2500, 6000, 12000, 8000, 10000, 8000, 10000, 10000, 10000],
};
export const CAT_ACCS = ['bell', 'bandana', 'bow', 'scarf', 'crown'] as const;
export type CatAcc = (typeof CAT_ACCS)[number];
export const CAT_ACC_PRICE: Record<CatAcc, number> = { bell: 500, bandana: 1200, bow: 2000, scarf: 4000, crown: 15000 };

/** Affinity levels at which a regular hands over a gift: postcard, sticker, craft, photo. */
export const GIFT_KINDS = ['postcard', 'sticker', 'craft', 'photo'] as const;
export const GIFT_LEVELS = [2, 5, 10, 20];
