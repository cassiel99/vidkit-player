import { Braces, CircleCheck, Code2, Download, FileCode2, Package, Sparkles, Terminal } from 'lucide-react';
import Section from './Section.jsx';
import CodeBlock from './CodeBlock.jsx';
import Tabs from './Tabs.jsx';
import { CODE, url } from '../data.js';

// Размеры подставляются при сборке из реальных файлов core/dist (см. vite.config.js)
const SIZES = typeof __PLAYER_SIZES__ !== 'undefined' ? __PLAYER_SIZES__ : {};
const kb = (n) => (n ? `≈ ${n} КБ` : '');

const FILES = [
  { name: 'vidkit-player.js', badge: 'Нужен', size: kb(SIZES.lite), text: 'Сам плеер. Стили внутри, автозамена <video> включена.', href: 'player/vidkit-player.js', main: true },
  { name: 'hls.min.js', badge: 'Для HLS', size: kb(SIZES.hls), text: 'Кладите рядом: плеер подгрузит его сам. Нужен для адаптивного качества.', href: 'player/hls.min.js' },
  { name: 'vidkit-player.full.js', badge: 'Вместо двух', size: kb(SIZES.full), text: 'Всё в одном файле, hls.js уже внутри. Если не хочется класть два файла.', href: 'player/vidkit-player.full.js' },
];

const TABS = [
  {
    id: 'auto',
    label: 'Автоматически',
    icon: <Sparkles size={16} aria-hidden="true" />,
    content: (
      <>
        <p className="tab-text">Самый простой путь: ничего не менять в разметке. Скрипт сам найдёт ваши <code>&lt;video controls&gt;</code> и заменит их на плеер.</p>
        <CodeBlock code={CODE.auto} title="index.html" />
      </>
    ),
  },
  {
    id: 'tag',
    label: 'Тег',
    icon: <Code2 size={16} aria-hidden="true" />,
    content: (
      <>
        <p className="tab-text">Хотите явно и с HLS? Используйте готовый тег <code>&lt;vidkit-player&gt;</code>. Реклама задаётся атрибутом <code>ads</code> или свойством <code>el.ads</code>.</p>
        <CodeBlock code={CODE.tag} title="index.html" />
      </>
    ),
  },
  {
    id: 'js',
    label: 'JavaScript',
    icon: <Braces size={16} aria-hidden="true" />,
    content: (
      <>
        <p className="tab-text">Нужен полный контроль? Создайте плеер в любом контейнере и управляйте им из кода.</p>
        <CodeBlock code={CODE.js} language="javascript" title="app.js" />
      </>
    ),
  },
  {
    id: 'react',
    label: 'React / сборщик',
    icon: <Package size={16} aria-hidden="true" />,
    content: (
      <>
        <p className="tab-text">
          Для сборщиков есть ES-модуль <code>vidkit-player.esm.js</code>. В нём <b>нет</b> автозамены <code>&lt;video&gt;</code>:
          фреймворк сам управляет своим DOM. Пакет пока не опубликован в npm — подключайте из репозитория: <code>npm i ./player</code>.
        </p>
        <CodeBlock code={CODE.react} language="jsx" title="Video.jsx" />
      </>
    ),
  },
];

const CHECKS = [
  <>Вместо стандартного видео появился плеер с большой кнопкой Play.</>,
  <>В меню настроек есть пункт «Качество» (для HLS-видео, вплоть до 4K).</>,
  <>Работают горячие клавиши: <kbd>Пробел</kbd>, <kbd>F</kbd>, <kbd>M</kbd>.</>,
];

export default function Install() {
  return (
    <Section
      id="install"
      title="Установка за три шага"
      lead="Никаких сборщиков и зависимостей: достаточно положить файлы на сайт и подключить скрипт."
    >
      <ol className="steps">
        {/* Шаг 1 */}
        <li className="step">
          <span className="step-num" aria-hidden="true">1</span>
          <div className="step-body">
            <h3>Скачайте плеер</h3>
            <p className="step-text">Положите файлы в одну папку на своём сайте, например <code>/vidkit/</code>.</p>
            <div className="files">
              {FILES.map((f) => (
                <a className={`file${f.main ? ' is-main' : ''}`} key={f.name} href={url(f.href)} download>
                  <span className="file-ico"><FileCode2 size={22} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="file-info">
                    <span className="file-name">{f.name}<em>{f.badge}</em></span>
                    <span className="file-text">{f.text}</span>
                    {f.size && <span className="file-size">{f.size}</span>}
                  </span>
                  <span className="file-dl" aria-label="Скачать"><Download size={18} aria-hidden="true" /></span>
                </a>
              ))}
            </div>
          </div>
        </li>

        {/* Шаг 2 */}
        <li className="step">
          <span className="step-num" aria-hidden="true">2</span>
          <div className="step-body">
            <h3>Подключите на страницу</h3>
            <p className="step-text">Выберите способ — результат один: на странице появится Vidkit Player.</p>
            <Tabs tabs={TABS} />
          </div>
        </li>

        {/* Шаг 3 */}
        <li className="step">
          <span className="step-num" aria-hidden="true">3</span>
          <div className="step-body">
            <h3>Проверьте результат</h3>
            <p className="step-text">Откройте страницу и убедитесь, что всё на месте:</p>
            <ul className="checks">
              {CHECKS.map((c, i) => (
                <li key={i}><CircleCheck size={20} aria-hidden="true" /><span>{c}</span></li>
              ))}
            </ul>
            <a className="callout" href="#encoder">
              <Terminal size={20} aria-hidden="true" />
              <span><b>Нужны 4K и адаптивное качество?</b> Подготовьте видео кодировщиком — это одна команда.</span>
            </a>
          </div>
        </li>
      </ol>

      <p className="note">
        Свой цвет акцента: <code>vidkit-player {'{'} --vp-accent: #4f8cff; {'}'}</code>. Все стили лежат внутри скрипта и не конфликтуют со страницей.
      </p>
    </Section>
  );
}
