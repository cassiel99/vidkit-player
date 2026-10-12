import { icon } from './icons.js';
import { RATES, clamp, esc, fmt, qlabel, store } from './util.js';
import { loadHls } from './hls-loader.js';
import { AdController } from './ads.js';
import { injectStyles } from './styles.js';

export class VidkitPlayer {
  /**
   * @param {string|HTMLElement} mount  контейнер (селектор или элемент)
   * @param {object} opts  { src, poster, title, autoplay, ads, hlsUrl, capToPlayerSize, adTimeout }
   */
  constructor(mount, opts = {}) {
    this.root = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (!this.root) throw new Error('VidkitPlayer: контейнер не найден');
    injectStyles();
    if (this.root.__vidkit) this.root.__vidkit.destroy();
    this.root.__vidkit = this;
    this.opts = Object.assign({ src: '', poster: '', title: '', autoplay: false, muted: false, loop: false, resume: true, capToPlayerSize: true, adTimeout: 8000 }, opts);
    if (this.opts.adTimeout == null) this.opts.adTimeout = 8000;
    this.hls = null;
    this.level = -1; // -1 = авто
    this.destroyed = false;
    this.scrubbing = false;
    this._loadToken = 0;
    this._listeners = [];
    this._docHandlers = [];
    this._build();
    this.ads = new AdController(this, this.opts.ads, { timeout: this.opts.adTimeout });
    this._bind();
    this._renderMarks();
    this._syncPlay(); // начальное состояние: на паузе — видна большая кнопка Play и панель
    if (this.opts.src) this.load(this.opts.src);
  }

  /* ================= Публичный API ================= */
  get video() { return this.v; }
  play() { if (this.ads.active) { if (!this.adv.hidden) this.adv.play().catch(() => {}); return; } this.v.play().catch(() => {}); }
  pause() { (this.ads.active ? this.adv : this.v).pause(); }
  toggle() {
    if (this.ads.active) { if (this.adv.hidden) return; return this.adv.paused ? this.adv.play().catch(() => {}) : this.adv.pause(); }
    const v = this.v;
    if (v.paused || v.ended) { if (v.ended) v.currentTime = 0; v.play().catch(() => {}); } else v.pause();
  }
  seekTo(sec) { if (!this.ads.active && isFinite(this.v.duration)) this.v.currentTime = clamp(sec, 0, this.v.duration); }
  seekBy(sec, flash) {
    const v = this.v;
    if (this.ads.active || !isFinite(v.duration)) return;
    v.currentTime = clamp(v.currentTime + sec, 0, v.duration);
    if (flash) {
      const n = sec < 0 ? this.el.skipL : this.el.skipR;
      n.hidden = false; n.classList.remove('vp-pop'); void n.offsetWidth; n.classList.add('vp-pop');
      clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 550);
    } else this._toast(`${sec > 0 ? '+' : '−'}${Math.abs(sec)} с`);
  }
  setVolume(x) { this.v.volume = clamp(x, 0, 1); this.v.muted = this.v.volume === 0; }
  setMuted(m) { this.v.muted = !!m; }
  setRate(r) { this.v.playbackRate = r; this._toast(`Скорость ${r}×`); }
  /** Доступные качества: [{ height, bitrate, label }] от большего к меньшему */
  getQualities() { return this._levels().map((l) => ({ height: l.h, bitrate: l.br, label: qlabel(l.h) })); }
  /** 'auto' или высота кадра, например 2160 / 1080 / 720 */
  setQuality(q) {
    if (q === 'auto' || q == null) return this.setLevel(-1);
    const l = this._levels().find((x) => x.h === Number(q));
    if (l) this.setLevel(l.i);
  }
  getQuality() {
    const h = this.hls;
    const lvl = h && h.levels ? h.levels[h.currentLevel >= 0 ? h.currentLevel : Math.max(h.loadLevel, 0)] : null;
    return { auto: this.level < 0, height: lvl ? lvl.height : this.v.videoHeight || null };
  }
  setAds(list) { this.ads.setList(list); this._renderMarks(); }
  isPlayingAd() { return this.ads.active; }
  /** Пропустить текущую рекламу. Без force — только если уже можно пропускать. */
  skipAd(force = false) { return this.ads.skip(force); }
  on(name, fn) {
    const h = (e) => fn(e.detail, e);
    this.root.addEventListener('vp:' + name, h);
    this._listeners.push([name, fn, h]);
    return this;
  }
  off(name, fn) {
    this._listeners = this._listeners.filter(([n, f, h]) => {
      if (n === name && (!fn || f === fn)) { this.root.removeEventListener('vp:' + n, h); return false; }
      return true;
    });
    return this;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ads.destroy();
    this._destroyHls();
    clearInterval(this._statsTimer);
    [this.hideTimer, this.toastTimer, this.clickTimer].forEach(clearTimeout);
    this._docHandlers.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn));
    this.v.removeAttribute('src'); this.v.load();
    this.root.innerHTML = '';
    this.root.classList.remove('vp', 'vp-theater', 'vp-active', 'vp-paused', 'vp-ad', 'vp-adloading', 'vp-menu-open', 'vp-fullscreen', 'vp-scrubbing');
    // Снимаем подписки разработчика с контейнера: его могут использовать для нового плеера
    this._listeners.forEach(([n, , h]) => this.root.removeEventListener('vp:' + n, h));
    this._listeners = [];
    delete this.root.__vidkit;
  }

  _emit(name, detail) { if (!this.destroyed) this.root.dispatchEvent(new CustomEvent('vp:' + name, { detail })); }

  /* ================= DOM ================= */
  _build() {
    const r = this.root;
    r.classList.add('vp');
    r.tabIndex = 0;
    r.setAttribute('role', 'region');
    r.setAttribute('aria-label', 'Видеоплеер');
    r.innerHTML = `
      <video class="vp-video" playsinline preload="metadata"></video>
      <video class="vp-adv" playsinline hidden></video>
      <div class="vp-title"></div>
      <div class="vp-adtop" hidden><span class="vp-adchip">Реклама</span><button class="vp-adlink" hidden>Подробнее ${icon('link')}</button></div>
      <div class="vp-spinner" hidden><i></i></div>
      <div class="vp-toast" hidden></div>
      <button class="vp-bigplay" aria-label="Воспроизвести">${icon('play')}</button>
      <div class="vp-skip vp-skip-l" hidden>« 10 с</div>
      <div class="vp-skip vp-skip-r" hidden>10 с »</div>
      <div class="vp-stats" hidden></div>
      <div class="vp-menu" hidden></div>
      <button class="vp-skipad" hidden></button>
      <div class="vp-bar">
        <div class="vp-adprog" hidden><i></i></div>
        <div class="vp-progress" role="slider" aria-label="Перемотка" tabindex="-1">
          <div class="vp-track">
            <div class="vp-buffered"></div>
            <div class="vp-played"></div>
            <div class="vp-marks"></div>
            <div class="vp-handle"></div>
          </div>
          <div class="vp-tip" hidden>0:00</div>
        </div>
        <div class="vp-row">
          <button class="vp-btn vp-play" aria-label="Воспроизвести / пауза (k)">${icon('play')}</button>
          <div class="vp-vol">
            <button class="vp-btn vp-mute" aria-label="Звук (m)">${icon('volHigh')}</button>
            <input class="vp-volrange" type="range" min="0" max="1" step="0.02" value="1" aria-label="Громкость">
          </div>
          <div class="vp-time"><span class="vp-cur">0:00</span> / <span class="vp-dur">0:00</span></div>
          <div class="vp-spacer"></div>
          <span class="vp-badge" hidden></span>
          <button class="vp-btn vp-settings" aria-label="Настройки">${icon('settings')}</button>
          <button class="vp-btn vp-pip" aria-label="Картинка в картинке (i)">${icon('pip')}</button>
          <button class="vp-btn vp-theater-btn" aria-label="Режим кинотеатра (t)">${icon('theater')}</button>
          <button class="vp-btn vp-fs" aria-label="Полный экран (f)">${icon('fs')}</button>
        </div>
      </div>`;
    const q = (s) => r.querySelector(s);
    this.v = q('.vp-video');
    this.adv = q('.vp-adv');
    this.el = {
      title: q('.vp-title'), spinner: q('.vp-spinner'), toast: q('.vp-toast'), big: q('.vp-bigplay'),
      skipL: q('.vp-skip-l'), skipR: q('.vp-skip-r'), stats: q('.vp-stats'), menu: q('.vp-menu'),
      progress: q('.vp-progress'), buffered: q('.vp-buffered'), played: q('.vp-played'), handle: q('.vp-handle'),
      marks: q('.vp-marks'), tip: q('.vp-tip'), play: q('.vp-play'), mute: q('.vp-mute'), vol: q('.vp-volrange'),
      cur: q('.vp-cur'), dur: q('.vp-dur'), badge: q('.vp-badge'), settings: q('.vp-settings'),
      pip: q('.vp-pip'), theater: q('.vp-theater-btn'), fs: q('.vp-fs'),
      adtop: q('.vp-adtop'), adchip: q('.vp-adchip'), adlink: q('.vp-adlink'), skipad: q('.vp-skipad'),
      adprog: q('.vp-adprog'), adprogFill: q('.vp-adprog i'),
    };
    this.el.title.textContent = this.opts.title || '';
    if (this.opts.poster) this.v.poster = this.opts.poster;
    if (!document.pictureInPictureEnabled) this.el.pip.hidden = true;
    this.v.volume = store.get('volume', 1);
    this.v.muted = this.opts.muted ? true : store.get('muted', false);
    this._mirrorVolume();
    this._syncVolume();
  }

  /* ================= Источник ================= */
  async load(src) {
    if (!src) return;
    const token = ++this._loadToken;
    this._destroyHls();
    this.src = src;
    this.opts.src = src;
    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (isHls) {
      const Hls = await loadHls(this.opts.hlsUrl);
      if (token !== this._loadToken || this.destroyed) return;
      if (Hls && Hls.isSupported()) {
        const hls = (this.hls = new Hls({
          capLevelToPlayerSize: this.opts.capToPlayerSize !== false,
          maxBufferLength: 30,
          startLevel: -1,
        }));
        hls.loadSource(src);
        hls.attachMedia(this.v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { this._refreshBadge(); this._emit('ready', { qualities: this.getQualities() }); });
        hls.on(Hls.Events.LEVEL_SWITCHED, () => { this._refreshBadge(); this._emit('qualitychange', this.getQuality()); });
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else { this._toast('Не удалось загрузить видео', 4000); this._emit('error', { fatal: true, details: d.details }); }
        });
      } else if (this.v.canPlayType('application/vnd.apple.mpegurl')) {
        this.v.src = src; // Safari / iOS — нативный HLS
      } else {
        this._toast('Браузер не поддерживает HLS', 4000);
        return;
      }
    } else {
      this.v.src = src;
    }
    const resume = this.opts.resume === false ? 0 : store.get('pos:' + src, 0);
    this.v.addEventListener('loadedmetadata', () => {
      if (resume > 3 && resume < this.v.duration - 5) { this.v.currentTime = resume; this.ads.markPassed(resume); }
      this._updateTime();
      if (!isHls) this._emit('ready', { qualities: [] });
    }, { once: true });
    if (this.opts.autoplay) {
      this.v.play().catch(() => { this.v.muted = true; this.v.play().catch(() => {}); });
    }
    this._setMediaSession();
  }

  // Запоминаем место просмотра (отключается опцией resume: false)
  _savePos() { if (this.opts.resume !== false && this.src) store.set('pos:' + this.src, this.v.ended ? 0 : this.v.currentTime); }

  _destroyHls() { if (this.hls) { this.hls.destroy(); this.hls = null; } }

  /* ================= События ================= */
  _doc(target, ev, fn) { target.addEventListener(ev, fn); this._docHandlers.push([target, ev, fn]); }

  _bind() {
    const { v, adv, el, root } = this;

    el.play.onclick = el.big.onclick = (e) => { e.stopPropagation(); this.toggle(); };

    // --- основное видео ---
    v.addEventListener('play', () => {
      if (this.ads.active) { v.pause(); return; }
      const pre = this.ads.pendingPre();
      if (pre) { this._runBreak(pre); return; }
      this._syncPlay(); this._emit('play');
    });
    v.addEventListener('pause', () => {
      this._savePos();
      this._syncPlay();
      if (!this.ads.active) this._emit('pause');
    });
    v.addEventListener('ended', async () => {
      const post = this.ads.pendingPost();
      if (post && !this.ads.active) await this._runBreak(post, false);
      if (this.opts.loop && !this.destroyed) { v.currentTime = 0; v.play().catch(() => {}); return; }
      this._syncPlay(); this._emit('ended');
    });
    v.addEventListener('timeupdate', () => {
      if (this.ads.active) return;
      this._updateTime();
      if (!v.paused && !this.scrubbing) { const mid = this.ads.dueMid(v.currentTime); if (mid) this._runBreak(mid); }
    });
    v.addEventListener('durationchange', () => { this.ads.resolveTimes(v.duration); this._renderMarks(); this._updateTime(); });
    v.addEventListener('progress', () => this._updateBuffered());
    v.addEventListener('waiting', () => { if (!this.ads.active) el.spinner.hidden = false; });
    v.addEventListener('playing', () => { el.spinner.hidden = true; });
    v.addEventListener('canplay', () => { el.spinner.hidden = true; });
    v.addEventListener('volumechange', () => {
      this._mirrorVolume(); this._syncVolume();
      store.set('volume', v.volume); store.set('muted', v.muted);
    });
    v.addEventListener('ratechange', () => this._refreshMenu());
    v.addEventListener('error', () => { this._toast('Ошибка воспроизведения', 4000); this._emit('error', { fatal: true, details: 'media' }); });
    this._doc(window, 'pagehide', () => this._savePos());

    // --- рекламное видео ---
    adv.addEventListener('play', () => this._syncPlay());
    adv.addEventListener('pause', () => this._syncPlay());
    adv.addEventListener('timeupdate', () => { if (this.ads.active) this._updateTime(); });
    adv.addEventListener('click', () => this.ads.click());
    el.adlink.onclick = (e) => { e.stopPropagation(); this.ads.click(); };
    el.skipad.onclick = (e) => { e.stopPropagation(); this.ads.skip(); };

    // --- клик по видео: пауза / двойной клик ---
    v.addEventListener('click', (e) => {
      if (!el.menu.hidden) { this._closeMenu(); return; }
      if (e.pointerType === 'touch' && !root.classList.contains('vp-active')) { this._showControls(); return; }
      clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => this.toggle(), 230);
    });
    v.addEventListener('dblclick', (e) => {
      clearTimeout(this.clickTimer);
      const x = (e.clientX - root.getBoundingClientRect().left) / root.clientWidth;
      if (x < 0.33) this.seekBy(-10, true); else if (x > 0.66) this.seekBy(10, true); else this.toggleFullscreen();
    });

    // --- громкость ---
    el.mute.onclick = () => { v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 0.5; };
    el.vol.oninput = () => { v.volume = +el.vol.value; v.muted = v.volume === 0; };

    // --- кнопки справа ---
    el.fs.onclick = () => this.toggleFullscreen();
    el.pip.onclick = () => this.togglePip();
    el.theater.onclick = () => this.toggleTheater();
    el.settings.onclick = (e) => { e.stopPropagation(); el.menu.hidden ? this._openMenu('main') : this._closeMenu(); };
    this._doc(document, 'click', (e) => { if (!root.contains(e.target)) this._closeMenu(); });
    this._doc(document, 'fullscreenchange', () => {
      const on = document.fullscreenElement === root;
      el.fs.innerHTML = icon(on ? 'fsExit' : 'fs');
      root.classList.toggle('vp-fullscreen', on);
    });

    // --- полоса прогресса ---
    const pos = (e) => {
      const rect = el.progress.getBoundingClientRect();
      return clamp((e.clientX - rect.left) / rect.width, 0, 1);
    };
    el.progress.addEventListener('pointerdown', (e) => {
      if (this.ads.active) return;
      this.scrubbing = true; el.progress.setPointerCapture(e.pointerId);
      root.classList.add('vp-scrubbing');
      this._previewSeek(pos(e));
    });
    el.progress.addEventListener('pointermove', (e) => {
      const p = pos(e);
      this._showTip(p);
      if (this.scrubbing) this._previewSeek(p);
    });
    el.progress.addEventListener('pointerup', (e) => {
      if (!this.scrubbing) return;
      this.scrubbing = false; root.classList.remove('vp-scrubbing');
      if (isFinite(v.duration)) v.currentTime = pos(e) * v.duration;
    });
    el.progress.addEventListener('pointerleave', () => { if (!this.scrubbing) el.tip.hidden = true; });
    el.progress.addEventListener('pointerenter', () => { el.tip.hidden = false; });

    // --- автоскрытие панели ---
    this._doc(root, 'mousemove', () => this._showControls());
    this._doc(root, 'mouseleave', () => this._scheduleHide(600));
    this._doc(root, 'focusin', () => this._showControls());

    // --- клавиатура ---
    // Любой клик в плеере даёт ему фокус, иначе горячие клавиши «пропадают»,
    // когда сфокусированная кнопка (например, большой play) исчезает.
    this._doc(root, 'pointerdown', (e) => {
      if (!(e.target.matches && e.target.matches('input'))) root.focus({ preventScroll: true });
    });
    this._doc(root, 'keydown', (e) => this._onKey(e));
    this._doc(root, 'mouseenter', () => {
      if (!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) root.focus({ preventScroll: true });
    });
  }

  _onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const v = this.v, k = e.key;
    const handled = (fn) => { e.preventDefault(); fn(); this._showControls(); };
    const isBtn = e.target.matches && e.target.matches('button');
    if (e.target.matches && e.target.matches('.vp-volrange') && /Arrow(Left|Right)/.test(k)) return;

    const vol = (d) => handled(() => { v.muted = false; v.volume = clamp(v.volume + d, 0, 1); this._toast(`Громкость ${Math.round(v.volume * 100)}%`); });
    const mute = () => handled(() => { v.muted = !v.muted; this._toast(v.muted ? 'Звук выключен' : 'Звук включён'); });

    // Во время рекламы доступны только пауза, звук и полный экран
    if (this.ads.active) {
      if ([' ', 'k', 'K', 'л', 'Л'].includes(k)) { if (k === ' ' && isBtn) return; return handled(() => this.toggle()); }
      if (['m', 'M', 'ь', 'Ь'].includes(k)) return mute();
      if (['f', 'F', 'а', 'А'].includes(k)) return handled(() => this.toggleFullscreen());
      if (k === 'ArrowUp') return vol(0.05);
      if (k === 'ArrowDown') return vol(-0.05);
      return;
    }

    switch (k) {
      case ' ': case 'k': case 'K': case 'л': case 'Л':
        if (k === ' ' && isBtn) return; // пробел на кнопке = её нажатие
        return handled(() => this.toggle());
      case 'ArrowLeft': return handled(() => this.seekBy(-5));
      case 'ArrowRight': return handled(() => this.seekBy(5));
      case 'j': case 'J': case 'о': case 'О': return handled(() => this.seekBy(-10));
      case 'l': case 'L': case 'д': case 'Д': return handled(() => this.seekBy(10));
      case 'ArrowUp': return vol(0.05);
      case 'ArrowDown': return vol(-0.05);
      case 'm': case 'M': case 'ь': case 'Ь': return mute();
      case 'f': case 'F': case 'а': case 'А': return handled(() => this.toggleFullscreen());
      case 't': case 'T': case 'е': case 'Е': return handled(() => this.toggleTheater());
      case 'i': case 'I': case 'ш': case 'Ш': return handled(() => this.togglePip());
      case 's': case 'S': case 'ы': case 'Ы': return handled(() => this.toggleStats());
      case 'Home': return handled(() => { v.currentTime = 0; });
      case 'End': return handled(() => { v.currentTime = v.duration || 0; });
      case '>': case '.': if (e.shiftKey || k === '>') return handled(() => this.setRate(this._stepRate(1))); break;
      case '<': case ',': if (e.shiftKey || k === '<') return handled(() => this.setRate(this._stepRate(-1))); break;
      case 'Escape': if (!this.el.menu.hidden) return handled(() => this._closeMenu()); break;
    }
    if (/^[0-9]$/.test(k) && isFinite(v.duration)) return handled(() => { v.currentTime = (+k / 10) * v.duration; });
  }

  /* ================= Действия ================= */
  _stepRate(dir) { const i = RATES.indexOf(this.v.playbackRate); const base = i < 0 ? RATES.indexOf(1) : i; return RATES[clamp(base + dir, 0, RATES.length - 1)]; }
  setLevel(i) {
    this.level = i;
    if (this.hls) this.hls.currentLevel = i; // -1 — автоматический выбор
    this._refreshBadge(); this._refreshMenu();
    this._emit('qualitychange', this.getQuality());
  }
  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (this.root.requestFullscreen) this.root.requestFullscreen();
    else if (this.root.webkitRequestFullscreen) this.root.webkitRequestFullscreen();
    else if (this.v.webkitEnterFullscreen) this.v.webkitEnterFullscreen(); // iPhone
  }
  async togglePip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await this.v.requestPictureInPicture();
    } catch { this._toast('Картинка в картинке недоступна'); }
  }
  toggleTheater() {
    const on = this.root.classList.toggle('vp-theater');
    this.el.theater.classList.toggle('vp-on', on);
    this._emit('theater', on);
  }
  toggleStats() {
    const s = this.el.stats;
    s.hidden = !s.hidden;
    clearInterval(this._statsTimer);
    if (!s.hidden) { this._renderStats(); this._statsTimer = setInterval(() => this._renderStats(), 500); }
  }

  /* ================= Реклама: интерфейс ================= */
  async _runBreak(slot, resume = true) {
    const job = this.ads.runSlot(slot); // синхронно включает режим рекламы
    this.v.pause();
    await job;
    if (resume && !this.destroyed && !this.v.ended) this.v.play().catch(() => {});
  }

  _enterAd() {
    this._closeMenu();
    this.root.classList.add('vp-ad', 'vp-adloading');
    this.el.adchip.textContent = 'Реклама';
    this.el.adtop.hidden = false;
    this.el.adlink.hidden = true;
    this.el.skipad.hidden = true;
    this.el.spinner.hidden = false;
    this._showControls(true);
  }

  _adUi(item, index, total) {
    this.el.adchip.textContent = total > 1 ? `Реклама · ${index} из ${total}` : 'Реклама';
    this.el.adlink.hidden = !item.clickUrl;
    this.el.skipad.hidden = true;
    this.el.adprog.hidden = true;
    this.el.adprogFill.style.width = '0%';
  }

  _adReady() {
    this.adv.hidden = false;
    this.root.classList.remove('vp-adloading');
    this.el.spinner.hidden = true;
    this.el.adprog.hidden = false;
    this._syncPlay();
  }

  _adTick(t, d, item, index, total) {
    const left = Math.max(0, Math.ceil(d - t));
    this.el.adchip.textContent = (total > 1 ? `Реклама · ${index} из ${total} · ` : 'Реклама · ') + fmt(left);
    this.el.adprogFill.style.width = (t / d) * 100 + '%';
    const b = this.el.skipad;
    if (item.skipAfter == null) { b.hidden = true; return; }
    b.hidden = false;
    const wait = Math.ceil(item.skipAfter - t);
    if (wait > 0) { b.disabled = true; b.innerHTML = `Пропустить через ${wait}`; }
    else if (b.disabled || !b.innerHTML.includes('svg')) { b.disabled = false; b.innerHTML = `Пропустить рекламу ${icon('skip')}`; }
  }

  _leaveAd() {
    const adv = this.adv;
    adv.hidden = true;
    this.root.classList.remove('vp-ad', 'vp-adloading');
    this.el.adtop.hidden = true;
    this.el.skipad.hidden = true;
    this.el.adprog.hidden = true;
    this.el.spinner.hidden = true;
    this._syncPlay();
    this._updateTime();
  }

  // Метки mid-roll на полосе прогресса
  _renderMarks() {
    const d = this.v.duration;
    this.el.marks.innerHTML = isFinite(d) && d > 0
      ? this.ads.slots.filter((s) => s.kind === 'mid' && s.time != null && s.time < d)
        .map((s) => `<i style="left:${(s.time / d) * 100}%"></i>`).join('')
      : '';
  }

  /* ================= Отрисовка состояния ================= */
  _media() { return this.ads && this.ads.active ? this.adv : this.v; }

  _syncPlay() {
    const m = this._media();
    const ended = m.ended, playing = !m.paused && !ended;
    this.root.classList.toggle('vp-paused', !playing);
    this.el.play.innerHTML = icon(ended ? 'replay' : playing ? 'pause' : 'play');
    this.el.big.innerHTML = icon(ended ? 'replay' : 'play');
    if (playing) this._scheduleHide(2500); else this._showControls(true);
  }
  _mirrorVolume() { this.adv.volume = this.v.volume; this.adv.muted = this.v.muted; }
  _syncVolume() {
    const v = this.v, vol = v.muted ? 0 : v.volume;
    this.el.mute.innerHTML = icon(vol === 0 ? 'volMute' : vol < 0.5 ? 'volLow' : 'volHigh');
    this.el.vol.value = vol;
    this.el.vol.style.setProperty('--p', vol * 100 + '%');
  }
  _updateTime() {
    const m = this._media();
    this.el.cur.textContent = fmt(m.currentTime);
    this.el.dur.textContent = fmt(m.duration);
    if (this.ads.active) return;
    const v = this.v;
    if (!this.scrubbing) this._paintProgress(isFinite(v.duration) && v.duration ? v.currentTime / v.duration : 0);
    this.el.progress.setAttribute('aria-valuenow', Math.round(v.currentTime));
    this.el.progress.setAttribute('aria-valuemax', Math.round(v.duration || 0));
    this._updateBuffered();
  }
  _paintProgress(p) { this.el.played.style.width = p * 100 + '%'; this.el.handle.style.left = p * 100 + '%'; }
  _updateBuffered() {
    const v = this.v; if (!isFinite(v.duration) || !v.duration) return;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5) end = Math.max(end, v.buffered.end(i));
    this.el.buffered.style.width = (end / v.duration) * 100 + '%';
  }
  _previewSeek(p) {
    this._paintProgress(p);
    if (isFinite(this.v.duration)) this.el.cur.textContent = fmt(p * this.v.duration);
    this._showTip(p);
  }
  _showTip(p) {
    const d = this.v.duration; if (!isFinite(d)) return;
    const w = this.el.progress.clientWidth, tw = this.el.tip.offsetWidth || 48;
    this.el.tip.textContent = fmt(p * d);
    this.el.tip.style.left = clamp(p * w - tw / 2, 0, w - tw) + 'px';
  }
  _refreshBadge() {
    const h = this.hls, b = this.el.badge;
    if (!h || !h.levels || !h.levels.length) { b.hidden = true; return; }
    const cur = h.levels[h.currentLevel >= 0 ? h.currentLevel : (h.loadLevel >= 0 ? h.loadLevel : 0)];
    const label = cur ? qlabel(cur.height) : '';
    b.hidden = !label;
    b.textContent = h.autoLevelEnabled ? `Авто · ${label}` : label;
    b.classList.toggle('vp-hd', !!cur && cur.height >= 720);
    b.classList.toggle('vp-4k', !!cur && cur.height >= 2160);
  }

  /* ================= Меню настроек ================= */
  _levels() {
    return this.hls && this.hls.levels
      ? this.hls.levels.map((l, i) => ({ i, h: l.height, br: l.bitrate })).sort((a, b) => b.h - a.h || b.br - a.br)
      : [];
  }
  _openMenu(view) { if (this.ads.active) return; this.menuView = view; this.el.menu.hidden = false; this.root.classList.add('vp-menu-open'); this._renderMenu(); }
  _closeMenu() { this.el.menu.hidden = true; this.root.classList.remove('vp-menu-open'); }
  _refreshMenu() { if (!this.el.menu.hidden) this._renderMenu(); }
  _renderMenu() {
    const m = this.el.menu, levels = this._levels();
    const sel = levels.find((l) => l.i === this.level);
    const curLabel = this.level < 0 || !sel ? 'Авто' : qlabel(sel.h);
    const tag = (h) => (h >= 2160 ? ' <b>4K</b>' : h >= 1080 ? ' <b>HD</b>' : '');
    let html = '';
    if (this.menuView === 'main') {
      html = `<button data-go="speed">${icon('speed')}<span>Скорость</span><em>${this.v.playbackRate === 1 ? 'Обычная' : this.v.playbackRate + '×'}</em>${icon('next')}</button>`;
      if (levels.length) html += `<button data-go="quality">${icon('quality')}<span>Качество</span><em>${curLabel}</em>${icon('next')}</button>`;
      html += `<button data-go="stats">${icon('info')}<span>Статистика для гиков</span><em>S</em></button>`;
    } else {
      const title = this.menuView === 'speed' ? 'Скорость воспроизведения' : 'Качество';
      html = `<button class="vp-menu-head" data-go="main">${icon('back')}<span>${title}</span></button>`;
      if (this.menuView === 'speed') {
        html += RATES.map((r) => `<button data-rate="${r}" class="${r === this.v.playbackRate ? 'on' : ''}">${icon('check', 'vp-check')}<span>${r === 1 ? 'Обычная' : r + '×'}</span></button>`).join('');
      } else {
        html += levels.map((l) => `<button data-level="${l.i}" class="${l.i === this.level ? 'on' : ''}">${icon('check', 'vp-check')}<span>${l.h}p${tag(l.h)}</span><em>${(l.br / 1e6).toFixed(1)} Мбит/с</em></button>`).join('');
        html += `<button data-level="-1" class="${this.level < 0 ? 'on' : ''}">${icon('check', 'vp-check')}<span>Авто</span></button>`;
      }
    }
    m.innerHTML = html;
    m.querySelectorAll('button').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const d = b.dataset;
        if (d.go === 'stats') { this._closeMenu(); this.toggleStats(); }
        else if (d.go) { this.menuView = d.go; this._renderMenu(); }
        else if (d.rate) { this.setRate(+d.rate); this._closeMenu(); }
        else if (d.level) { this.setLevel(+d.level); this._closeMenu(); }
      };
    });
  }

  /* ================= Статистика ================= */
  _renderStats() {
    const v = this.v, h = this.hls, q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    const lvl = h && h.levels ? h.levels[h.currentLevel >= 0 ? h.currentLevel : Math.max(h.loadLevel, 0)] : null;
    let buf = 0;
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) buf = v.buffered.end(i) - v.currentTime;
    const rows = [
      ['Разрешение кадра', `${v.videoWidth}×${v.videoHeight}`],
      ['Кодеки', lvl ? (lvl.codecSet || [lvl.videoCodec, lvl.audioCodec].filter(Boolean).join(', ')) : '—'],
      ['Битрейт уровня', lvl ? (lvl.bitrate / 1e6).toFixed(2) + ' Мбит/с' : '—'],
      ['Оценка сети', h && h.bandwidthEstimate ? (h.bandwidthEstimate / 1e6).toFixed(1) + ' Мбит/с' : '—'],
      ['Буфер', buf.toFixed(1) + ' с'],
      ['Пропущено кадров', q ? `${q.droppedVideoFrames} / ${q.totalVideoFrames}` : '—'],
      ['Режим качества', this.level < 0 ? 'Авто (ABR)' : 'Фиксированный'],
    ];
    this.el.stats.innerHTML = '<b>Статистика</b>' + rows.map(([a, b]) => `<div><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('');
  }

  /* ================= Мелочи ================= */
  _toast(text, ms = 1100) {
    const t = this.el.toast; t.textContent = text; t.hidden = false;
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }
  _showControls(keep) {
    this.root.classList.add('vp-active');
    clearTimeout(this.hideTimer);
    if (!keep && !this._media().paused) this._scheduleHide(2500);
  }
  _scheduleHide(ms) {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (this._media().paused || this.scrubbing || !this.el.menu.hidden) return;
      this.root.classList.remove('vp-active');
    }, ms);
  }
  _setMediaSession() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: this.opts.title || 'Видео', artwork: this.opts.poster ? [{ src: this.opts.poster }] : [] });
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => this.seekBy(-10));
    navigator.mediaSession.setActionHandler('seekforward', () => this.seekBy(10));
  }
}
