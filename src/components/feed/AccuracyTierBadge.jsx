import React from "react";
import { computeAnalystTier } from "@/lib/analystTier";

// Map tier identity to a design-system pill variant. The pill utility classes
// (.pill / .pill-primary / .pill-accent) own the colors, border, and radius so
// the tier hex values from scoringEngine.js are ignored here on purpose.
const TIER_VARIANT = {
  legend: "pill-accent",
  elite: "pill-accent",
  expert: "pill-primary",
  strong: "pill-primary",
  rising: "pill-primary",
  building: "pill",
};

export default function AccuracyTierBadge({ user, allReports, tierData, size = "sm" }) {
  const tier = tierData || (user ? computeAnalystTier(user, allReports || []) : null);
  if (!tier) return null;
  const variant = TIER_VARIANT[tier.key] || "pill";
  const sizeStyle = size === "lg" ? { fontSize: 13, padding: "5px 12px" } : undefined;

  return (
    <span className={`${variant} shrink-0`} style={sizeStyle}>
      <span aria-hidden="true">{tier.icon}</span> {tier.label}
    </span>
  );
}
