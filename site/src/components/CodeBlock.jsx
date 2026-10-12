import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Check, Copy } from 'lucide-react';

// Тема подсветки: берём стандартную тёмную и убираем её фон — фон задаёт наш CSS
const theme = { ...themes.vsDark, plain: { ...themes.vsDark.plain, backgroundColor: 'transparent' } };

export default function CodeBlock({ code, language = 'markup', title, className = '' }) {
  const [copied, setCopied] = useState(false);
  const text = code.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* буфер недоступен — пользователь может выделить текст вручную */
    }
  };

  return (
    <div className={`code ${className}`}>
      {title && (
        <div className="code-head">
          <span className="code-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="code-title">{title}</span>
          <button type="button" className={`copy-btn${copied ? ' is-done' : ''}`} onClick={copy} aria-label="Скопировать код">
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      )}
      <Highlight theme={theme} code={text} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre tabIndex={0}>
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, k) => <span key={k} {...getTokenProps({ token })} />)}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
