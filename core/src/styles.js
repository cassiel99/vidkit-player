import css from './player.css';

// Стили встраиваются в сам скрипт — отдельный CSS-файл подключать не нужно.
// Вызывается автоматически при создании первого плеера.
export function injectStyles() {
  if (typeof document === 'undefined' || document.querySelector('style[data-vidkit]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-vidkit', '');
  s.textContent = css;
  (document.head || document.documentElement).prepend(s); // prepend — чтобы стили сайта могли переопределять
}
