import React from "react";
import { MOCK_STOCKS } from "@/lib/mockData";

export default function InlineTickerChip({ ticker }) {
  const data = MOCK_STOCKS[ticker.toUpperCase()];
  const isPositive = data ? data.changePercent >= 0 : null;

  if (!data) {
    return (
      <span className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-tag border border-border bg-secondary text-muted-foreground text-xs font-display font-medium align-baseline">
        ${ticker}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 mx-0.5 px-2 py-0.5 rounded-tag border text-xs font-display font-medium align-baseline cursor-default select-none ${
        isPositive
          ? "border-gain/30 bg-gain/10 text-gain"
          : "border-loss/30 bg-loss/10 text-loss"
      }`}
    >
      <span>${ticker}</span>
      <span>${data.price.toFixed(2)}</span>
      <span>{isPositive ? "+" : ""}{data.changePercent.toFixed(2)}%</span>
    </span>
  );
}
