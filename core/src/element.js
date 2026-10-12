// Веб-компонент <vidkit-player>: самый простой способ поставить плеер на сайт.
//
//   <vidkit-player src="video/master.m3u8" poster="poster.jpg" title="Название"></vidkit-player>
//   <vidkit-player src="..." ads='[{"type":"preroll","src":"ad.mp4","skipAfter":5}]'></vidkit-player>
//
// Реклама также задаётся из JS: el.ads = [...]; сам плеер: el.player.
// Для совместимости с <video> у элемента есть play(), pause(), currentTime, duration, paused, volume, muted.
import { VidkitPlayer } from './player.js';

function parseJson(s) { try { return s ? JSON.parse(s) : null; } catch { console.warn('vidkit-player: атрибут ads — некорректный JSON'); return null; } }

export function defineElement() {
  if (typeof customElements === 'undefined' || customElements.get('vidkit-player')) return;

  class VidkitPlayerElement extends HTMLElement {
    static get observedAttributes() { return ['src', 'poster']; }

    connectedCallback() {
      if (this.player) return;
      const cfg = (typeof window !== 'undefined' && window.VidkitPlayerConfig) || {};
      // Атрибут title показывал бы всплывающую подсказку браузера поверх плеера — переносим в data-title
      const title = this.getAttribute('title') || this.dataset.title || '';
      if (this.hasAttribute('title')) { this.dataset.title = title; this.removeAttribute('title'); }
      const opts = {
        src: this.getAttribute('src') || '',
        poster: this.getAttribute('poster') || '',
        title,
        autoplay: this.hasAttribute('autoplay'),
        muted: this.hasAttribute('muted'),
        loop: this.hasAttribute('loop'),
        hlsUrl: this.getAttribute('hls-url') || cfg.hlsUrl || undefined,
        capToPlayerSize: this.getAttribute('cap-to-player-size') !== 'false' && cfg.capToPlayerSize !== false,
        adTimeout: cfg.adTimeout,
      };
      const ads = this._ads || parseJson(this.getAttribute('ads')) || cfg.ads;
      if (ads) opts.ads = ads;
      this.player = new VidkitPlayer(this, opts);
    }

    disconnectedCallback() {
      // Элемент могли просто переместить в DOM — уничтожаем, только если он реально удалён
      queueMicrotask(() => { if (!this.isConnected && this.player) { this.player.destroy(); this.player = null; } });
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this.player || oldV === newV) return;
      if (name === 'src') this.player.load(newV);
      else if (name === 'poster') this.player.v.poster = newV || '';
    }

    get ads() { return this._ads; }
    set ads(list) { this._ads = list; if (this.player) this.player.setAds(list); }

    // --- совместимость с <video> ---
    play() { if (this.player) this.player.play(); return Promise.resolve(); }
    pause() { if (this.player) this.player.pause(); }
    get paused() { return this.player ? this.player.v.paused : true; }
    get duration() { return this.player ? this.player.v.duration : NaN; }
    get currentTime() { return this.player ? this.player.v.currentTime : 0; }
    set currentTime(t) { if (this.player) this.player.seekTo(t); }
    get volume() { return this.player ? this.player.v.volume : 1; }
    set volume(x) { if (this.player) this.player.setVolume(x); }
    get muted() { return this.player ? this.player.v.muted : false; }
    set muted(m) { if (this.player) this.player.setMuted(m); }
  }

  customElements.define('vidkit-player', VidkitPlayerElement);
}
