import React, { useState } from "react";
import { Target, TrendingUp, CheckCircle2, AlertCircle, Minus, Info, ChevronDown, ChevronUp, BarChart3, Zap, Shield } from "lucide-react";

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

const SCORE_COMPONENTS = [
  { pct: "40%", label: "Annualized Alpha", icon: TrendingUp, color: "text-primary", desc: "Percentile rank of your annualized return vs the platform distribution (mean 5%/yr, σ 15%/yr). A +20% annualized return scores ~84 (top 16%). This is the primary driver — return quality outweighs direction accuracy per TipRanks/Cornell methodology." },
  { pct: "25%", label: "Hit Rate", icon: Target, color: "text-gain", desc: "Did the price move in the predicted direction? Bold calls (above noise threshold for the timeframe) count at full weight. Sub-noise calls count at 50%. HOLD success requires the stock stayed within a timeframe-specific flat window (e.g. ±3% for SHORT)." },
  { pct: "20%", label: "Price Target Accuracy", icon: BarChart3, color: "text-amber-500", desc: "How close did the exit price land to the declared target? Within 5% = 100 pts, within 10% = 70 pts, within 20% = 40 pts, beyond = 0 pts. Analysts without declared targets score 50 (neutral)." },
  { pct: "15%", label: "Consistency (Sharpe)", icon: Shield, color: "text-purple-500", desc: "Sharpe ratio of returns: mean / std_dev, scaled to [0, 100]. An analyst with high average returns and low variance scores highest. Replaces the old std × 300 formula — now adjusts for the mean return level, not just volatility." },
];

const TIMEFRAMES = [
  { key: "INTRADAY", label: "Intraday",    range: "< 1 day",       holdWindow: "±1.0%", noiseThreshold: "0.5%" },
  { key: "SHORT",    label: "Short-Term",  range: "1–14 days",     holdWindow: "±3.0%", noiseThreshold: "2%"   },
  { key: "MEDIUM",   label: "Medium-Term", range: "15–90 days",    holdWindow: "±6.0%", noiseThreshold: "5%"   },
  { key: "LONG",     label: "Long-Term",   range: "91–730 days",   holdWindow: "±10.0%", noiseThreshold: "10%" },
];

const TIERS_SCORE = [
  { min: 90, max: 100, tier: "Elite",    icon: "🌟", color: "text-amber-500",  bg: "bg-amber-50 border-amber-200",  desc: "Top 5% of analysts. Exceptional accuracy, high alpha, consistent track record." },
  { min: 75, max: 89,  tier: "Expert",   icon: "⭐", color: "text-gain",       bg: "bg-gain/10 border-gain/20",     desc: "Top 20%. Strong performance across multiple metrics with meaningful sample size." },
  { min: 60, max: 74,  tier: "Strong",   icon: "📈", color: "text-primary",    bg: "bg-primary/5 border-primary/20", desc: "Top 40%. Above-average accuracy and positive alpha vs benchmark." },
  { min: 45, max: 59,  tier: "Average",  icon: "📊", color: "text-muted-foreground", bg: "bg-secondary border-border", desc: "Directionally correct but close to market baseline." },
  { min: 0,  max: 44,  tier: "Building", icon: "🔨", color: "text-muted-foreground", bg: "bg-secondary border-border", desc: "Not enough calls yet, or early-stage analyst building their track record." },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-8">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-4 group">
        <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">{title}</h2>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && children}
    </div>
  );
}

export default function CalculationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Scoring & Calculations</h1>
        <p className="text-muted-foreground">How STOA calculates analyst accuracy scores — fully transparent and verifiable.</p>
      </div>

      {/* How the Score Works */}
      <Section title="How the Accuracy Score Works">
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-sm text-muted-foreground mb-4">The accuracy score (0–100) is built in 3 stages:</p>
          <div className="space-y-3">
            {[
              { step: "1", title: "Sort calls into 4 timeframe buckets", desc: "Each prediction is classified as Intraday, Short-Term, Medium-Term, or Long-Term based on how long the prediction was held." },
              { step: "2", title: "Score each bucket independently", desc: "Each bucket is scored on 4 components (below). Buckets with too few calls are penalized with a significance multiplier until the sample is large enough to be statistically meaningful." },
              { step: "3", title: "Combine buckets by weighted average", desc: "Buckets are combined weighted by (calls × significance). Analysts with more calls in a bucket have more of their score driven by that bucket." },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{s.step}</div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Score Components */}
      <Section title="Score Components">
        <div className="grid grid-cols-1 gap-3 mb-4">
          {SCORE_COMPONENTS.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="p-4 bg-card border border-border rounded-2xl flex gap-4 items-start">
                <div className="flex-shrink-0 text-center">
                  <div className={`text-xl font-bold ${c.color}`}>{c.pct}</div>
                  <Icon className={`w-4 h-4 mx-auto mt-1 ${c.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Timeframe Buckets */}
      <Section title="Timeframe Buckets & Requirements">
        <p className="text-sm text-muted-foreground mb-4">Statistical significance is calculated via a binomial Z-test (H₀: hit rate = 50%). More calls → higher Z-score → multiplier approaches 1.0. A single perfect call still scores low.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-xl overflow-hidden">
            <thead className="bg-secondary">
              <tr>
                {["Bucket", "Range", "HOLD Success Window", "Noise Threshold"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMEFRAMES.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                  <td className="px-3 py-2.5 font-semibold">{row.label}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.range}</td>
                  <td className="px-3 py-2.5 text-primary font-medium">{row.holdWindow}</td>
                  <td className="px-3 py-2.5">{row.noiseThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground"><strong>Z-test significance:</strong> Scores are multiplied by a significance factor derived from a binomial Z-test. At n=50 with 65% hit rate, multiplier ≈ 0.68. At n=100, ≈ 0.90. At n=200+, approaches 1.0. This replaces the old min/max calls thresholds.</p>
        </div>
      </Section>

      {/* Prediction Outcome Tiers */}
      <Section title="Prediction Outcome Tiers" defaultOpen={false}>
        <p className="text-sm text-muted-foreground mb-4">Every locked prediction is graded into one of four tiers when its timeframe expires or the target is hit.</p>
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
      </Section>

      {/* Score Tiers */}
      <Section title="Score Tiers" defaultOpen={false}>
        <div className="space-y-2">
          {TIERS_SCORE.map(t => (
            <div key={t.tier} className={`flex items-center gap-4 p-4 border rounded-xl ${t.bg}`}>
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-bold text-sm ${t.color}`}>{t.tier}</span>
                  <span className="text-xs text-muted-foreground">{t.min}–{t.max} pts</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Annualized Alpha */}
      <Section title="Why Annualized Alpha?" defaultOpen={false}>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Annualizing returns makes all timeframes directly comparable on a level playing field:</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { call: "+1% in 1 hour",    ann: "+5,800% annualized", color: "text-gain" },
              { call: "+2% in 3 days",    ann: "+243% annualized",   color: "text-gain" },
              { call: "+5% in 1 month",   ann: "+80% annualized",    color: "text-primary" },
              { call: "+12% in 6 months", ann: "+25% annualized",    color: "text-primary" },
              { call: "+15% in 1 year",   ann: "+15% annualized",    color: "text-amber-500" },
            ].map(r => (
              <div key={r.call} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-2 text-xs">
                <span className="font-mono text-muted-foreground">{r.call}</span>
                <span className={`font-bold font-mono ${r.color}`}>{r.ann}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">v2 uses <strong>percentile rank</strong> vs the platform distribution (mean 5%/yr, σ 15%/yr) instead of raw annualized value. This prevents short-term analysts from saturating the score with a single big trade — a +3% gain in 3 days annualizes to +400%, but is ranked against all other analysts' annualized returns, scoring ~97th percentile only if truly exceptional.</p>
          </div>
        </div>
      </Section>

      {/* Fairness note */}
      <div className="bg-secondary border border-border rounded-2xl p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">Transparency commitment</p>
        <p>All scoring logic is documented here and applied consistently. No analyst pays to improve their score. Scores update automatically when predictions are resolved. The methodology may evolve as we gather more data — changes are announced in the Newsroom.</p>
      </div>
    </div>
  );
}