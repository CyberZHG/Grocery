import { describe, expect, it } from 'vitest';
import { dateOf, demandMult, holidayOf, trafficMult, weatherOf } from '../src/game/calendar';
import { equipSpeed, stars, supplierDiscount } from '../src/game/growth';

function dayOf(month: number, dom: number, year = 1): number {
  for (let d = 1; d < 800; d++) {
    const c = dateOf(d);
    if (c.month === month && c.dom === dom && d > (year - 1) * 365) return d;
  }
  throw new Error('not found');
}

describe('calendar', () => {
  it('starts on March 1st', () => {
    expect(dateOf(1)).toMatchObject({ month: 3, dom: 1, season: 'spring' });
    expect(dateOf(31)).toMatchObject({ month: 3, dom: 31 });
    expect(dateOf(32)).toMatchObject({ month: 4, dom: 1 });
  });

  it('places holidays on the right dates', () => {
    expect(holidayOf(dayOf(7, 4))).toBe('july4');
    expect(holidayOf(dayOf(10, 31))).toBe('halloween');
    expect(holidayOf(dayOf(12, 25))).toBe('christmas');
    const thanksgiving = [...Array(30).keys()].map((i) => dayOf(11, 1) + i).filter((d) => holidayOf(d) === 'thanksgiving');
    expect(thanksgiving).toHaveLength(1);
    const d = dateOf(thanksgiving[0]);
    expect(d.weekday).toBe(4);
    expect(d.dom).toBeGreaterThanOrEqual(22);
    expect(d.dom).toBeLessThanOrEqual(28);
  });

  it('weather is stable per day and seasonal', () => {
    expect(weatherOf(7, 100)).toBe(weatherOf(7, 100));
    const summer = [...Array(60).keys()].map((i) => weatherOf(3, dayOf(6, 1) + i));
    expect(summer).not.toContain('snow');
    const winter = [...Array(60).keys()].map((i) => weatherOf(3, dayOf(12, 1) + i));
    expect(winter).not.toContain('hot');
  });

  it('holidays boost the matching products and traffic', () => {
    const t = dayOf(11, 1) + [...Array(30).keys()].findIndex((i) => holidayOf(dayOf(11, 1) + i) === 'thanksgiving');
    expect(demandMult(1, t, 'sweet_potato')).toBeGreaterThan(2);
    expect(trafficMult(1, dayOf(10, 31))).toBeGreaterThan(trafficMult(1, dayOf(10, 30)) * 0.99);
  });
});

describe('growth curves', () => {
  it('stay modest at high levels', () => {
    expect(supplierDiscount(999)).toBeLessThan(0.15);
    expect(equipSpeed(999)).toBeLessThan(1.6);
    expect(stars(1)).toBe(1);
    expect(stars(999)).toBe(5);
  });
});
