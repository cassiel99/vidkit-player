import { ArrowDown, Download } from 'lucide-react';
import CodeBlock from './CodeBlock.jsx';
import { CODE } from '../data.js';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-inner">
        <p className="eyebrow">
          {['Встраиваемый видеоплеер', 'HLS', 'до 4K', 'реклама'].map((t) => <span key={t}>{t}</span>)}
        </p>
        <h1>
          Плеер как у YouTube — <span className="grad">на вашем сайте</span>
        </h1>
        <p className="lead">
          Добавьте один скрипт — и обычные <code>&lt;video&gt;</code> станут плеером с адаптивным качеством до 4K,
          рекламой с кнопкой «Пропустить» и горячими клавишами. Без фреймворков и сборки.
        </p>
        <div className="cta">
          <a className="btn" href="#install"><Download size={18} aria-hidden="true" />Установить за минуту</a>
          <a className="btn btn-ghost" href="#demo"><ArrowDown size={18} aria-hidden="true" />Смотреть демо</a>
        </div>
        <CodeBlock className="hero-code" code={CODE.hero} title="index.html" />
      </div>
    </section>
  );
}
