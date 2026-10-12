# Сайт Vidkit Player

Сайт-презентация ядра (`../core`): демо плеера, автоподключение «до / после», таблица качеств до 4K, реклама, пошаговая установка и API. React 18 + Vite.

Сайт — потребитель ядра: он подключает его как зависимость `vidkit-player` (npm workspaces) и ничего в ядре не меняет.

## Команды

Запускать из корня репозитория:

```bash
npm run demo      # демо-видео и реклама → site/public/media (нужен ffmpeg)
npm run dev       # собирает ядро и запускает сайт на http://localhost:5173
npm run build     # собирает ядро и сайт → site/dist
npm run preview   # показывает собранный сайт
```

Перед `dev` и `build` скрипт `scripts/sync-player.mjs` копирует собранное ядро (`core/dist`) в `site/public/player`: оттуда же посетители скачивают файлы плеера. Если ядро не собрано, скрипт подскажет выполнить `npm run build:core`.

## Структура

```
src/
  components/   Header, Hero, Demo, Features, AutoConnect, Quality, Ads, Install, Api, Encoder, Footer
                общие: CodeBlock, Tabs, Section, Logo; VideoPlayer — обёртка ядра для React
  hooks/        useEventLog (журнал событий в демо)
  data.js       тексты, таблицы и примеры кода
  styles/       base.css (токены, шапка, кнопки), blocks.css (остальные блоки, адаптив)
public/
  examples/     запускаемые примеры подключения (auto.html, minimal.html, with-ads.html)
  media/        демо-видео — создаётся `npm run demo`, в git не хранится
  player/       копия core/dist — создаётся при сборке, в git не хранится
scripts/        make-demo.mjs, sync-player.mjs
```

## Заметки

- Иконки: [Lucide](https://lucide.dev) (набор SVG, лицензия ISC).
- Демо-плеер и hls.js вынесены в отдельный фрагмент (`React.lazy`), чтобы не задерживать первый экран.
- Пути относительные (`base: './'`): сайт работает и в корне домена, и в подпапке GitHub Pages.
- Демо-пиксели рекламы (`__track?e=…`) принимает dev- и preview-сервер Vite (см. `vite.config.js`); на статическом хостинге они дадут 404, это безвредно.
