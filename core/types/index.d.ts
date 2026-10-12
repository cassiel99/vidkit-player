// Типы Vidkit Player

export interface AdItem {
  /** Где показывать. По умолчанию 'preroll' */
  type?: 'preroll' | 'midroll' | 'postroll';
  /** Только для midroll: секунды (30), процент ('50%') или время ('1:30') */
  at?: number | string;
  /** Видео рекламы: MP4 или HLS (.m3u8). Нужен либо src, либо vast */
  src?: string;
  /** Ссылка на VAST 2/3/4 (InLine и Wrapper). Сервер должен отдавать CORS-заголовки */
  vast?: string;
  /** Через сколько секунд появляется «Пропустить». null — реклама не пропускается. По умолчанию 5 (в VAST — из skipoffset) */
  skipAfter?: number | null;
  /** Куда ведёт кнопка «Подробнее» (только http/https) */
  clickUrl?: string;
  title?: string;
  /** Пиксели показа */
  impression?: string | string[];
}

export interface VidkitPlayerOptions {
  /** Ссылка на master.m3u8 или обычный видеофайл */
  src?: string;
  poster?: string;
  title?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  /** Запоминать место просмотра между визитами. По умолчанию true */
  resume?: boolean;
  ads?: AdItem | string | Array<AdItem | string>;
  /** Путь к hls.js, если он лежит не рядом со скриптом плеера */
  hlsUrl?: string;
  /** Авто-качество не выше размера окна плеера. По умолчанию true */
  capToPlayerSize?: boolean;
  /** Сколько ждать загрузки рекламы, мс. По умолчанию 8000 */
  adTimeout?: number;
}

export interface Quality { height: number; bitrate: number; label: string }

export interface AdEventDetail { item: AdItem; index: number; total: number; result?: 'complete' | 'skipped'; error?: Error; url?: string }

export interface VidkitPlayerEvents {
  ready: { qualities: Quality[] };
  play: undefined;
  pause: undefined;
  ended: undefined;
  qualitychange: { auto: boolean; height: number | null };
  theater: boolean;
  error: { fatal: boolean; details: string };
  adbreakstart: { kind: 'pre' | 'mid' | 'post' };
  adbreakend: { kind: 'pre' | 'mid' | 'post'; played: number };
  adstart: AdEventDetail;
  adend: AdEventDetail;
  adskip: AdEventDetail;
  adclick: AdEventDetail;
  aderror: { item: AdItem; error?: Error; index?: number; total?: number };
}

/** Настройки для автоподключения; задаются до загрузки скрипта: window.VidkitPlayerConfig = {...} */
export interface VidkitPlayerConfig {
  /** false — не заменять <video> автоматически */
  auto?: boolean;
  /** Реклама для всех автоматически подключённых видео */
  ads?: VidkitPlayerOptions['ads'];
  hlsUrl?: string;
  capToPlayerSize?: boolean;
  adTimeout?: number;
}

export function autoInit(scope?: ParentNode): VidkitPlayerElement[];
export function upgradeVideo(video: HTMLVideoElement): VidkitPlayerElement | null;

export class VidkitPlayer {
  static autoInit: typeof autoInit;
  static upgrade: typeof upgradeVideo;
  constructor(container: string | HTMLElement, options?: VidkitPlayerOptions);
  readonly video: HTMLVideoElement;
  play(): void;
  pause(): void;
  toggle(): void;
  seekTo(seconds: number): void;
  seekBy(seconds: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  getQualities(): Quality[];
  setQuality(quality: 'auto' | number): void;
  getQuality(): { auto: boolean; height: number | null };
  load(src: string): Promise<void>;
  setAds(ads: VidkitPlayerOptions['ads']): void;
  isPlayingAd(): boolean;
  skipAd(force?: boolean): boolean;
  on<K extends keyof VidkitPlayerEvents>(event: K, handler: (detail: VidkitPlayerEvents[K]) => void): this;
  off<K extends keyof VidkitPlayerEvents>(event: K, handler?: (detail: VidkitPlayerEvents[K]) => void): this;
  destroy(): void;
}

export interface VidkitPlayerElement extends HTMLElement {
  player: VidkitPlayer | null;
  ads: VidkitPlayerOptions['ads'];
}

declare global {
  interface Window { VidkitPlayer: typeof VidkitPlayer; VidkitPlayerConfig?: VidkitPlayerConfig }
  interface HTMLElementTagNameMap { 'vidkit-player': VidkitPlayerElement }
}

export default VidkitPlayer;
