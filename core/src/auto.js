// Автоподключение: достаточно добавить скрипт на страницу — обычные <video controls>
// автоматически заменяются на Vidkit Player (HLS, качество до 4K, реклама, горячие клавиши).
//
// Что заменяется, а что нет:
//   <video controls src="a.mp4">            → заменяется
//   <video controls><source src="a.m3u8">   → заменяется (берётся первый источник, HLS в приоритете)
//   <video autoplay muted loop> (без controls) → НЕ трогаем: это фоновое видео без плеера
//   <video controls><track ...>             → НЕ трогаем: плеер пока не умеет субтитры
//   <video data-vidkit="off">                → отключено автором;  data-vidkit="on" — заменить принудительно
//
// Настройки: window.VidkitPlayerConfig = { auto, ads, hlsUrl, capToPlayerSize, adTimeout }
//            или атрибут на скрипте: <script src="vidkit-player.js" data-auto="false">
// Рекламу для одного видео можно задать атрибутом data-ads='[{"type":"preroll","src":"ad.mp4"}]'.
import { defineElement } from './element.js';

// document.currentScript доступен только пока скрипт выполняется — запоминаем сразу
const SCRIPT = typeof document !== 'undefined' ? document.currentScript : null;

const OWN = '.vp, vidkit-player'; // видео внутри самого плеера не трогаем

function readConfig() {
  const cfg = (typeof window !== 'undefined' && window.VidkitPlayerConfig) || {};
  if (SCRIPT && SCRIPT.dataset && SCRIPT.dataset.auto === 'false') return { ...cfg, auto: false };
  return cfg;
}

function parseJson(s) {
  try { return s ? JSON.parse(s) : null; } catch { console.warn('Vidkit: data-ads — некорректный JSON'); return null; }
}

function pickSource(video) {
  const direct = video.getAttribute('src');
  if (direct) return direct;
  const sources = Array.from(video.querySelectorAll('source[src]'));
  const hls = sources.find((s) => /mpegurl/i.test(s.type || '') || /\.m3u8(\?|$)/i.test(s.getAttribute('src')));
  const chosen = hls || sources[0];
  return chosen ? chosen.getAttribute('src') : null;
}

/** Нужно ли заменять это видео */
export function shouldUpgrade(video) {
  if (!video || video.nodeName !== 'VIDEO' || video.closest(OWN)) return false;
  const flag = (video.getAttribute('data-vidkit') || '').toLowerCase();
  if (flag === 'off' || flag === 'false') return false;
  if (!pickSource(video)) return false;
  if (flag === 'on' || flag === 'true') return true;
  return video.hasAttribute('controls') && !video.querySelector('track');
}

/** Заменить один <video> на <vidkit-player>. Возвращает созданный элемент. */
export function upgradeVideo(video) {
  defineElement();
  const src = pickSource(video);
  if (!src) return null;
  const el = document.createElement('vidkit-player');
  el.setAttribute('src', src);
  const title = video.getAttribute('title') || video.getAttribute('aria-label');
  if (title) el.setAttribute('title', title);
  ['poster', 'autoplay', 'muted', 'loop'].forEach((a) => { if (video.hasAttribute(a)) el.setAttribute(a, video.getAttribute(a)); });
  ['id', 'class', 'style'].forEach((a) => { if (video.hasAttribute(a)) el.setAttribute(a, video.getAttribute(a)); });
  const w = parseFloat(video.getAttribute('width')), h = parseFloat(video.getAttribute('height'));
  if (w) { el.style.width = '100%'; el.style.maxWidth = w + 'px'; }
  if (w && h) el.style.aspectRatio = `${w} / ${h}`;
  const ads = parseJson(video.getAttribute('data-ads'));
  if (ads) el.ads = ads;
  el.setAttribute('data-vidkit-upgraded', '');
  video.replaceWith(el);
  return el;
}

/** Найти и заменить подходящие видео внутри scope (по умолчанию — вся страница) */
export function autoInit(scope = document) {
  if (typeof document === 'undefined' || !scope) return [];
  const list = scope.querySelectorAll ? Array.from(scope.querySelectorAll('video')) : [];
  if (scope.nodeName === 'VIDEO') list.unshift(scope);
  return list.filter(shouldUpgrade).map(upgradeVideo).filter(Boolean);
}

let observer = null;
/** Следить за страницей: видео, добавленные позже (AJAX, SPA), тоже будут заменены */
export function watch(root) {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1 || (n.closest && n.closest(OWN))) return;
        autoInit(n);
      });
    }
  });
  observer.observe(root || document.documentElement, { childList: true, subtree: true });
}

/** Запуск при загрузке скрипта (только в браузерной сборке) */
export function startAuto() {
  if (typeof document === 'undefined' || readConfig().auto === false) return;
  const run = () => { autoInit(document); watch(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}
