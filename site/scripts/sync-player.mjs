// Забирает собранное ядро (core/dist) в site/public/player: сайт отдаёт эти файлы на скачивание
// и использует их на страницах-примерах. Запускается автоматически перед `dev` и `build`.
// Ядро о сайте ничего не знает — вся связь односторонняя: сайт → ядро.
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', '..', 'core', 'dist');
const target = join(here, '..', 'public', 'player');
const FILES = ['vidkit-player.js', 'vidkit-player.full.js', 'vidkit-player.esm.js', 'hls.min.js', 'hls.js.LICENSE.txt'];

const missing = FILES.filter((f) => !existsSync(join(dist, f)));
if (missing.length) {
  console.error(`Не найдено собранное ядро (${missing.join(', ')}). Сначала выполните: npm run build:core`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const f of FILES) copyFileSync(join(dist, f), join(target, f));
console.log('Ядро скопировано в site/public/player');
