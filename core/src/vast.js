// Минимальный клиент VAST 2/3/4: линейная реклама (InLine и цепочки Wrapper).
// Поддержано: MediaFile, Duration, skipoffset, ClickThrough, Impression,
// Tracking (start / quartiles / complete / skip / pause / resume ...), ClickTracking.
// VAST-ссылка должна отдавать CORS-заголовки, иначе браузер заблокирует запрос.
import { parseTime } from './util.js';

const txt = (el) => (el && el.textContent ? el.textContent.trim() : '');

function pickMedia(linear) {
  const probe = document.createElement('video');
  const files = Array.from(linear.querySelectorAll('MediaFile'))
    .map((m) => ({ url: txt(m), type: (m.getAttribute('type') || '').toLowerCase(), w: Number(m.getAttribute('width')) || 0 }))
    .filter((f) => f.url && (/mpegurl/.test(f.type) || probe.canPlayType(f.type) !== ''));
  // Прогрессивный MP4 надёжнее всего; среди них берём ближайший к ширине 1280
  files.sort((a, b) => {
    const rank = (f) => (/mp4/.test(f.type) ? 0 : /mpegurl/.test(f.type) ? 1 : 2);
    return rank(a) - rank(b) || Math.abs(a.w - 1280) - Math.abs(b.w - 1280);
  });
  return files[0] ? files[0].url : null;
}

export async function resolveVast(url, { timeout = 6000, depth = 0, acc } = {}) {
  acc = acc || { impression: [], tracking: {}, clickTracking: [] };
  if (depth > 4) throw new Error('VAST: слишком длинная цепочка Wrapper');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let text;
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
    if (!res.ok) throw new Error('VAST: HTTP ' + res.status);
    text = await res.text();
  } finally { clearTimeout(timer); }

  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('VAST: некорректный XML');
  const ad = doc.querySelector('Ad');
  if (!ad) throw new Error('VAST: в ответе нет рекламы');

  ad.querySelectorAll('Impression').forEach((n) => txt(n) && acc.impression.push(txt(n)));
  const linear = ad.querySelector('Linear');
  if (linear) {
    linear.querySelectorAll('Tracking').forEach((n) => {
      const ev = n.getAttribute('event');
      if (ev && txt(n)) (acc.tracking[ev] = acc.tracking[ev] || []).push(txt(n));
    });
    linear.querySelectorAll('ClickTracking').forEach((n) => txt(n) && acc.clickTracking.push(txt(n)));
  }

  const wrapper = ad.querySelector('Wrapper');
  if (wrapper) {
    const next = txt(ad.querySelector('VASTAdTagURI'));
    if (!next) throw new Error('VAST: Wrapper без VASTAdTagURI');
    return resolveVast(next, { timeout, depth: depth + 1, acc });
  }

  if (!linear) throw new Error('VAST: нет линейного креатива');
  const src = pickMedia(linear);
  if (!src) throw new Error('VAST: нет подходящего видеофайла');

  const duration = parseTime(txt(linear.querySelector('Duration')));
  let skipAfter = null;
  const skip = linear.getAttribute('skipoffset');
  if (skip) skipAfter = skip.endsWith('%') ? (parseFloat(skip) / 100) * (duration || 0) : parseTime(skip);

  return {
    src,
    title: txt(ad.querySelector('AdTitle')),
    clickUrl: txt(linear.querySelector('ClickThrough')) || null,
    skipAfter: isNaN(skipAfter) ? null : skipAfter,
    impression: acc.impression,
    tracking: acc.tracking,
    clickTracking: acc.clickTracking,
  };
}
