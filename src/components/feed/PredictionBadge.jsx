import React from "react";
import { Lock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { format } from "date-fns";

const ACTION_STYLES = {
  Long: { bg: "bg-gain/10 border-gain/20", text: "text-gain", icon: ArrowUp },
  Short: { bg: "bg-loss/10 border-loss/20", text: "text-loss", icon: ArrowDown },
  Hold: { bg: "bg-amber-50 border-amber-200", text: "text-amber-600", icon: Minus },
};

export default function PredictionBadge({ prediction }) {
  if (!prediction) return null;
  const style = ACTION_STYLES[prediction.action] || ACTION_STYLES.Hold;
  const Icon = style.icon;
  return (
    <div className={`rounded-xl border p-4 ${style.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Locked Prediction</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${style.text}`} />
        <span className={`font-bold text-lg ${style.text}`}>{prediction.action}</span>
        <span className="font-mono font-bold text-foreground">${prediction.ticker}</span>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        Target: <span className="font-semibold text-foreground">${prediction.targetPrice}</span>
        {" "}({prediction.timeframe})
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Locked at ${prediction.lockPrice}
        {prediction.lockTime && (
          <> · {format(new Date(prediction.lockTime), "MMM d, yyyy HH:mm")}</>
        )}
      </div>
    </div>
  );
}