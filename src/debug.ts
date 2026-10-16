import { Rng } from './core/rng';
import { DRINKS } from './game/defs';
import { makeCashPayment } from './game/rules';
import { BakeryGame } from './mini/bakery';
import { BaggingGame } from './mini/bagging';
import { CheckoutGame } from './mini/checkout';
import { CoffeeGame } from './mini/coffee';
import { DeliGame } from './mini/deli';
import { OdenGame } from './mini/oden';

const overlay = () => document.querySelector('.overlay') as HTMLElement;

export function checkout(total = 1347, seed = 3): void {
  const p = makeCashPayment(total, new Rng(seed), { exact: 0.5, miscount: 0 });
  void new CheckoutGame(total, p, seed).open(overlay());
}
export function oden(): void {
  void new OdenGame({ egg: 2, daikon: 1, fishball: 3 }).open(overlay());
}
export function deli(): void {
  void new DeliGame('ham', 0.5, 1).open(overlay());
}
export function bakery(): void {
  void new BakeryGame('croissant', 2).open(overlay());
}
export function coffee(): void {
  void new CoffeeGame(DRINKS[6]).open(overlay());
}
export function bagging(): void {
  void new BaggingGame(['milk_whole', 'eggs_dozen', 'cola', 'potato_chips', 'white_bread', 'ice_cream_vanilla', 'canned_tuna', 'apple_red']).open(overlay());
}
