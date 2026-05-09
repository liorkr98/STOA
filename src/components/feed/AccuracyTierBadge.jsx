import React from "react";
import { computeAnalystTier } from "@/lib/analystTier";

// TierBadge: pass user + allReports for full tier calculation
// OR pass a pre-computed tierData object directly
export default function AccuracyTierBadge({ user, allReports, tierData, size = "sm" }) {
  const tier = tierData || (user ? computeAnalystTier(user, allReports || []) : null);
  if (!tier) return null;

  const fontSize = size === "lg" ? 13 : 10;
  const padding  = size === "lg" ? "5px 12px" : "3px 8px";

  return (
    <span style={{
      background: tier.bg,
      color: tier.color,
      border: `1px solid ${tier.border}`,
      fontSize,
      fontWeight: 700,
      padding,
      borderRadius: 20,
      letterSpacing: '0.01em',
      flexShrink: 0,
      display: 'inline-block',
    }}>
      {tier.label}
    </span>
  );
}