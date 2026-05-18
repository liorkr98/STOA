import React from "react";
import { TrendingUp, TrendingDown, Zap, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

const BUCKET_KEYS = ["INTRADAY", "SHORT", "MEDIUM", "LONG"];
const BUCKET_LABELS = {
  INTRADAY: "Intraday",
  SHORT:    "Short-Term",
  MEDIUM:   "Medium-Term",
  LONG:     "Long-Term",
};
const BUCKET_DESC = {
  INTRADAY: "< 1 day",
  SHORT:    "1–14 days",
  MEDIUM:   "15–90 days",
  LONG:     "90d+",
};

function EloBar({ delta, maxDelta = 80 }) {
  const pct = Math.min(100, Math.max(0, (delta / maxDelta) * 100));
  const isPos = delta >= 0;
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
      <div
        className={`h-full rounded-full transition-all ${isPos ? "bg-gain" : "bg-loss"}`}
        style={{ width: `${isPos ? pct : Math.min(100, (-delta / maxDelta) * 100)}%` }}
      />
    </div>
  );
}

export default function AccuracyBreakdown({ analystUser }) {
  const breakdown = (() => {
    try { return analystUser?.accuracy_breakdown ? JSON.parse(analystUser.accuracy_breakdown) : {}; }
    catch { return {}; }
  })();

  const totalCalls = analystUser?.total_calls || 0;
  const hasCalls   = totalCalls > 0;
  const score     = analystUser?.accuracy_score || 0;
  // Starting Elo per PRD: 1,000. Every new researcher begins here — matches
  // what /scoring advertises ("Starting Elo = 1,000"). Previously this
  // floored at 600 for analysts with no resolved calls, contradicting the
  // PRD and the scoring-page copy.
  const rating    = hasCalls ? (analystUser?.accuracy_rating || 1000) : 1000;
  const tier      = hasCalls ? (analystUser?.accuracy_tier || "Building") : "Building";
  const hitRate   = hasCalls ? (analystUser?.hit_rate || 0) : null;
  const yield_    = analystUser?.yearly_yield;

  return (
    <div className="surface p-5 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-[14px] text-foreground">Track Record — Elo Engine</h3>
        {analystUser?.specialization && (
          <span className="pill-primary">
            {analystUser.specialization}
          </span>
        )}
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Accuracy Score", value: `${score}`, sub: "/ 100", color: score >= 75 ? "text-gain" : "text-foreground" },
          { label: "Elo Rating",     value: rating,      sub: "/ 1400", color: "text-foreground" },
          { label: "Hit Rate",       value: hitRate == null ? "—" : `${hitRate}%`, sub: "of calls",  color: "text-foreground" },
          { label: "Total Calls",    value: totalCalls,   sub: "resolved",  color: "text-foreground" },
        ].map(kpi => (
          <div key={kpi.label} className="stat-card">
            <p className="stat-card-label mb-1">{kpi.label}</p>
            <p className={`text-xl font-medium font-display ${kpi.color}`}>{kpi.value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{kpi.sub}</span></p>
          </div>
        ))}
      </div>

      {/* Elo progress bar */}
      <div className="bg-secondary rounded-tag p-3 border border-border/60">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground font-medium">Elo Rating Progress</span>
          <span className="font-medium font-display text-foreground">{rating} / 1400</span>
        </div>
        <div className="w-full h-2.5 bg-border rounded-tag overflow-hidden">
          <div
            className="h-full rounded-tag bg-primary transition-all"
            style={{ width: `${Math.max(2, ((rating - 600) / 800) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
          <span>600 · Building</span>
          <span>800 · Average</span>
          <span>1000 · Strong</span>
          <span>1200 · Expert</span>
          <span>1400 · Elite</span>
        </div>
      </div>

      {/* Yearly yield */}
      {yield_ != null && yield_ !== 0 && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-tag border text-sm font-medium ${yield_ >= 0 ? "bg-gain/10 border-gain/20 text-gain" : "bg-loss/10 border-loss/20 text-loss"}`}>
          {yield_ >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="font-display">{yield_ >= 0 ? "+" : ""}{yield_.toFixed(1)}%</span> annualized yield across closed calls
        </div>
      )}

      {/* Per-bucket breakdown */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Elo Δ by Timeframe</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BUCKET_KEYS.map(key => {
            const b = breakdown[key];
            return (
              <div key={key} className={`rounded-tag border p-3 text-center ${b ? "bg-background border-border" : "bg-secondary border-border opacity-50"}`}>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{BUCKET_LABELS[key]}</p>
                <p className="text-[9px] text-muted-foreground mb-2">{BUCKET_DESC[key]}</p>
                {b ? (
                  <>
                    <p className={`text-lg font-medium font-display ${b.netDelta >= 0 ? "text-gain" : "text-loss"}`}>
                      {b.netDelta >= 0 ? "+" : ""}{b.netDelta}
                      <span className="text-[10px] font-normal text-muted-foreground ml-0.5">Δelo</span>
                    </p>
                    <EloBar delta={b.netDelta} />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      <span className="font-display">{b.hitRate}%</span> hit · <span className="font-display">{b.calls}</span> call{b.calls !== 1 ? "s" : ""}
                    </p>
                    {b.avgAlpha !== 0 && (
                      <p className={`text-[10px] font-medium mt-0.5 font-display ${b.avgAlpha > 0 ? "text-gain" : "text-loss"}`}>
                        {b.avgAlpha > 0 ? "+" : ""}{b.avgAlpha}% α/yr
                      </p>
                    )}
                    {!b.isSignificant && (
                      <p className="text-[9px] text-accent mt-1 flex items-center justify-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Low sample
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground/40 mt-2">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Engine note */}
      <p className="text-[10px] text-muted-foreground border-t border-border/60 pt-3">
        <Zap className="w-3 h-3 inline mr-1 text-primary" />
        Powered by Modified Elo (K-factor weighted by alpha, boldness & timeframe). Based on TipRanks/Cornell research & Elo literature 2024.
        1 call moves rating by at most ~+20 Elo. Score becomes meaningful after 10+ calls.
      </p>
    </div>
  );
}