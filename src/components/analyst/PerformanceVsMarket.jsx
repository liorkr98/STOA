import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { callReturn } from "@/lib/scoringEngine";

// Build a monthly cumulative-yield series for the last 6 calendar months
// from resolved predictions. Only includes the analyst line — S&P 500 data
// would require a benchmark feed; if `prediction_benchmark_pct` is present
// on resolved reports, the avg is folded into Alpha (computed below).
function buildMonthlySeries(resolved) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key:   `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString("en-US", { month: "short" }),
      yield: 0,
    });
  }
  const byKey = Object.fromEntries(months.map(m => [m.key, m]));

  for (const r of resolved) {
    const ts = r.prediction_resolved_time || r.updated_date || r.created_date;
    if (!ts) continue;
    const d = new Date(ts);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey[k];
    if (!bucket) continue;
    const yld = callReturn(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price);
    if (yld != null) bucket.yield += yld;
  }

  // Convert per-month yield into a running cumulative line
  let running = 0;
  return months.map(m => {
    running += m.yield;
    return { month: m.month, analyst: parseFloat(running.toFixed(2)) };
  });
}

function avgHoldDays(resolved) {
  const days = [];
  for (const r of resolved) {
    const lock = r.prediction_lock_time;
    const exit = r.prediction_resolved_time;
    if (!lock || !exit) continue;
    const ms = new Date(exit).getTime() - new Date(lock).getTime();
    if (ms > 0) days.push(ms / (1000 * 60 * 60 * 24));
  }
  if (days.length === 0) return null;
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

export default function PerformanceVsMarket({ resolvedReports = [] }) {
  const total = resolvedReports.length;

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-2">Performance vs Market</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Track record builds as predictions are resolved. Publish and lock predictions to start.
        </p>
      </div>
    );
  }

  // Real metrics
  const hits  = resolvedReports.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length;
  const winRate = parseFloat(((hits / total) * 100).toFixed(1));

  const withBenchmark = resolvedReports.filter(r => r.prediction_benchmark_pct != null);
  const avgBenchmark = withBenchmark.length > 0
    ? withBenchmark.reduce((s, r) => s + r.prediction_benchmark_pct, 0) / withBenchmark.length
    : null;

  const yields = resolvedReports
    .map(r => callReturn(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price))
    .filter(v => v != null);
  const avgYield = yields.length > 0
    ? yields.reduce((s, v) => s + v, 0) / yields.length
    : null;

  const alpha = avgYield != null && avgBenchmark != null
    ? (avgYield - avgBenchmark).toFixed(1)
    : null;

  const holdDays = avgHoldDays(resolvedReports);
  const series   = buildMonthlySeries(resolvedReports);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-sm">Performance vs Market</h2>
        <span className="text-[10px] text-muted-foreground">6 months · Cumulative Yield</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Based on {total} resolved prediction{total === 1 ? "" : "s"}
      </p>

      {total < 10 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-3">
          Early track record — becomes more meaningful after 10+ calls.
        </p>
      )}

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Alpha vs S&P", value: alpha != null ? `${alpha >= 0 ? "+" : ""}${alpha}%` : "—", color: "text-gain", bg: "bg-gain/10 border-gain/20" },
          { label: "Win Rate",     value: `${winRate}%`,                                              color: "text-primary", bg: "bg-primary/5 border-primary/20" },
          { label: "Avg Hold Time", value: holdDays != null ? `${holdDays} day${holdDays === 1 ? "" : "s"}` : "—", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart — only meaningful with 10+ resolved */}
      {total >= 10 && (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="analystGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={v => [`${v}%`, "Researcher Yield"]}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="analyst" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#analystGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-primary inline-block rounded" /> Researcher Yield
            </span>
          </div>
        </>
      )}
    </div>
  );
}
