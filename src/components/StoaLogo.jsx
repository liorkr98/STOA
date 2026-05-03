import React from "react";

export default function StoaLogo({ className = "", size = 28, textSize = "text-xl", showText = true, light = false }) {
  const color = light ? "#ffffff" : "#1e3a6e";
  // Matches the uploaded logo: 3 thick vertical rectangular pillars,
  // a thick horizontal bar on top, a thick horizontal bar on bottom,
  // small connector nubs at top of each pillar (like capital details)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Top horizontal bar */}
        <rect x="2" y="5" width="28" height="4" rx="1" fill={color} />
        {/* Bottom horizontal bar */}
        <rect x="2" y="23" width="28" height="4" rx="1" fill={color} />
        {/* Pillar 1 */}
        <rect x="3" y="9" width="7" height="14" rx="1" fill={color} />
        {/* Pillar 2 (center) */}
        <rect x="12.5" y="9" width="7" height="14" rx="1" fill={color} />
        {/* Pillar 3 */}
        <rect x="22" y="9" width="7" height="14" rx="1" fill={color} />
        {/* Top nubs on each pillar */}
        <rect x="3" y="4.5" width="7" height="1.5" rx="0.5" fill={color} opacity="0.6" />
        <rect x="12.5" y="4.5" width="7" height="1.5" rx="0.5" fill={color} opacity="0.6" />
        <rect x="22" y="4.5" width="7" height="1.5" rx="0.5" fill={color} opacity="0.6" />
      </svg>
      {showText && (
        <span className={`font-bold tracking-wide ${textSize}`} style={{ color }}>
          STOA
        </span>
      )}
    </div>
  );
}