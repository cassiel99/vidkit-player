// Сборка ядра: npm run build:core  (из корня репозитория) или npm run build (из папки core)
//   dist/vidkit-player.js       — браузерная сборка: один файл, стили внутри; сама заменяет <video controls>
//   dist/vidkit-player.full.js  — то же, но hls.js внутри (+~400 КБ), больше ничего подключать не нужно
//   dist/vidkit-player.esm.js   — ES-модуль для сборщиков (import VidkitPlayer from 'vidkit-player'), без автозамены
//   dist/hls.min.js            — копия hls.js для обычной сборки (кладите рядом со скриптом)
//   dist/hls.js.LICENSE.txt    — лицензия hls.js (Apache-2.0); распространяется вместе с hls.min.js и full-сборкой
// Результат лежит только в core/dist. Ядро не зависит от сайта: сайт сам забирает dist (site/scripts/sync-player.mjs).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const require = createRequire(import.meta.url);
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const common = {
  bundle: true,
  minify: true,
  target: 'es2020',
  loader: { '.css': 'text' },
  legalComments: 'none',
  banner: { js: `/*! Vidkit Player v${pkg.version} */` },
  logLevel: 'warning',
};
const src = (f) => join(root, 'src', f);

await build({ ...common, entryPoints: [src('index.js')], outfile: join(dist, 'vidkit-player.js'), format: 'iife' });
await build({ ...common, banner: { js: `/*! Vidkit Player v${pkg.version} | включает hls.js (Apache-2.0), см. hls.js.LICENSE.txt */` }, entryPoints: [src('full.js')], outfile: join(dist, 'vidkit-player.full.js'), format: 'iife' });
await build({ ...common, entryPoints: [src('module.js')], outfile: join(dist, 'vidkit-player.esm.js'), format: 'esm' });
// hls.js лежит в node_modules (при workspaces — в корне репозитория), ищем через резолвер
copyFileSync(require.resolve('hls.js/dist/hls.min.js'), join(dist, 'hls.min.js'));
// hls.js распространяется под Apache-2.0: текст лицензии должен лежать рядом с его копией
copyFileSync(join(dirname(require.resolve('hls.js/package.json')), 'LICENSE'), join(dist, 'hls.js.LICENSE.txt'));

const FILES = ['vidkit-player.js', 'vidkit-player.full.js', 'vidkit-player.esm.js', 'hls.min.js', 'hls.js.LICENSE.txt'];
for (const f of FILES) console.log(f.padEnd(26), (statSync(join(dist, f)).size / 1024).toFixed(1).padStart(7), 'КБ');
