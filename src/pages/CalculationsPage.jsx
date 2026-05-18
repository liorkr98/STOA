import React, { useState } from "react";
import { Target, TrendingUp, CheckCircle2, AlertCircle, Minus, Info, ChevronDown, ChevronUp, BarChart3, Zap, Shield, Activity } from "lucide-react";

const TIERS_SCORE = [
  { min: 90, max: 100, elo: "1320–1400", tier: "Elite",    icon: "🌟", color: "text-amber-500",       bg: "bg-amber-50 border-amber-200",     desc: "Top 5%. Exceptional directional accuracy, high sustained alpha, bold calls. Elo ≥ 1320." },
  { min: 75, max: 89,  elo: "1200–1319", tier: "Expert",   icon: "⭐", color: "text-gain",            bg: "bg-gain/10 border-gain/20",        desc: "Top 20%. Strong multi-bucket performance with meaningful sample size. Elo 1200–1319." },
  { min: 60, max: 74,  elo: "1080–1199", tier: "Strong",   icon: "📈", color: "text-primary",         bg: "bg-primary/5 border-primary/20",   desc: "Top 40%. Positive alpha, above-average hit rate. Elo 1080–1199." },
  { min: 45, max: 59,  elo: "960–1079",  tier: "Average",  icon: "📊", color: "text-muted-foreground", bg: "bg-secondary border-border",      desc: "Near market baseline. Some skill signal, needs more calls. Elo 960–1079." },
  { min: 0,  max: 44,  elo: "600–959",   tier: "Building", icon: "🔨", color: "text-muted-foreground", bg: "bg-secondary border-border",      desc: "Building track record. Not enough calls yet to determine skill. Elo 600–959." },
];

const TIMEFRAMES = [
  { key: "INTRADAY", label: "Intraday",    range: "< 1 day",     holdWindow: "±1.0%", kmult: "×0.8", boldNoise: "0.5%" },
  { key: "SHORT",    label: "Short-Term",  range: "1–14 days",   holdWindow: "±3.0%", kmult: "×0.9", boldNoise: "2%"   },
  { key: "MEDIUM",   label: "Medium-Term", range: "15–90 days",  holdWindow: "±6.0%", kmult: "×1.0", boldNoise: "5%"   },
  { key: "LONG",     label: "Long-Term",   range: "91d+",        holdWindow: "±10.0%", kmult: "×1.2", boldNoise: "10%" },
];

const K_ALPHA = [
  { alpha: "> +30%/yr", mult: "×2.5", color: "text-gain" },
  { alpha: "+15–30%/yr", mult: "×2.0", color: "text-gain" },
  { alpha: "+5–15%/yr",  mult: "×1.5", color: "text-primary" },
  { alpha: "0–+5%/yr",  mult: "×1.0", color: "text-primary" },
  { alpha: "−15–0%/yr", mult: "×0.7", color: "text-amber-500" },
  { alpha: "< −15%/yr", mult: "×0.4", color: "text-loss" },
];

const EXAMPLES = [
  { call: "1 perfect BUY (+10% in 3d)", elo_delta: "+~+10 Elo", score: "~+1.3 pts", note: "Can never give 100/100" },
  { call: "50 calls, 68% hit, +15% avg yield", elo_delta: "+~+220 Elo → 1220", score: "~77 (Expert)", note: "Meaningful track record" },
  { call: "10 bold long-term calls, 80% hit", elo_delta: "+~+290 Elo → 1290", score: "~86 (Expert)", note: "Bold + long = high K" },
  { call: "50 spam intraday calls (±0.4% move)", elo_delta: "+~+40 Elo (low K)", score: "~42 (Building)", note: "Anti-gaming filter" },
  { call: "HOLD +4.3% in 3 days", elo_delta: "−K (loss, SHORT window=3%)", score: "Counted as miss", note: "Should have said BUY" },
];

const OUTCOME_TIERS = [
  { title: "Hit",     icon: CheckCircle2, color: "text-gain",   bg: "bg-gain/10 border-gain/20",           desc: "Price reached ≥95% of the way to the target price in the correct direction.", example: "Target $200 · Reached $198 → Hit ✓" },
  { title: "Near",    icon: TrendingUp,   color: "text-primary", bg: "bg-primary/5 border-primary/20",     desc: "Price moved in correct direction, covered 50–95% of the distance to target.", example: "Target $200 · Lock $150 · Reached $178 → Near ✓" },
  { title: "Partial", icon: Minus,        color: "text-amber-600", bg: "bg-amber-50 border-amber-200",     desc: "Price moved in correct direction but only covered 15–50% of target distance.", example: "Target $200 · Lock $150 · Reached $158 → Partial ✓" },
  { title: "Miss",    icon: AlertCircle,  color: "text-loss",   bg: "bg-loss/10 border-loss/20",           desc: "Price moved wrong direction, or covered <15% of target distance by expiry.", example: "Long $200 · Reached $148 → Miss ✗" },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-8">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-4 group">
        <h2 className="text-lg font-medium group-hover:text-primary transition-colors">{title}</h2>
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
        <h1 className="text-3xl font-medium mb-2">Scoring & Calculations</h1>
        <p className="text-muted-foreground">How STOA calculates analyst accuracy scores using a Modified Elo engine. Fully transparent and verifiable.</p>
        <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary font-medium">
          <Activity className="w-3.5 h-3.5" />
          Engine v3 — Modified Elo with adaptive K-factor. Academic basis: TipRanks/Cornell (2021), Elo literature (2024).
        </div>
      </div>

      {/* Core Idea */}
      <Section title="Why Elo?">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 mb-4">
          <p className="text-sm text-muted-foreground">Traditional weighted-score systems have a critical structural flaw: <strong>1 correct call gives 100/100</strong>. This makes new analysts look as good as battle-tested ones. Elo fixes this fundamentally.</p>
          <div className="space-y-3">
            {[
              { step: "1", title: "Every analyst starts at Elo 1000", desc: "The baseline for all new analysts. No advantage for joining early." },
              { step: "2", title: "Each closed prediction updates the Elo rating", desc: "A win pushes the rating up; a loss pushes it down. The K-factor controls how much (see below). One perfect call moves rating by at most ~+20 Elo — structurally impossible to score 100 with one call." },
              { step: "3", title: "Display score = (Elo − 600) / 8", desc: "Maps the 600–1400 Elo range onto a 0–100 display scale. 1000 Elo = 50 pts. 1400 Elo = 100 pts. Requires many consistent wins to reach top tiers." },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">{s.step}</div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 bg-secondary border border-border rounded-xl px-4 py-3">
            <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground font-display">Δ Elo = K × (Actual − 0.5)  where Actual = 1 (win) or 0 (loss)</p>
          </div>
        </div>
      </Section>

      {/* Modified K-Factor */}
      <Section title="Modified K-Factor — The Core Innovation">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 mb-4">
          <p className="text-sm text-muted-foreground">Standard Elo treats all wins equally. We weight K by three multipliers so that bold, high-alpha, long-timeframe calls matter more:</p>
          <div className="bg-secondary rounded-xl px-4 py-3 font-display text-xs text-center">
            K_modified = K_base(16) × α_mult × boldness_mult × timeframe_mult
          </div>

          {/* Alpha multiplier table */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Alpha Multiplier (excess return vs SPY benchmark, annualized)</p>
            <div className="grid grid-cols-3 gap-1.5">
              {K_ALPHA.map(row => (
                <div key={row.alpha} className="bg-secondary rounded-lg px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{row.alpha}</p>
                  <p className={`text-sm font-medium ${row.color}`}>{row.mult}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Boldness */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Boldness Multiplier</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gain/10 border border-gain/20 rounded-lg px-3 py-2">
                <p className="font-medium text-gain">×1.3 Bold call</p>
                <p className="text-muted-foreground mt-0.5">Target move ≥ 2× timeframe noise floor (e.g. ≥4% for SHORT)</p>
              </div>
              <div className="bg-secondary border border-border rounded-lg px-3 py-2">
                <p className="font-medium text-muted-foreground">×0.5 Weak call</p>
                <p className="text-muted-foreground mt-0.5">Sub-noise move — anti-spam filter. HOLD calls get ×0.8.</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Timeframe table */}
      <Section title="Timeframe Buckets">
        <p className="text-sm text-muted-foreground mb-4">Each prediction is classified by how long it was held. Longer timeframes have higher K multipliers — they're harder to predict and carry more information.</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border border-border rounded-xl overflow-hidden">
            <thead className="bg-secondary">
              <tr>
                {["Bucket", "Range", "HOLD Success Window", "Bold Noise Threshold", "K Timeframe Mult"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMEFRAMES.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                  <td className="px-3 py-2.5 font-medium">{row.label}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.range}</td>
                  <td className="px-3 py-2.5 text-primary font-medium">{row.holdWindow}</td>
                  <td className="px-3 py-2.5">{row.boldNoise}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{row.kmult}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground"><strong>HOLD success:</strong> A HOLD call succeeds only if the stock stayed <em>flat</em> within the window. A HOLD that moves +4.3% in 3 days = LOSS (SHORT window = ±3%) — the analyst should have said BUY. Target price on HOLD is a fair-value estimate only; it does NOT determine win/loss.</p>
        </div>
      </Section>

      {/* Score Tiers */}
      <Section title="Score Tiers">
        <div className="space-y-2">
          {TIERS_SCORE.map(t => (
            <div key={t.tier} className={`flex items-center gap-4 p-4 border rounded-xl ${t.bg}`}>
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`font-medium text-sm ${t.color}`}>{t.tier}</span>
                  <span className="text-xs text-muted-foreground">Score {t.min}–{t.max} · Elo {t.elo}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Real examples */}
      <Section title="Real-World Examples" defaultOpen={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-xl overflow-hidden">
            <thead className="bg-secondary">
              <tr>
                {["Call", "Elo Delta", "Display Score", "Note"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                  <td className="px-3 py-2.5 font-display">{r.call}</td>
                  <td className="px-3 py-2.5 font-medium text-primary">{r.elo_delta}</td>
                  <td className="px-3 py-2.5 font-medium">{r.score}</td>
                  <td className="px-3 py-2.5 text-muted-foreground italic">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Prediction Outcome Tiers */}
      <Section title="Prediction Outcome Tiers" defaultOpen={false}>
        <p className="text-sm text-muted-foreground mb-4">Every locked prediction is graded when the timeframe expires or the target is hit. The outcome feeds the Elo win/loss calculation.</p>
        <div className="space-y-3">
          {OUTCOME_TIERS.map(tier => {
            const Icon = tier.icon;
            return (
              <div key={tier.title} className={`p-4 border rounded-xl ${tier.bg}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${tier.color}`} />
                  <div>
                    <p className="text-sm font-medium mb-1">{tier.title}</p>
                    <p className="text-xs text-foreground/80 mb-1.5">{tier.desc}</p>
                    <p className="text-[11px] text-muted-foreground font-display bg-white/50 rounded-lg px-3 py-1.5 inline-block">{tier.example}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Sector bonus */}
      <Section title="Sector Difficulty Bonus" defaultOpen={false}>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground mb-4">After replaying all calls, the final Elo rating receives a small sector bonus to account for higher prediction difficulty in volatile sectors.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { sector: "Crypto", bonus: "+25% Elo bonus" },
              { sector: "Biotechnology", bonus: "+20%" },
              { sector: "Energy", bonus: "+15%" },
              { sector: "Healthcare", bonus: "+10%" },
              { sector: "Technology", bonus: "+5%" },
              { sector: "Other", bonus: "+0%" },
            ].map(r => (
              <div key={r.sector} className="bg-secondary rounded-lg px-3 py-2 flex justify-between">
                <span className="font-medium">{r.sector}</span>
                <span className="text-primary font-medium">{r.bonus}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Bonus is applied as: adjusted_rating = rating × (1 + (sectorMult − 1) × 0.5), then capped at 1400.</p>
        </div>
      </Section>

      {/* Transparency */}
      <div className="bg-secondary border border-border rounded-2xl p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Transparency commitment</p>
        <p>All scoring logic is open, documented here, and applied consistently. No analyst pays to improve their score. Scores update automatically when predictions are resolved. Source: <span className="font-display text-xs">lib/accuracyScore.js</span>.</p>
      </div>
    </div>
  );
}