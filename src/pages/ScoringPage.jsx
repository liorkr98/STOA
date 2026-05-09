import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import { CheckCircle2, XCircle, Clock, TrendingUp, Zap, Minus } from "lucide-react";

const TIERS = [
  { badge: "⭐", name: "ELITE", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", range: "80%+", desc: "Top tier analysts with a proven track record. Consistently correct across multiple calls." },
  { badge: "🔷", name: "EXPERT", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", range: "65–79%", desc: "Above-average analysts who consistently outperform random chance." },
  { badge: "💚", name: "STRONG", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", range: "50–64%", desc: "Solid performers who are right more often than not." },
  { badge: "📊", name: "AVERAGE", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", range: "35–49%", desc: "Building their track record." },
  { badge: "🔨", name: "BUILDING", color: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", range: "< 35% or < 3 calls", desc: "New or developing analysts establishing their track record." },
];

const OUTCOMES = [
  { icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "HIT ✅", desc: "The prediction reached or surpassed its target price within the specified timeframe. Full credit." },
  { icon: TrendingUp, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", label: "NEAR HIT 🟡", desc: "The prediction came within 5% of the target price. Partial credit (0.75×)." },
  { icon: Zap, color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "PARTIAL ⚡", desc: "The prediction moved significantly in the right direction (50%+ of target move) but didn't reach the target. Half credit." },
  { icon: XCircle, color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "MISS ❌", desc: "The prediction moved against the stated direction or expired without reaching the target. No credit." },
  { icon: Clock, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: "PENDING ⏳", desc: "Prediction is still active within its stated timeframe." },
];

export default function ScoringPage() {
  useEffect(() => {
    setMeta({ title: "Scoring & Calculations — STOA", description: "How STOA calculates analyst accuracy scores, yields, badges, and leaderboard rankings." });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>›</span>
        <span>Scoring & Calculations</span>
      </div>

      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Scoring & Calculations</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Every analyst score on STOA is calculated automatically from verified prediction data. No manual input, no cherry-picking — just math.
        </p>
      </div>

      {/* Section 1: Elo System */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-3">Accuracy Score (Elo-Based)</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          STOA uses a modified Elo rating system — the same system used to rank chess players — to calculate analyst accuracy. Every prediction outcome updates the analyst's Elo rating dynamically.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Starting Elo", val: "1,000", desc: "Every new analyst begins here", color: "text-foreground" },
            { label: "Hit / Near Hit", val: "+15–30", desc: "Points gained for correct call", color: "text-gain" },
            { label: "Miss", val: "−10–20", desc: "Points lost for incorrect call", color: "text-loss" },
          ].map((item, i) => (
            <div key={i} className="bg-secondary rounded-xl p-4 text-center border border-border">
              <div className={`text-2xl font-extrabold mb-1 ${item.color}`}>{item.val}</div>
              <div className="text-sm font-semibold text-foreground mb-1">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border border-border rounded-xl p-4">
          <p className="text-xs font-mono text-muted-foreground mb-1">Score Formula</p>
          <p className="font-mono text-sm text-foreground">Accuracy Score (%) = (Elo Rating − 600) ÷ 8</p>
          <p className="text-xs text-muted-foreground mt-2">Example: Elo 1400 → Score = (1400 − 600) / 8 = 100%</p>
        </div>
      </div>

      {/* Section 2: Outcomes */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">Prediction Outcomes</h2>
        <div className="space-y-3">
          {OUTCOMES.map((o, i) => {
            const Icon = o.icon;
            return (
              <div key={i} style={{ background: o.bg, border: `1px solid ${o.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Icon size={18} color={o.color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: o.color, marginBottom: 3 }}>{o.label}</p>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{o.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Yield Calculation */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-3">How Yield Is Calculated</h2>
        <p className="text-muted-foreground mb-6">Average yield measures the actual return on resolved predictions.</p>
        <div className="space-y-3 mb-6">
          {[
            { label: "LONG prediction", formula: "Yield = ((Resolved Price − Lock Price) / Lock Price) × 100%", example: "Lock $100 → Resolve $128 = +28.0%" },
            { label: "SHORT prediction", formula: "Yield = ((Lock Price − Resolved Price) / Lock Price) × 100%", example: "Lock $100 → Resolve $82 = +18.0%" },
            { label: "Average Yield", formula: "Avg Yield = Sum of all resolved yields ÷ Number of resolved predictions", example: null },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">{item.label}</p>
              <p className="font-mono text-sm text-foreground">{item.formula}</p>
              {item.example && <p className="text-xs text-muted-foreground mt-1">e.g. {item.example}</p>}
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800"><strong>Note:</strong> Pending predictions are excluded from yield. Hold predictions measure accuracy only and are excluded from yield calculations.</p>
        </div>
      </div>

      {/* Section 4: Tiers */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">Analyst Tiers & Badges</h2>
        <div className="space-y-3">
          {TIERS.map((tier, i) => (
            <div key={i} style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{tier.badge}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: tier.color }}>{tier.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, background: tier.border, color: tier.color, padding: "2px 10px", borderRadius: 20 }}>{tier.range}</span>
                </div>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{tier.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Streak */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-3">Win Streaks 🔥</h2>
        <p className="text-muted-foreground leading-relaxed">
          A win streak is the number of <strong>consecutive HIT or NEAR HIT predictions</strong>. Streaks are displayed on analyst profiles and feed cards to show current momentum. Streaks reset on any MISS or PARTIAL outcome.
        </p>
      </div>

      {/* Section 6: Leaderboard */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-3">Leaderboard Ranking</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Rankings are calculated based on <strong>Accuracy Score (primary)</strong>, then by <strong>Total Resolved Calls (secondary tiebreaker)</strong>. Analysts need at least <strong>3 resolved predictions</strong> to appear in the leaderboard.
        </p>
        <Link to="/leaderboard" className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
          View Leaderboard →
        </Link>
      </div>

      {/* Section 7: Fairness */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-3">Fairness & Transparency</h2>
        <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
          <p>✅ All scores are calculated by algorithm, not manually set by any human.</p>
          <p>✅ Analysts cannot edit or delete predictions after locking — all calls are immutable.</p>
          <p>✅ All prediction data is publicly auditable in the Analytics section.</p>
          <p>✅ Scores reflect only resolved predictions with actual price data.</p>
        </div>
        <div className="mt-4">
          <Link to="/analytics" className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
            View Analytics Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}