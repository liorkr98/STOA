import React, { useState } from "react";
import { X, TrendingUp, Users, BarChart3, Star, BookOpen, Zap, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    icon: TrendingUp,
    color: "text-blue-500",
    bg: "bg-blue-50",
    title: "Welcome to STOA",
    subtitle: "Your edge in the market",
    body: "STOA is a platform where professional researchers publish in-depth reports on stocks, ETFs, and markets — with real predictions you can track over time.",
    visual: (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {["$NVDA +42%", "$AAPL +18%", "$MSFT +27%", "$TSLA -12%"].map((t, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 text-sm font-bold text-center border ${t.includes("+") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{t}</div>
        ))}
      </div>
    ),
  },
  {
    icon: BookOpen,
    color: "text-violet-500",
    bg: "bg-violet-50",
    title: "Read Researcher Reports",
    subtitle: "Research by real researchers",
    body: "Browse the Feed to discover the latest researcher reports. Each report includes a full thesis, supporting data, and a verified price prediction — locked at the moment of publishing.",
    visual: (
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">JD</div>
          <div>
            <div className="text-xs font-semibold">John D. · Tech Researcher</div>
            <div className="text-[10px] text-muted-foreground">2h ago · 12 min read</div>
          </div>
        </div>
        <div className="text-xs font-bold mb-1">NVIDIA: AI supercycle still has 18 months left</div>
        <div className="flex gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">LONG $NVDA</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-full">Target: $190</span>
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Follow Researchers",
    subtitle: "Build your inner circle",
    body: "Follow the researchers whose views align with yours. Their new reports will appear in your Feed the moment they publish. You can also subscribe for exclusive premium research.",
    visual: (
      <div className="mt-4 space-y-2">
        {[
          { name: "Sarah K.", spec: "Macro & Rates", tier: "Elite" },
          { name: "Alex T.", spec: "Tech & AI", tier: "Expert" },
        ].map((a, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">{a.name[0]}</div>
              <div>
                <div className="text-xs font-semibold">{a.name}</div>
                <div className="text-[10px] text-muted-foreground">{a.spec}</div>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">{a.tier}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BarChart3,
    color: "text-green-500",
    bg: "bg-green-50",
    title: "Track Predictions",
    subtitle: "Hold researchers accountable",
    body: "Every published prediction is automatically tracked against real market prices. Researchers earn their reputation through verified accuracy — not just good writing.",
    visual: (
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Live prediction tracker</div>
        <div className="space-y-1.5">
          {[
            { ticker: "NVDA", dir: "LONG", entry: "$120", current: "$148", pct: "+23%" },
            { ticker: "AMZN", dir: "LONG", entry: "$180", current: "$197", pct: "+9%" },
          ].map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-bold">${p.ticker}</span>
              <span className="text-muted-foreground">{p.entry} → {p.current}</span>
              <span className="font-bold text-green-600">{p.pct}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Star,
    color: "text-rose-500",
    bg: "bg-rose-50",
    title: "Your Watchlist & Markets",
    subtitle: "Never miss a move",
    body: "Add any stock or ETF to your Watchlist. The Markets tab shows live prices with your watchlist at the top. AI analyst is always available to answer market questions.",
    visual: (
      <div className="mt-4 space-y-2">
        {["$SPY", "$NVDA", "$BTC-USD"].map((t, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold">{t}</span>
            </div>
            <span className="text-xs font-semibold text-green-600">+{(Math.random() * 3 + 0.5).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "You're all set!",
    subtitle: "Start exploring STOA",
    body: "Head to the Feed to discover the latest research, or browse the Markets tab to add stocks to your watchlist. Want to share your own insights? Become a researcher anytime.",
    cta: true,
  },
];

const ONBOARDING_KEY = "stoa_investor_onboarding_done";

export function shouldShowInvestorOnboarding(user) {
  if (!user) return false;
  if (localStorage.getItem(ONBOARDING_KEY)) return false;
  // Show if user has been registered for less than 5 minutes (new account)
  if (user.created_date) {
    const age = Date.now() - new Date(user.created_date).getTime();
    if (age > 10 * 60 * 1000) return false; // > 10 min old, skip
  }
  return true;
}

export function markInvestorOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "1");
}

export default function InvestorOnboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const S = STEPS[step];
  const Icon = S.icon;
  const isLast = step === STEPS.length - 1;

  const finish = (path) => {
    markInvestorOnboardingDone();
    onClose?.();
    if (path) navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={() => finish(null)}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-secondary transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-secondary"}`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl ${S.bg} flex items-center justify-center mb-4`}>
            <Icon className={`w-6 h-6 ${S.color}`} />
          </div>

          <h2 className="text-xl font-extrabold mb-0.5">{S.title}</h2>
          <p className="text-xs font-semibold text-primary mb-2">{S.subtitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{S.body}</p>

          {S.visual}

          {/* CTA buttons on last step */}
          {isLast ? (
            <div className="mt-5 space-y-2">
              <Button className="w-full" onClick={() => finish("/feed")}>
                Explore the Feed
              </Button>
              <Button variant="outline" className="w-full" onClick={() => finish("/")}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                className={`flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ${step === 0 ? "invisible" : ""}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
