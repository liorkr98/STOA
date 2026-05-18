import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, TrendingUp, TrendingDown, ArrowRight, Lock,
  Shield, CheckCircle, Star, Users, DollarSign, Zap,
  BarChart3, PenLine, Target, Award, ChevronRight,
  Layers, Eye, Bell, Globe, MessageSquare
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const SIGNIN_PATH = "/signin";

// ── Mock report cards for the marquee ───────────────────────────────────────
const MOCK_REPORTS = [
  { title: "NVDA: AI Supercycle Intact Despite Near-Term Volatility", analyst: "James Mercer", action: "LONG", ticker: "NVDA", change: "+34.2%", outcome: "win", sector: "Technology" },
  { title: "Macro Regime Shift: Why the 10Y Yield Break Changes Everything", analyst: "Sarah Chen", action: "SHORT", ticker: "TLT", change: "+18.7%", outcome: "win", sector: "Macro" },
  { title: "META: Advertising Resilience & Reality Labs Path to Profitability", analyst: "David Osei", action: "LONG", ticker: "META", change: "+41.3%", outcome: "win", sector: "Technology" },
  { title: "Energy Sector Rotation: XOM Undervalued vs. Historical Multiples", analyst: "Priya Nair", action: "LONG", ticker: "XOM", change: "+12.8%", outcome: "win", sector: "Energy" },
  { title: "TSLA: Margin Compression & EV Price War — Avoiding the Dip", analyst: "Lucas Berg", action: "SHORT", ticker: "TSLA", change: "+22.1%", outcome: "win", sector: "Auto" },
  { title: "Bitcoin Halving Cycle Analysis: On-Chain Metrics Signal Accumulation", analyst: "Nina Walsh", action: "LONG", ticker: "BTC", change: "+67.4%", outcome: "win", sector: "Crypto" },
  { title: "MSFT: Azure Growth Re-acceleration & Copilot Monetization Deep-Dive", analyst: "James Mercer", action: "LONG", ticker: "MSFT", change: "+28.9%", outcome: "win", sector: "Technology" },
  { title: "Healthcare Sector: GLP-1 Market Sizing & Competitive Moat Analysis", analyst: "Sarah Chen", action: "LONG", ticker: "LLY", change: "+55.6%", outcome: "win", sector: "Healthcare" },
  { title: "Gold: Real Rates Thesis & Breakout Above $2,400 Resistance", analyst: "Priya Nair", action: "LONG", ticker: "GLD", change: "+15.2%", outcome: "win", sector: "Commodities" },
  { title: "AAPL: Services Margin Expansion Offset by China Revenue Risk", analyst: "David Osei", action: "NEUTRAL", ticker: "AAPL", change: "+8.3%", outcome: "neutral", sector: "Technology" },
  { title: "Regional Banks: Credit Cycle Risk Underpriced After SVB Contagion", analyst: "Lucas Berg", action: "SHORT", ticker: "KRE", change: "+19.4%", outcome: "win", sector: "Financials" },
  { title: "AMZN: AWS Inflection Point & Margin Recovery to Pre-Pandemic Levels", analyst: "Nina Walsh", action: "LONG", ticker: "AMZN", change: "+38.7%", outcome: "win", sector: "Technology" },
];

const ROW1 = [...MOCK_REPORTS.slice(0, 6), ...MOCK_REPORTS.slice(0, 6)];
const ROW2 = [...MOCK_REPORTS.slice(6, 12), ...MOCK_REPORTS.slice(6, 12)];

function ReportCard({ r }) {
  const isLong = r.action === "LONG";
  const isShort = r.action === "SHORT";
  const tone = isLong
    ? "bg-gain/10 text-gain border-gain/30"
    : isShort
    ? "bg-loss/10 text-loss border-loss/30"
    : "bg-secondary text-muted-foreground border-border";
  return (
    <div className="surface shrink-0 w-[280px] p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="pill">{r.sector}</span>
        <span className={`text-[11px] font-medium tracking-wider px-2.5 py-0.5 rounded-tag border ${tone}`}>
          {r.action} {r.ticker}
        </span>
      </div>
      <p className="text-[13px] font-serif text-foreground leading-snug mb-3.5 min-h-[38px]">
        {r.title}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-medium">
            {r.analyst.split(" ").map(n => n[0]).join("")}
          </div>
          <span className="text-[11px] text-muted-foreground">{r.analyst}</span>
        </div>
        <span className="text-[13px] font-medium font-display text-gain">{r.change}</span>
      </div>
    </div>
  );
}

// ── Feature comparison data ──────────────────────────────────────────────────
const COMPARISON = [
  { feature: "Locked price predictions", stoa: true, substack: false, seekingAlpha: false },
  { feature: "Auto-verified track record", stoa: true, substack: false, seekingAlpha: false },
  { feature: "Accuracy score dashboard", stoa: true, substack: false, seekingAlpha: true },
  { feature: "Professional financial editor", stoa: true, substack: false, seekingAlpha: false },
  { feature: "AI research assistant", stoa: true, substack: false, seekingAlpha: false },
  { feature: "Keep 90%+ of revenue", stoa: true, substack: true, seekingAlpha: false },
  { feature: "Stock chart embeds", stoa: true, substack: false, seekingAlpha: false },
  { feature: "Metrics & thesis blocks", stoa: true, substack: false, seekingAlpha: false },
  { feature: "No follower count required", stoa: true, substack: false, seekingAlpha: false },
];

// ── Top analyst mocks ────────────────────────────────────────────────────────
const MOCK_ANALYSTS = [
  { name: "James Mercer", handle: "jmercer", initials: "JM", accuracy: 91, calls: 24, subscribers: "1.8K", sector: "Technology", badge: "Top Researcher", revenue: "$4,200/mo" },
  { name: "Sarah Chen", handle: "schen", initials: "SC", accuracy: 88, calls: 31, subscribers: "3.1K", sector: "Macro / Rates", badge: "Macro Expert", revenue: "$7,800/mo" },
  { name: "Priya Nair", handle: "pnair", initials: "PN", accuracy: 85, calls: 18, subscribers: "940", sector: "Energy & Commodities", badge: "Rising Star", revenue: "$2,100/mo" },
];

// ── Landing-only animations ──────────────────────────────────────────────────
const LANDING_STYLES = `
  @keyframes marquee     { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes marqueeRev  { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
  @keyframes pulse2      { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .marquee-track     { display: flex; gap: 16px; animation: marquee 44s linear infinite; width: max-content; }
  .marquee-track-rev { display: flex; gap: 16px; animation: marqueeRev 48s linear infinite; width: max-content; }
  .marquee-wrap:hover .marquee-track,
  .marquee-wrap:hover .marquee-track-rev { animation-play-state: paused; }
`;

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1600;
        const start = Date.now();
        const tick = () => {
          const progress = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setVal(Math.floor(ease * to));
          if (progress < 1) requestAnimationFrame(tick);
          else setVal(to);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);

  return <span ref={ref} className="font-display">{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (window.location.hash && /login|signin|auth/i.test(window.location.hash)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, []);

  const enterPlatform = () => {
    localStorage.setItem("stoa_last_landing_visit", Date.now().toString());
    navigate("/feed");
  };
  const go = () => {
    localStorage.setItem("stoa_last_landing_visit", Date.now().toString());
    navigate(SIGNIN_PATH);
  };

  const primaryAction = user ? enterPlatform : go;
  const primaryLabel  = user ? "Go to Feed" : "Start Publishing Free";

  return (
    // The landing page runs the dark Stoa palette by default. Adding `dark`
    // to the wrapper opts every component below into the dark-mode CSS vars
    // (background, foreground, glass tints) — so .surface, text colors, and
    // pills all resolve via the design system rather than hard-coded hex.
    <div className="dark bg-background text-foreground overflow-x-hidden">
      <style>{LANDING_STYLES}</style>

      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all ${
          scrolled ? "nav-glass" : ""
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-accent" />
            <span className="font-serif font-medium text-xl text-foreground tracking-tight" style={{ letterSpacing: "4px" }}>STOA</span>
            <span className="badge-founding ml-1">BETA</span>
          </div>

          <div className="hidden md:flex gap-8 items-center">
            {[["Platform", "#platform"], ["For Researchers", "#for-analysts"], ["Compare", "#compare"], ["Pricing", "#pricing"]].map(([l, h]) => (
              <a key={l} href={h} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l}
              </a>
            ))}
          </div>

          <div className="flex gap-2.5 items-center">
            {user ? (
              <button onClick={enterPlatform} className="cta-gold inline-flex items-center gap-2 text-sm font-medium px-5 py-2" style={{ borderRadius: 6 }}>
                Open Platform <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={go} className="text-sm text-muted-foreground hover:text-foreground bg-transparent border-0 px-4 py-2 font-medium">
                  Log In
                </button>
                <button onClick={go} className="cta-gold inline-flex items-center gap-2 text-sm font-medium px-5 py-2" style={{ borderRadius: 6 }}>
                  Get Started Free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6 pt-[120px] text-center relative overflow-hidden ambient-section">
        <div className="relative z-[1] max-w-[820px] mx-auto fade-up">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-gain/10 border border-gain/30 rounded-tag px-4 py-1.5 mb-9 text-xs text-gain font-medium tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-gain inline-block" style={{ animation: "pulse2 2s infinite" }} />
            Live · Predictions Tracked in Real Time
          </div>

          <h1 className="font-serif font-medium text-foreground leading-[1.08] mb-7 tracking-tight" style={{ fontSize: "clamp(38px, 6.5vw, 76px)", letterSpacing: "-0.025em" }}>
            Where Financial Researchers<br />
            <span className="text-accent">Build Their Reputation</span>
          </h1>

          <p className="text-muted-foreground max-w-[620px] mx-auto mb-11 leading-relaxed" style={{ fontSize: "clamp(16px, 2vw, 19px)" }}>
            Publish research. Lock price targets publicly. Let the market grade your calls — automatically. The first platform where your track record is the product.
          </p>

          <div className="flex gap-3.5 justify-center flex-wrap mb-14">
            <button onClick={primaryAction} className="cta-gold inline-flex items-center gap-2 text-base font-medium px-9 py-4" style={{ borderRadius: 6 }}>
              {primaryLabel} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={user ? enterPlatform : go} className="inline-flex items-center gap-2 text-base font-medium px-9 py-4 rounded-sm border border-border text-foreground hover:bg-secondary/40 transition-colors" style={{ borderRadius: 6 }}>
              Browse Top Researchers
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex gap-7 justify-center flex-wrap">
            {[
              [Lock, "Predictions locked on publish"],
              [Shield, "Track records auto-verified"],
              [DollarSign, "Researchers keep 90% of revenue"],
            ].map(([Icon, label]) => (
              <div key={label} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrolling report marquee ── */}
        <div className="w-full mt-[72px] pb-20 relative z-[1]" id="platform">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-40 z-[2] pointer-events-none" style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-40 z-[2] pointer-events-none" style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }} />

          <div className="marquee-wrap flex flex-col gap-3.5 overflow-hidden">
            <div className="marquee-track">
              {ROW1.map((r, i) => <ReportCard key={i} r={r} />)}
            </div>
            <div className="marquee-track-rev">
              {ROW2.map((r, i) => <ReportCard key={i} r={r} />)}
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-5 tracking-wider uppercase">
            Hover to pause · Representative content
          </p>
        </div>
      </section>

      {/* ── METRICS BAR ── */}
      <div className="bg-secondary/30 border-y border-border py-12 px-6">
        <div className="max-w-[960px] mx-auto grid grid-cols-4 text-center">
          {[
            { value: 2400, suffix: "+", label: "Reports Published" },
            { value: 89, suffix: "%", prefix: "↑ ", label: "Avg Winning Accuracy" },
            { value: 140, suffix: "K+", label: "Monthly Readers" },
            { value: 320, suffix: "K", prefix: "$", label: "Paid to Researchers" },
          ].map((s, i) => (
            <div key={i} className={`px-6 ${i < 3 ? "border-r border-border" : ""}`}>
              <div className="font-display font-medium text-accent mb-2 tracking-tight" style={{ fontSize: "clamp(28px,4vw,42px)" }}>
                <Counter to={s.value} suffix={s.suffix} prefix={s.prefix || ""} />
              </div>
              <div className="text-[13px] text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOR ANALYSTS ── */}
      <section id="for-analysts" className="max-w-[1200px] mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="eyebrow text-primary mb-4">For Financial Content Creators</div>
          <h2 className="font-serif font-medium text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.02em" }}>
            Everything you need.<br />Nothing you don't.
          </h2>
          <p className="text-[17px] text-muted-foreground max-w-[560px] mx-auto">
            Built by people who understand financial research — not a generic creator tool retrofitted for finance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { Icon: Lock,        title: "Lock Predictions Publicly",     desc: "Timestamp your price targets on publish. No editing after the fact. Your calls stand or fall on record — that's what builds real credibility." },
            { Icon: Award,       title: "Auto-Verified Track Record",   desc: "Your accuracy score updates automatically as predictions resolve. No self-reporting. Readers see exactly how you've performed across every call." },
            { Icon: DollarSign,  title: "Keep 90% of Revenue",          desc: "Set your own subscription price. Set premium reports. We take 10% — Seeking Alpha takes 50%+. Your audience, your pricing, your income." },
            { Icon: PenLine,     title: "Professional Research Editor", desc: "Metrics blocks, bull/bear thesis cards, live stock chart embeds, columnar layouts. Built for financial researchers — not bloggers." },
            { Icon: Zap,         title: "AI Research Assistant",        desc: "A market expert AI that knows fundamentals, technicals, and macro. Ask questions, drag answers into your report. Your research copilot." },
            { Icon: BarChart3,   title: "Deep Analytics Dashboard",     desc: "See who reads your reports, where they came from, which predictions drive subscriptions. Know what content your audience actually wants." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="surface surface-interactive p-7">
              <div className="w-11 h-11 rounded-tag bg-primary/10 flex items-center justify-center mb-5">
                <Icon className="w-[22px] h-[22px] text-primary" />
              </div>
              <h3 className="font-serif font-medium text-[16px] text-foreground mb-2.5">{title}</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOP ANALYSTS SPOTLIGHT ── */}
      <section className="bg-secondary/30 border-y border-border py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="eyebrow text-accent mb-4">Researcher Spotlight</div>
            <h2 className="font-serif font-medium text-foreground tracking-tight mb-3.5" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}>
              No followers required.<br />Just results.
            </h2>
            <p className="text-[16px] text-muted-foreground max-w-[520px] mx-auto">
              On STOA, your accuracy score is your credential. New researchers with a 90% track record outrank veterans with 10,000 followers.
            </p>
          </div>

          <div className="flex gap-5 flex-wrap">
            {MOCK_ANALYSTS.map((a) => (
              <div key={a.name} className="surface surface-interactive flex-1 min-w-[260px] p-7">
                {/* Header */}
                <div className="flex items-center gap-3.5 mb-6">
                  <div className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-medium shrink-0" style={{ width: 52, height: 52 }}>
                    {a.initials}
                  </div>
                  <div>
                    <div className="font-serif text-[16px] text-foreground">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.sector}</div>
                  </div>
                  <span className="badge-founding ml-auto shrink-0">{a.badge}</span>
                </div>

                {/* Accuracy big number */}
                <div className="stat-card stat-card-hero text-center mb-6">
                  <div className="stat-card-value text-gain">{a.accuracy}%</div>
                  <div className="text-xs text-muted-foreground mt-1.5">Prediction Accuracy</div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Calls", val: a.calls },
                    { label: "Subscribers", val: a.subscribers },
                    { label: "Revenue", val: a.revenue },
                  ].map(s => (
                    <div key={s.label} className="text-center px-1.5 py-2.5 rounded-tag bg-background/40 border border-border/60">
                      <div className="text-sm font-medium font-display text-foreground">{s.val}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <button onClick={primaryAction} className="w-full py-3 rounded-sm bg-primary/10 border border-primary/30 text-primary text-[13px] font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2" style={{ borderRadius: 6 }}>
                  Follow Researcher <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button onClick={primaryAction} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-sm border border-border text-foreground hover:bg-secondary/40 transition-colors text-base font-medium" style={{ borderRadius: 6 }}>
              View Full Leaderboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOR READERS ── */}
      <section className="max-w-[1100px] mx-auto py-24 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="eyebrow text-gain mb-4">For Readers & Investors</div>
            <h2 className="font-serif font-medium text-foreground tracking-tight leading-[1.1] mb-5" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}>
              Follow researchers who are actually right.
            </h2>
            <p className="text-[16px] text-muted-foreground leading-relaxed mb-8">
              Every prediction is locked with a timestamp before the move happens. No retroactive analysis. No cherry-picking. You see the full record — wins, losses, and everything in between.
            </p>
            <div className="flex flex-col gap-4 mb-9">
              {[
                [Eye, "See exactly how each researcher has performed across all calls"],
                [Bell, "Get notified when followed researchers publish new research"],
                [Star, "Subscribe to premium content from top-performing researchers"],
                [Globe, "Browse 100+ researchers across tech, macro, energy, crypto"],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-tag bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[15px] text-muted-foreground leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
            <button onClick={primaryAction} className="cta-gold inline-flex items-center gap-2 text-base font-medium px-8 py-3.5" style={{ borderRadius: 6 }}>
              Browse Researchers <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mock prediction card */}
          <div className="relative">
            <div className="surface-premium p-7">
              <div className="eyebrow mb-4">Locked Prediction — Jan 15, 2025 · 09:32 AM</div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[13px] font-medium">JM</div>
                <div>
                  <div className="font-serif text-[14px] text-foreground">James Mercer</div>
                  <div className="text-[11px] text-muted-foreground"><span className="font-display">91%</span> accuracy · <span className="font-display">24</span> calls</div>
                </div>
                <div className="pill-gain ml-auto">LONG NVDA</div>
              </div>
              <div className="rounded-tag bg-background/40 border border-border/60 px-4 py-4 mb-4">
                <p className="text-[14px] text-muted-foreground leading-relaxed m-0 font-serif italic">
                  "AI infrastructure buildout accelerating into Q2. Data center capex from hyperscalers up 40% YoY. NVDA's H100 backlog extends 12 months — pricing power intact."
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {[["Entry", "$485.00"], ["Target", "$620.00"], ["Stop", "$440.00"]].map(([l, v]) => (
                  <div key={l} className="text-center px-2 py-2.5 rounded-tag bg-background/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground mb-1">{l}</div>
                    <div className="text-sm font-medium font-display text-foreground">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 rounded-tag bg-gain/10 border border-gain/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gain" />
                  <span className="text-[13px] font-medium text-gain">Resolved — Target Hit</span>
                </div>
                <span className="text-base font-medium font-display text-gain">+27.8%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section id="compare" className="bg-secondary/30 border-y border-border py-24 px-6">
        <div className="max-w-[860px] mx-auto">
          <div className="text-center mb-14">
            <div className="eyebrow text-accent mb-4">Why STOA</div>
            <h2 className="font-serif font-medium text-foreground tracking-tight" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}>
              Built for finance.<br />Not adapted for it.
            </h2>
          </div>

          {/* Table */}
          <div className="surface overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-secondary/40 border-b border-border/60">
              <div className="px-6 py-4 text-[13px] font-medium text-muted-foreground">Feature</div>
              {[
                { name: "STOA", highlight: true },
                { name: "Substack", highlight: false },
                { name: "Seeking Alpha", highlight: false },
              ].map(col => (
                <div key={col.name} className={`px-4 py-4 text-center text-[13px] font-medium ${col.highlight ? "text-primary" : "text-muted-foreground"}`}>
                  {col.name}
                  {col.highlight && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                </div>
              ))}
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-[2fr_1fr_1fr_1fr] ${i < COMPARISON.length - 1 ? "border-b border-border/40" : ""} ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                <div className="px-6 py-3.5 text-sm text-foreground">{row.feature}</div>
                {[row.stoa, row.substack, row.seekingAlpha].map((has, ci) => (
                  <div key={ci} className="flex justify-center items-center px-4 py-3.5">
                    {has
                      ? <CheckCircle className={`w-[18px] h-[18px] ${ci === 0 ? "text-gain" : "text-muted-foreground"}`} />
                      : <div className="w-4 h-0.5 bg-border rounded-tag" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="max-w-[1100px] mx-auto py-24 px-6">
        <div className="text-center mb-14">
          <div className="eyebrow text-accent mb-4">Pricing</div>
          <h2 className="font-serif font-medium text-foreground tracking-tight" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}>
            Start free. Earn when you grow.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              name: "Reader", price: "Free", sub: "Forever",
              highlight: false,
              features: ["Follow any researcher", "Read all free research", "Prediction feed access", "Leaderboard & rankings", "Market ticker & data"],
            },
            {
              name: "Researcher", price: "Free", sub: "To publish",
              highlight: true,
              badge: "Most Popular",
              features: ["Publish unlimited reports", "Lock & track predictions", "Professional editor + AI", "Accuracy score dashboard", "Free subscriber following", "Subscribe button on profile"],
            },
            {
              name: "Premium Researcher", price: "10%", sub: "Platform fee on revenue",
              highlight: false,
              features: ["Everything in Researcher", "Paid subscription tiers", "Premium report gating", "Subscriber analytics", "Revenue dashboard & wallet", "Priority support"],
            },
          ].map(plan => (
            <div key={plan.name} className={`${plan.highlight ? "surface-premium" : "surface"} p-7 relative`}>
              {plan.badge && (
                <span className="badge-founding absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <div className={`text-[13px] font-medium uppercase tracking-widest mb-3.5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`}>{plan.name}</div>
              <div className="font-serif font-medium text-foreground tracking-tight mb-1" style={{ fontSize: "clamp(32px,5vw,48px)", letterSpacing: "-0.025em" }}>{plan.price}</div>
              <div className="text-[13px] text-muted-foreground mb-7">{plan.sub}</div>
              <div className="flex flex-col gap-3 mb-8">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle className={`w-[15px] h-[15px] shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} /> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={primaryAction}
                className={`w-full py-3 font-medium text-sm transition-colors ${
                  plan.highlight ? "cta-gold" : "border border-border text-foreground hover:bg-secondary/40"
                }`}
                style={{ borderRadius: 6 }}
              >
                Get Started Free
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-secondary/30 border-t border-border py-24 px-6">
        <div className="max-w-[920px] mx-auto">
          <div className="text-center mb-16">
            <div className="eyebrow text-primary mb-4">How It Works</div>
            <h2 className="font-serif font-medium text-foreground tracking-tight" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}>
              From insight to income in minutes.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-8 left-[33.33%] right-[33.33%] h-px bg-border z-0" />
            {[
              { step: "01", Icon: PenLine,    title: "Write & Publish",       desc: "Use the professional editor to craft your research. Add stock charts, metrics blocks, and a bull/bear thesis with our dedicated finance blocks." },
              { step: "02", Icon: Lock,       title: "Lock Your Prediction",  desc: "Attach a price target before you publish. It's timestamped, immutable, and tracked by the platform — no editing after the fact." },
              { step: "03", Icon: DollarSign, title: "Build & Monetize",      desc: "As your accuracy score climbs, subscribers follow. Set subscription tiers, gate premium reports, and keep 90% of everything you earn." },
            ].map(({ step, Icon, title, desc }) => (
              <div key={step} className="text-center relative z-[1]">
                <div className="w-16 h-16 rounded-full mx-auto mb-6 surface flex items-center justify-center">
                  <Icon className="w-[26px] h-[26px] text-primary" />
                </div>
                <div className="text-[11px] font-medium text-primary tracking-widest mb-3 font-display">STEP {step}</div>
                <h3 className="font-serif font-medium text-[18px] text-foreground mb-3">{title}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6 text-center relative overflow-hidden ambient-section">
        <div className="relative z-[1] max-w-[680px] mx-auto">
          <h2 className="font-serif font-medium text-foreground tracking-tight mb-5 leading-[1.1]" style={{ fontSize: "clamp(32px, 5vw, 60px)", letterSpacing: "-0.025em" }}>
            Your track record<br />
            <span className="text-accent">is the product.</span>
          </h2>
          <p className="text-[18px] text-muted-foreground mb-11 leading-relaxed">
            Stop posting alpha for free on Twitter. Publish on a platform that proves your edge, builds your audience, and pays you for being right.
          </p>
          <div className="flex gap-3.5 justify-center flex-wrap">
            <button onClick={primaryAction} className="cta-gold inline-flex items-center gap-2 text-[17px] font-medium px-10 py-4" style={{ borderRadius: 6 }}>
              Start Publishing Free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={primaryAction} className="inline-flex items-center gap-2 text-[17px] font-medium px-10 py-4 rounded-sm border border-border text-foreground hover:bg-secondary/40 transition-colors" style={{ borderRadius: 6 }}>
              Browse Research
            </button>
          </div>
          <p className="mt-6 text-[13px] text-muted-foreground">
            No credit card required · Free forever for readers & researchers
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-15 px-6" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-[18px] h-[18px] text-accent" />
                <span className="font-serif font-medium text-lg text-foreground tracking-tight" style={{ letterSpacing: "4px" }}>STOA</span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[280px]">
                The research platform where financial researchers build verifiable track records and monetize their expertise.
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-4 leading-relaxed">
                Not financial advice. All predictions are user-generated content. Past performance does not guarantee future results.
              </p>
            </div>
            {[
              { title: "Platform",  links: [["Feed", "/feed"], ["Leaderboard", "/leaderboard"], ["Markets", "/stocks"], ["Pricing", "#pricing"]] },
              { title: "Creators",  links: [["Start Writing", "/editor"], ["Dashboard", "/dashboard"], ["Scoring", "/scoring"], ["Analytics", "/analytics"]] },
              { title: "Company",   links: [["About", "/about"], ["How It Works", "/how-it-works"], ["Features", "/features"], ["Terms", "/terms"]] },
            ].map(col => (
              <div key={col.title}>
                <div className="eyebrow mb-4">{col.title}</div>
                <div className="flex flex-col gap-2.5">
                  {col.links.map(([label, href]) => (
                    <a key={label} href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 pt-6 flex justify-between items-center flex-wrap gap-3">
            <span className="text-xs text-muted-foreground">© 2026 STOA Research. All rights reserved.</span>
            <span className="text-xs text-muted-foreground">Made for researchers, by researchers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
