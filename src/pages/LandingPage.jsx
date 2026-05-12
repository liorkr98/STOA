import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, TrendingUp, TrendingDown, ArrowRight, Lock,
  Shield, CheckCircle, Star, Users, DollarSign, Zap,
  BarChart3, PenLine, Target, Award, ChevronRight,
  Layers, Eye, Bell, Globe, MessageSquare
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const go = () => base44.auth.redirectToLogin("/");

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
  return (
    <div style={{
      flexShrink: 0, width: 280, background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14,
      padding: "16px 18px", cursor: "default",
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          color: "#6b7280", background: "rgba(255,255,255,0.05)",
          padding: "3px 8px", borderRadius: 4,
        }}>{r.sector}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
          padding: "3px 10px", borderRadius: 20,
          background: isLong ? "rgba(34,197,94,0.12)" : isShort ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)",
          color: isLong ? "#22c55e" : isShort ? "#ef4444" : "#f59e0b",
          border: `1px solid ${isLong ? "rgba(34,197,94,0.2)" : isShort ? "rgba(239,68,68,0.2)" : "rgba(251,191,36,0.2)"}`,
        }}>
          {r.action} {r.ticker}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.45, marginBottom: 14, minHeight: 38 }}>
        {r.title}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "linear-gradient(135deg, #1e3a6e, #2d5ba3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#fff",
          }}>
            {r.analyst.split(" ").map(n => n[0]).join("")}
          </div>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{r.analyst}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#22c55e" }}>{r.change}</span>
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
  { feature: "Keep 85%+ of revenue", stoa: true, substack: true, seekingAlpha: false },
  { feature: "Stock chart embeds", stoa: true, substack: false, seekingAlpha: false },
  { feature: "Metrics & thesis blocks", stoa: true, substack: false, seekingAlpha: false },
  { feature: "No follower count required", stoa: true, substack: false, seekingAlpha: false },
];

// ── Top analyst mocks ────────────────────────────────────────────────────────
const MOCK_ANALYSTS = [
  { name: "James Mercer", handle: "jmercer", initials: "JM", grad: ["#1e3a6e","#2d5ba3"], accuracy: 91, calls: 24, subscribers: "1.8K", sector: "Technology", badge: "Top Analyst", revenue: "$4,200/mo" },
  { name: "Sarah Chen", handle: "schen", initials: "SC", grad: ["#1e3a6e","#c99613"], accuracy: 88, calls: 31, subscribers: "3.1K", sector: "Macro / Rates", badge: "Macro Expert", revenue: "$7,800/mo" },
  { name: "Priya Nair", handle: "pnair", initials: "PN", grad: ["#c99613","#a07710"], accuracy: 85, calls: 18, subscribers: "940", sector: "Energy & Commodities", badge: "Rising Star", revenue: "$2,100/mo" },
];

// ── CSS animations (injected once) ──────────────────────────────────────────
const STYLES = `
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes marqueeRev {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse2 {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .marquee-track { display: flex; gap: 16px; animation: marquee 44s linear infinite; width: max-content; }
  .marquee-track-rev { display: flex; gap: 16px; animation: marqueeRev 48s linear infinite; width: max-content; }
  .marquee-wrap:hover .marquee-track,
  .marquee-wrap:hover .marquee-track-rev { animation-play-state: paused; }
  .landing-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: #c99613; color: #fff; font-weight: 700; font-size: 15px;
    padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer;
    transition: all 0.2s; box-shadow: 0 4px 24px rgba(201,150,19,0.35);
    text-decoration: none;
  }
  .landing-btn-primary:hover { background: #a07710; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(201,150,19,0.45); }
  .landing-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; color: #e2e8f0; font-weight: 600; font-size: 15px;
    padding: 13px 28px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer;
    transition: all 0.2s; text-decoration: none;
  }
  .landing-btn-ghost:hover { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.04); }
  .feature-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px; padding: 28px; transition: border-color 0.2s, background 0.2s;
  }
  .feature-card:hover { border-color: rgba(201,150,19,0.3); background: rgba(30,58,110,0.06); }
  .analyst-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px; padding: 32px 28px; transition: all 0.25s; flex: 1;
  }
  .analyst-card:hover { border-color: rgba(201,150,19,0.3); transform: translateY(-4px); background: rgba(255,255,255,0.05); }
  .nav-link { font-size: 14px; color: #9ca3af; text-decoration: none; transition: color 0.2s; font-weight: 500; }
  .nav-link:hover { color: #f9fafb; }
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

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enterPlatform = () => {
    localStorage.setItem("stoa_last_landing_visit", Date.now().toString());
    navigate("/feed");
  };

  const primaryAction = user ? enterPlatform : go;
  const primaryLabel  = user ? "Go to Feed" : "Start Publishing Free";

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#080d1a", color: "#f9fafb", overflowX: "hidden" }}>
      <style>{STYLES}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(8,13,26,0.97)" : "rgba(8,13,26,0.6)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <BarChart2 size={22} color="#c99613" />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.04em" }}>STOA</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#c99613", background: "rgba(201,150,19,0.15)", padding: "2px 7px", borderRadius: 4, letterSpacing: "0.06em", marginLeft: 4 }}>BETA</span>
          </div>

          <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
            {[["Platform", "#platform"], ["For Analysts", "#for-analysts"], ["Compare", "#compare"], ["Pricing", "#pricing"]].map(([l, h]) => (
              <a key={l} href={h} className="nav-link">{l}</a>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user ? (
              <button onClick={enterPlatform} className="landing-btn-primary" style={{ fontSize: 14, padding: "9px 20px" }}>
                Open Platform <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button onClick={go} style={{ fontSize: 14, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "8px 16px", transition: "color 0.2s", fontWeight: 500 }}
                  onMouseEnter={e => e.target.style.color = "#f9fafb"}
                  onMouseLeave={e => e.target.style.color = "#9ca3af"}>
                  Log In
                </button>
                <button onClick={go} className="landing-btn-primary" style={{ fontSize: 14, padding: "9px 20px" }}>
                  Get Started Free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "120px 24px 0", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: "8%", left: "12%", width: 600, height: 600, background: "rgba(30,58,110,0.18)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "8%", width: 400, height: 400, background: "rgba(201,150,19,0.08)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "30%", width: 500, height: 300, background: "rgba(30,58,110,0.10)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", animation: "fadeUp 0.7s ease both" }}>
          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 100, padding: "7px 18px", marginBottom: 36, fontSize: 12,
            color: "#6ee7b7", fontWeight: 600, letterSpacing: "0.04em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse2 2s infinite" }} />
            Live · Predictions Tracked in Real Time
          </div>

          <h1 style={{
            fontSize: "clamp(38px, 6.5vw, 76px)", fontWeight: 800,
            color: "#f9fafb", lineHeight: 1.08, marginBottom: 28,
            letterSpacing: "-0.04em",
          }}>
            Where Financial Analysts<br />
            <span style={{ background: "linear-gradient(92deg, #c99613 0%, #f0c040 50%, #c99613 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Build Their Reputation
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#9ca3af", maxWidth: 620, margin: "0 auto 44px", lineHeight: 1.7, fontWeight: 400 }}>
            Publish research. Lock price targets publicly. Let the market grade your calls — automatically. The first platform where your track record is the product.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <button onClick={primaryAction} className="landing-btn-primary" style={{ fontSize: 16, padding: "15px 34px" }}>
              {primaryLabel} <ArrowRight size={18} />
            </button>
            <button onClick={user ? enterPlatform : go} className="landing-btn-ghost" style={{ fontSize: 16, padding: "15px 34px" }}>
              Browse Top Analysts
            </button>
          </div>

          {/* Trust strip */}
          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              [Lock, "Predictions locked on publish"],
              [Shield, "Track records auto-verified"],
              [DollarSign, "Analysts keep 85% of revenue"],
            ].map(([Icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280" }}>
                <Icon size={14} color="#4b5563" /> {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrolling report marquee ── */}
        <div style={{ width: "100%", marginTop: 72, paddingBottom: 80, position: "relative", zIndex: 1 }} id="platform">
          {/* Fade edges */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 160, background: "linear-gradient(to right, #080d1a, transparent)", zIndex: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 160, background: "linear-gradient(to left, #080d1a, transparent)", zIndex: 2, pointerEvents: "none" }} />

          <div className="marquee-wrap" style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
            <div className="marquee-track">
              {ROW1.map((r, i) => <ReportCard key={i} r={r} />)}
            </div>
            <div className="marquee-track-rev">
              {ROW2.map((r, i) => <ReportCard key={i} r={r} />)}
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#374151", marginTop: 20, letterSpacing: "0.05em" }}>
            HOVER TO PAUSE · REPRESENTATIVE CONTENT
          </p>
        </div>
      </section>

      {/* ── METRICS BAR ── */}
      <div style={{ background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, textAlign: "center" }}>
          {[
            { value: 2400, suffix: "+", label: "Reports Published", color: "#3b82f6" },
            { value: 89, suffix: "%", prefix: "↑ ", label: "Avg Winning Accuracy", color: "#22c55e" },
            { value: 140, suffix: "K+", label: "Monthly Readers", color: "#8b5cf6" },
            { value: 320, suffix: "K", prefix: "$", label: "Paid to Analysts", color: "#f59e0b" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "0 24px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, color: s.color, marginBottom: 8, letterSpacing: "-0.03em" }}>
                <Counter to={s.value} suffix={s.suffix} prefix={s.prefix || ""} />
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOR ANALYSTS ── */}
      <section id="for-analysts" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#3b82f6", textTransform: "uppercase", marginBottom: 16 }}>For Financial Content Creators</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.03em", marginBottom: 16 }}>
            Everything you need.<br />Nothing you don't.
          </h2>
          <p style={{ fontSize: 17, color: "#6b7280", maxWidth: 560, margin: "0 auto" }}>
            Built by people who understand financial research — not a generic creator tool retrofitted for finance.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="grid-responsive">
          {[
            {
              Icon: Lock, color: "#3b82f6", title: "Lock Predictions Publicly",
              desc: "Timestamp your price targets on publish. No editing after the fact. Your calls stand or fall on record — that's what builds real credibility.",
            },
            {
              Icon: Award, color: "#22c55e", title: "Auto-Verified Track Record",
              desc: "Your accuracy score updates automatically as predictions resolve. No self-reporting. Readers see exactly how you've performed across every call.",
            },
            {
              Icon: DollarSign, color: "#f59e0b", title: "Keep 85% of Revenue",
              desc: "Set your own subscription price. Set premium reports. We take 15% — Seeking Alpha takes 50%+. Your audience, your pricing, your income.",
            },
            {
              Icon: PenLine, color: "#8b5cf6", title: "Professional Research Editor",
              desc: "Metrics blocks, bull/bear thesis cards, live stock chart embeds, columnar layouts. Built for financial analysts — not bloggers.",
            },
            {
              Icon: Zap, color: "#06b6d4", title: "AI Research Assistant",
              desc: "A market expert AI that knows fundamentals, technicals, and macro. Ask questions, drag answers into your report. Your research copilot.",
            },
            {
              Icon: BarChart3, color: "#f43f5e", title: "Deep Analytics Dashboard",
              desc: "See who reads your reports, where they came from, which predictions drive subscriptions. Know what content your audience actually wants.",
            },
          ].map(({ Icon, color, title, desc }) => (
            <div key={title} className="feature-card">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOP ANALYSTS SPOTLIGHT ── */}
      <section style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16 }}>Analyst Spotlight</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.03em", marginBottom: 14 }}>
              No followers required.<br />Just results.
            </h2>
            <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 520, margin: "0 auto" }}>
              On STOA, your accuracy score is your credential. New analysts with a 90% track record outrank veterans with 10,000 followers.
            </p>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {MOCK_ANALYSTS.map((a) => (
              <div key={a.name} className="analyst-card">
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${a.grad[0]}, ${a.grad[1]})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>{a.initials}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{a.sector}</div>
                  </div>
                  <div style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                    color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                    padding: "3px 9px", borderRadius: 6, flexShrink: 0,
                  }}>{a.badge}</div>
                </div>

                {/* Accuracy big number */}
                <div style={{ marginBottom: 24, padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#22c55e", lineHeight: 1, letterSpacing: "-0.04em" }}>{a.accuracy}%</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Prediction Accuracy</div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Calls", val: a.calls },
                    { label: "Subscribers", val: a.subscribers },
                    { label: "Revenue", val: a.revenue },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <button onClick={primaryAction} style={{
                  width: "100%", padding: "11px", borderRadius: 10,
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                  color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)"; }}>
                  Follow Analyst <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button onClick={primaryAction} className="landing-btn-ghost">
              View Full Leaderboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOR READERS ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#22c55e", textTransform: "uppercase", marginBottom: 16 }}>For Readers & Investors</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
              Follow analysts who are actually right.
            </h2>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, marginBottom: 32 }}>
              Every prediction is locked with a timestamp before the move happens. No retroactive analysis. No cherry-picking. You see the full record — wins, losses, and everything in between.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 36 }}>
              {[
                [Eye, "See exactly how each analyst has performed across all calls"],
                [Bell, "Get notified when followed analysts publish new research"],
                [Star, "Subscribe to premium content from top-performing analysts"],
                [Globe, "Browse 100+ analysts across tech, macro, energy, crypto"],
              ].map(([Icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Icon size={16} color="#22c55e" />
                  </div>
                  <span style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.55 }}>{text}</span>
                </div>
              ))}
            </div>
            <button onClick={primaryAction} className="landing-btn-primary">
              Browse Analysts <ArrowRight size={16} />
            </button>
          </div>

          {/* Mock prediction card */}
          <div style={{ position: "relative" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: 28, position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#6b7280", textTransform: "uppercase", marginBottom: 16 }}>Locked Prediction — Jan 15, 2025 · 09:32 AM</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a6e, #2d5ba3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>JM</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>James Mercer</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>91% accuracy · 24 calls</div>
                </div>
                <div style={{ marginLeft: "auto", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 800, color: "#22c55e" }}>LONG NVDA</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                  "AI infrastructure buildout accelerating into Q2. Data center capex from hyperscalers up 40% YoY. NVDA's H100 backlog extends 12 months — pricing power intact."
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[["Entry", "$485.00"], ["Target", "$620.00"], ["Stop", "$440.00"]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(34,197,94,0.08)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={16} color="#22c55e" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Resolved — Target Hit</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>+27.8%</span>
              </div>
            </div>
            {/* Second card peeking behind */}
            <div style={{ position: "absolute", bottom: -16, left: 16, right: -16, height: 80, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, zIndex: -1 }} />
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section id="compare" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "100px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#f43f5e", textTransform: "uppercase", marginBottom: 16 }}>Why STOA</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.03em" }}>
              Built for finance.<br />Not adapted for it.
            </h2>
          </div>

          {/* Table */}
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ padding: "18px 24px", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Feature</div>
              {[
                { name: "STOA", highlight: true },
                { name: "Substack", highlight: false },
                { name: "Seeking Alpha", highlight: false },
              ].map(col => (
                <div key={col.name} style={{ padding: "18px 16px", textAlign: "center", fontSize: 13, fontWeight: 800, color: col.highlight ? "#60a5fa" : "#6b7280" }}>
                  {col.name}
                  {col.highlight && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", margin: "4px auto 0" }} />}
                </div>
              ))}
            </div>
            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div key={row.feature} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                borderBottom: i < COMPARISON.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}>
                <div style={{ padding: "14px 24px", fontSize: 14, color: "#9ca3af" }}>{row.feature}</div>
                {[row.stoa, row.substack, row.seekingAlpha].map((has, ci) => (
                  <div key={ci} style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "14px 16px" }}>
                    {has
                      ? <CheckCircle size={18} color={ci === 0 ? "#22c55e" : "#4b5563"} />
                      : <div style={{ width: 16, height: 2, background: "#1f2937", borderRadius: 1 }} />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.03em" }}>
            Start free. Earn when you grow.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            {
              name: "Reader", price: "Free", sub: "Forever",
              color: "#6b7280", highlight: false,
              features: ["Follow any analyst", "Read all free research", "Prediction feed access", "Leaderboard & rankings", "Market ticker & data"],
            },
            {
              name: "Analyst", price: "Free", sub: "To publish",
              color: "#3b82f6", highlight: true,
              badge: "Most Popular",
              features: ["Publish unlimited reports", "Lock & track predictions", "Professional editor + AI", "Accuracy score dashboard", "Free subscriber following", "Subscribe button on profile"],
            },
            {
              name: "Premium Analyst", price: "15%", sub: "Platform fee on revenue",
              color: "#8b5cf6", highlight: false,
              features: ["Everything in Analyst", "Paid subscription tiers", "Premium report gating", "Subscriber analytics", "Revenue dashboard & wallet", "Priority support"],
            },
          ].map(plan => (
            <div key={plan.name} style={{
              background: plan.highlight ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.025)",
              border: `1px solid ${plan.highlight ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 20, padding: "32px 28px", position: "relative",
              boxShadow: plan.highlight ? "0 0 60px rgba(59,130,246,0.12)" : "none",
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 20, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: plan.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>{plan.name}</div>
              <div style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.04em", marginBottom: 4 }}>{plan.price}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>{plan.sub}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#9ca3af" }}>
                    <CheckCircle size={15} color={plan.color} /> {f}
                  </div>
                ))}
              </div>
              <button onClick={primaryAction} style={{
                width: "100%", padding: "12px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14,
                background: plan.highlight ? "#3b82f6" : "transparent",
                color: plan.highlight ? "#fff" : plan.color,
                border: `1px solid ${plan.highlight ? "#3b82f6" : `rgba(${plan.color === "#8b5cf6" ? "139,92,246" : "107,114,128"},0.3)`}`,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                Get Started Free
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "100px 24px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#06b6d4", textTransform: "uppercase", marginBottom: 16 }}>How It Works</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.03em" }}>
              From insight to income in minutes.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, position: "relative" }}>
            {/* Connector lines */}
            <div style={{ position: "absolute", top: 32, left: "33.33%", right: "33.33%", height: 1, background: "rgba(255,255,255,0.08)", zIndex: 0 }} />
            {[
              { step: "01", Icon: PenLine, color: "#3b82f6", title: "Write & Publish", desc: "Use the professional editor to craft your research. Add stock charts, metrics blocks, and a bull/bear thesis with our dedicated finance blocks." },
              { step: "02", Icon: Lock, color: "#8b5cf6", title: "Lock Your Prediction", desc: "Attach a price target before you publish. It's timestamped, immutable, and tracked by the platform — no editing after the fact." },
              { step: "03", Icon: DollarSign, color: "#22c55e", title: "Build & Monetize", desc: "As your accuracy score climbs, subscribers follow. Set subscription tiers, gate premium reports, and keep 85% of everything you earn." },
            ].map(({ step, Icon, color, title, desc }) => (
              <div key={step} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", margin: "0 auto 24px",
                  background: `linear-gradient(135deg, ${color}22, ${color}08)`,
                  border: `1px solid ${color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={26} color={color} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: color, letterSpacing: "0.1em", marginBottom: 12 }}>STEP {step}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "120px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", left: "20%", width: 600, height: 400, background: "rgba(30,58,110,0.15)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 400, height: 300, background: "rgba(201,150,19,0.07)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.04em", marginBottom: 20, lineHeight: 1.1 }}>
            Your track record<br />
            <span style={{ background: "linear-gradient(92deg, #c99613, #f0c040)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              is the product.
            </span>
          </h2>
          <p style={{ fontSize: 18, color: "#6b7280", marginBottom: 44, lineHeight: 1.6 }}>
            Stop posting alpha for free on Twitter. Publish on a platform that proves your edge, builds your audience, and pays you for being right.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={primaryAction} className="landing-btn-primary" style={{ fontSize: 17, padding: "16px 38px" }}>
              Start Publishing Free <ArrowRight size={20} />
            </button>
            <button onClick={primaryAction} className="landing-btn-ghost" style={{ fontSize: 17, padding: "16px 38px" }}>
              Browse Research
            </button>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: "#374151" }}>
            No credit card required · Free forever for readers & analysts
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "60px 24px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <BarChart2 size={18} color="#3b82f6" />
                <span style={{ fontSize: 18, fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.04em" }}>STOA</span>
              </div>
              <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.65, maxWidth: 280 }}>
                The research platform where financial analysts build verifiable track records and monetize their expertise.
              </p>
              <p style={{ fontSize: 11, color: "#374151", marginTop: 16, lineHeight: 1.6 }}>
                Not financial advice. All predictions are user-generated content. Past performance does not guarantee future results.
              </p>
            </div>
            {[
              { title: "Platform", links: [["Feed", "/feed"], ["Leaderboard", "/leaderboard"], ["Markets", "/stocks"], ["Pricing", "#pricing"]] },
              { title: "Creators", links: [["Start Writing", "/editor"], ["Dashboard", "/dashboard"], ["Scoring", "/scoring"], ["Analytics", "/analytics"]] },
              { title: "Company", links: [["About", "/about"], ["How It Works", "/how-it-works"], ["Features", "/features"], ["Terms", "/terms"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#6b7280", textTransform: "uppercase", marginBottom: 16 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([label, href]) => (
                    <a key={label} href={href} style={{ fontSize: 14, color: "#4b5563", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => e.target.style.color = "#9ca3af"}
                      onMouseLeave={e => e.target.style.color = "#4b5563"}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>© 2026 STOA Research. All rights reserved.</span>
            <span style={{ fontSize: 12, color: "#374151" }}>Made for analysts, by analysts.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
