/**
 * The Academy's mark: three strokes, two falling and one rising, like a tick or an arrow going up.
 * Black strokes follow the text colour (white on dark backgrounds); the middle stroke is always red.
 */
export default function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeWidth="5.6" strokeLinecap="round">
      <line x1="8.48" y1="5.18" x2="40.63" y2="29.21" stroke="currentColor" />
      <line x1="36.97" y1="4" x2="44.45" y2="41.05" stroke="#DB0B0B" />
      <line x1="55.52" y1="21.43" x2="35.89" y2="60" stroke="currentColor" />
    </svg>
  );
}
