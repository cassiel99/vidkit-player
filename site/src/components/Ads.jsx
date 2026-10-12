import { Film, FlagTriangleRight, SkipForward, Rocket } from 'lucide-react';
import Section from './Section.jsx';
import CodeBlock from './CodeBlock.jsx';
import { CODE } from '../data.js';

const SLOTS = [
  { Icon: Rocket, title: 'Pre-roll', text: 'Перед видео. Показывается при первом нажатии на play, а не при загрузке страницы, поэтому показ засчитывается честно.' },
  { Icon: Film, title: 'Mid-roll', text: <>В заданное время: <code>at: 30</code>, <code>'50%'</code> или <code>'1:30'</code>. Метка на полосе. Если зритель перемотал сразу через несколько вставок, покажется одна.</> },
  { Icon: FlagTriangleRight, title: 'Post-roll', text: 'После окончания видео. Можно собрать блок из нескольких роликов: «Реклама · 1 из 2».' },
];

export default function Ads() {
  return (
    <Section
      id="ads"
      title="Реклама на вашем сайте"
      lead="Плеер сам показывает рекламу в нужные моменты и возвращает зрителя к видео. Если рекламный ролик не загрузился за 8 секунд, он пропускается, и зритель смотрит видео без ожидания."
    >
      <div className="grid cards three">
        {SLOTS.map(({ Icon, title, text }) => (
          <article className="card" key={title}>
            <span className="icon-box"><Icon size={24} strokeWidth={1.75} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="split">
        <div>
          <h3 className="sub"><SkipForward size={20} aria-hidden="true" className="inline-ico" /> Кнопка «Пропустить рекламу»</h3>
          <p className="muted">
            Для каждого ролика задаёте <code>skipAfter</code>: сначала обратный отсчёт «Пропустить через 5», потом активная кнопка.{' '}
            <code>skipAfter: null</code> — ролик нельзя пропустить. Во время рекламы перемотка, скорость и качество отключены,
            доступны пауза, звук и полный экран.
          </p>
          <h3 className="sub">VAST</h3>
          <p className="muted">
            Вместо <code>src</code> можно указать VAST-ссылку рекламной сети: поддерживаются InLine и Wrapper, <code>skipoffset</code>,
            ClickThrough и пиксели start / quartiles / complete / skip. Сервер рекламы должен разрешать CORS.
          </p>
        </div>
        <CodeBlock code={CODE.ads} language="javascript" title="Реклама из JavaScript" />
      </div>
    </Section>
  );
}
