import React from "react";
import { Target, TrendingUp, CheckCircle2, AlertCircle, Minus, Info } from "lucide-react";

const TIERS = [
  {
    icon: CheckCircle2,
    iconColor: "text-gain",
    bg: "bg-gain/10 border-gain/20",
    title: "Exact Hit",
    credit: "100% credit",
    creditColor: "text-gain",
    desc: "The stock price reaches the target price within the stated timeframe, within ±5% variance of the target.",
    example: "Target: $200 · Reached: $198.50 → ✓ Exact Hit",
  },
  {
    icon: TrendingUp,
    iconColor: "text-primary",
    bg: "bg-primary/5 border-primary/20",
    title: "Near Hit",
    credit: "50% credit",
    creditColor: "text-primary",
    desc: "The price moves in the correct direction and gets within 5–15% of the target price within the timeframe.",
    example: "Target: $200 · Reached: $185 (92.5% of way there) → ✓ Near Hit",
  },
  {
    icon: Minus,
    iconColor: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    title: "Directional",
    credit: "25% credit",
    creditColor: "text-amber-600",
    desc: "The price moves in the correct direction but only covers 15–30% of the distance to the target by expiry.",
    example: "Target: $200 · Lock: $150 · Reached: $162 (24% of the way) → ✓ Directional",
  },
  {
    icon: AlertCircle,
    iconColor: "text-loss",
    bg: "bg-loss/10 border-loss/20",
    title: "Miss",
    credit: "0% credit",
    creditColor: "text-loss",
    desc: "The price does not meaningfully move toward the target, moves opposite to predicted direction, or the timeframe expires.",
    example: "Target: $200 (Long) · Reached: $148 (moved down) → ✗ Miss",
  },
];

const FORMULAS = [
  {
    icon: Target,
    title: "Overall Accuracy Score (0–100)",
    formula: "Score = weighted avg of bucket scores × significance multiplier",
    note: "Calls are sorted into 4 timeframe buckets (Intraday, Short, Medium, Long). Each bucket scores Hit Rate (35%), Annualized Alpha (30%), Price Target Accuracy (20%), and Consistency (15%). Buckets with fewer calls are penalized until statistically significant.",
    example: "SHORT bucket: 40 calls, 62% hit rate, +18% annualized alpha above benchmark → bucket score 71",
  },
  {
    icon: TrendingUp,
    title: "Annualized Alpha",
    formula: "Alpha = annualize(analyst return) − annualize(benchmark return)",
    note: "All returns are annualized so timeframes are comparable. +1% in 1 hour = +5,800% annualized. Benchmark is QQQ for tech, SPY for others. Each timeframe has a hurdle rate: Intraday requires 15% ann. alpha, Short 10%, Medium 5%, Long 2%.",
    example: "+2% in 3 days vs SPY flat → +243% annualized alpha — displayed prominently on the analyst profile",
  },
  {
    icon: Target,
    title: "Bold Call Requirement",
    formula: "Call weight = 1.0 if |target − entry| / entry ≥ noise threshold, else 0.5",
    note: "Calls within typical timeframe noise get half weight on hit rate. This prevents gaming by making many trivially-safe predictions. Noise thresholds: Intraday 0.5%, Short 2%, Medium 5%, Long 10%.",
    example: "Predicting +0.3% in 1 hour on a stock with 1% typical hourly move → counts at 50% weight",
  },
];

export default function CalculationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Scoring & Calculations</h1>
        <p className="text-muted-foreground">How STOA calculates analyst accuracy and prediction scores — fully transparent.</p>
      </div>

      {/* Prediction Tiers */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-1">Prediction Outcome Tiers</h2>
        <p className="text-sm text-muted-foreground mb-5">Every locked prediction is graded into one of four tiers when its timeframe expires or the target is hit.</p>
        <div className="space-y-3">
          {TIERS.map(tier => {
            const Icon = tier.icon;
            return (
              <div key={tier.title} className={`p-5 border rounded-2xl ${tier.bg}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${tier.iconColor}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{tier.title}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 ${tier.creditColor}`}>{tier.credit}</span>
                    </div>
                    <p className="text-sm text-foreground/80 mb-2">{tier.desc}</p>
                    <p className="text-xs text-muted-foreground font-mono bg-white/50 rounded-lg px-3 py-1.5 inline-block">{tier.example}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulas */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-1">Performance Metrics</h2>
        <p className="text-sm text-muted-foreground mb-5">How platform-wide leaderboard rankings and analyst scores are computed.</p>
        <div className="space-y-4">
          {FORMULAS.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="p-5 bg-card border border-border rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                </div>
                <code className="block text-sm font-mono bg-secondary text-primary rounded-lg px-4 py-2 mb-3">{f.formula}</code>
                <p className="text-sm text-muted-foreground mb-2">{f.note}</p>
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{f.example}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fairness note */}
      <div className="bg-secondary border border-border rounded-2xl p-5 text-sm text-muted-foreground space-y-3">
        <div>
          <p className="font-semibold text-foreground mb-1">Why annualized alpha instead of difficulty multipliers?</p>
          <p>Short-term wins are not harder directionally — momentum makes them easier. But they're harder to prove statistically. Annualizing returns makes all timeframes comparable on a level playing field: a genuine short-term edge compounds to enormous annualized alpha, which is exactly what the score rewards.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Why more calls required for short-term analysts?</p>
          <p>Short-term price direction has a ~55% momentum base rate — higher than the ~50% long-term base rate. You need more samples (75–150) to prove your win rate is above that baseline, not just lucky momentum-riding.</p>
        </div>
      </div>
    </div>
  );
}