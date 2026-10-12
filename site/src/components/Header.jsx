import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo.jsx';
import { NAV } from '../data.js';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); };
  }, []);

  // Меню на телефоне закрывается при повороте экрана / расширении окна
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 961px)');
    const close = () => mq.matches && setOpen(false);
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="header-bar wrap">
        <a className="logo" href="#top" onClick={() => setOpen(false)} aria-label="Vidkit Player — наверх">
          <Logo />
          <span>Vidkit Player</span>
        </a>

        <nav className="nav-desktop" aria-label="Основное меню">
          {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
        </nav>

        <a className="btn btn-sm header-cta" href="#install">Установить</a>

        <button
          type="button"
          className="burger"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      <nav id="mobile-menu" className="nav-mobile" aria-label="Меню" hidden={!open}>
        <div className="wrap">
          {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>)}
          <a className="btn" href="#install" onClick={() => setOpen(false)}>Установить на сайт</a>
        </div>
      </nav>
    </header>
  );
}
