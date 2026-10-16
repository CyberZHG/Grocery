/** Synthesized 8-bit sound: short effects plus a tiny procedural music loop. No audio files. */

export type Sfx = 'door' | 'ding' | 'coin' | 'slice' | 'steam' | 'meow' | 'level' | 'fanfare' | 'click' | 'error' | 'pop';
export type Music = 'day' | 'night' | null;

interface Settings {
  muted: boolean;
  master: number;
  music: number;
  sfx: number;
}

const KEY = 'grocery.audio';
let settings: Settings = { muted: false, master: 0.8, music: 0.5, sfx: 0.8 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
} catch {
  // storage unavailable
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let rainNode: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;
let current: Music = null;
let wantRain = false;
let timer = 0;
let step = 0;
let nextTime = 0;

export function audioSettings(): Settings {
  return { ...settings };
}

export function setAudio(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
  apply();
}

function apply(): void {
  if (!ctx || !master || !musicBus || !sfxBus) return;
  master.gain.value = settings.muted ? 0 : settings.master;
  musicBus.gain.value = settings.music * 0.35;
  sfxBus.gain.value = settings.sfx * 0.6;
}

/** Browsers only allow audio after a user gesture; call this from the first pointer event. */
export function unlockAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(ctx.destination);
  apply();
  setMusic(current, wantRain, true);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, bus: GainNode, slideTo?: number): void {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(bus);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(start: number, dur: number, vol: number, bus: GainNode, freq = 1200): void {
  if (!ctx) return;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(bus);
  src.start(start);
}

export function sfx(name: Sfx): void {
  if (!ctx || !sfxBus || settings.muted) return;
  const t = ctx.currentTime;
  const b = sfxBus;
  switch (name) {
    case 'door':
      tone(988, t, 0.25, 'triangle', 0.25, b);
      tone(784, t + 0.18, 0.35, 'triangle', 0.25, b);
      break;
    case 'ding':
      tone(1568, t, 0.3, 'square', 0.12, b);
      tone(2093, t + 0.06, 0.3, 'triangle', 0.15, b);
      break;
    case 'coin':
      tone(1319, t, 0.06, 'square', 0.12, b);
      tone(1976, t + 0.05, 0.12, 'square', 0.1, b);
      break;
    case 'slice':
      noise(t, 0.12, 0.25, b, 3000);
      break;
    case 'steam':
      noise(t, 0.35, 0.18, b, 5000);
      break;
    case 'meow':
      tone(700, t, 0.12, 'triangle', 0.22, b, 980);
      tone(980, t + 0.12, 0.22, 'triangle', 0.2, b, 560);
      break;
    case 'level':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'square', 0.1, b));
      break;
    case 'fanfare':
      [523, 659, 784, 659, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.2, 'square', 0.11, b));
      break;
    case 'click':
      tone(880, t, 0.04, 'square', 0.06, b);
      break;
    case 'error':
      tone(220, t, 0.18, 'square', 0.12, b, 160);
      break;
    case 'pop':
      tone(520, t, 0.08, 'triangle', 0.2, b, 900);
      break;
  }
}

// ---------- music ----------

const NOTE = (n: number) => 440 * 2 ** ((n - 69) / 12);
// day: bright major pentatonic, 112 bpm; night: slow minor arpeggio, 72 bpm
const SONGS = {
  day: { bpm: 112, lead: [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, -1], bass: [48, 48, 55, 55, 53, 53, 55, 55], wave: 'square' as OscillatorType },
  night: { bpm: 72, lead: [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 64, 67, 71, -1], bass: [45, 43, 41, 40], wave: 'triangle' as OscillatorType },
};

function schedule(): void {
  if (!ctx || !musicBus || !current) return;
  const song = SONGS[current];
  const beat = 60 / song.bpm / 2;
  while (nextTime < ctx.currentTime + 0.3) {
    const n = song.lead[step % song.lead.length];
    if (n > 0) tone(NOTE(n), nextTime, beat * 0.9, song.wave, 0.08, musicBus);
    if (step % 2 === 0) {
      const bn = song.bass[Math.floor(step / 2) % song.bass.length];
      tone(NOTE(bn), nextTime, beat * 1.8, 'triangle', 0.1, musicBus);
    }
    nextTime += beat;
    step += 1;
  }
}

function setRain(on: boolean): void {
  if (!ctx || !musicBus) return;
  if (on && !rainNode) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    rainNode = ctx.createBufferSource();
    rainNode.buffer = buf;
    rainNode.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.12;
    rainNode.connect(f);
    f.connect(rainGain);
    rainGain.connect(musicBus);
    rainNode.start();
  } else if (!on && rainNode) {
    rainNode.stop();
    rainNode = null;
    rainGain = null;
  }
}

export function setMusic(m: Music, rain = false, force = false): void {
  wantRain = rain;
  if (!force && m === current && !!rainNode === rain) return;
  current = m;
  if (!ctx) return;
  clearInterval(timer);
  setRain(rain);
  if (!m) return;
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  timer = window.setInterval(schedule, 100);
  schedule();
}
