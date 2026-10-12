import Section from './Section.jsx';
import { API, SHORTCUTS } from '../data.js';

const BOXES = [
  ['Опции', 'options'],
  ['Методы', 'methods'],
  ['События', 'events'],
];

export default function Api() {
  return (
    <Section id="api" title="API для разработчиков">
      <div className="api">
        {BOXES.map(([title, key]) => (
          <div className="api-box" key={key}>
            <h3>{title}</h3>
            <dl>
              {API[key].map(([name, text]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <h3 className="sub keys-title">Горячие клавиши</h3>
      <div className="keys">
        {SHORTCUTS.map(([keys, text]) => (
          <div className="key-row" key={text}>
            <span className="key-set">{keys.map((k) => <kbd key={k}>{k}</kbd>)}</span>
            <span className="key-text">{text}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
