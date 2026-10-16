import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/savecode';
import { newGame } from '../src/game/state';

describe('save code', () => {
  it('round-trips a save', async () => {
    const s = newGame(42);
    s.money = 1234.5;
    s.achievements.expand_1 = 3;
    const code = await encodeSave(s);
    expect(code.startsWith('GROCERY2.')).toBe(true);
    expect(code.length).toBeLessThan(JSON.stringify(s).length / 3);
    const back = await decodeSave(code);
    expect(back?.money).toBe(1234.5);
    expect(back?.achievements.expand_1).toBe(3);
  });

  it('rejects garbage', async () => {
    expect(await decodeSave('hello')).toBeNull();
    expect(await decodeSave('GROCERY2.@@@')).toBeNull();
    expect(await decodeSave('GROCERY2.AAAA')).toBeNull();
  });
});
