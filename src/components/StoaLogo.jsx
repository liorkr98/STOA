import React from "react";

export default function StoaLogo({ className = "", size = 28, textSize = "text-xl", showText = true, light = false }) {
  const color = light ? "#ffffff" : "#1e3a6e";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Top horizontal bar */}
        <rect x="2" y="4" width="28" height="4" rx="1" fill={color} />
        {/* Bottom horizontal bar */}
        <rect x="2" y="24" width="28" height="4" rx="1" fill={color} />
        {/* Pillar 1 */}
        <rect x="3" y="8" width="7" height="16" rx="1" fill={color} />
        {/* Pillar 2 (center) */}
        <rect x="12.5" y="8" width="7" height="16" rx="1" fill={color} />
        {/* Pillar 3 */}
        <rect x="22" y="8" width="7" height="16" rx="1" fill={color} />
        {/* Top nubs on each pillar */}
        <rect x="3" y="6" width="7" height="2" rx="0.5" fill={color} opacity="0.7" />
        <rect x="12.5" y="6" width="7" height="2" rx="0.5" fill={color} opacity="0.7" />
        <rect x="22" y="6" width="7" height="2" rx="0.5" fill={color} opacity="0.7" />
      </svg>
      {showText && (
        <span className={`font-bold tracking-wide ${textSize}`} style={{ color }}>
          STOA
        </span>
      )}
    </div>
  );
}