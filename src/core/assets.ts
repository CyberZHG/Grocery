import atlasData from '../data/atlas.json';

const base = import.meta.env.BASE_URL;
const atlasUrl = `${base}assets/atlas.png?v=${__BUILD__}`;
const productsUrl = `${base}assets/products.png?v=${__BUILD__}`;
const charsUrl = `${base}assets/chars.png?v=${__BUILD__}`;
const smallUrl = `${base}assets/products_small.png?v=${__BUILD__}`;

export type Rect = [number, number, number, number];

export interface Assets {
  atlas: HTMLImageElement;
  products: HTMLImageElement;
  chars: HTMLImageElement;
  small: HTMLImageElement;
}

let assets: Assets;
const rects = atlasData.rects as unknown as Record<string, Rect>;
const fontChars = atlasData.font;
const tinted = new Map<string, HTMLCanvasElement>();

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadAssets(): Promise<void> {
  const [atlas, products, chars, small] = await Promise.all([load(atlasUrl), load(productsUrl), load(charsUrl), load(smallUrl)]);
  assets = { atlas, products, chars, small };
}

export function rect(name: string): Rect {
  const r = rects[name];
  if (!r) throw new Error(`Missing sprite ${name}`);
  return r;
}

export function hasSprite(name: string): boolean {
  return name in rects;
}

export function drawSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, flip = false, scale = 1): void {
  const [sx, sy, w, h] = rect(name);
  blit(ctx, assets.atlas, sx, sy, w, h, x, y, flip, scale);
}

export function drawProduct(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, scale = 1): void {
  blit(ctx, assets.products, (index % 20) * 32, Math.floor(index / 20) * 32, 32, 32, x, y, false, scale);
}

export function drawProductSmall(ctx: CanvasRenderingContext2D, index: number, x: number, y: number): void {
  blit(ctx, assets.small, (index % 20) * 16, Math.floor(index / 20) * 16, 16, 16, x, y, false);
}

export const CHAR_W = 32;
export const CHAR_H = 48;

export type Expression = 'happy' | 'sad' | null;

export function drawChar(ctx: CanvasRenderingContext2D, row: number, dir: 'down' | 'up' | 'left' | 'right', frame: number, x: number, y: number, expr: Expression = null): void {
  // Expressions only exist for the front view: columns 9-11 happy, 12-14 upset.
  const base = dir === 'down' ? (expr === 'happy' ? 9 : expr === 'sad' ? 12 : 0) : dir === 'up' ? 6 : 3;
  const col = base + frame;
  blit(ctx, assets.chars, col * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H, x, y, dir === 'left');
}

function blit(ctx: CanvasRenderingContext2D, img: CanvasImageSource, sx: number, sy: number, w: number, h: number, x: number, y: number, flip: boolean, scale = 1): void {
  const dw = w * scale;
  const dh = h * scale;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x) + dw, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, w, h, 0, 0, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, sx, sy, w, h, Math.round(x), Math.round(y), dw, dh);
  }
}

function fontFor(color: string): HTMLCanvasElement {
  let c = tinted.get(color);
  if (c) return c;
  const [fx, fy, fw, fh] = rect('font');
  c = document.createElement('canvas');
  c.width = fw;
  c.height = fh;
  const g = c.getContext('2d')!;
  g.drawImage(assets.atlas, fx, fy, fw, fh, 0, 0, fw, fh);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, fw, fh);
  tinted.set(color, c);
  return c;
}

export function textWidth(s: string, scale = 1): number {
  return s.length * 6 * scale - scale;
}

export function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color = '#ffffff', scale = 1): void {
  const img = fontFor(color);
  let cx = Math.round(x);
  for (const raw of s) {
    let i = fontChars.indexOf(raw);
    if (i < 0) i = fontChars.indexOf(raw.toUpperCase());
    if (i >= 0) ctx.drawImage(img, i * 6, 0, 5, 8, cx, Math.round(y), 5 * scale, 8 * scale);
    cx += 6 * scale;
  }
}
