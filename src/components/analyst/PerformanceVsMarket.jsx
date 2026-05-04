import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const MOCK_PERFORMANCE = [
  { month: "Nov", analyst: 5.2, sp500: 2.1 },
  { month: "Dec", analyst: 11.8, sp500: 4.0 },
  { month: "Jan", analyst: 9.5, sp500: 5.3 },
  { month: "Feb", analyst: 18.4, sp500: 6.8 },
  { month: "Mar", analyst: 26.7, sp500: 8.9 },
  { month: "Apr", analyst: 34.2, sp500: 12.0 },
];

export default function PerformanceVsMarket({ analyst }) {
  const currentYield = analyst?.yearlyYield || 34.2;
  const sp500 = 12.0;
  const alpha = (currentYield - sp500).toFixed(1);
  const winRate = analyst?.accuracy || 87.5;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-sm">Performance vs Market</h2>
        <span className="text-[10px] text-muted-foreground">6 months · Cumulative Yield</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Track record based on {analyst?.reports || 45} locked predictions
      </p>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Alpha vs S&P", value: `+${alpha}%`, color: "text-gain", bg: "bg-gain/10 border-gain/20" },
          { label: "Win Rate", value: `${winRate}%`, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
          { label: "Avg Hold Time", value: "47 days", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={MOCK_PERFORMANCE} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="analystGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sp500Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v, name) => [`${v}%`, name === "analyst" ? "Analyst Yield" : "S&P 500"]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="analyst" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#analystGrad)" dot={false} />
          <Area type="monotone" dataKey="sp500" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#sp500Grad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-primary inline-block rounded" /> Analyst Yield
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-slate-400 inline-block rounded" style={{ borderTop: "1px dashed #94a3b8", background: "none" }} /> S&P 500
        </span>
      </div>
    </div>
  );
}