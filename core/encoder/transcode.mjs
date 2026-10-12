// Транскодер: любой видеофайл -> HLS с адаптивным битрейтом (как у YouTube), до 4K.
// Использование: node core/encoder/transcode.mjs <входной_файл> <имя_видео> [--out <папка>]
// Результат:     ./out/<имя_видео>/master.m3u8 + poster.jpg  (папка ./out создаётся в текущей директории)
//
// Качества выше разрешения исходника не создаются (без апскейла).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const positional = [];
let outDir = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') outDir = argv[++i];
  else positional.push(argv[i]);
}
const [input, name = 'video'] = positional;
if (!input) {
  console.error('Использование: node core/encoder/transcode.mjs <входной_файл> <имя_видео> [--out <папка>]');
  process.exit(1);
}

// Лесенка качеств. Ключевые кадры выровнены (-g), чтобы плеер мог
// переключаться между качествами без артефактов.
const FULL_LADDER = [
  { h: 2160, v: '16000k', max: '17000k', buf: '24000k', a: '192k' },
  { h: 1440, v: '9000k',  max: '9600k',  buf: '13500k', a: '192k' },
  { h: 1080, v: '5000k',  max: '5350k',  buf: '7500k',  a: '192k' },
  { h: 720,  v: '2800k',  max: '3000k',  buf: '4200k',  a: '128k' },
  { h: 480,  v: '1400k',  max: '1500k',  buf: '2100k',  a: '128k' },
  { h: 360,  v: '800k',   max: '856k',   buf: '1200k',  a: '96k'  },
];
const FPS = 30;
const SEGMENT = 4;

function probe(streamSelector, entries) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', streamSelector,
    '-show_entries', `stream=${entries}`, '-of', 'json', input], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  try { return JSON.parse(r.stdout).streams || []; } catch { return null; }
}

const vInfo = probe('v:0', 'width,height');
if (!vInfo || !vInfo.length) {
  console.error('Не удалось прочитать видеопоток. Файл существует и это видео? ffprobe установлен?');
  process.exit(1);
}
const srcH = vInfo[0].height;
const hasAudio = (probe('a:0', 'codec_type') || []).length > 0;

// Берём качества не выше исходника (допуск 5% на нестандартные размеры); минимум — одно.
let LADDER = FULL_LADDER.filter((l) => l.h <= srcH * 1.05);
if (!LADDER.length) LADDER = [FULL_LADDER[FULL_LADDER.length - 1]];
console.log(`Исходник: ${vInfo[0].width}x${vInfo[0].height}, звук: ${hasAudio ? 'есть' : 'нет'}. Качества: ${LADDER.map((l) => l.h + 'p').join(', ')}`);

const out = join(resolve(outDir || 'out'), name);
mkdirSync(out, { recursive: true });

const split = LADDER.map((_, i) => `[s${i}]`).join('');
const filter =
  `[0:v]fps=${FPS},split=${LADDER.length}${split};` +
  LADDER.map((l, i) => `[s${i}]scale=-2:${l.h}:flags=lanczos,format=yuv420p[v${i}]`).join(';');

const args = ['-y', '-hide_banner', '-loglevel', 'warning', '-i', input, '-filter_complex', filter];
LADDER.forEach((l, i) => {
  args.push(
    '-map', `[v${i}]`, `-c:v:${i}`, 'libx264', `-preset`, 'veryfast', `-profile:v:${i}`, 'high',
    `-b:v:${i}`, l.v, `-maxrate:v:${i}`, l.max, `-bufsize:v:${i}`, l.buf,
    '-g', String(FPS * SEGMENT), '-keyint_min', String(FPS * SEGMENT), '-sc_threshold', '0',
  );
});
if (hasAudio) {
  LADDER.forEach((l, i) => {
    args.push('-map', '0:a:0', `-c:a:${i}`, 'aac', `-b:a:${i}`, l.a, `-ar:a:${i}`, '48000', `-ac:a:${i}`, '2');
  });
}
args.push(
  '-f', 'hls', '-hls_time', String(SEGMENT), '-hls_playlist_type', 'vod',
  '-hls_flags', 'independent_segments', '-hls_segment_type', 'mpegts',
  '-master_pl_name', 'master.m3u8',
  '-hls_segment_filename', join(out, '%v_%03d.ts'),
  '-var_stream_map', LADDER.map((l, i) => `v:${i}${hasAudio ? `,a:${i}` : ''},name:${l.h}p`).join(' '),
  join(out, '%v.m3u8'),
);

console.log(`Кодирую ${input} -> ${out}`);
let r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

// Постер из 2-й секунды (или с начала для коротких файлов)
r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '2', '-i', input,
  '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', join(out, 'poster.jpg')], { stdio: 'inherit' });
if (r.status !== 0) {
  spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', input,
    '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', join(out, 'poster.jpg')], { stdio: 'inherit' });
}

writeFileSync(join(out, 'info.json'), JSON.stringify({ name, ladder: LADDER.map((l) => `${l.h}p`) }, null, 2));
console.log('Готово:', join(out, 'master.m3u8'));
