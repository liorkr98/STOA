import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function AnalyticsKPICard({ icon, label, value, sub, trend, trendLabel, color = "text-primary" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {trend != null && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color} leading-none mb-1`}>{value}</p>
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}