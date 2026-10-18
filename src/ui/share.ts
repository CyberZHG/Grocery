import { drawSprite, drawText } from '../core/assets';
import { money, t } from '../i18n';
import { ACH_TOTAL, unlockedCount } from '../game/achievements';
import type { Game } from '../game/game';
import { LEVELS } from '../game/defs';
import { worldBounds, WorldRenderer } from '../render/world';
import type { UI } from './app';
import { h } from './dom';

export const SITE_URL = 'https://cyberzhg.github.io/Grocery/';
const W = 1200;
const H = 630;
const BAND = 150;

/** Renders the current store with a caption band into a 1200x630 card. */
export async function makeShareImage(game: Game): Promise<HTMLCanvasElement> {
  const font = "'Grocery Digits', 'Pixelify Sans', 'PingFang SC', 'Noto Sans SC', sans-serif";
  await Promise.all([document.fonts.load(`32px ${font}`), document.fonts.load(`600 32px ${font}`)]).catch(() => undefined);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1e1a24';
  ctx.fillRect(0, 0, W, H);

  const b = worldBounds(game.sim.layout);
  const areaH = H - BAND;
  const zoom = Math.min(W / b.w, areaH / b.h);
  const z = zoom >= 1 ? Math.floor(zoom * 2) / 2 : zoom;
  ctx.save();
  ctx.translate(Math.round((W - b.w * z) / 2 - b.x * z), Math.round((areaH - b.h * z) / 2 - b.y * z));
  ctx.scale(z, z);
  const r = new WorldRenderer();
  r.lightAt = 720;
  r.draw(ctx, game.sim, 0, null);
  ctx.restore();

  ctx.fillStyle = 'rgba(20, 24, 34, 0.94)';
  ctx.fillRect(0, H - BAND, W, BAND);
  ctx.fillStyle = '#f0c040';
  ctx.fillRect(0, H - BAND, W, 4);

  const top = H - BAND + 22;
  drawText(ctx, 'Grocery', 34, top + 4, '#3a2a10', 6);
  drawText(ctx, 'Grocery', 30, top, '#f8e08a', 6);
  drawText(ctx, SITE_URL, 32, top + 72, '#9fd8f0', 3);

  const s = game.state;
  const n = unlockedCount(s);
  const rx = 700;
  ctx.save();
  ctx.translate(rx, top - 2);
  ctx.scale(3, 3);
  drawSprite(ctx, 'trophy', 0, 0);
  ctx.restore();
  ctx.fillStyle = '#f8e08a';
  ctx.font = `600 34px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillText(t('share.achievements', { n, total: ACH_TOTAL }), rx + 76, top + 2);
  ctx.fillStyle = '#e8eef0';
  ctx.font = `28px ${font}`;
  ctx.fillText(`${t('hud.day', { n: s.day })} · ${money(s.money)}`, rx + 76, top + 48);
  const lv = LEVELS[s.level];
  ctx.fillStyle = '#a9a0b4';
  ctx.font = `22px ${font}`;
  ctx.fillText(s.level ? t('share.store', { w: lv.w, h: lv.h, n: s.level }) : t('share.storeBase', { w: lv.w, h: lv.h }), rx + 76, top + 88);
  return c;
}

export async function openShare(game: Game, ui: UI): Promise<void> {
  const canvas = await makeShareImage(game);
  const url = canvas.toDataURL('image/png');
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = blob ? new File([blob], `grocery-day${game.state.day}.png`, { type: 'image/png' }) : null;
  const text = t('share.text', { n: unlockedCount(game.state), total: ACH_TOTAL, day: game.state.day, url: SITE_URL });
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const download = () => {
    const a = h('a', { href: url, download: file?.name ?? 'grocery.png' });
    document.body.append(a);
    a.click();
    a.remove();
  };
  const buttons = [h('button', { class: 'btn', onclick: download }, [t('share.download')])];
  if (canShare) {
    buttons.unshift(h('button', {
      class: 'btn primary',
      onclick: () => void navigator.share({ files: [file!], text, title: 'Grocery' }).catch(() => undefined),
    }, [t('share.share')]));
  }
  const body = h('div', { class: 'stack' }, [
    h('img', { class: 'share-img', src: url, alt: text }),
    h('p', { class: 'muted' }, [text]),
  ]);
  ui.modal(t('share.title'), body, buttons, true);
}
