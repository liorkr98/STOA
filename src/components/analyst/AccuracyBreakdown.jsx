import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  { label: "Exact Hit (≤5%)", count: 18, colorClass: "bg-gain", pct: 40 },
  { label: "Near Hit (5–15%)", count: 11, colorClass: "bg-primary", pct: 24 },
  { label: "Directional (15–30%)", count: 9, colorClass: "bg-amber-500", pct: 20 },
  { label: "Miss", count: 7, colorClass: "bg-loss", pct: 16 },
];

export default function AccuracyBreakdown({ analystName }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors"
      >
        <span className="text-sm font-semibold">Accuracy Breakdown & Yield vs S&P 500</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-border">
          {/* Prediction breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
              How {analystName}'s accuracy is calculated
            </h4>
            <div className="space-y-2">
              {PREDICTION_BREAKDOWN.map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-40">
                    <span className={`w-2 h-2 rounded-full ${b.colorClass}`} />
                    <span className="text-xs text-muted-foreground">{b.label}</span>
                  </div>
                  <div className="flex-1 bg-secondary rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${b.colorClass}`} style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-6">{b.count}</span>
                  <span className="text-xs text-muted-foreground">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sector accuracy */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Accuracy by Sector</h4>
            <div className="space-y-2">
              {SECTOR_ACCURACY.map(s => (
                <div key={s.sector} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex-1 truncate">{s.sector}</span>
                  <div className="flex-1 bg-secondary rounded-full h-1.5 max-w-24">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${s.accuracy}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-10">{s.accuracy}%</span>
                  <span className="text-[10px] text-muted-foreground">{s.hits}/{s.predictions}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quarterly yield */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quarterly Yield vs S&P 500</h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={QUARTERLY_YIELD} barSize={12}>
                <XAxis dataKey="quarter" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [`${v}%`, n === "analyst" ? "Analyst" : "S&P 500"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <ReferenceLine y={0} stroke="#e2e8f0" />
                <Bar dataKey="analyst" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sp500" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary" /> Analyst</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-slate-400" /> S&P 500</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}