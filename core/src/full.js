// «Full»-сборка: hls.js уже внутри, больше ничего подключать не нужно.
import Hls from 'hls.js';

if (typeof window !== 'undefined' && !window.Hls) window.Hls = Hls;

import './index.js';
