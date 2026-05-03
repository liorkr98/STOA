import React, { useState } from "react";
import { Target, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const QUARTERLY_YIELD = [
  { quarter: "Q2 '25", analyst: 8.4, sp500: 3.1 },
  { quarter: "Q3 '25", analyst: 12.1, sp500: 2.4 },
  { quarter: "Q4 '25", analyst: 7.8, sp500: 4.2 },
  { quarter: "Q1 '26", analyst: 6.1, sp500: -1.8 },
];

const SECTOR_ACCURACY = [
  { sector: "AI & Semiconductors", accuracy: 91.2, predictions: 18, hits: 16 },
  { sector: "Big Tech", accuracy: 85.4, predictions: 12, hits: 10 },
  { sector: "EV & Energy", accuracy: 72.0, predictions: 8, hits: 6 },
  { sector: "Financials", accuracy: 66.7, predictions: 6, hits: 4 },
];

const PREDICTION_BREAKDOWN = [
  { label: "Exact Hit (≤5%)", count: 18, color: "bg-gain", pct: 40 },
  { label: "Near Hit (5–15%)", count: 11, color: "bg-primary", pct: 24 },
  { label: "Directional (15–30%)", count: 9, color: "bg-amber-500", pct: 20 },
  { label: "Miss", count: 7, color: "bg-loss", pct: 16 },
];

export default function AccuracyBreakdown({ analystName }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Accuracy Breakdown & Yield vs S&P 500</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">How {analystName}'s accuracy is calculated</p>
            <div className="space-y-2">
              {PREDICTION_BREAKDOWN.map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${b.color}`}>{b.count}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="font-semibold">{b.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Accuracy by Sector</p>
            <div className="space-y-2">
              {SECTOR_ACCURACY.map(s => (
                <div key={s.sector} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex-1 truncate">{s.sector}</span>
                  <div className="flex-1 bg-secondary rounded-full h-1.5">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${s.accuracy}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-10 text-right">{s.accuracy}%</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{s.hits}/{s.predictions}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Quarterly Yield vs S&P 500</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={QUARTERLY_YIELD} barCategoryGap="30%">
                <XAxis dataKey="quarter" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} width={35} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [`${v}%`, n === "analyst" ? "Analyst" : "S&P 500"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="analyst" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sp500" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-1">
              <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Analyst</div>
              <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" /> S&P 500</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}