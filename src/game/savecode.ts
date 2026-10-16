import { migrate, type GameState } from './state';

const PREFIX = 'GROCERY2.';
const KEY = 'pixel-grocery-store';

/** Light obfuscation only: deflate, XOR with a rolling key, then base64. Not meant to resist tampering. */
function xor(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ ((KEY.charCodeAt(i % KEY.length) + i * 7) & 0xff);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const buf = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodeSave(s: GameState): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(s));
  return PREFIX + toBase64(xor(await pipe(raw, new CompressionStream('deflate-raw'))));
}

export async function decodeSave(code: string): Promise<GameState | null> {
  try {
    const body = code.trim().replace(/\s+/g, '');
    if (!body.startsWith(PREFIX)) return null;
    const raw = await pipe(xor(fromBase64(body.slice(PREFIX.length))), new DecompressionStream('deflate-raw'));
    return migrate(JSON.parse(new TextDecoder().decode(raw)));
  } catch {
    return null;
  }
}
