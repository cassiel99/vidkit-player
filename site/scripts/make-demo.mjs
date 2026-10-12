// Создаёт демо-материалы сайта: 4K-ролик в HLS-лесенке, MP4-клип и рекламные ролики с VAST.
// Они не хранятся в git (большие файлы), поэтому создаются командой:  npm run demo
//
//   node site/scripts/make-demo.mjs [--out <папка>] [--force]
//
// Это материалы сайта (не ядра). По умолчанию кладёт всё в site/public/media и пропускает уже созданное (--force — пересоздать).
// Нужны ffmpeg и ffprobe в PATH.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const force = argv.includes('--force');
const outIdx = argv.indexOf('--out');
const MEDIA = outIdx >= 0 ? resolve(argv[outIdx + 1]) : join(here, '..', 'public', 'media');

for (const tool of ['ffmpeg', 'ffprobe']) {
  const r = spawnSync(tool, ['-version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    console.error(`Не найден ${tool}. Установите ffmpeg (https://ffmpeg.org) и добавьте в PATH.`);
    process.exit(1);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'vidkit-demo-'));
const ffmpeg = (args) => {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg завершился с ошибкой');
};

// Шрифт для надписей на рекламных роликах (кириллица). Не нашли — делаем ролики без текста.
const FONTS = [
  'C:/Windows/Fonts/arialbd.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
];
const font = FONTS.find((f) => existsSync(f));
if (!font) console.warn('Шрифт для надписей не найден — рекламные ролики будут без текста.');
const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');

function drawText(file, text, size, y, extra = '') {
  if (!font) return '';
  const tf = join(tmp, file);
  writeFileSync(tf, text, 'utf8');
  return `drawtext=fontfile='${esc(font)}':textfile='${esc(tf)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.35:shadowx=3:shadowy=3${extra}`;
}

function ad(name, seconds, c0, c1, text, freq) {
  const file = join(MEDIA, 'ads', name);
  if (existsSync(file) && !force) return console.log('пропуск (уже есть):', name);
  mkdirSync(dirname(file), { recursive: true });
  const filters = [drawText(`${name}.txt`, text, 64, '(h-text_h)/2', ':line_spacing=14'), 'format=yuv420p'].filter(Boolean).join(',');
  ffmpeg([
    '-f', 'lavfi', '-i', `gradients=s=1280x720:d=${seconds}:r=30:c0=${c0}:c1=${c1}:speed=0.06:n=2`,
    '-f', 'lavfi', '-i', `sine=f=${freq}:d=${seconds}`,
    '-vf', filters,
    '-af', `volume=0.12,afade=t=in:d=0.3,afade=t=out:st=${seconds - 1}:d=1`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', file,
  ]);
  console.log('создан ролик:', name);
}

try {
  /* 1. Основное демо: 30 секунд 4K -> HLS-лесенка */
  const demoDir = join(MEDIA, 'demo');
  if (existsSync(join(demoDir, 'master.m3u8')) && !force) console.log('пропуск (уже есть): demo/');
  else {
    const src = join(tmp, 'demo-4k.mp4');
    console.log('Генерирую исходник 4K (это займёт около минуты)…');
    ffmpeg([
      '-f', 'lavfi', '-i', 'gradients=s=3840x2160:d=30:r=30:speed=0.03:n=4',
      '-f', 'lavfi', '-i', 'sine=f=220:d=30', '-f', 'lavfi', '-i', 'sine=f=330:d=30',
      '-filter_complex', '[1:a][2:a]amix=inputs=2,volume=0.25[a]',
      '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-c:a', 'aac', src,
    ]);
    const r = spawnSync('node', [join(here, '..', '..', 'core', 'encoder', 'transcode.mjs'), src, 'demo', '--out', MEDIA], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('Кодирование демо не удалось');
  }

  /* 2. Обычный MP4 для демонстрации автоподключения <video controls> */
  const clip = join(MEDIA, 'demo-clip.mp4');
  if (existsSync(clip) && !force) console.log('пропуск (уже есть): demo-clip.mp4');
  else {
    mkdirSync(MEDIA, { recursive: true });
    ffmpeg([
      '-f', 'lavfi', '-i', 'gradients=s=1280x720:d=20:r=30:c0=0x1d2671:c1=0xff3d57:speed=0.05:n=3',
      '-f', 'lavfi', '-i', 'sine=f=262:d=20',
      '-af', 'volume=0.15,afade=t=in:d=0.4,afade=t=out:st=19:d=1',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', clip,
    ]);
    console.log('создан клип: demo-clip.mp4');
  }

  /* 3. Реклама: два ролика и VAST-файл */
  ad('ad1.mp4', 8, '0x1d2671', '0xc33764', 'Здесь может быть\nваша реклама', 440);
  ad('ad2.mp4', 6, '0x0f9b8e', '0x1a2a6c', 'Ещё один рекламный\nролик в пакете', 330);

  const vast = join(MEDIA, 'ads', 'vast-demo.xml');
  if (!existsSync(vast) || force) {
    // Пути в VAST считаются от страницы, а не от самого файла. Пиксели ведут на /__track (его слушает Vite).
    writeFileSync(vast, `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="demo-1">
    <InLine>
      <AdSystem>Vidkit Demo</AdSystem>
      <AdTitle>Демо-реклама (VAST)</AdTitle>
      <Impression><![CDATA[__track?e=impression]]></Impression>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:03">
            <Duration>00:00:06</Duration>
            <TrackingEvents>
              <Tracking event="start"><![CDATA[__track?e=start]]></Tracking>
              <Tracking event="complete"><![CDATA[__track?e=complete]]></Tracking>
              <Tracking event="skip"><![CDATA[__track?e=skip]]></Tracking>
            </TrackingEvents>
            <VideoClicks>
              <ClickThrough><![CDATA[https://example.com/?from=vast]]></ClickThrough>
            </VideoClicks>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720"><![CDATA[media/ads/ad2.mp4]]></MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>
`);
    console.log('создан VAST: ads/vast-demo.xml');
  }
  console.log('\nГотово:', MEDIA);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
