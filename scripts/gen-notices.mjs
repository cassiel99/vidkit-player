// Собирает THIRD_PARTY_NOTICES.md: список сторонних библиотек, которые попадают в браузер посетителя
// (сайт и плеер), с их лицензиями и полными текстами. Запуск: npm run notices
// Инструменты сборки (Vite, esbuild) в браузер не попадают и здесь не перечислены.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['react', 'react-dom', 'hls.js', 'lucide-react', 'prism-react-renderer'];
const seen = new Map();

const locate = (name) => [join(root, 'node_modules', name), join(root, 'site', 'node_modules', name), join(root, 'core', 'node_modules', name)]
  .find((p) => existsSync(join(p, 'package.json')));

function walk(name) {
  if (seen.has(name)) return;
  const dir = locate(name);
  if (!dir) throw new Error(`Не найден пакет ${name}. Выполните npm install.`);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = readdirSync(dir).find((f) => /^licen[sc]e(\.(md|txt))?$/i.test(f));
  seen.set(name, {
    version: pkg.version,
    license: typeof pkg.license === 'string' ? pkg.license : (pkg.license && pkg.license.type) || 'см. пакет',
    homepage: (pkg.homepage || (pkg.repository && (pkg.repository.url || pkg.repository)) || '').toString().replace(/^git\+/, '').replace(/\.git$/, ''),
    text: file ? readFileSync(join(dir, file), 'utf8').trim() : '(файл лицензии в пакете отсутствует)',
  });
  Object.keys(pkg.dependencies || {}).forEach(walk);
}
ROOTS.forEach(walk);

const names = [...seen.keys()].sort();
let md = `# Сторонние компоненты

Vidkit использует открытые библиотеки. Ниже перечислено то, что попадает в браузер посетителя (плеер и сайт), с лицензиями и их полными текстами.
Файл создаётся командой \`npm run notices\`; не редактируйте его вручную.

| Пакет | Версия | Лицензия |
|---|---|---|
${names.map((n) => `| ${n} | ${seen.get(n).version} | ${seen.get(n).license} |`).join('\n')}

Иконки сайта: [Lucide](https://lucide.dev) (ISC). Плеер распространяется вместе с hls.js (Apache-2.0): полный текст лежит рядом с \`hls.min.js\` в файле \`hls.js.LICENSE.txt\`.

---
`;
for (const n of names) {
  const i = seen.get(n);
  md += `\n## ${n} ${i.version} (${i.license})\n${i.homepage ? `\n${i.homepage}\n` : ''}\n\`\`\`text\n${i.text}\n\`\`\`\n`;
}
writeFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), md);
console.log(`THIRD_PARTY_NOTICES.md: ${names.length} пакетов`);
