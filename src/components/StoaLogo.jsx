import React from "react";

export default function StoaLogo({ className = "", size = 28, textSize = "text-xl", showText = true, light = false }) {
  const color = light ? "#ffffff" : "#1e3a6e";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        {/* Top architrave */}
        <rect x="2" y="4" width="24" height="3" rx="1" fill={color} />
        {/* Top thin cap line */}
        <rect x="2" y="3" width="24" height="1.2" rx="0.5" fill={color} opacity="0.5" />
        {/* Bottom base */}
        <rect x="2" y="21" width="24" height="3" rx="1" fill={color} />
        {/* Pillar 1 */}
        <rect x="4" y="7" width="4" height="14" rx="1" fill={color} />
        {/* Pillar 2 */}
        <rect x="12" y="7" width="4" height="14" rx="1" fill={color} />
        {/* Pillar 3 */}
        <rect x="20" y="7" width="4" height="14" rx="1" fill={color} />
      </svg>
      {showText && (
        <span className={`font-bold tracking-wide ${textSize}`} style={{ color }}>
          STOA
        </span>
      )}
    </div>
  );
}