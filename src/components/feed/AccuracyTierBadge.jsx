import React from "react";

export default function AccuracyTierBadge({ accuracy }) {
  let label, bg, color;
  if (accuracy >= 80)      { label = "⭐ ELITE";    bg = "#f59e0b"; color = "#ffffff"; }
  else if (accuracy >= 65) { label = "EXPERT";      bg = "#2563eb"; color = "#ffffff"; }
  else if (accuracy >= 50) { label = "STRONG";      bg = "#16a34a"; color = "#ffffff"; }
  else if (accuracy >= 35) { label = "AVERAGE";     bg = "#e5e7eb"; color = "#374151"; }
  else                     { label = "BUILDING";    bg = "#f1f5f9"; color = "#94a3b8"; }

  return (
    <span style={{
      background: bg,
      color,
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 4,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}