type Child = Node | string | null | undefined | false;
type Attrs = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, children: Child[] = []): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k in el && typeof v !== 'string') {
      (el as unknown as Record<string, unknown>)[k] = v;
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** A tiny pixel-grid icon drawn in the text colour, so it sits with the pixel font: '1' is a filled pixel. */
export function pixelIcon(rows: string[], px = 2): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const w = rows[0].length;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', String(w * px));
  svg.setAttribute('height', String(rows.length * px));
  svg.setAttribute('viewBox', `0 0 ${w} ${rows.length}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('class', 'pix-icon');
  svg.setAttribute('aria-hidden', 'true');
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      if (row[x] !== '1') continue;
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', '1');
      r.setAttribute('height', '1');
      r.setAttribute('fill', 'currentColor');
      svg.append(r);
    }
  });
  return svg;
}

export const ICON_SOUND = [
  '00001000000', '00011000100', '11111010010', '11111001010', '11111001010', '11111001010', '11111010010', '00011000100', '00001000000',
];
export const ICON_MUTED = [
  '00001000000', '00011000000', '11111010001', '11111001010', '11111000100', '11111001010', '11111010001', '00011000000', '00001000000',
];
export const ICON_STORE = [
  '01111111110', '11010101011', '11111111111', '01000000010', '01011011010', '01011011010', '01000011010', '01000011010', '11111111111',
];
