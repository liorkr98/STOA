import React from "react";

// Shared loading spinner — single source of truth across the app.
// Uses the design-system 0.5px border with the design-system primary token
// so it stays theme-aware and consistent regardless of where it appears.
const SIZE_CLASSES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function Spinner({ size = "md", className = "", label = "Loading" }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  return (
    <span
      role="status"
      aria-label={label}
      className={`${sizeClass} inline-block border border-primary/30 border-t-primary rounded-full animate-spin ${className}`}
    />
  );
}
