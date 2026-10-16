import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
});
