import React, { useState } from "react";

const LOGO_URL = "https://media.base44.com/images/public/69f7681ad5920983f5b3c3a0/b45d30844_WhatsAppImage2026-05-03at2027161.jpeg";

function LogoSVG({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="26" width="28" height="3" rx="1" fill={color} />
      <rect x="2" y="3" width="28" height="3" rx="1" fill={color} />
      <rect x="5.5" y="3" width="2" height="4" rx="0.5" fill={color} />
      <rect x="3" y="7" width="7" height="14" rx="1" fill={color} />
      <rect x="5.5" y="21" width="2" height="5" rx="0.5" fill={color} />
      <rect x="14.5" y="3" width="2" height="6" rx="0.5" fill={color} />
      <rect x="12" y="9" width="7" height="10" rx="1" fill={color} />
      <rect x="14.5" y="19" width="2" height="7" rx="0.5" fill={color} />
      <rect x="24.5" y="3" width="2" height="5" rx="0.5" fill={color} />
      <rect x="22" y="8" width="7" height="13" rx="1" fill={color} />
      <rect x="24.5" y="21" width="2" height="5" rx="0.5" fill={color} />
    </svg>
  );
}

export default function StoaLogo({
  className = "",
  size = 28,
  textSize = "text-xl",
  showText = true,
  light = false,
  useSvg = false,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = light ? "#ffffff" : "#1E3A8A";
  const showSvg = useSvg || imgFailed;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showSvg ? (
        <LogoSVG size={size} color={color} />
      ) : (
        <img
          src={LOGO_URL}
          alt="STOA Logo"
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          style={{
            width: size,
            height: size,
            objectFit: "contain",
            filter: light ? "brightness(0) invert(1)" : "none",
          }}
        />
      )}
      {showText && (
        <span className={`font-bold tracking-wide ${textSize}`} style={{ color }}>
          STOA
        </span>
      )}
    </div>
  );
}