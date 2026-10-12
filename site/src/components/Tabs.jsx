import { useId, useRef, useState } from 'react';

// Доступные вкладки: стрелки ← → переключают, Home/End — в начало/конец.
export default function Tabs({ tabs, initial = 0 }) {
  const [active, setActive] = useState(initial);
  const id = useId();
  const refs = useRef([]);

  const onKey = (e) => {
    const last = tabs.length - 1;
    let next = null;
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="tabs">
      <div className="tab-list" role="tablist" aria-label="Способ подключения" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            className="tab-btn"
            onClick={() => setActive(i)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${id}-panel-${i}`}
          aria-labelledby={`${id}-tab-${i}`}
          hidden={active !== i}
          className="tab-panel"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
