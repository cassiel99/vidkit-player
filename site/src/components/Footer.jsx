import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <a className="logo" href="#top" aria-label="Vidkit Player — наверх">
          <Logo size={24} />
          <span>Vidkit Player</span>
        </a>
        <span className="footer-text"></span>
      </div>
    </footer>
  );
}
