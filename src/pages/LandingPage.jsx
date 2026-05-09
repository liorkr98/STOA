import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setMeta, injectJsonLd } from "@/lib/seo";
import { BarChart2, TrendingUp, TrendingDown, Check, ArrowRight, ChevronDown, Shield, Bell, Lock, Star, Zap, Users, Target, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const go = () => base44.auth.redirectToLogin("/");

// ── Navbar ──────────────────────────────────────────────────────────────────
function Navbar({ scrolled, isAuthenticated }) {
  const navigate = useNavigate();
  const enterPlatform = () => {
    localStorage.setItem('stoa_last_landing_visit', Date.now().toString());
    navigate('/feed');
  };
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(10,15,30,0.95)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={20} color="#3b82f6" />
          <span style={{ fontSize: 20, fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.02em" }}>STOA</span>
        </div>
        {/* Center links */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }} className="hidden md:flex">
          {[["Features", "#features"], ["How It Works", "#how"], ["For Analysts", "#analysts"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 14, color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#f9fafb"}
              onMouseLeave={e => e.target.style.color = "#9ca3af"}>
              {label}
            </a>
          ))}
        </div>
        {/* Right CTAs */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isAuthenticated ? (
            <button onClick={enterPlatform} style={{
              fontSize: 14, fontWeight: 700, color: "#fff", background: "#22c55e",
              border: "none", cursor: "pointer", padding: "9px 20px", borderRadius: 8,
              transition: "background 0.2s",
            }}
              onMouseEnter={e => e.target.style.background = "#16a34a"}
              onMouseLeave={e => e.target.style.background = "#22c55e"}>
              Go to Feed →
            </button>
          ) : (
            <>
              <button onClick={go} style={{ fontSize: 14, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "8px 16px", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#f9fafb"}
                onMouseLeave={e => e.target.style.color = "#9ca3af"}>
                Log In
              </button>
              <button onClick={go} style={{
                fontSize: 14, fontWeight: 700, color: "#fff", background: "#3b82f6",
                border: "none", cursor: "pointer", padding: "9px 20px", borderRadius: 8,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.target.style.background = "#2563eb"}
                onMouseLeave={e => e.target.style.background = "#3b82f6"}>
                Get Started Free
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────
function Hero({ isAuthenticated }) {
  const navigate = useNavigate();

  const enterPlatform = () => {
    localStorage.setItem('stoa_last_landing_visit', Date.now().toString());
    navigate('/feed');
  };

  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)",
      padding: "80px 24px 60px", textAlign: "center", position: "relative",
    }}>
      {/* Glow blobs */}
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, background: "rgba(59,130,246,0.06)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 400, height: 400, background: "rgba(34,197,94,0.04)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto" }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 100, padding: "6px 16px", marginBottom: 32, fontSize: 13, color: "#9ca3af",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
          🔴 Live Platform — Tracking 6+ Active Predictions
        </div>

        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, color: "#f9fafb", lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.03em" }}>
          The Research Platform Where
          <br />
          <span style={{ background: "linear-gradient(90deg, #3b82f6, #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Analysts Prove Their Edge
          </span>
        </h1>

        <p style={{ fontSize: 18, color: "#9ca3af", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Follow verified analysts. Track every prediction from lock to resolution. Subscribe to premium research from the best performers — every call is timestamped and publicly accountable.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
          {isAuthenticated ? (
            <button onClick={enterPlatform} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 16,
              padding: "14px 32px", borderRadius: 10, border: "none", cursor: "pointer",
              transition: "all 0.2s", boxShadow: "0 4px 24px rgba(34,197,94,0.35)",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#22c55e"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Enter Platform <ArrowRight size={18} />
            </button>
          ) : (
            <button onClick={go} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 16,
              padding: "14px 32px", borderRadius: 10, border: "none", cursor: "pointer",
              transition: "all 0.2s", boxShadow: "0 4px 24px rgba(59,130,246,0.35)",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#3b82f6"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Get Started Free <ArrowRight size={18} />
            </button>
          )}
          <button onClick={isAuthenticated ? enterPlatform : go} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", color: "#f9fafb", fontWeight: 600, fontSize: 16,
            padding: "14px 32px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}>
            {isAuthenticated ? "Go to My Feed →" : "View Top Analysts"}
          </button>
        </div>

        {/* Trust line */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", color: "#6b7280", fontSize: 13 }}>
          <span>🔒 Not Financial Advice</span>
          <span>📊 All Predictions Locked</span>
          <span>✅ Track Records Verified</span>
        </div>
      </div>

      {/* Scroll teaser */}
      <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#4b5563", fontSize: 12 }}>
        <span>See how it works</span>
        <ChevronDown size={16} style={{ animation: "bounce 2s infinite" }} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
      `}</style>
    </section>
  );
}

// ── Stats Bar ───────────────────────────────────────────────────────────────
function StatsBar({ liveStats }) {
  const items = [
    { val: liveStats?.activeCalls ?? "6+", label: "Active Calls", color: "#3b82f6" },
    { val: liveStats?.topAccuracy ? `${liveStats.topAccuracy}%` : "100%", label: "Top Accuracy", color: "#22c55e" },
    { val: liveStats?.avgYield != null ? `+${liveStats.avgYield.toFixed(2)}%` : "+4.59%", label: "Avg Yield", color: "#22c55e" },
    { val: liveStats?.analysts ?? "2", label: "Verified Analysts", color: "#f59e0b" },
  ];
  return (
    <div style={{ background: "#111827", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, textAlign: "center" }}>
        {items.map((item, i) => (
          <div key={i}>
            <div style={{ fontSize: 36, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.val}</div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── For Investors ────────────────────────────────────────────────────────────
function ForInvestors() {
  return (
    <section id="features" style={{ padding: "96px 24px", background: "#0a0f1e" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        {/* Left */}
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, display: "block" }}>FOR INVESTORS</span>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#f9fafb", lineHeight: 1.2, marginBottom: 28, letterSpacing: "-0.02em" }}>
            Stop Guessing. Follow Analysts Who Prove Their Track Record.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { icon: "📈", title: "Every prediction locked", desc: "Price, target, and timestamp — no retroactive edits, ever." },
              { icon: "🏆", title: "Accuracy scores auto-updated", desc: "After each resolved call, scores update algorithmically. No self-reporting." },
              { icon: "🔔", title: "Get notified instantly", desc: "Get alerted when your analyst publishes new research or locks a prediction." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#f9fafb", marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mockup cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Analyst profile card */}
          <div style={{ background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>B</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f9fafb" }}>Bar Amsalem</div>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⭐ ELITE</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["100.0%", "Accuracy"], ["+28.1%", "Yield"], ["5 calls", "Resolved"]].map(([val, lbl]) => (
                <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>{val}</div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{lbl}</div>
                </div>
              ))}
            </div>
            <button style={{ width: "100%", background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer" }}>Subscribe</button>
          </div>
          {/* Sample prediction card */}
          <div style={{ background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "6px 12px", marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
              📈 Long $NVDA → $273
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f9fafb", marginBottom: 6 }}>"Nvidia's AI Moat Widens..."</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>+28.1% target</span>
              <span style={{ fontSize: 11, background: "rgba(34,197,94,0.1)", color: "#22c55e", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>🟢 PENDING</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how" style={{ padding: "96px 24px", background: "#0d1422", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#f9fafb", marginBottom: 12 }}>How It Works</h2>
          <p style={{ fontSize: 16, color: "#9ca3af" }}>Three steps to smarter investing.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { num: "1", icon: Target, title: "Discover", color: "#3b82f6", desc: "Browse the leaderboard. Find analysts with verified track records. Filter by accuracy, yield, and sector." },
            { num: "2", icon: Star, title: "Follow & Subscribe", color: "#f59e0b", desc: "Follow analysts for free to see public research. Subscribe to unlock premium calls, price targets, and locked predictions." },
            { num: "3", icon: BarChart2, title: "Track Performance", color: "#22c55e", desc: "Every call is automatically tracked. See real-time P&L on open positions. Get notified when predictions resolve." },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} style={{ background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 16, right: 16, fontSize: 64, fontWeight: 900, color: "rgba(255,255,255,0.03)", lineHeight: 1 }}>{step.num}</div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${step.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={20} color={step.color} />
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: step.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{step.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── For Analysts ─────────────────────────────────────────────────────────────
function ForAnalysts() {
  return (
    <section id="analysts" style={{ padding: "96px 24px", background: "#0a0f1e" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: "linear-gradient(135deg, #111827, #1a2234)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "56px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, display: "block" }}>FOR ANALYSTS</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 800, color: "#f9fafb", lineHeight: 1.2, marginBottom: 28 }}>
              Publish Research. Build an Audience. Earn Revenue.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 32 }}>
              {[
                { icon: "🔐", text: "Lock predictions publicly — your calls are timestamped and immutable" },
                { icon: "📊", text: "Automated track record — STOA calculates your accuracy and yield automatically" },
                { icon: "💰", text: "Set your own price — you decide what to charge. STOA takes only 15%." },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                  <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>{item.text}</p>
                </div>
              ))}
            </div>
            <button onClick={go} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#f59e0b", color: "#000", fontWeight: 700, fontSize: 15,
              padding: "13px 28px", borderRadius: 10, border: "none", cursor: "pointer",
            }}>
              Start Publishing Free <ArrowRight size={16} />
            </button>
          </div>
          {/* Dashboard mockup */}
          <div style={{ background: "#0a0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, fontWeight: 600 }}>ANALYST DASHBOARD</div>
            {[
              { label: "Reports Published", val: "3", color: "#3b82f6" },
              { label: "Accuracy", val: "100% — ⭐ ELITE", color: "#22c55e" },
              { label: "Followers", val: "124", color: "#f9fafb" },
              { label: "Revenue", val: "$2,400/mo", color: "#f59e0b" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name: "FREE FOREVER",
      price: "$0",
      period: "",
      features: ["Browse all public reports", "Follow analysts", "See prediction outcomes", "Access the leaderboard"],
      cta: "Get Started Free",
      action: go,
      highlight: false,
    },
    {
      name: "ANALYST SUBSCRIPTIONS",
      price: "Priced by each analyst",
      period: "",
      badge: "MOST POPULAR",
      features: ["Each analyst sets their own monthly rate", "Typically $5 – $99/month", "Full premium reports, locked predictions & alerts", "Cancel anytime"],
      cta: "Browse Analysts",
      action: go,
      highlight: true,
    },
    {
      name: "BECOME AN ANALYST",
      price: "Free to publish",
      period: "",
      features: ["Publish unlimited free reports", "Charge subscribers your chosen rate", "STOA keeps 15% of subscription revenue", "Full analytics dashboard"],
      cta: "Start Writing",
      action: go,
      highlight: false,
    },
  ];

  return (
    <section id="pricing" style={{ padding: "96px 24px", background: "#0d1422", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#f9fafb", marginBottom: 12 }}>Transparent Pricing</h2>
          <p style={{ fontSize: 16, color: "#9ca3af" }}>Every analyst sets their own subscription price. Pay only for the research you want.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "start" }}>
          {plans.map((plan, i) => (
            <div key={i} style={{
              background: plan.highlight ? "linear-gradient(135deg, #1e3a6e, #1a2f5e)" : "#1a2234",
              border: plan.highlight ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 28,
              boxShadow: plan.highlight ? "0 0 40px rgba(59,130,246,0.15)" : "none",
              position: "relative",
              marginTop: plan.highlight ? -8 : 0,
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>
                  {plan.badge}
                </div>
              )}
              <p style={{ fontSize: 11, fontWeight: 700, color: plan.highlight ? "#93c5fd" : "#6b7280", letterSpacing: "0.08em", marginBottom: 12 }}>{plan.name}</p>
              <div style={{ fontSize: plan.price.length > 5 ? 16 : 36, fontWeight: 800, color: "#f9fafb", marginBottom: 20, lineHeight: 1.2 }}>{plan.price}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: plan.highlight ? "#bfdbfe" : "#9ca3af" }}>
                    <Check size={14} color={plan.highlight ? "#60a5fa" : "#22c55e"} style={{ flexShrink: 0, marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={plan.action} style={{
                width: "100%", padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: 14,
                cursor: "pointer", border: "none",
                background: plan.highlight ? "#3b82f6" : "rgba(255,255,255,0.08)",
                color: plan.highlight ? "#fff" : "#f9fafb",
              }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Leaderboard preview ──────────────────────────────────────────────────────
function LeaderboardPreview({ analysts }) {
  return (
    <section style={{ padding: "96px 24px", background: "#0a0f1e", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 800, color: "#f9fafb", marginBottom: 12 }}>Top Performing Analysts This Month</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {(analysts.length > 0 ? analysts.slice(0, 3) : [
            { full_name: "Bar Amsalem", accuracy_score: 100, mock: true, yield: "+28.1%", calls: 5 },
            { full_name: "Lior K.", accuracy_score: 52, mock: true, yield: "+4.2%", calls: 2 },
          ]).map((a, i) => (
            <div key={i} style={{ background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{["🥇", "🥈", "🥉"][i] || `#${i+1}`}</span>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {(a.full_name || "A")[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#f9fafb" }}>{a.full_name || a.email?.split("@")[0] || "Analyst"}</p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>{a.accuracy_score?.toFixed ? a.accuracy_score.toFixed(1) : a.accuracy_score}% accuracy</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{a.yield || (a.accuracy_score > 70 ? "+12.4%" : "+3.1%")}</p>
                <p style={{ fontSize: 11, color: "#6b7280" }}>{a.calls || "—"} calls</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <Link to="/leaderboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#3b82f6", textDecoration: "none" }}>
            View Full Leaderboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Trust Section ────────────────────────────────────────────────────────────
function TrustSection() {
  return (
    <section style={{ padding: "56px 24px", background: "#111827", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32, textAlign: "center" }}>
          {[
            { icon: "🔒", label: "All Predictions Locked" },
            { icon: "📊", label: "Algorithmically Tracked" },
            { icon: "⚡", label: "Real-Time Updates" },
            { icon: "👁️", label: "Fully Transparent" },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 16px" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>{item.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#4b5563", textAlign: "center", lineHeight: 1.7, maxWidth: 680, margin: "0 auto" }}>
          STOA is an information and research platform. Nothing published on STOA constitutes financial advice. All predictions are for informational purposes only. Past performance does not guarantee future results. Always do your own research (DYOR). Users are solely responsible for their investment decisions.
        </p>
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ padding: "96px 24px", background: "linear-gradient(135deg, #0a0f1e, #0d1b2a)", textAlign: "center" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#f9fafb", marginBottom: 14 }}>Ready to Find Your Edge?</h2>
        <p style={{ fontSize: 16, color: "#9ca3af", marginBottom: 36 }}>Join analysts and investors who track every call.</p>
        <button onClick={go} style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 17,
          padding: "16px 40px", borderRadius: 12, border: "none", cursor: "pointer",
          boxShadow: "0 4px 32px rgba(59,130,246,0.4)", marginBottom: 16,
        }}>
          Get Started Free — It's Free <ArrowRight size={18} />
        </button>
        <p style={{ fontSize: 13, color: "#4b5563" }}>No credit card required • Free forever for basic access</p>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title: "PLATFORM", links: [["Feed", "/feed"], ["Markets", "/stocks"], ["Leaderboard", "/leaderboard"], ["Pricing", "/pricing"], ["Features", "/features"]] },
    { title: "ANALYSTS", links: [["Start Writing", "/editor"], ["Dashboard", "/dashboard"], ["Scoring", "/scoring"]] },
    { title: "COMPANY", links: [["About Us", "/about"], ["How It Works", "/how-it-works"], ["Newsroom", "/newsroom"]] },
    { title: "LEGAL", links: [["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Cookie Policy", "/cookies"], ["Accessibility", "/accessibility"]] },
  ];
  return (
    <footer style={{ background: "#070d18", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "60px 24px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <BarChart2 size={18} color="#3b82f6" />
              <span style={{ fontSize: 18, fontWeight: 800, color: "#f9fafb" }}>STOA</span>
            </div>
            <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, marginBottom: 8 }}>
              Transparent financial research with verified, locked predictions.
            </p>
            <p style={{ fontSize: 12, color: "#374151", fontStyle: "italic" }}>Not financial advice. Always DYOR.</p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 14 }}>{col.title}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(([label, path]) => (
                  <li key={path}>
                    <Link to={path} style={{ fontSize: 13, color: "#4b5563", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => e.target.style.color = "#9ca3af"}
                      onMouseLeave={e => e.target.style.color = "#4b5563"}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "#374151" }}>© 2026 STOA. All rights reserved.</p>
          <p style={{ fontSize: 12, color: "#374151" }}>Not financial advice. Always DYOR.</p>
        </div>
      </div>
    </footer>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [liveStats, setLiveStats] = useState(null);
  const [analysts, setAnalysts] = useState([]);

  useEffect(() => {
    setMeta({
      title: "STOA — Verified Financial Research",
      description: "Follow verified analysts with real track records. Every prediction is locked, timestamped, and performance-tracked.",
    });
    injectJsonLd("jsonld-org", {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "STOA",
      "url": "https://stoamarket.ai",
    });
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list("-accuracy_score", 20).catch(() => []),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 200).catch(() => []),
    ]).then(([users, reports]) => {
      const analysts = (users || []).filter(u => u.accuracy_score > 0);
      setAnalysts(analysts);
      const topAcc = analysts.length > 0 ? Math.max(...analysts.map(u => u.accuracy_score || 0)) : null;
      const activeCalls = (reports || []).filter(r => !r.prediction_outcome || r.prediction_outcome === "pending").length;
      const resolved = (reports || []).filter(r => r.prediction_outcome && r.prediction_outcome !== "pending" && r.prediction_resolved_price && r.prediction_lock_price);
      const yields = resolved.map(r => {
        const lock = parseFloat(r.prediction_lock_price);
        const res = parseFloat(r.prediction_resolved_price);
        if (!lock || !res) return null;
        return r.prediction_action === "Short" ? ((lock - res) / lock) * 100 : ((res - lock) / lock) * 100;
      }).filter(y => y !== null);
      const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : null;
      setLiveStats({ topAccuracy: topAcc ? topAcc.toFixed(0) : 100, activeCalls, avgYield, analysts: analysts.length });
    }).catch(() => {});
  }, []);

  return (
    <div style={{ background: "#0a0f1e", color: "#f9fafb", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <Navbar scrolled={scrolled} isAuthenticated={isAuthenticated} />
      <Hero isAuthenticated={isAuthenticated} />
      <StatsBar liveStats={liveStats} />
      <ForInvestors />
      <HowItWorks />
      <ForAnalysts />
      <Pricing />
      <LeaderboardPreview analysts={analysts} />
      <TrustSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}