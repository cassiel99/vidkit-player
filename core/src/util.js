export const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Экранирование для вставки строк в innerHTML (строки из плейлистов и рекламы нельзя считать безопасными)
export const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

// Подпись качества: 2160 -> «4K», остальное — «720p»
export const qlabel = (h) => (h >= 2160 ? '4K' : h + 'p');

export const store = {
  get(k, d) { try { const v = localStorage.getItem('vidkit:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('vidkit:' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

// Разбор времени вида "00:00:05", "00:05" или "5" в секунды
export function parseTime(s) {
  if (typeof s === 'number') return s;
  if (!s) return NaN;
  const parts = String(s).trim().split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// Пиксель-трекер для статистики рекламы (макросы VAST заменяются на лету)
export function ping(url) {
  if (!url) return;
  try {
    const u = String(url).replace(/\[(TIMESTAMP|CACHEBUSTING)\]/g, () => Date.now()).replace(/\[ERRORCODE\]/g, '900');
    new Image().src = u;
  } catch { /* ignore */ }
}

// Открывать только http(s)-ссылки, чтобы нельзя было подсунуть javascript:
export function safeUrl(url) {
  try { const u = new URL(url, location.href); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; }
}
