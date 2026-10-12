// Ленивая загрузка hls.js. В «full»-сборке hls.js уже внутри (window.Hls задан),
// в обычной — подгружается рядом со скриптом плеера или с CDN, если файла рядом нет.
const SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
const CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
// Subresource Integrity: браузер выполнит файл с CDN, только если его содержимое совпадает с этим хешем.
// Если CDN или канал подменят файл, загрузка будет отклонена. При смене версии hls.js хеш нужно обновить.
const CDN_SRI = 'sha384-9v3HcdYrO3D+OPDTjZ40RXocgE4GtXVCd3/mCS62JsM93JXgI1afJVuwjFvsu6ni';

let pending = null;

function inject(url, integrity) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url; s.async = true;
    if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
    s.onload = () => (window.Hls ? resolve(window.Hls) : reject(new Error('hls.js не определился')));
    s.onerror = () => reject(new Error('Не удалось загрузить ' + url));
    document.head.appendChild(s);
  });
}

export function loadHls(customUrl) {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Hls) return Promise.resolve(window.Hls);
  if (pending) return pending;
  const candidates = [];
  if (customUrl) candidates.push({ url: customUrl });
  if (SCRIPT_SRC) candidates.push({ url: new URL('hls.min.js', SCRIPT_SRC).href });
  candidates.push({ url: CDN, integrity: CDN_SRI });
  pending = candidates.reduce(
    (chain, c) => chain.catch(() => inject(c.url, c.integrity)),
    Promise.reject(new Error('start')),
  ).catch(() => { pending = null; return null; });
  return pending;
}
