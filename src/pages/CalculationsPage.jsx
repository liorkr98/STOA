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
    title: "Overall Accuracy Score",
    formula: "Accuracy = (Σ credits earned / total predictions) × 100%",
    note: "A weighted metric that rewards analysts for near misses — not just binary hit/miss.",
    example: "3 Exact (3×1.0) + 2 Near (2×0.5) + 1 Miss (1×0) = 4.0 credits out of 6 → 66.7% Accuracy",
  },
  {
    icon: TrendingUp,
    title: "Yearly Yield",
    formula: "Yield = avg % gain from all locked predictions (hits only), annualized",
    note: "Reflects the average return an investor would have made following this analyst's locked Long/Short calls.",
    example: "4 hits returning +8%, +15%, +22%, +12% → avg +14.25% yield",
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
      <div className="bg-secondary border border-border rounded-2xl p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Why weighted scoring?</p>
        <p>Binary hit/miss systems punish analysts for being slightly early or for ambitious targets. STOA's weighted credit system rewards direction, magnitude, and timing — giving a more accurate picture of real-world investment skill.</p>
      </div>
    </div>
  );
}