import React, { useState } from "react";
import { X, PenLine, Lock, Trophy, Palette, DollarSign, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    icon: Sparkles,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "You're now a researcher!",
    subtitle: "Welcome to the creator program",
    body: "As a STOA researcher, you publish research reports that investors can read, follow, and subscribe to. Your track record is built automatically — every prediction is verified against real prices.",
    visual: (
      <div className="mt-4 rounded-xl border border-border bg-gradient-to-br from-violet-50 to-blue-50 p-4 text-center">
        <div className="text-4xl mb-1">🏆</div>
        <div className="text-sm font-medium">Your researcher journey starts today</div>
        <div className="text-xs text-muted-foreground mt-1">Publish your first report to get on the leaderboard</div>
      </div>
    ),
  },
  {
    icon: PenLine,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Write Reports",
    subtitle: "Your research, your voice",
    body: "Use the Editor to write structured reports. Add heading, paragraphs, bullet lists, callout boxes, and embedded stock charts. The AI assistant can help you research, draft, and fact-check.",
    visual: (
      <div className="mt-4 rounded-xl border border-border bg-card p-3 space-y-1.5">
        {[
          { type: "Heading",     color: "bg-primary/10 text-primary" },
          { type: "Paragraph",  color: "bg-secondary text-muted-foreground" },
          { type: "Stock Chart",color: "bg-primary/10 text-primary" },
          { type: "Prediction", color: "bg-accent/10 text-accent" },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${b.color}`}>{b.type}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Lock,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "Predictions are Price-Locked",
    subtitle: "No backdating, ever",
    body: "When you add a prediction (LONG/SHORT/NEUTRAL), the live market price is fetched and frozen at publish time from multiple data sources. This makes your track record tamper-proof and trustworthy.",
    visual: (
      <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium text-accent">Price locked at publish</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ticker</span>
            <span className="font-medium">$NVDA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Direction</span>
            <span className="font-medium text-primary">LONG</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lock price</span>
            <span className="font-medium">$124.60</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source</span>
            <span className="font-medium text-blue-600">Finnhub real-time</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Trophy,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Build Your Track Record",
    subtitle: "Accuracy earns reputation",
    body: "Your score is computed from win rate (Wilson-adjusted), profit factor, and alpha vs benchmark. The leaderboard rewards researchers with the most accurate predictions — not just the most popular.",
    visual: (
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="text-[10px] text-muted-foreground font-medium uppercase mb-2">Score breakdown</div>
        <div className="space-y-2">
          {[
            { label: "Win rate (adjusted)", pct: 68, color: "bg-green-500" },
            { label: "Profit factor",       pct: 45, color: "bg-blue-500" },
            { label: "Alpha vs S&P 500",    pct: 30, color: "bg-accent/10" },
          ].map((m, i) => (
            <div key={i}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span>{m.label}</span><span className="font-medium">{m.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Palette,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Customise Your Profile",
    subtitle: "Your brand, your page",
    body: "Your public researcher profile is fully customisable. Add a banner, pick colours, write your bio, embed stock spotlights, add social links — it's your creator landing page.",
    visual: (
      <div className="mt-4 rounded-xl overflow-hidden border border-border">
        <div className="h-8" style={{ background: "linear-gradient(135deg,#0A1A3F,#1E3A8A)" }} />
        <div className="bg-card px-3 pb-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 border-2 border-card -mt-5 mb-1 flex items-center justify-center text-sm font-medium text-accent">A</div>
          <div className="text-xs font-medium">Your Name</div>
          <div className="text-[10px] text-muted-foreground">Your tagline here</div>
          <div className="flex gap-1 mt-1.5">
            {["Tech", "AI", "Macro"].map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded-tag">{s}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: DollarSign,
    color: "text-accent",
    bg: "bg-primary/10",
    title: "Earn from Your Research",
    subtitle: "Premium reports & subscriptions",
    body: "Set any report as Premium (paid). Investors pay directly from their wallet. You can also offer monthly subscriptions for exclusive research. STOA takes a 10% platform fee — the rest is yours.",
    visual: (
      <div className="mt-4 space-y-2">
        {[
          { type: "Free report",        earn: "Followers + exposure" },
          { type: "Premium ($5)",       earn: "You earn $4.50" },
          { type: "Subscription ($29/mo)", earn: "You earn $26.10/mo" },
        ].map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <span>{r.type}</span>
            <span className="font-medium text-accent">{r.earn}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: PenLine,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Time to write",
    subtitle: "Your first report is one click away",
    body: "Head to the Editor to write your first report. It costs 10 AI credits to publish — you get 50 free credits when you join. The AI assistant is there to help at any time.",
    cta: true,
  },
];

const ONBOARDING_KEY = "stoa_analyst_onboarding_done";

export function shouldShowAnalystOnboarding(user) {
  if (!user) return false;
  if (user.role !== "analyst" && user.role !== "admin") return false;
  if (localStorage.getItem(ONBOARDING_KEY)) return false;
  // Show if user just became an analyst (last 10 minutes)
  if (user.updated_date) {
    const age = Date.now() - new Date(user.updated_date).getTime();
    if (age > 15 * 60 * 1000) return false;
  }
  return true;
}

export function markAnalystOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "1");
}

export default function AnalystOnboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const S = STEPS[step];
  const Icon = S.icon;
  const isLast = step === STEPS.length - 1;

  const finish = (path) => {
    markAnalystOnboardingDone();
    onClose?.();
    if (path) navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm surface overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <button
          onClick={() => finish(null)}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-secondary transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-secondary"}`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className={`w-12 h-12 rounded-2xl ${S.bg} flex items-center justify-center mb-4`}>
            <Icon className={`w-6 h-6 ${S.color}`} />
          </div>

          <h2 className="font-serif text-[20px] text-foreground mb-0.5">{S.title}</h2>
          <p className="text-xs font-medium text-primary mb-2">{S.subtitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{S.body}</p>

          {S.visual}

          {isLast ? (
            <div className="mt-5 space-y-2">
              <Button className="w-full" onClick={() => finish("/editor")}>
                Write My First Report
              </Button>
              <Button variant="outline" className="w-full" onClick={() => finish("/analyst")}>
                View My Profile
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
