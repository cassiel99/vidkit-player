import Section from './Section.jsx';
import { LADDER } from '../data.js';

export default function Quality() {
  return (
    <Section
      id="4k"
      title="От 360p до 4K"
      lead="Видео кодируется в несколько качеств, а плеер сам выбирает подходящее по скорости сети и размеру окна. Зритель может зафиксировать качество вручную. Выше исходника качество не создаётся: видео в 1080p не будет «растянуто» до 4K."
    >
      <div className="ladder" role="table" aria-label="Лесенка качеств">
        <div className="ladder-row ladder-head" role="row">
          <span role="columnheader">Качество</span>
          <span role="columnheader">Видео</span>
          <span role="columnheader">Звук</span>
          <span role="columnheader">Для кого</span>
        </div>
        {LADDER.map((r) => (
          <div className={`ladder-row${r.top ? ' is-top' : ''}`} role="row" key={r.q}>
            <span role="cell" className="q" data-label="Качество">{r.q}</span>
            <span role="cell" data-label="Видео">{r.v}</span>
            <span role="cell" data-label="Звук">{r.a}</span>
            <span role="cell" className="who" data-label="Для кого">{r.who}</span>
          </div>
        ))}
      </div>
      <p className="note">
        Сейчас 4K кодируется в H.264: он играет везде, но весит много, а 4K требует аппаратной поддержки на устройстве зрителя.
        Для экономии трафика 4K обычно кодируют в VP9 или AV1 — это следующий шаг для кодировщика.
      </p>
    </Section>
  );
}
