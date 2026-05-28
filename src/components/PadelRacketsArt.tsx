type Props = { className?: string };

// Build a simple dot grid that fits inside an ellipse rx,ry.
function dotsInEllipse(cx: number, cy: number, rx: number, ry: number, step = 7) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let y = -ry + step; y < ry; y += step) {
    for (let x = -rx + step; x < rx; x += step) {
      const ox = Math.floor(y / step) % 2 === 0 ? 0 : step / 2;
      const xx = x + ox;
      // inside ellipse with small inset so dots don't touch frame
      if ((xx * xx) / ((rx - 6) * (rx - 6)) + (y * y) / ((ry - 6) * (ry - 6)) < 1) {
        pts.push({ x: cx + xx, y: cy + y });
      }
    }
  }
  return pts;
}

export default function PadelRacketsArt({ className = "" }: Props) {
  const headRX = 36;
  const headRY = 46;
  const leftDots = dotsInEllipse(0, 0, headRX, headRY);
  const rightDots = leftDots; // identical for both heads

  return (
    <svg
      viewBox="0 0 260 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g
        stroke="currentColor"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Left racket — head + throat + handle, rotated counter-clockwise */}
        <g transform="rotate(-22 130 175) translate(95 70)">
          <ellipse rx={headRX} ry={headRY} />
          <path d={`M -10 ${headRY - 4} L 0 ${headRY + 32}`} />
          <path d={`M 10 ${headRY - 4} L 0 ${headRY + 32}`} />
          <rect x="-7" y={headRY + 32} width="14" height="32" rx="2" />
          <g fill="currentColor" stroke="none">
            {leftDots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="1.5" />
            ))}
          </g>
        </g>

        {/* Right racket — mirrored rotation */}
        <g transform="rotate(22 130 175) translate(165 70)">
          <ellipse rx={headRX} ry={headRY} />
          <path d={`M -10 ${headRY - 4} L 0 ${headRY + 32}`} />
          <path d={`M 10 ${headRY - 4} L 0 ${headRY + 32}`} />
          <rect x="-7" y={headRY + 32} width="14" height="32" rx="2" />
          <g fill="currentColor" stroke="none">
            {rightDots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="1.5" />
            ))}
          </g>
        </g>

        {/* Tape band where handles cross */}
        <rect
          x="118"
          y="170"
          width="24"
          height="8"
          rx="1"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
}
