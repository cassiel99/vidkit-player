import { Activity, Keyboard, Megaphone, PictureInPicture2, Sparkles, Tv } from 'lucide-react';
import Section from './Section.jsx';

// Иконки — Lucide (открытый набор SVG, лицензия ISC), вместо эмодзи
const ITEMS = [
  { Icon: Tv, title: 'Качество до 4K', text: 'Лесенка 2160p / 1440p / 1080p / 720p / 480p / 360p. Авто-режим не качает 4K в маленьком плеере и поднимает качество в полном экране.' },
  { Icon: Megaphone, title: 'Реклама для сайтов', text: 'Pre-roll, mid-roll и post-roll, блоки из нескольких роликов, кнопка «Пропустить рекламу», «Подробнее», VAST и пиксели статистики.' },
  { Icon: Sparkles, title: 'Автоподключение', text: 'Добавьте скрипт — и обычные <video controls> на странице сами станут Vidkit Player. Теги менять не нужно.' },
  { Icon: Keyboard, title: 'Горячие клавиши', text: 'Пробел, J/L, стрелки, цифры 0–9, F, M, T, I — как на YouTube. Работают и с русской раскладкой.' },
  { Icon: PictureInPicture2, title: 'Кинотеатр и PiP', text: 'Широкий режим, картинка в картинке, полный экран. Громкость и место просмотра запоминаются.' },
  { Icon: Activity, title: 'Статистика для гиков', text: 'Разрешение, кодеки, битрейт, оценка сети, буфер и пропущенные кадры — клавиша S.' },
];

export default function Features() {
  return (
    <Section id="features" title="Всё, что ждёшь от современного плеера">
      <div className="grid cards">
        {ITEMS.map(({ Icon, title, text }) => (
          <article className="card" key={title}>
            <span className="icon-box"><Icon size={26} strokeWidth={1.75} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
