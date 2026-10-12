// Логотип — SVG, а не картинка: масштабируется без потери качества
export default function Logo({ size = 28 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`lg${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3d57" />
          <stop offset="1" stopColor="#ff8a3d" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#lg${size})`} />
      <path d="M12 9v14l12-7z" fill="#fff" />
    </svg>
  );
}
