import React, { useMemo } from "react";

/**
 * Sparkline — tiny inline trend SVG used on analyst cards, ticker rows,
 * leaderboard rails. Stroke color follows the sentiment palette via CSS
 * variables (--rolex-green / --velvet-red) — these are the ONLY places
 * sentiment color is allowed.
 *
 * Ported from prototype/src/components.jsx (Sparkline) per design handoff v2.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 36,
  kind = "pos",
  filled = true,
  strokeWidth = 1.25,
}) {
  const { d, area } = useMemo(() => {
    if (!data || !data.length) return { d: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = Math.max(1, max - min);
    const stepX = width / (data.length - 1);
    let path = "";
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / rng) * (height - 4) - 2;
      path += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    });
    return { d: path, area: path + `L${width},${height} L0,${height} Z` };
  }, [data, width, height]);

  const stroke = kind === "neg" ? "var(--velvet-red)" : "var(--rolex-green)";

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      {filled && <path d={area} fill={stroke} fillOpacity="0.08" />}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
