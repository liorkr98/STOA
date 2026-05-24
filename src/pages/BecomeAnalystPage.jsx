import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, ArrowRight, Loader2, CheckCircle2, X, Sparkles,
  TrendingUp, BarChart3, Zap, Globe, Shield, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SPECIALTY_OPTIONS = [
  "Tech", "AI & Semiconductors", "Fintech", "Healthcare", "Biotech",
  "Energy", "Crypto", "Real Estate", "Consumer", "Industrials",
  "Financials", "Macro", "Small Caps", "Emerging Markets", "ETFs",
];

const STYLES = [
  { key: "value",      label: "Long-Term Value",     desc: "Fundamentals, DCF, multi-year theses",      icon: Award },
  { key: "growth",     label: "Growth",              desc: "High-conviction growth stories",            icon: TrendingUp },
  { key: "day",        label: "Active Trader",       desc: "Short-term setups, technicals",             icon: Zap },
  { key: "macro",      label: "Macro",               desc: "Top-down rates, FX, sectors",               icon: Globe },
  { key: "quant",      label: "Quantitative",        desc: "Systematic, factor-driven",                 icon: BarChart3 },
];

export default function BecomeAnalystPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [step, setStep]       = useState(1);
  const [submitting, setSub]  = useState(false);
  const [done, setDone]       = useState(false);

  // Form state
  const [tagline,     setTagline]     = useState("");
  const [bio,         setBio]         = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [customSpec,  setCustomSpec]  = useState("");
  const [style,       setStyle]       = useState("");
  const [methodology, setMethodology] = useState("");
  const [agreed,      setAgreed]      = useState(false);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setTagline(user.tagline || "");
      setSpecialties(user.specialties || []);
    }
  }, [user]);

  // Existing researchers don't need to see the onboarding form again. Show
  // an already-onboarded card instead of silently redirecting to their
  // profile (which made the footer "Become a Researcher" link look like
  // it was broken — it routed admins straight back to their own profile).
  const isAlreadyAnalyst = user && (user.role === "analyst" || user.role === "admin");

  if (isAlreadyAnalyst) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gain/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-gain" />
        </div>
        <h1 className="text-2xl font-medium text-foreground mb-2">You're already a researcher</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your account has researcher access. Open your public profile to publish
          a report or update your bio.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => navigate("/analyst")}>View My Profile</Button>
          <Button variant="outline" onClick={() => navigate("/editor")}>Write a Report</Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">Sign in first to become a researcher.</p>
        <Button onClick={() => navigate("/signin")}>Sign In</Button>
      </div>
    );
  }

  const toggleSpec = s =>
    setSpecialties(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const addCustom = () => {
    const trimmed = customSpec.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties(p => [...p, trimmed]);
      setCustomSpec("");
    }
  };

  const canNext = () => {
    if (step === 1) return tagline.trim().length >= 5;
    if (step === 2) return bio.trim().length >= 20 && specialties.length >= 1 && style;
    if (step === 3) return methodology.trim().length >= 30 && agreed;
    return false;
  };

  const submit = async () => {
    if (!canNext() || submitting || !user) return;
    setSub(true);
    try {
      await base44.entities.User.update(user.id, {
        role:           "analyst",
        tagline:        tagline.trim(),
        bio:            bio.trim(),
        specialties,
        specialization: style,
        // Stash methodology into bio appendix if no dedicated field
        // (We append it visually but keep bio main field as written)
      });
      // Methodology + style stored in profile_config so it's structured & doesn't bloat bio
      const existingCfg = (() => {
        try { return JSON.parse(user.profile_config || "{}"); } catch { return {}; }
      })();
      await base44.entities.User.update(user.id, {
        profile_config: JSON.stringify({
          ...existingCfg,
          methodology: methodology.trim(),
          investment_style: style,
        }),
      });
      setDone(true);
      setTimeout(() => navigate("/analyst"), 1800);
    } catch {
      setSub(false);
    }
  };

  // ── Success screen ──
  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-medium mb-2">You're a researcher now</h1>
        <p className="text-sm text-muted-foreground mb-1">Welcome to STOA's creator program.</p>
        <p className="text-xs text-muted-foreground">Redirecting to your profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — pt-4 adds room so the sticky nav doesn't clip the top */}
      <div className="relative overflow-hidden pt-4" style={{ minHeight: 120, background: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 100%)" }}>
        {/* Decorative grid pattern — pointer-events-none so clicks reach
            the Back button below (same fix as AnalystProfilePage hero). */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.05) 40px,rgba(255,255,255,0.05) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.05) 40px,rgba(255,255,255,0.05) 41px)"
        }} />
        <div className="max-w-2xl mx-auto px-4 pb-8 relative z-10">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      {/* ── Creator pitch — Beehiiv/Patreon style.
          Value props, revenue math, and social proof BEFORE the
          onboarding form. Reduces drop-off by answering "why should I
          set up a profile?" before asking the user to commit. */}
      <div className="max-w-3xl mx-auto px-4 mt-10 mb-4">
        <div className="text-center mb-10">
          <span className="eyebrow">For Researchers</span>
          <h2 className="font-serif font-medium text-foreground tracking-tight mt-3" style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em" }}>
            Publish in 60 seconds.<br />
            <span className="text-accent">Keep 90% of every dollar.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { Icon: Award,       title: "Auto-verified track record",  desc: "Every prediction is locked at publish and graded by the market. Your accuracy score updates on its own." },
            { Icon: TrendingUp,  title: "Set your own price",          desc: "Charge $5 to $200 per month for subscriptions, or sell individual reports. We take 10%." },
            { Icon: Sparkles,    title: "Professional editor + AI",    desc: "Stock charts, metrics blocks, bull/bear thesis cards, and an AI research copilot. Built for finance." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="surface p-5">
              <div className="w-9 h-9 rounded-tag bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-serif text-[15px] text-foreground mb-1.5">{title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Quick revenue calc — Patreon-style social proof.
            Static math, no inputs (keeping it simple per "one card, one
            action"); the numbers come from the platform's standard 90/10
            split and a typical $9/mo subscription tier. */}
        <div className="surface-premium p-6 mb-2">
          <p className="eyebrow text-accent mb-3">If you build a subscriber base</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { subs: 100,  rev: 9 * 100 * 0.9 },
              { subs: 500,  rev: 9 * 500 * 0.9 },
              { subs: 1000, rev: 9 * 1000 * 0.9 },
            ].map(({ subs, rev }) => (
              <div key={subs} className="text-center">
                <p className="font-display font-medium text-foreground" style={{ fontSize: 26 }}>
                  ${rev.toLocaleString()}<span className="text-muted-foreground text-sm font-normal">/mo</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  with <span className="font-display text-foreground">{subs.toLocaleString()}</span> subscribers
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            Assumes $9/mo subscriptions · You keep 90% · STOA fee 10%
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* `surface-premium` defaults to a near-transparent glass background,
            which works for cards floating over the page background. But this
            card is pulled UP by -mt-12 so its top 48px overlaps the dark navy
            hero banner — with a translucent fill the banner bled straight
            through, making the header icon + "Become a Researcher" title sit
            on top of the navy gradient. Inline style overrides the glass fill
            with the opaque theme card color so the gradient border + top-edge
            highlight still work, but the banner can't bleed through anymore.
            Same fix as AnalystProfilePage's profile header card. */}
        <div className="surface-premium p-6 mb-5" style={{ background: "hsl(var(--card))" }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-tag bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-[22px] text-foreground">Become a Researcher</h1>
              <p className="text-xs text-muted-foreground">Set up your public creator profile</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6 mt-5">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-secondary"}`} />
                <p className={`text-[10px] mt-1 ${s <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  Step {s} of 3
                </p>
              </div>
            ))}
          </div>

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-medium text-base mb-1">Who are you, in one line?</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  This is your public tagline — what visitors to your profile see first.
                </p>
                <input
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. AI & semiconductor researcher · long-term growth"
                  className="w-full text-base border border-border rounded-tag px-3 py-2.5 bg-background focus:outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">Min 5 characters</p>
                  <p className="text-[10px] text-muted-foreground">{tagline.length}/80</p>
                </div>
              </div>

              <div className="bg-secondary/50 border border-border rounded-tag p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1 text-xs uppercase tracking-wider">Good examples</p>
                <ul className="space-y-1 text-xs">
                  <li>• "Tech & megacaps · long-term value, contrarian when needed"</li>
                  <li>• "Crypto-native, on-chain researcher · ETH, L2s, DeFi"</li>
                  <li>• "Macro generalist · rates, FX, sector rotation"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-medium text-base mb-1">Tell investors about you</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Your bio appears on your profile page. Cover your background, edge, and what you focus on.
                </p>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={5}
                  maxLength={600}
                  placeholder="I'm a former [role] now writing independently. My focus is..."
                  className="w-full text-sm border border-border rounded-tag px-3 py-2.5 bg-background focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">Min 20 characters</p>
                  <p className="text-[10px] text-muted-foreground">{bio.length}/600</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm mb-1">Your specialty sectors</h3>
                <p className="text-xs text-muted-foreground mb-2">Pick 1–4 — these appear as tags on your profile.</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SPECIALTY_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSpec(s)}
                      className={`text-xs px-2.5 py-1 rounded-tag border transition-colors font-medium ${
                        specialties.includes(s)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    value={customSpec}
                    onChange={e => setCustomSpec(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustom())}
                    placeholder="Add custom…"
                    className="flex-1 text-xs border border-border rounded-tag px-2.5 py-1.5 bg-background focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={addCustom}
                    className="text-xs bg-secondary text-foreground px-3 rounded-tag border border-border font-medium hover:bg-primary/10"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2">Your style</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STYLES.map(s => {
                    const Icon = s.icon;
                    const active = style === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setStyle(s.key)}
                        className={`text-left rounded-tag border p-3 transition-colors ${
                          active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium text-sm">{s.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Methodology + Agreement */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-medium text-base mb-1">How do you make calls?</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Briefly describe your research process — fundamentals, screens, models, signals.
                  Investors trust researchers who can explain their edge.
                </p>
                <textarea
                  value={methodology}
                  onChange={e => setMethodology(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="My process is..."
                  className="w-full text-sm border border-border rounded-tag px-3 py-2.5 bg-background focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">Min 30 characters</p>
                  <p className="text-[10px] text-muted-foreground">{methodology.length}/500</p>
                </div>
              </div>

              {/* Code of conduct */}
              <div className="bg-accent/10 border border-accent/30 rounded-tag p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif text-[14px] text-foreground">STOA Creator Code of Conduct</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verified track records are the core of this platform. By becoming a researcher, you agree to:
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-foreground mb-4 ml-7">
                  {[
                    "Publish only my own analysis and original views",
                    "Make predictions in good faith — never to manipulate prices",
                    "Disclose positions when I write about a stock I own or hold short",
                    "Accept transparent scoring: hits, misses, and yield are visible on my profile",
                    "Never use pump-and-dump, paid promotion, or insider information",
                    "Cite sources when referencing third-party data or claims",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-current cursor-pointer flex-shrink-0 text-accent"
                  />
                  <span className="text-xs font-medium text-foreground">
                    I agree to the STOA Creator Code of Conduct
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/60">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {step > 1 ? "Back" : "Cancel"}
            </button>

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1.5">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={!canNext() || submitting} className="gap-1.5">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Become a Researcher
              </Button>
            )}
          </div>
        </div>

        {/* Benefits panel */}
        <div className="surface p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">What you unlock</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["📝", "Publish reports",     "Write market analysis and lock predictions to the blockchain of your track record."],
              ["📊", "Track record page",   "Visible win rate, profit factor, and per-call performance for every visitor."],
              ["💸", "Monetize",            "Set premium reports, charge subscriptions, get tipped via AI credits."],
              ["📬", "Direct messaging",   "Subscribers can DM you. Build a real community."],
              ["🎨", "Customizable page", "Banner themes, pinned reports, social links, layout reorder."],
              ["🏆", "Leaderboard rewards", "Top researchers earn monthly AI credits and platform recognition."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
