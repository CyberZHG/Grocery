import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/vt323/400.css';
import './style.css';
import { loadAssets } from './core/assets';
import { locale, t } from './i18n';
import { Game } from './game/game';
import { UI } from './ui/app';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  document.documentElement.lang = locale();
  await loadAssets();
  root.replaceChildren();
  const ui = new UI(root);
  const game = new Game(ui);
  ui.attach(game);
  if (import.meta.env.DEV) Object.assign(window, { game, debug: await import('./debug') });
  document.title = `${t('app.title')} · Pixel Supermarket`;
  const loop = (now: number) => {
    game.frame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  setInterval(() => {
    if (document.hidden) game.frame(performance.now(), false);
  }, 500);
}

void boot();
