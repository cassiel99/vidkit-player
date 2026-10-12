// ES-модуль для сборщиков (React, Vue, Vite, webpack ...): import VidkitPlayer from 'vidkit-player'.
// В отличие от браузерной сборки здесь НЕТ автоматической замены <video> — фреймворк сам управляет
// своим DOM, и неожиданная замена узлов ему вредит. Нужна — вызовите autoInit(контейнер) вручную.
import { VidkitPlayer } from './player.js';
import { defineElement } from './element.js';
import { injectStyles } from './styles.js';
import { autoInit, upgradeVideo, watch } from './auto.js';

VidkitPlayer.autoInit = autoInit;
VidkitPlayer.upgrade = upgradeVideo;

defineElement(); // регистрирует тег <vidkit-player>, DOM страницы не трогает

export { VidkitPlayer, autoInit, upgradeVideo, watch, injectStyles, defineElement };
export default VidkitPlayer;
