import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Sparkles, X } from 'lucide-react';
import Section from './Section.jsx';
import CodeBlock from './CodeBlock.jsx';
import { CODE, url } from '../data.js';

// Живая демонстрация автоподключения. Это ровно то, что делает скрипт на странице автора:
// на странице лежит обычный <video controls>, а autoInit() заменяет его на Vidkit Player.
// Контейнер создаётся вручную (не React-детьми), чтобы React не конфликтовал с заменой узла.
function AutoDemo() {
  const stage = useRef(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    const box = stage.current;
    if (!box) return;
    box.textContent = ''; // удаляет и плеер (он сам уничтожается), и старый <video>
    const v = document.createElement('video');
    v.controls = true;
    v.preload = 'metadata';
    v.src = url('media/demo-clip.mp4');
    v.poster = url('media/demo/poster.jpg');
    v.setAttribute('playsinline', '');
    v.className = 'plain-video';
    box.appendChild(v);
    setApplied(false);
  }, []);

  useEffect(() => {
    reset();
    return () => { if (stage.current) stage.current.textContent = ''; };
  }, [reset]);

  const apply = async () => {
    setBusy(true);
    // Плеер подгружается только сейчас, по нажатию — первый экран сайта остаётся лёгким
    const { autoInit } = await import('vidkit-player');
    autoInit(stage.current); // то же, что скрипт делает сам при загрузке страницы
    setApplied(true);
    setBusy(false);
  };

  return (
    <div className="auto-demo">
      <div className="auto-demo-head">
        <span className={`state-pill${applied ? ' is-on' : ''}`}>
          {applied ? 'Сейчас: Vidkit Player' : 'Сейчас: обычный <video>'}
        </span>
      </div>
      <div className="auto-stage" ref={stage} />
      <div className="auto-actions">
        <button type="button" className="btn btn-sm" onClick={apply} disabled={applied || busy}>
          <Sparkles size={16} aria-hidden="true" />Подключить Vidkit Player
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={!applied}>
          <RotateCcw size={16} aria-hidden="true" />Вернуть обычное
        </button>
      </div>
      <p className="muted small">Вместо кнопки на вашем сайте всё происходит само при загрузке страницы.</p>
    </div>
  );
}

const RULES = [
  { ok: true, text: <>Любой <code>&lt;video controls&gt;</code> с <code>src</code> или <code>&lt;source&gt;</code> внутри</> },
  { ok: true, text: 'Видео, добавленные на страницу позже (AJAX, динамические блоки)' },
  { ok: true, text: <>Реклама для всех видео сразу — через <code>VidkitPlayerConfig</code></> },
  { ok: false, text: <>Фоновые ролики без <code>controls</code> (autoplay, muted, loop) — остаются как есть</> },
  { ok: false, text: <>Видео с субтитрами <code>&lt;track&gt;</code> — плеер пока не умеет их показывать</> },
  { ok: false, text: <>Видео с <code>data-vidkit="off"</code> — вы исключили его сами</> },
];

export default function AutoConnect() {
  return (
    <Section
      id="auto"
      title="Подключили скрипт — видео уже в плеере"
      lead="Не нужно переписывать разметку: скрипт сам находит <video controls> на странице и заменяет их на Vidkit Player. Обычные MP4 тоже работают, а HLS получает адаптивное качество до 4K."
    >
      <div className="auto-grid">
        <div className="auto-col">
          <CodeBlock code={CODE.auto} title="index.html" />
          <h3 className="sub">Что заменяется, а что нет</h3>
          <ul className="rules">
            {RULES.map((r, i) => (
              <li key={i} className={r.ok ? 'yes' : 'no'}>
                <span className="rule-ico" aria-hidden="true">{r.ok ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="auto-col">
          <AutoDemo />
          <h3 className="sub">Настройка для всех видео сразу</h3>
          <CodeBlock code={CODE.autoConfig} title="Свои настройки" />
        </div>
      </div>
    </Section>
  );
}
