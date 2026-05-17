import React, { useEffect, useState } from "react";

// Candle Colonnade mark — three pillars + two beams (Greek stoa structure),
// reinterpreted as candlestick bodies with wicks ABOVE and BELOW each pillar.
// The wick pattern is short-tall-short (symmetric), so the middle candle reads
// as the "high-range" candle and the outer two as supporting candles —
// classic candlestick visual rhythm. Pure inline SVG so it scales crisply
// and recolors with theme.
function LogoMark({ size, color, wickColor }) {
  // Geometry on a 64×64 viewBox. The drawing is vertically centered: the
  // top and bottom beams are equidistant from the middle line (y=32) so
  // the mark balances against the wordmark beside it.
  const CENTER_Y      = 32;
  const HALF_BODY     = 9;                              // pillar half-height
  const BEAM_TOP_Y    = CENTER_Y - HALF_BODY - 5;       // 18
  const BEAM_BOTTOM_Y = CENTER_Y + HALF_BODY + 2;       // 43
  const PILLAR_TOP    = BEAM_TOP_Y + 3;                 // 21
  const PILLAR_BOTTOM = BEAM_BOTTOM_Y;                  // 43
  const PILLAR_W      = 6;
  const CENTERS       = [16, 32, 48];

  // Wick lengths: outer wicks shorter, middle wick longer.
  // Pattern: low-high-low (symmetric).
  const OUTER_WICK_TOP_Y = BEAM_TOP_Y - 6;     // outer wicks start higher (less tall)
  const MIDDLE_WICK_TOP_Y = BEAM_TOP_Y - 12;   // middle wick extends further up
  const OUTER_WICK_BOT_Y = BEAM_BOTTOM_Y + 6;  // mirrored below
  const MIDDLE_WICK_BOT_Y = BEAM_BOTTOM_Y + 12;

  const wickYTop    = (i) => (i === 1 ? MIDDLE_WICK_TOP_Y : OUTER_WICK_TOP_Y);
  const wickYBottom = (i) => (i === 1 ? MIDDLE_WICK_BOT_Y : OUTER_WICK_BOT_Y);

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
      {/* Top wicks — short / tall / short */}
      <g stroke={wickColor} strokeWidth="0.9" opacity="0.45" strokeLinecap="round">
        {CENTERS.map((cx, i) => (
          <line key={`t-${i}`} x1={cx} y1={wickYTop(i)} x2={cx} y2={BEAM_TOP_Y - 0.5} />
        ))}
      </g>

      {/* Top beam */}
      <rect x="4" y={BEAM_TOP_Y} width="56" height="3" rx="0.5" fill={color} />

      {/* Three pillars — candle bodies */}
      {CENTERS.map((cx, i) => (
        <rect
          key={`p-${i}`}
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

      {/* Bottom wicks — mirror of top (short / tall / short) */}
      <g stroke={wickColor} strokeWidth="0.9" opacity="0.45" strokeLinecap="round">
        {CENTERS.map((cx, i) => (
          <line key={`b-${i}`} x1={cx} y1={BEAM_BOTTOM_Y + 3.5} x2={cx} y2={wickYBottom(i)} />
        ))}
      </g>
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

// Watch the documentElement for the .dark class so the logo recolors as soon
// as the theme flips, without each consumer having to pass a `light` prop.
function useIsDark() {
  const [isDark, setIsDark] = useState(
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function StoaLogo({
  className = "",
  size = 28,
  textSize = "text-xl",
  showText = true,
  light = false,        // force the dark-bg color (use for places not in .dark scope)
}) {
  // Brand spec: navy on light surfaces, pale blue on dark surfaces.
  // Now follows the theme automatically so the header logo isn't navy-on-navy
  // in dark mode (which made it nearly invisible). Consumers can still
  // force the light variant with `light` for headers that sit on a dark
  // hero in light mode.
  const isDark    = useIsDark();
  const color     = (light || isDark) ? "#C8D8F0" : "#1B3A6B";
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
