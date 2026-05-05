import React from "react";

export default function StoaLogo({ className = "", size = 28, textSize = "text-xl", showText = true, light = false }) {
  const color = light ? "#ffffff" : "#1e3a6e";
  const wick = light ? "rgba(255,255,255,0.6)" : "rgba(30,58,110,0.55)";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Candlestick 1 — bullish (tall body) */}
        <rect x="3" y="1.5" width="1.5" height="4" rx="0.5" fill={wick} />
        <rect x="3" y="25" width="1.5" height="5" rx="0.5" fill={wick} />
        <rect x="1.5" y="5.5" width="4.5" height="19.5" rx="1" fill={color} />

        {/* Candlestick 2 — medium body (slightly shorter) */}
        <rect x="13.25" y="3.5" width="1.5" height="5" rx="0.5" fill={wick} />
        <rect x="13.25" y="22" width="1.5" height="6" rx="0.5" fill={wick} />
        <rect x="11.5" y="8.5" width="5" height="13.5" rx="1" fill={color} />

        {/* Candlestick 3 — bearish (short body, long wicks) */}
        <rect x="23.25" y="0.5" width="1.5" height="7" rx="0.5" fill={wick} />
        <rect x="23.25" y="20" width="1.5" height="11" rx="0.5" fill={wick} />
        <rect x="21.5" y="7.5" width="5" height="12.5" rx="1" fill={color} opacity="0.75" />
      </svg>
      {showText && (
        <span className={`font-bold tracking-wide ${textSize}`} style={{ color }}>
          STOA
        </span>
      )}
    </div>
  );
}