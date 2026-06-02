import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, BarChart2, Award, AlertTriangle, Info } from "lucide-react";
import { computeScore, computeTier, callReturn } from "@/lib/scoringEngine";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v, suffix = "", prefix = "") {
  if (v == null) return "—";
  return `${prefix}${typeof v === "number" ? v.toFixed(1) : v}${suffix}`;
}

function pctBar(value, max = 100, colorClass = "bg-primary") {
  const w = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
      <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${w}%` }} />
    </div>
  );
}

// Bucket a report by days held
function getDaysHeld(report) {
  const lock     = report.prediction_lock_time || report.prediction_locked_at || report.created_date;
  const resolved = report.prediction_resolved_time;
  if (!lock || !resolved) return null;
  return Math.max(1, Math.round((new Date(resolved) - new Date(lock)) / 86400000));
}

function getBucket(days) {
  if (days == null) return null;
  if (days < 1)  return "INTRADAY";
  if (days < 15) return "SHORT";
  if (days < 91) return "MEDIUM";
  return "LONG";
}

const BUCKET_META = {
  INTRADAY: { label: "Intraday",     desc: "< 1 day",    icon: "⚡" },
  SHORT:    { label: "Short-Term",   desc: "1 – 14 days", icon: "📅" },
  MEDIUM:   { label: "Medium-Term",  desc: "15 – 90 days", icon: "📊" },
  LONG:     { label: "Long-Term",    desc: "90d+",        icon: "🏔️" },
};

// ── Per-timeframe breakdown (computed from reports) ────────────────────────────
function buildBuckets(reports) {
  const buckets = { INTRADAY: [], SHORT: [], MEDIUM: [], LONG: [] };

  const resolved = (reports || []).filter(r =>
    r.prediction_outcome &&
    r.prediction_outcome !== "pending" &&
    (r.prediction_lock_price || r.prediction_entry_price) &&
    r.prediction_resolved_price
  );

  resolved.forEach(r => {
    const days   = getDaysHeld(r);
    const bucket = getBucket(days) || "MEDIUM";
    const isHit  = r.prediction_outcome === "hit" || r.prediction_outcome === "near";
    const ret    = callReturn(
      r.prediction_action,
      r.prediction_lock_price || r.prediction_entry_price,
      r.prediction_resolved_price
    );
    buckets[bucket].push({ isHit, ret });
  });

  const result = {};
  Object.entries(buckets).forEach(([key, items]) => {
    if (items.length === 0) return;
    const hits     = items.filter(i => i.isHit).length;
    const returns  = items.map(i => i.ret).filter(v => v != null);
    const avgRet   = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
    const wins     = returns.filter(v => v > 0);
    const losses   = returns.filter(v => v < 0);
    const avgWin   = wins.length   ? wins.reduce((a, b) => a + b, 0) / wins.length   : null;
    const avgLoss  = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : null;
    const pf       = avgLoss > 0 ? Math.min(10, avgWin / avgLoss) : (avgWin > 0 ? 5 : 0);
    result[key] = {
      calls:   items.length,
      hits,
      hitRate: Math.round((hits / items.length) * 100),
      avgRet:  avgRet != null ? parseFloat(avgRet.toFixed(2)) : null,
      pf:      avgLoss != null ? parseFloat(pf.toFixed(2)) : null,
    };
  });
  return result;
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * AccuracyBreakdown — STOA Scoring Engine v2 display.
 *
 * Props:
 *   analystUser    — User entity (used for specialization, achievements meta)
 *   analystReports — Published reports by this analyst (required for live compute)
 */
export default function AccuracyBreakdown({ analystUser, analystReports }) {
  const reports = analystReports || [];

  // Compute live STOA score from reports
  const s = useMemo(() => computeScore(reports), [reports]);
  const tier = useMemo(() => computeTier(s.score, s.total), [s.score, s.total]);
  const buckets = useMemo(() => buildBuckets(reports), [reports]);

  const hasData = s.total > 0;
  const lowSample = s.total > 0 && s.total < 10;

  return (
    <div className="surface p-5 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-serif text-[14px] text-foreground">Track Record</h3>
          {hasData && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}
            >
              {tier.icon} {tier.label}
            </span>
          )}
        </div>
        {analystUser?.specialization && (
          <span className="pill text-[11px]">{analystUser.specialization}</span>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>No resolved predictions yet.</p>
          <p className="text-xs mt-1 opacity-70">Complete 5+ calls to earn a tier.</p>
        </div>
      ) : (
        <>
          {/* ── Top KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "STOA Score",
                value: s.score,
                sub:   "/ 100",
                color: s.score >= 65 ? "text-gain" : s.score >= 35 ? "text-amber-600" : "text-loss",
                bar:   { value: s.score, color: s.score >= 65 ? "bg-gain" : s.score >= 35 ? "bg-amber-500" : "bg-loss" },
              },
              {
                label: "Win Rate",
                value: s.rawWR != null ? `${(s.rawWR * 100).toFixed(0)}%` : "—",
                sub:   `(${s.hits}/${s.total})`,
                color: s.rawWR >= 0.6 ? "text-gain" : s.rawWR >= 0.45 ? "text-amber-600" : "text-loss",
                bar:   { value: s.rawWR * 100, color: s.rawWR >= 0.6 ? "bg-gain" : s.rawWR >= 0.45 ? "bg-amber-500" : "bg-loss" },
              },
              {
                label: "Profit Factor",
                value: s.profitFactor != null ? `${s.profitFactor}x` : "—",
                sub:   "avg win / loss",
                color: s.profitFactor >= 2 ? "text-gain" : s.profitFactor >= 1 ? "text-amber-600" : "text-loss",
                bar:   { value: Math.min(100, (s.profitFactor / 4) * 100), color: s.profitFactor >= 2 ? "bg-gain" : "bg-amber-500" },
              },
              {
                label: "Avg Return",
                value: s.avgReturn != null ? `${s.avgReturn > 0 ? "+" : ""}${s.avgReturn.toFixed(1)}%` : "—",
                sub:   "per closed call",
                color: s.avgReturn >= 0 ? "text-gain" : "text-loss",
                bar:   null,
              },
            ].map(kpi => (
              <div key={kpi.label} className="stat-card">
                <p className="stat-card-label mb-1">{kpi.label}</p>
                <p className={cn("text-xl font-medium font-display", kpi.color)}>
                  {kpi.value}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{kpi.sub}</span>
                </p>
                {kpi.bar && pctBar(kpi.bar.value, 100, kpi.bar.color)}
              </div>
            ))}
          </div>

          {/* ── Score composition ── */}
          <div className="rounded-xl border border-border/60 p-3 bg-secondary/30 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score Composition</p>
            {[
              { label: "Win Rate (Wilson-adjusted)",  value: s._winRateScore, weight: s._alphaScore != null ? "40%" : "52%" },
              { label: "Profit Factor",               value: s._pfScore,       weight: s._alphaScore != null ? "35%" : "48%" },
              ...(s._alphaScore != null ? [{ label: "Alpha vs S&P 500", value: s._alphaScore, weight: "25%" }] : []),
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground w-[160px] flex-shrink-0">{row.label}</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${row.value || 0}%` }} />
                </div>
                <span className="text-[11px] font-medium font-display w-8 text-right tabular-nums">{row.value ?? "—"}</span>
                <span className="text-[10px] text-muted-foreground w-6">{row.weight}</span>
              </div>
            ))}
            {lowSample && (
              <p className="text-[10px] text-amber-600 flex items-center gap-1 pt-1">
                <AlertTriangle className="w-3 h-3" />
                Score is sample-scaled ({s.total} calls). Stabilises around 20+.
              </p>
            )}
          </div>

          {/* ── Avg Win vs Avg Loss ── */}
          {(s.avgWin != null || s.avgLoss != null) && (
            <div className="grid grid-cols-2 gap-3">
              <div className={cn("rounded-xl border p-3", "bg-gain/5 border-gain/20")}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Avg Win</p>
                <p className="text-lg font-bold font-display text-gain">
                  {s.avgWin != null ? `+${s.avgWin.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.hits} winning calls</p>
              </div>
              <div className={cn("rounded-xl border p-3", "bg-loss/5 border-loss/20")}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Avg Loss</p>
                <p className="text-lg font-bold font-display text-loss">
                  {s.avgLoss != null ? `-${s.avgLoss.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.misses} losing calls</p>
              </div>
            </div>
          )}

          {/* ── Alpha vs benchmark ── */}
          {s.avgAlpha != null && (
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium",
              s.avgAlpha >= 0 ? "bg-gain/10 border-gain/20 text-gain" : "bg-loss/10 border-loss/20 text-loss"
            )}>
              {s.avgAlpha >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-display">{s.avgAlpha >= 0 ? "+" : ""}{s.avgAlpha.toFixed(1)}%</span>
              <span className="font-normal text-muted-foreground">average alpha vs S&P 500</span>
            </div>
          )}

          {/* ── Per-timeframe breakdown ── */}
          {Object.keys(buckets).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Performance by Timeframe
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["INTRADAY", "SHORT", "MEDIUM", "LONG"].map(key => {
                  const b   = buckets[key];
                  const meta = BUCKET_META[key];
                  return (
                    <div key={key} className={cn(
                      "rounded-xl border p-3 text-center",
                      b ? "bg-background border-border" : "bg-secondary/40 border-border opacity-50"
                    )}>
                      <p className="text-lg mb-0.5">{meta.icon}</p>
                      <p className="text-[10px] font-semibold text-foreground">{meta.label}</p>
                      <p className="text-[9px] text-muted-foreground mb-2">{meta.desc}</p>
                      {b ? (
                        <>
                          <p className={cn(
                            "text-base font-bold font-display",
                            b.hitRate >= 60 ? "text-gain" : b.hitRate >= 45 ? "text-amber-600" : "text-loss"
                          )}>
                            {b.hitRate}%
                          </p>
                          <p className="text-[9px] text-muted-foreground">win rate</p>
                          {pctBar(b.hitRate, 100, b.hitRate >= 60 ? "bg-gain" : b.hitRate >= 45 ? "bg-amber-500" : "bg-loss")}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {b.hits}/{b.calls} calls
                          </p>
                          {b.avgRet != null && (
                            <p className={cn("text-[10px] font-medium font-display mt-0.5", b.avgRet >= 0 ? "text-gain" : "text-loss")}>
                              {b.avgRet >= 0 ? "+" : ""}{b.avgRet}% avg
                            </p>
                          )}
                          {b.calls < 5 && (
                            <p className="text-[9px] text-amber-600 mt-1 flex items-center justify-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Low sample
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground/30 mt-2">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Engine note ── */}
      <p className="text-[10px] text-muted-foreground border-t border-border/60 pt-3 flex items-start gap-1.5">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary" />
        <span>
          STOA Scoring Engine v2: Wilson-adjusted win rate + profit factor + alpha vs S&P 500.
          Sample-scaled logarithmically — score stabilises at ~20 resolved calls.
          All returns are direction-adjusted (Short wins = price fell).
        </span>
      </p>
    </div>
  );
}
