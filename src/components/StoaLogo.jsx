import React from "react";

// Candle Colonnade mark — three pillars + two beams (Greek stoa structure),
// with hairline "ghost wicks" above each pillar (candlestick-chart wicks at
// 30% opacity — only finance people notice). Pure SVG so it scales, recolors
// with theme, and blends into the surrounding nav instead of looking pasted.
function LogoMark({ size, color, wickColor }) {
  // Geometry (viewBox 64×64) — beams 56 wide, three pillars centered.
  // Wicks extend above beams; offsets are picked so the lines land on
  // the column centerlines.
  const BEAM_TOP_Y    = 14;
  const BEAM_BOTTOM_Y = 49;
  const PILLAR_TOP    = BEAM_TOP_Y + 3;
  const PILLAR_BOTTOM = BEAM_BOTTOM_Y - 0;
  const PILLAR_W      = 6;
  // Centerlines: 16, 32, 48
  const CENTERS = [16, 32, 48];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="STOA"
    >
      {/* Ghost wicks (candlestick wicks above each pillar).
          Opacity bumped from 0.3 → 0.45 and stroke from 0.5 → 0.9
          so the candlestick reference reads at small sizes. */}
      <g stroke={wickColor} strokeWidth="0.9" opacity="0.45" strokeLinecap="round">
        {CENTERS.map((cx, i) => (
          <line key={i} x1={cx} y1="2" x2={cx} y2={BEAM_TOP_Y - 0.5} />
        ))}
      </g>

      {/* Top beam */}
      <rect x="4" y={BEAM_TOP_Y} width="56" height="3" rx="0.5" fill={color} />

      {/* Three pillars */}
      {CENTERS.map((cx, i) => (
        <rect
          key={i}
          x={cx - PILLAR_W / 2}
          y={PILLAR_TOP}
          width={PILLAR_W}
          height={PILLAR_BOTTOM - PILLAR_TOP}
          rx="0.5"
          fill={color}
        />
      ))}

      {/* Bottom beam */}
      <rect x="4" y={BEAM_BOTTOM_Y} width="56" height="3" rx="0.5" fill={color} />
    </svg>
  );
}

// Wordmark — "S T O A" in spaced classical serif (Lora).
function Wordmark({ size, color }) {
  return (
    <span
      className="font-serif"
      style={{
        color,
        fontFamily: 'Lora, Georgia, serif',
        fontWeight: 600,
        fontSize: size,
        letterSpacing: '0.32em',
        lineHeight: 1,
        // Lora's natural baseline sits a hair low next to a geometric mark;
        // nudge it up so the cap-height aligns with the beams.
        transform: 'translateY(-1px)',
        display: 'inline-block',
      }}
    >
      S T O A
    </span>
  );
}

export default function StoaLogo({
  className = "",
  size = 28,
  textSize = "text-xl",
  showText = true,
  light = false,        // force dark-bg colors (for places that aren't in .dark scope, e.g. dark footer in light mode)
}) {
  // Brand spec: #1B3A6B on light backgrounds, #C8D8F0 on dark.
  const color     = light ? "#C8D8F0" : "#1B3A6B";
  const wickColor = color;

  // Map Tailwind textSize → numeric font px for the inline wordmark style.
  const TEXT_PX = {
    "text-xs":   12,
    "text-sm":   13,
    "text-base": 15,
    "text-lg":   17,
    "text-xl":   19,
    "text-2xl":  22,
    "text-3xl":  28,
  };
  const fontPx = TEXT_PX[textSize] ?? 16;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} color={color} wickColor={wickColor} />
      {showText && <Wordmark size={fontPx} color={color} />}
    </div>
  );
}
