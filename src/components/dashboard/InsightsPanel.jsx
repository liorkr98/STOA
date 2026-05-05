import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function InsightsPanel({ accuracyScore = 0, reports = [] }) {
  const chartData = useMemo(() => {
    if (!accuracyScore || accuracyScore === 0) return [];
    // Build simple trend from real accuracy score
    // We only have the current score — show it as a single point with context
    return [{ month: "Current", value: parseFloat(accuracyScore.toFixed(1)) }];
  }, [accuracyScore]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">Accuracy Trend</h3>
      {chartData.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Accuracy trend will appear as you publish more predictions.
        </p>
      ) : (
        <>
          <div className="text-center mb-3">
            <span className={`text-2xl font-bold ${accuracyScore >= 80 ? "text-gain" : accuracyScore >= 60 ? "text-amber-500" : "text-loss"}`}>
              {accuracyScore.toFixed(1)}%
            </span>
            <p className="text-xs text-muted-foreground">Overall Accuracy</p>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`${v}%`, "Accuracy"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#accGrad)" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}