# Vidkit Player: ядро

Это ядро репозитория: плеер и кодировщик. Оно не зависит от сайта (`../site`) и может использоваться отдельно.

Встраиваемый видеоплеер для сайтов: HLS с адаптивным качеством **до 4K**, реклама **pre / mid / post-roll** с кнопкой **«Пропустить рекламу»**, поддержка **VAST**, горячие клавиши как на YouTube. Без фреймворков и без сборки на стороне вашего сайта.

## Быстрый старт

Положите `vidkit-player.js` и `hls.min.js` в одну папку на сайте и подключите скрипт. Больше ничего не нужно (рядом с `hls.min.js` оставьте `hls.js.LICENSE.txt`: это лицензия hls.js, Apache-2.0):

```html
<script src="/vidkit/vidkit-player.js"></script>

<!-- Ваши обычные видео станут Vidkit Player сами -->
<video controls src="/video/movie.mp4" poster="/video/poster.jpg"></video>
```

Стили встроены в скрипт. `hls.min.js` плеер подгружает сам (из папки рядом со скриптом, потом с CDN). Если нужен один файл, берите `vidkit-player.full.js`: hls.js уже внутри.

| Файл (`dist/`) | Размер | Для чего |
|---|---|---|
| `vidkit-player.js` | ~51 КБ | браузерная сборка (+ `hls.min.js` рядом); сама заменяет `<video controls>` |
| `vidkit-player.full.js` | ~435 КБ | то же, всё в одном файле (включает hls.js, лицензия в `hls.js.LICENSE.txt`) |
| `vidkit-player.esm.js` | ~51 КБ | ES-модуль для сборщиков (React, Vue…), **без** автозамены |

## Автоподключение

Скрипт при загрузке страницы находит `<video>` и заменяет подходящие на плеер. Новые видео, добавленные позже (AJAX, динамические блоки), тоже подхватываются.

| Видео | Что произойдёт |
|---|---|
| `<video controls src="a.mp4">` | заменяется |
| `<video controls><source src="a.m3u8"></video>` | заменяется (HLS в приоритете: качество до 4K) |
| `<video autoplay muted loop>` без `controls` | **не трогаем**: это фоновое видео без плеера |
| `<video controls>` с `<track>` | **не трогаем**: плеер пока не показывает субтитры |
| `<video data-vidkit="off">` | исключено автором |
| `<video data-vidkit="on">` | заменяется принудительно |

Из `<video>` переносятся: `src`/`<source>`, `poster`, `title`/`aria-label`, `autoplay`, `muted`, `loop`, `id`, `class`, `style`, `width`/`height`. Заменённый элемент — это `<vidkit-player>`; у него есть `play()`, `pause()`, `paused`, `currentTime`, `duration`, `volume`, `muted`, а сам плеер лежит в `el.player`. Если ваш код хранил ссылку на прежний `<video>`, получите элемент заново: `document.getElementById(...)`.

**Настройки для всех видео** (определите до подключения скрипта):

```html
<script>
  window.VidkitPlayerConfig = {
    ads: [{ type: 'preroll', src: '/ads/intro.mp4', skipAfter: 5 }], // реклама для всех
    // auto: false,            // выключить автозамену
    // hlsUrl: '/vidkit/hls.min.js',
    // capToPlayerSize: true, adTimeout: 8000,
  };
</script>
<script src="/vidkit/vidkit-player.js"></script>
```

Автозамену можно выключить и атрибутом на скрипте: `<script src="vidkit-player.js" data-auto="false">`. Реклама для одного видео: `<video controls data-ads='[{"type":"preroll","src":"ad.mp4"}]'>` (главнее общего конфига).

Вручную: `VidkitPlayer.autoInit(контейнер)` заменяет подходящие видео внутри контейнера, `VidkitPlayer.upgrade(videoElement)` — одно видео.

> В ES-модуле (`vidkit-player.esm.js`) автозамены нет: фреймворки сами управляют своим DOM, и неожиданная замена узлов им вредит. Нужна — вызовите `autoInit(контейнер)` вручную, на элементах, которыми не управляет фреймворк.

## Тег `<vidkit-player>`

```html
<script src="/vidkit/vidkit-player.js"></script>
<vidkit-player src="/video/master.m3u8" poster="/video/poster.jpg" title="Моё видео"></vidkit-player>
```

Атрибуты: `src poster title autoplay muted loop hls-url ads` (JSON). Реклама также свойством: `el.ads = [...]`.

## Из JavaScript

```js
const player = new VidkitPlayer('#mount', {
  src: '/video/master.m3u8',
  poster: '/video/poster.jpg',
});

player.on('qualitychange', (q) => console.log(q.height));
player.setQuality(2160); // или 'auto'
player.destroy();        // при удалении компонента
```

React:

```jsx
import { useEffect, useRef } from 'react';
import VidkitPlayer from 'vidkit-player';

export function Video({ src, poster }) {
  const mount = useRef(null);
  useEffect(() => {
    const player = new VidkitPlayer(mount.current, { src, poster });
    return () => player.destroy();
  }, [src, poster]);
  return <div ref={mount} />;
}
```

Готовый пример такой обёртки лежит в сайте: `site/src/components/VideoPlayer.jsx`.

## Реклама

```js
new VidkitPlayer('#mount', {
  src: '/video/master.m3u8',
  ads: [
    { type: 'preroll',  src: '/ads/intro.mp4', skipAfter: 5, clickUrl: 'https://example.com' },
    { type: 'midroll',  at: '50%', vast: 'https://ads.example.com/vast.xml' },
    { type: 'postroll', src: '/ads/outro.mp4', skipAfter: null },
  ],
});
```

| Поле | Описание |
|---|---|
| `type` | `'preroll'` (по умолчанию), `'midroll'`, `'postroll'` |
| `at` | только для midroll: `30`, `'50%'`, `'1:30'` |
| `src` | видео рекламы: MP4 или HLS |
| `vast` | VAST-ссылка вместо `src` (InLine, Wrapper, `skipoffset`, ClickThrough, пиксели) |
| `skipAfter` | через сколько секунд появится «Пропустить» (по умолчанию 5); `null` — нельзя пропустить |
| `clickUrl` | куда ведёт «Подробнее» (только http/https) |
| `impression` | пиксель(и) показа |

Как это работает:

- Несколько реклам одного места показываются подряд: «Реклама · 1 из 2».
- Pre-roll запускается при первом нажатии на play, а не при загрузке страницы.
- Mid-roll отмечен жёлтой меткой на полосе. Если зритель перемотал через несколько вставок, показывается одна (последняя), остальные считаются показанными. При возобновлении просмотра пройденные mid-roll не повторяются.
- Если ролик не загрузился за `adTimeout` (8 с) или упал с ошибкой, он пропускается, видео продолжается.
- Во время рекламы перемотка, скорость, качество и режим кинотеатра отключены. Доступны пауза, звук и полный экран.
- Для VAST сервер рекламы должен отдавать CORS-заголовки. Пиксели Impression, start, firstQuartile, midpoint, thirdQuartile, complete, skip, pause, resume, error и ClickTracking отправляются автоматически.

## API

**Опции:** `src`, `poster`, `title`, `autoplay`, `muted`, `loop`, `resume` (запоминать место просмотра, по умолчанию `true`), `ads`, `hlsUrl`, `capToPlayerSize` (по умолчанию `true`: авто-качество не выше размера окна, поэтому 4K не качается в маленьком плеере), `adTimeout`.

**Методы:** `play() pause() toggle() seekTo(с) seekBy(с) setVolume(0..1) setMuted(bool) setRate(x) getQualities() setQuality('auto'|высота) getQuality() load(src) setAds(список) isPlayingAd() skipAd(force?) on(событие, fn) off(событие, fn?) destroy()`, а также `player.video` — нативный `<video>`.

**События:** `ready`, `play`, `pause`, `ended`, `qualitychange`, `theater`, `error`, `adbreakstart`, `adbreakend`, `adstart`, `adend`, `adskip`, `adclick`, `aderror`.

Типы TypeScript: `types/index.d.ts`.

## Оформление

Цвет акцента меняется CSS-переменной: `vidkit-player { --vp-accent: #4f8cff; }`. Размер определяется контейнером (соотношение 16:9).

## Горячие клавиши

`Space`/`K` пауза · `←` `→` ±5 с · `J` `L` ±10 с · `↑` `↓` громкость · `0`–`9` переход к 0–90% · `M` звук · `F` полный экран · `T` кинотеатр · `I` картинка в картинке · `Shift`+`.`/`,` скорость · `S` статистика · `Home` `End`. Двойной клик по краю видео — ±10 с. Работают и с русской раскладкой.

## Подготовка видео

Плееру нужен HLS-поток (`master.m3u8` + сегменты). Кодировщик из этого репозитория делает его из любого файла:

```
npm run encode -- видео.mp4 имя        # из корня репозитория; результат в ./out/имя/
```

Создаются качества до разрешения исходника: 2160p, 1440p, 1080p, 720p, 480p, 360p (H.264 + AAC). Обычные MP4 тоже играют, но без выбора качества.

## Сборка из исходников

```
npm install          # из корня репозитория (workspaces)
npm run build:core   # результат только в core/dist
```

Исходники: `src/player.js` (плеер), `src/ads.js` (реклама), `src/vast.js` (VAST), `src/auto.js` (автоподключение), `src/element.js` (`<vidkit-player>`), `src/player.css`. Запускаемые примеры подключения лежат в сайте: `site/public/examples/` (`auto.html`, `minimal.html`, `with-ads.html`; после `npm run dev` доступны по адресу `/examples/…`). Они используют ядро и демо-видео сайта.

## Совместимость

Проверено в Chrome (Windows). Остальные современные браузеры должны работать через hls.js (MSE), а Safari/iPhone — через нативный HLS (без выбора качества), но это пока не тестировалось.
4K в H.264 требует аппаратной поддержки на устройстве зрителя; если её нет, плеер в авто-режиме выберет качество ниже.

Пакет `vidkit-player` пока не опубликован в npm: подключайте файлы из `dist/` или `npm i ./core`.

## Лицензия

MIT, см. [LICENSE](../LICENSE) в корне репозитория. Сторонние компоненты (в том числе hls.js, Apache-2.0): [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
