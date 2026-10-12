import Section from './Section.jsx';
import CodeBlock from './CodeBlock.jsx';
import { CODE } from '../data.js';

export default function Encoder() {
  return (
    <Section
      id="encoder"
      title="Подготовка видео: Vidkit Encoder"
      lead="Плееру нужен HLS-поток. Кодировщик на ffmpeg делает его из любого файла: нарезает на сегменты, кодирует все качества до 4K и выравнивает ключевые кадры для плавного переключения."
    >
      <CodeBlock code={CODE.encoder} language="bash" title="Terminal" />
      <p className="note">Нужны Node.js 18+ и ffmpeg с ffprobe в PATH. Обычные MP4 тоже играют без кодирования, но без выбора качества.</p>
    </Section>
  );
}
