import { useCallback, useState } from 'react';
import { ChevronRight, RotateCcw, Settings } from 'lucide-react';
import VideoPlayer from './VideoPlayer.jsx';
import EventLog from './EventLog.jsx';
import { DEMO_ADS, url } from '../data.js';
import { useEventLog } from '../hooks/useEventLog.js';

// Демо загружается лениво (React.lazy в App): hls.js и плеер не тормозят первый экран.
export default function Demo() {
  const [adsOn, setAdsOn] = useState(true);
  const [run, setRun] = useState(0); // меняем, чтобы начать демо сначала
  const { lines, push, clear } = useEventLog();

  const options = {
    src: url('media/demo/master.m3u8'),
    poster: url('media/demo/poster.jpg'),
    title: 'Демо: адаптивный поток от 360p до 4K',
    ads: adsOn ? DEMO_ADS : [],
    resume: false, // демо всегда стартует с начала
  };

  const onPlayer = useCallback((player) => {
    player.on('ready', ({ qualities }) => push(`ready · качества: ${qualities.map((q) => q.label).join(', ')}`));
    player.on('qualitychange', (q) => push(`qualitychange · ${q.auto ? 'авто' : 'вручную'} · ${q.height || '?'}p`));
    player.on('play', () => push('play'));
    player.on('pause', () => push('pause'));
    player.on('ended', () => push('ended'));
    player.on('adbreakstart', (d) => push(`adbreakstart · ${d.kind}-roll`));
    player.on('adstart', (d) => push(`adstart · ${d.index} из ${d.total}${d.item.title ? ' · ' + d.item.title : ''}`));
    player.on('adskip', () => push('adskip · реклама пропущена'));
    player.on('adend', (d) => push(`adend · ${d.result}`));
    player.on('adclick', (d) => push(`adclick · ${d.url}`));
    player.on('aderror', (d) => push(`aderror · ${d.error && d.error.message ? d.error.message : 'ошибка'}`));
    player.on('adbreakend', (d) => push(`adbreakend · показано: ${d.played}`));
  }, [push]);

  return (
    <div className="wrap demo">
      <div className="demo-tools">
        <label className="switch">
          <input type="checkbox" checked={adsOn} onChange={(e) => setAdsOn(e.target.checked)} />
          <span className="sw" aria-hidden="true" />
          <span>Реклама в демо <small>pre-roll и mid-roll на 12-й секунде</small></span>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRun((n) => n + 1)}>
          <RotateCcw size={16} aria-hidden="true" />Начать сначала
        </button>
      </div>

      <div className="demo-frame">
        <VideoPlayer options={options} onPlayer={onPlayer} resetKey={run} />
      </div>

      <p className="hint">
        <kbd>Пробел</kbd> — пауза, <kbd>J</kbd>/<kbd>L</kbd> — перемотка, <kbd>S</kbd> — статистика, <kbd>T</kbd> — кинотеатр.
        Откройте <Settings size={14} className="inline-ico" aria-label="шестерёнка" /> <ChevronRight size={14} className="inline-ico" aria-hidden="true" /> «Качество»: в списке есть 4K.
        Жёлтая метка на полосе — место рекламы.
      </p>

      <EventLog lines={lines} onClear={clear} />
    </div>
  );
}
