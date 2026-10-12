import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { statSync } from 'node:fs';

// Размеры файлов плеера для блока «Скачать» берём из реальной сборки (core/dist)
const kb = (file) => {
  try { return Math.round(statSync(new URL(`../core/dist/${file}`, import.meta.url)).size / 1024); } catch { return null; }
};

// Демо-приёмник рекламных пикселей: печатает событие в консоль (только dev/preview).
// На статическом хостинге (GitHub Pages) такой адрес вернёт 404 — для демо это безвредно.
const trackEndpoint = () => {
  const handler = (req, res) => {
    console.log('[трекинг рекламы]', new URL(req.url, 'http://x').searchParams.get('e'));
    res.statusCode = 204;
    res.end();
  };
  return {
    name: 'vidkit-track-endpoint',
    // Блок с фигурными скобками: Vite трактует возвращённую функцию как пост-обработчик, поэтому ничего не возвращаем
    configureServer(server) { server.middlewares.use('/__track', handler); },
    configurePreviewServer(server) { server.middlewares.use('/__track', handler); },
  };
};

export default defineConfig({
  // Относительные пути: сайт работает и в корне домена, и в подпапке GitHub Pages (user.github.io/repo/)
  base: './',
  plugins: [react(), trackEndpoint()],
  define: {
    __PLAYER_SIZES__: JSON.stringify({ lite: kb('vidkit-player.js'), hls: kb('hls.min.js'), full: kb('vidkit-player.full.js') }),
  },
});
