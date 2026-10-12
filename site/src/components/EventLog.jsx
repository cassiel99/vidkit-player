import { useEffect, useRef } from 'react';

export default function EventLog({ lines, onClear }) {
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [lines]);

  return (
    <div className="logbox">
      <div className="logbox-head">
        <span>События плеера <code>player.on(…)</code></span>
        <button type="button" className="link-btn" onClick={onClear}>Очистить</button>
      </div>
      <pre ref={box} aria-live="polite" tabIndex={0}>{lines.length ? lines.join('\n') : '—'}</pre>
    </div>
  );
}
