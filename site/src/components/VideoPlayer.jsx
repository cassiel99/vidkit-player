import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import VidkitPlayer from 'vidkit-player';

// hls.js входит в сайт целиком, поэтому плееру не нужно подгружать его отдельно
if (typeof window !== 'undefined' && !window.Hls) window.Hls = Hls;

/**
 * Обёртка над Vidkit Player для React. Так плеер подключают в приложениях:
 * создаём в useEffect, обязательно уничтожаем в cleanup.
 * Контейнер НЕ имеет React-детей — внутри им управляет плеер.
 * resetKey — любое значение; при его смене плеер создаётся заново.
 */
export default function VideoPlayer({ options, onPlayer, resetKey = 0, className = '' }) {
  const mount = useRef(null);
  // Пересоздаём плеер только когда реально поменялись настройки
  const key = JSON.stringify(options) + '|' + resetKey;

  useEffect(() => {
    const player = new VidkitPlayer(mount.current, options);
    if (onPlayer) onPlayer(player);
    return () => player.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={mount} className={className} />;
}
