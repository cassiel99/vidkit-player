// Данные и тексты сайта вынесены сюда, чтобы компоненты оставались короткими.
// BASE_URL — корень сайта (работает и в подпапке GitHub Pages).
export const BASE = import.meta.env.BASE_URL;
export const url = (path) => BASE + path;

export const NAV = [
  { href: '#demo', label: 'Демо' },
  { href: '#auto', label: 'Автоподключение' },
  { href: '#4k', label: '4K' },
  { href: '#ads', label: 'Реклама' },
  { href: '#install', label: 'Установка' },
  { href: '#api', label: 'API' },
];

// Реклама в демо: pre-roll и mid-roll из VAST
export const DEMO_ADS = [
  { type: 'preroll', src: url('media/ads/ad1.mp4'), skipAfter: 5, clickUrl: 'https://example.com/?utm_source=vidkit-demo', title: 'Демо-реклама' },
  { type: 'midroll', at: 12, vast: url('media/ads/vast-demo.xml') },
];

export const LADDER = [
  { q: '4K · 2160p', v: '16 Мбит/с', a: '192 кбит/с', who: 'Быстрый интернет, 4K-экран, полный экран', top: true },
  { q: '1440p', v: '9 Мбит/с', a: '192 кбит/с', who: 'Большой монитор' },
  { q: '1080p', v: '5 Мбит/с', a: '192 кбит/с', who: 'Обычный быстрый интернет' },
  { q: '720p', v: '2.8 Мбит/с', a: '128 кбит/с', who: 'Wi-Fi' },
  { q: '480p', v: '1.4 Мбит/с', a: '128 кбит/с', who: 'Мобильная сеть' },
  { q: '360p', v: '0.8 Мбит/с', a: '96 кбит/с', who: 'Слабый сигнал' },
];

export const SHORTCUTS = [
  [['Space', 'K'], 'пауза / пуск'],
  [['←', '→'], '±5 секунд'],
  [['J', 'L'], '±10 секунд'],
  [['↑', '↓'], 'громкость'],
  [['0–9'], 'перейти к 0–90%'],
  [['M'], 'звук вкл/выкл'],
  [['F'], 'полный экран'],
  [['T'], 'кинотеатр'],
  [['I'], 'картинка в картинке'],
  [['Shift', '.', ','], 'скорость'],
  [['S'], 'статистика'],
  [['Home', 'End'], 'начало / конец'],
];

export const API = {
  options: [
    ['src', 'ссылка на master.m3u8 или обычный MP4'],
    ['poster, title', 'обложка и название'],
    ['autoplay, muted, loop', 'запуск сразу (если браузер запретил — без звука), без звука, зациклить'],
    ['ads', 'список реклам, формат выше'],
    ['hlsUrl', 'путь к hls.js, если лежит не рядом со скриптом'],
    ['capToPlayerSize', 'авто-качество не выше размера окна (по умолчанию true)'],
    ['adTimeout', 'сколько ждать загрузки рекламы, мс (по умолчанию 8000)'],
  ],
  methods: [
    ['play() pause() toggle()', 'управление воспроизведением'],
    ['seekTo(с) seekBy(с)', 'перемотка'],
    ['setVolume(0…1) setMuted()', 'звук'],
    ['setRate(x)', 'скорость'],
    ['getQualities()', 'список качеств'],
    ["setQuality('auto' | 2160)", 'выбор качества'],
    ['load(src)', 'загрузить другое видео'],
    ['setAds(список)', 'заменить рекламу'],
    ['skipAd(force?)', 'пропустить рекламу'],
    ['on() off() destroy()', 'подписка и очистка'],
  ],
  events: [
    ['ready', 'плейлист загружен, доступны качества'],
    ['play pause ended', 'состояние видео'],
    ['qualitychange', 'сменилось качество'],
    ['adbreakstart / adbreakend', 'начало и конец рекламного блока'],
    ['adstart / adend', 'показ ролика начался / закончился'],
    ['adskip', 'зритель пропустил рекламу'],
    ['adclick', 'нажали «Подробнее»'],
    ['aderror', 'реклама не загрузилась'],
    ['error', 'ошибка видео'],
  ],
};

/* ---------- Примеры кода ---------- */
export const CODE = {
  hero: `<script src="vidkit-player.js"></script>
<video controls src="video.mp4"></video>`,

  auto: `<script src="/vidkit/vidkit-player.js"></script>

<!-- Ваш обычный тег. Больше ничего менять не нужно -->
<video controls
       src="/video/movie.mp4"
       poster="/video/poster.jpg"></video>`,

  autoConfig: `<script>
  window.VidkitPlayerConfig = {
    // реклама для всех видео
    ads: [{ type: 'preroll',
            src: '/ads/intro.mp4' }],
    // auto: false,   // отключить
  };
</script>
<script src="/vidkit/vidkit-player.js"></script>

<!-- исключить:   data-vidkit="off" -->
<!-- принудительно: data-vidkit="on" -->`,

  tag: `<script src="/vidkit/vidkit-player.js"></script>

<vidkit-player
  src="/video/master.m3u8"
  poster="/video/poster.jpg"
  title="Моё видео">
</vidkit-player>`,

  js: `const player = new VidkitPlayer('#mount', {
  src: '/video/master.m3u8',
  poster: '/video/poster.jpg',
  ads: [{ type: 'preroll', src: '/ads/intro.mp4', skipAfter: 5 }],
});

player.on('qualitychange', (q) => console.log(q.height));
player.setQuality(2160);   // или 'auto'`,

  react: `import { useEffect, useRef } from 'react';
import VidkitPlayer from 'vidkit-player';

export function Video({ src, poster }) {
  const mount = useRef(null);

  useEffect(() => {
    const player = new VidkitPlayer(mount.current, { src, poster });
    return () => player.destroy();      // обязательно при размонтировании
  }, [src, poster]);

  return <div ref={mount} />;
}`,

  ads: `const player = new VidkitPlayer('#player', {
  src: 'video/master.m3u8',
  ads: [
    { type: 'preroll', src: 'ads/intro.mp4',
      skipAfter: 5, clickUrl: 'https://example.com' },
    { type: 'midroll', at: '50%',
      vast: 'https://ads.example.com/vast.xml' },
    { type: 'postroll', src: 'ads/outro.mp4', skipAfter: null },
  ],
});

player.on('adstart', ({ index, total }) => console.log('Реклама', index, total));
player.on('adskip',  () => console.log('Пропущена'));`,

  encoder: `# Видео -> HLS (качества до разрешения исходника, максимум 4K)
node core/encoder/transcode.mjs путь/к/видео.mp4 моё-видео

# Результат: ./out/моё-видео/master.m3u8 + poster.jpg`,
};
