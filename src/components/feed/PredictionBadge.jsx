import React, { useState } from "react";
import { Lock, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { getMarketStatus } from "@/lib/marketStatus";

// Long / Short = market sentiment (allowed). Hold = neutral position (not sentiment).
const ACTION_STYLES = {
  Long:  { bg: "bg-gain/10 border-gain/20",        text: "text-gain",            icon: ArrowUp },
  Short: { bg: "bg-loss/10 border-loss/20",        text: "text-loss",            icon: ArrowDown },
  Hold:  { bg: "bg-secondary border-border",       text: "text-muted-foreground", icon: Minus },
};

// Hit / Miss = sentiment-aligned outcomes. Partial / Pending stay neutral so
// they don't read as "small win" or "small loss".
const OUTCOME_STYLES = {
  hit:     { label: "Hit 🎯",     color: "text-gain bg-gain/10 border-gain/20" },
  near:    { label: "Near ✅",    color: "text-gain bg-gain/10 border-gain/20" },
  partial: { label: "Partial 🟡", color: "text-foreground bg-muted border-border" },
  miss:    { label: "Miss ❌",    color: "text-loss bg-loss/10 border-loss/20" },
  pending: { label: "Pending ⏳", color: "text-muted-foreground bg-muted border-border" },
};

export default function PredictionBadge({ prediction, currentPrice }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  if (!prediction) return null;
  const style = ACTION_STYLES[prediction.action] || ACTION_STYLES.Hold;
  const marketStatus = getMarketStatus();
  const Icon = style.icon;

  const lockPrice = prediction.lockPrice;
  const resolvedPrice = prediction.resolvedPrice;
  const displayPrice = resolvedPrice || currentPrice;

  // Yield since lock
  let yieldPct = null;
  if (lockPrice && displayPrice) {
    const raw = ((displayPrice - lockPrice) / lockPrice) * 100;
    yieldPct = prediction.action === "Short" ? -raw : raw;
  }

  const outcomeStyle = prediction.outcome ? OUTCOME_STYLES[prediction.outcome] : null;

  return (
    <div className={`surface p-4 mb-4 ${style.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Locked Prediction
          </span>
        </div>
        {outcomeStyle && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-tag border ${outcomeStyle.color}`}>
            {outcomeStyle.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${style.text}`} />
        <span className={`font-medium text-lg ${style.text}`}>{prediction.action}</span>
        <span className="font-display font-medium text-foreground">${prediction.ticker}</span>
        {prediction.timeframe && (
          <span className="text-xs text-muted-foreground ml-1">· {prediction.timeframe}</span>
        )}
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
        <div className="bg-background/60 rounded-tag px-2.5 py-1.5 border border-border/40">
          <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Locked at</p>
          <p className="text-sm font-medium font-display text-foreground">
            {lockPrice ? `$${lockPrice}` : "—"}
          </p>
        </div>
        <div className="bg-background/60 rounded-tag px-2.5 py-1.5 border border-border/40">
          <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Target</p>
          <p className="text-sm font-medium font-display text-primary">
            {prediction.targetPrice ? `$${prediction.targetPrice}` : "—"}
          </p>
        </div>
        {displayPrice && (
          <div className="bg-background/60 rounded-tag px-2.5 py-1.5 border border-border/40">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {resolvedPrice ? "Resolved" : "Current"}
              </p>
              {!resolvedPrice && (
                <div className="relative">
                  <span
                    className="text-[11px] text-muted-foreground whitespace-nowrap cursor-default"
                    onMouseEnter={() => setTooltipVisible(true)}
                    onMouseLeave={() => setTooltipVisible(false)}
                  >
                    {marketStatus.label}
                  </span>
                  {tooltipVisible && (
                    <div className="absolute bottom-full left-0 mb-1 z-10 bg-foreground text-background text-[10px] px-2 py-1 rounded-tag whitespace-nowrap pointer-events-none">
                      {marketStatus.tooltip}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm font-medium font-display text-foreground">${displayPrice}</p>
          </div>
        )}
        {yieldPct !== null && (
          <div className={`rounded-tag px-2.5 py-1.5 border ${yieldPct >= 0 ? "bg-gain/10 border-gain/20" : "bg-loss/10 border-loss/20"}`}>
            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Yield</p>
            <p className={`text-sm font-medium font-display flex items-center gap-0.5 ${yieldPct >= 0 ? "text-gain" : "text-loss"}`}>
              {yieldPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {yieldPct >= 0 ? "+" : ""}{yieldPct.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      {prediction.lockTime && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Locked · {format(new Date(prediction.lockTime), "MMM d, yyyy · h:mm a")}
        </p>
      )}
    </div>
  );
}
