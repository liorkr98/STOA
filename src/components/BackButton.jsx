import React from "react";
import { ChevronLeft } from "lucide-react";
import useGoBack from "@/hooks/useGoBack";

export default function BackButton({ fallback = "/", label = "Back", style }) {
  const goBack = useGoBack(fallback);
  return (
    <button
      type="button"
      onClick={goBack}
      className="btn btn-text btn-sm"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: "var(--text-mute)",
        padding: "0 6px",
        ...style,
      }}
      aria-label={label}
    >
      <ChevronLeft size={14} strokeWidth={1.6} />
      {label}
    </button>
  );
}
