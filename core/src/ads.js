// Рекламный движок: pre-roll, mid-roll, post-roll, пропуск рекламы, VAST, события.
//
// Формат описания рекламы (опция `ads` у плеера):
//   { type: 'preroll' | 'midroll' | 'postroll',
//     at: 30 | '50%' | '1:30',        // только для midroll
//     src: 'ad.mp4' | 'ad.m3u8',      // видеофайл рекламы...
//     vast: 'https://.../vast.xml',   // ...или VAST-ссылка вместо src
//     skipAfter: 5 | null,            // через сколько секунд можно пропустить; null — нельзя
//     clickUrl: 'https://...',        // куда ведёт «Подробнее»
//     title: 'Название',
//     impression: 'https://...pixel' | [..]  // пиксели показа
//   }
// Несколько реклам одного места (например, два preroll) показываются подряд: «1 из 2», «2 из 2».
import { resolveVast } from './vast.js';
import { loadHls } from './hls-loader.js';
import { parseTime, ping, safeUrl } from './util.js';

const QUARTILES = [[0.25, 'firstQuartile'], [0.5, 'midpoint'], [0.75, 'thirdQuartile']];
const toArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

function normalize(list) {
  return toArray(list)
    .map((a) => (typeof a === 'string' ? { src: a } : a))
    .filter((a) => a && (a.src || a.vast))
    .map((a) => ({ ...a, type: ['midroll', 'postroll'].includes(a.type) ? a.type : 'preroll' }));
}

function buildSlots(list) {
  const slots = [];
  for (const it of normalize(list)) {
    const kind = it.type === 'midroll' ? 'mid' : it.type === 'postroll' ? 'post' : 'pre';
    const at = kind === 'mid' ? (it.at ?? 0) : null;
    let slot = slots.find((s) => s.kind === kind && s.at === at);
    if (!slot) slots.push((slot = { kind, at, items: [], done: false, time: typeof at === 'number' ? at : null }));
    slot.items.push(it);
  }
  return slots;
}

export class AdController {
  constructor(player, list, { timeout = 8000 } = {}) {
    this.p = player;
    this.timeout = timeout;
    this.active = false;
    this.cur = null;
    this._aborted = false;
    this.slots = buildSlots(list);
  }

  setList(list) { this.slots = buildSlots(list); }

  /* ---------- расписание ---------- */
  pendingPre() { return this.slots.find((s) => s.kind === 'pre' && !s.done) || null; }
  pendingPost() { return this.slots.find((s) => s.kind === 'post' && !s.done) || null; }

  // Mid-roll, до которого дошло воспроизведение. Если пользователь перемотал сразу
  // через несколько, показываем только последний — остальные считаем показанными.
  dueMid(t) {
    const due = this.slots.filter((s) => s.kind === 'mid' && !s.done && s.time != null && t >= s.time)
      .sort((a, b) => a.time - b.time);
    if (!due.length) return null;
    due.forEach((s) => { s.done = true; });
    return due[due.length - 1];
  }

  resolveTimes(duration) {
    for (const s of this.slots) {
      if (s.kind !== 'mid' || typeof s.at === 'number') continue;
      const at = String(s.at).trim();
      s.time = at.endsWith('%') ? (parseFloat(at) / 100) * duration : parseTime(at);
      if (isNaN(s.time)) s.time = null;
    }
  }

  markPassed(t) { this.slots.forEach((s) => { if (s.kind === 'mid' && s.time != null && s.time <= t) s.done = true; }); }

  /* ---------- показ ---------- */
  async runSlot(slot) {
    if (this.active) return;
    slot.done = true;
    this.active = true;
    this._aborted = false;
    const p = this.p;
    p._enterAd();
    p._emit('adbreakstart', { kind: slot.kind });
    let played = 0;
    try {
      const items = await this._resolveItems(slot.items);
      for (let i = 0; i < items.length && !this._aborted; i++) {
        if ((await this._playOne(items[i], i + 1, items.length)) !== 'error') played++;
      }
    } finally {
      this.active = false;
      this.cur = null;
      if (!p.destroyed) { p._leaveAd(); p._emit('adbreakend', { kind: slot.kind, played }); }
    }
  }

  async _resolveItems(items) {
    const out = await Promise.all(items.map(async (it) => {
      try {
        let ad = { ...it };
        if (it.vast) {
          const v = await resolveVast(it.vast, { timeout: this.timeout });
          ad = { ...v, ...it, src: it.src || v.src, tracking: v.tracking, clickTracking: v.clickTracking,
            skipAfter: it.skipAfter !== undefined ? it.skipAfter : v.skipAfter,
            clickUrl: it.clickUrl || v.clickUrl, title: it.title || v.title,
            impression: [...toArray(v.impression), ...toArray(it.impression)] };
        } else if (ad.skipAfter === undefined) ad.skipAfter = 5;
        return ad;
      } catch (error) {
        this.p._emit('aderror', { item: it, error });
        return null;
      }
    }));
    return out.filter(Boolean);
  }

  _playOne(item, index, total) {
    const p = this.p, adv = p.adv;
    return new Promise((resolve) => {
      let done = false, started = false, hls = null, timer = null;
      const fired = new Set();
      const track = (ev) => toArray(item.tracking && item.tracking[ev]).forEach(ping);
      const once = (ev) => { if (!fired.has(ev)) { fired.add(ev); track(ev); } };
      const info = () => ({ item, index, total });

      const finish = (result, error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        Object.entries(handlers).forEach(([k, f]) => adv.removeEventListener(k, f));
        if (hls) { hls.destroy(); hls = null; }
        adv.pause(); adv.removeAttribute('src'); adv.load();
        if (result === 'error') { track('error'); p._emit('aderror', { ...info(), error }); }
        else {
          if (result === 'skipped') { track('skip'); p._emit('adskip', info()); }
          p._emit('adend', { ...info(), result });
        }
        this.cur = null;
        resolve(result);
      };
      const armTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish('error', new Error('Реклама не загрузилась за ' + this.timeout + ' мс')), this.timeout);
      };

      const handlers = {
        playing: () => {
          clearTimeout(timer);
          if (started) return;
          started = true;
          toArray(item.impression).forEach(ping);
          once('start');
          p._adReady();
          p._adTick(adv.currentTime, adv.duration, item, index, total); // кнопка пропуска и таймер видны сразу
          p._emit('adstart', info());
        },
        waiting: () => armTimer(),
        timeupdate: () => {
          if (!started || !isFinite(adv.duration)) return;
          const t = adv.currentTime, d = adv.duration;
          p._adTick(t, d, item, index, total);
          QUARTILES.forEach(([th, ev]) => { if (t / d >= th) once(ev); });
        },
        ended: () => { once('complete'); finish('complete'); },
        error: () => finish('error', adv.error || new Error('Ошибка загрузки рекламы')),
        pause: () => { if (started && !adv.ended) track('pause'); },
        play: () => { if (started) track('resume'); },
      };
      Object.entries(handlers).forEach(([k, f]) => adv.addEventListener(k, f));

      this.cur = { item, index, total, skip: () => finish('skipped'), abort: () => finish('aborted') };
      p._adUi(item, index, total);
      armTimer();

      (async () => {
        if (/\.m3u8(\?|$)/i.test(item.src)) {
          const Hls = await loadHls(p.opts.hlsUrl);
          if (done) return;
          if (Hls && Hls.isSupported()) {
            hls = new Hls();
            hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) finish('error', new Error(d.details)); });
            hls.loadSource(item.src);
            hls.attachMedia(adv);
          } else adv.src = item.src;
        } else adv.src = item.src;
        adv.volume = p.v.volume;
        adv.muted = p.v.muted;
        try { await adv.play(); }
        catch {
          // Браузер не разрешил звук без жеста — пробуем без звука
          if (done) return;
          p.v.muted = true; adv.muted = true;
          try { await adv.play(); } catch (e) { finish('error', e); }
        }
      })();
    });
  }

  /* ---------- управление ---------- */
  isSkippable() {
    const c = this.cur;
    return !!c && c.item.skipAfter != null && this.p.adv.currentTime >= c.item.skipAfter;
  }

  skip(force = false) {
    if (!this.cur) return false;
    if (!force && !this.isSkippable()) return false;
    this.cur.skip();
    return true;
  }

  click() {
    const c = this.cur;
    if (!c) return;
    const url = safeUrl(c.item.clickUrl);
    if (!url) { this.p.toggle(); return; }
    toArray(c.item.clickTracking).forEach(ping);
    this.p.adv.pause();
    window.open(url, '_blank', 'noopener,noreferrer');
    this.p._emit('adclick', { item: c.item, index: c.index, total: c.total, url });
  }

  destroy() {
    this._aborted = true;
    if (this.cur) this.cur.abort();
  }
}
