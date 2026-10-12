// Браузерная сборка (<script src="vidkit-player.js">): создаёт window.VidkitPlayer,
// регистрирует <vidkit-player> и сама заменяет подходящие <video controls> на странице.
import { VidkitPlayer } from './player.js';
import { defineElement } from './element.js';
import { injectStyles } from './styles.js';
import { autoInit, upgradeVideo, startAuto } from './auto.js';

VidkitPlayer.autoInit = autoInit;
VidkitPlayer.upgrade = upgradeVideo;

injectStyles();
defineElement();

if (typeof window !== 'undefined') {
  window.VidkitPlayer = VidkitPlayer;
  startAuto();
}

export { VidkitPlayer, autoInit, upgradeVideo, injectStyles, defineElement };
export default VidkitPlayer;
