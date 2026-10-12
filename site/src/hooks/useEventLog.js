import { useCallback, useState } from 'react';

// Журнал событий для демо: хранит последние 40 строк с временем
export function useEventLog(limit = 40) {
  const [lines, setLines] = useState([]);
  const push = useCallback((text) => {
    const t = new Date().toLocaleTimeString('ru-RU');
    setLines((prev) => [...prev, `${t}  ${text}`].slice(-limit));
  }, [limit]);
  const clear = useCallback(() => setLines([]), []);
  return { lines, push, clear };
}
