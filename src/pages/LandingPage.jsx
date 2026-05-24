import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Lock,
  Shield,
  DollarSign,
  Check,
  PenLine,
  BarChart3,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import StoaLogo from "@/components/StoaLogo";

/**
 * LandingPage — public marketing surface, v2 design-system handoff.
 *
 * Structure per spec (design_handoff_stoa_redesign/prototype/src/screens/landing.jsx):
 *   1. Sticky top nav with backdrop blur
 *   2. Editorial 2-column hero — copy left + locked-prediction card stack right
 *   3. Metrics strip — 4 hairline-bordered cells with Space Grotesk numbers
 *   4. How it works — three glass cards in a 3-column grid
 *   5. Comparison table — Stoa / Substack / Seeking Alpha matrix
 *   6. Analyst spotlight — 3 AnalystCard instances
 *   7. Final navy CTA section with ambient orbs
 *   8. Footer — 4-column with hairline divider
 *
 * Tone: editorial, restrained. Hero headline: "Think clearly. Invest better."
 */

const SIGNIN_PATH = "/signin";

/**
 * HeroPredictionStack — the visual signature of the page.
 * Three locked-prediction cards stacked with depth: a fully-populated
 * front card (NVDA hit, +26.3%) and two background cards rotated ±2°
 * with reduced opacity (0.55 / 0.78).
 */
function HeroPredictionStack() {
  return (
    <div style={{ position: "relative", height: 480 }}>
      <MiniLocked
        ticker="INTC"
        dir="SHORT"
        change={9.4}
        date="Jan 22"
        year={2025}
        style={{
          position: "absolute",
          top: 40,
          right: -20,
          width: 320,
          opacity: 0.55,
          transform: "rotate(3deg)",
          filter: "saturate(0.85)",
        }}
      />
      <MiniLocked
        ticker="MSFT"
        dir="LONG"
        change={18.7}
        date="Jan 18"
        year={2025}
        style={{
          position: "absolute",
          top: 14,
          right: 28,
          width: 380,
          opacity: 0.78,
          transform: "rotate(-1.6deg)",
        }}
      />
      <FullLocked
        style={{ position: "absolute", top: 60, left: 0, right: 30 }}
      />
    </div>
  );
}

function FullLocked({ style }) {
  return (
    <div
      className="surface"
      style={{
        padding: 24,
        background: "var(--bg-elev)",
        borderColor: "var(--border-strong)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div className="av av-md">JM</div>
        <div>
          <div className="t-title" style={{ fontSize: 14 }}>James Mercer</div>
          <div className="t-meta">
            Elo <span className="t-num" style={{ color: "var(--primary-blue)" }}>1,382</span> · 91% accuracy
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span className="tag tag-long" style={{ height: 26, padding: "0 10px" }}>
          LONG NVDA
        </span>
      </div>

      <div className="receipt" style={{ marginBottom: 14 }}>
        <Lock size={12} strokeWidth={1.5} />
        LOCKED · JAN 15 2025 · 09:32 ET · #C1
      </div>

      <p
        style={{
          fontFamily: "var(--f-serif)",
          fontStyle: "italic",
          fontSize: 14.5,
          lineHeight: 1.55,
          color: "var(--text-body)",
          margin: "0 0 18px",
        }}
      >
        “AI infrastructure buildout accelerating into Q2. Hyperscaler capex up 40% YoY. The H100 backlog extends 12 months — pricing power intact.”
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "var(--border-rgba)",
          border: "0.5px solid var(--border-rgba)",
          borderRadius: 6,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {[
          ["Entry", "$485.00"],
          ["Target", "$620.00"],
          ["Exit", "$612.40"],
          ["Return", "+26.3%", "pos"],
        ].map(([l, v, t], i) => (
          <div key={i} style={{ background: "var(--bg-elev)", padding: 12 }}>
            <div
              className="t-meta"
              style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em" }}
            >
              {l}
            </div>
            <div
              className="t-num"
              style={{
                fontSize: 15,
                marginTop: 4,
                color: t === "pos" ? "var(--rolex-green)" : "var(--text)",
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(14,107,69,0.06)",
          border: "0.5px solid rgba(14,107,69,0.32)",
          borderRadius: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2
            size={15}
            strokeWidth={1.6}
            style={{ color: "var(--rolex-green)" }}
          />
          <span style={{ fontSize: 12.5, color: "var(--rolex-green)", fontWeight: 500 }}>
            Resolved · Target hit · 86 days
          </span>
        </div>
        <span className="t-num" style={{ fontSize: 14, color: "var(--rolex-green)" }}>
          +26.3%
        </span>
      </div>
    </div>
  );
}

function MiniLocked({ ticker, dir, change, date, year, style }) {
  return (
    <div className="surface" style={{ padding: 16, background: "var(--bg-elev)", ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span className="receipt" style={{ fontSize: 10 }}>
          LOCKED · {date} {year}
        </span>
        <span className="tag tag-hit" style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}>
          HIT
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <span className={`tag ${dir === "LONG" ? "tag-long" : "tag-short"}`}>
          {dir} {ticker}
        </span>
      </div>
      <div className="t-num" style={{ fontSize: 16, color: "var(--rolex-green)" }}>
        +{change}%
      </div>
    </div>
  );
}

/** Spotlight analyst card — light, hand-built variant matching the spec. */
function SpotlightCard({ a, onSubscribe }) {
  return (
    <div className="surface surface-interactive" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div className="av av-lg" style={{ background: "var(--deepest-navy)" }}>
          {a.initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 className="t-title" style={{ fontSize: 17, margin: 0 }}>{a.name}</h3>
            <span className="badge-founding">{a.badge}</span>
          </div>
          <div className="t-meta" style={{ marginTop: 2 }}>{a.sector}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div className="stat">
          <span className="stat-label">Elo</span>
          <span className="stat-value" style={{ color: "var(--primary-blue)" }}>{a.elo}</span>
          <span className="stat-sub">Stoic tier</span>
        </div>
        <div className="stat">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value" style={{ color: "var(--rolex-green)" }}>{a.accuracy}%</span>
          <span className="stat-sub">{a.calls} calls</span>
        </div>
        <div className="stat">
          <span className="stat-label">Subs</span>
          <span className="stat-value">{a.subscribers}</span>
          <span className="stat-sub">{a.revenue}</span>
        </div>
      </div>

      <button className="btn btn-gold btn-sm" style={{ width: "100%" }} onClick={onSubscribe}>
        Browse {a.name.split(" ")[0]}'s research
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

const SPOTLIGHT_ANALYSTS = [
  { name: "James Mercer", initials: "JM", elo: 1382, accuracy: 91, calls: 24, subscribers: "1.8k", sector: "Semis & AI Infra", badge: "Top Researcher", revenue: "$4.2k / mo" },
  { name: "Sarah Chen",   initials: "SC", elo: 1264, accuracy: 88, calls: 31, subscribers: "3.1k", sector: "Macro & Rates",    badge: "Macro Expert",    revenue: "$7.8k / mo" },
  { name: "Priya Nair",   initials: "PN", elo: 1175, accuracy: 85, calls: 18, subscribers: "940",  sector: "Energy & Commodities", badge: "Rising Star", revenue: "$2.1k / mo" },
];

const COMPARISON = [
  ["Predictions locked on publish",     true,  false,    false],
  ["Auto-verified track record",        true,  false,    false],
  ["Modified Elo rating (600–1400)",    true,  false,    false],
  ["Analyst owns the subscriber list",  true,  true,     false],
  ["Keep 90%+ of revenue",              true,  true,     false],
  ["Built-in financial research editor",true,  false,    "partial"],
  ["No follower count required",        true,  false,    false],
];

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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

  return (
    <div className="page" style={{ background: "var(--bg)" }}>
      {/* ── Top nav ───────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 64,
          display: "flex",
          alignItems: "center",
          background: scrolled
            ? "color-mix(in srgb, var(--bg) 88%, transparent)"
            : "transparent",
          backdropFilter: scrolled ? "blur(18px) saturate(1.2)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(18px) saturate(1.2)" : "none",
          borderBottom: scrolled ? "0.5px solid var(--border-rgba)" : "0.5px solid transparent",
          transition: "background var(--t-base) var(--ease), border-color var(--t-base) var(--ease)",
        }}
      >
        <div className="shell" style={{ width: "100%", display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
            aria-label="Go to Stoa home"
          >
            <StoaLogo size={22} textSize="text-sm" />
            <span className="badge-founding" style={{ marginLeft: 2 }}>BETA</span>
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user ? (
              <button className="btn btn-gold" onClick={enterPlatform}>
                Open Platform <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button className="btn btn-text" onClick={go}>Log in</button>
                <button className="btn btn-gold" onClick={go}>
                  Get started free <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="ambient" style={{ padding: "164px 0 88px" }}>
        <div
          className="shell"
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 80,
            alignItems: "center",
          }}
        >
          <div className="fade-up">
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 26,
                  padding: "0 12px",
                  border: "0.5px solid rgba(14,107,69,0.32)",
                  background: "rgba(14,107,69,0.06)",
                  borderRadius: 4,
                  color: "var(--rolex-green)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  className="pulse-dot"
                  style={{ width: 6, height: 6, background: "var(--rolex-green)", borderRadius: "50%" }}
                />
                Live · Predictions tracking
              </span>
            </div>

            <h1
              className="t-display"
              style={{
                fontSize: "clamp(48px, 6.4vw, 78px)",
                lineHeight: 1.0,
                margin: 0,
                color: "var(--text)",
              }}
            >
              Think clearly.
              <br />
              <em style={{ fontStyle: "italic", color: "var(--gold-hex)", fontWeight: 500 }}>
                Invest better.
              </em>
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.55,
                color: "var(--text-mute)",
                margin: "26px 0 36px",
                maxWidth: 520,
              }}
            >
              Stoa is the research platform where every prediction is timestamped, every call is graded, and the track record{" "}
              <em style={{ fontStyle: "italic", color: "var(--text)" }}>is</em> the product. Receipts, not opinions.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
              <button className="btn btn-gold btn-lg" onClick={primaryAction}>
                {user ? "Go to feed" : "Browse researchers"} <ArrowRight size={16} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={primaryAction}>
                Publish on Stoa
              </button>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                [Lock, "Predictions locked on publish"],
                [Shield, "Auto-verified track records"],
                [DollarSign, "Analysts keep 90%"],
              ].map(([Icon, t]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={13} strokeWidth={1.6} color="var(--text-mute)" />
                  <span className="t-meta" style={{ fontSize: 12 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <HeroPredictionStack />
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ─────────────────────────────────── */}
      <section
        style={{
          borderTop: "0.5px solid var(--border-rgba)",
          borderBottom: "0.5px solid var(--border-rgba)",
        }}
      >
        <div
          className="shell"
          style={{
            padding: "44px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
          }}
        >
          {[
            { v: "2,417", l: "Reports published" },
            { v: "89%", l: "Avg. winning accuracy", tone: "green" },
            { v: "142k", l: "Monthly readers" },
            { v: "$1.4M", l: "Paid to researchers" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: "8px 28px",
                borderRight:
                  i < 3 ? "0.5px solid var(--border-rgba)" : "none",
              }}
            >
              <div
                className="t-num"
                style={{
                  fontSize: 36,
                  color: s.tone === "green" ? "var(--rolex-green)" : "var(--text)",
                  letterSpacing: "-0.02em",
                }}
              >
                {s.v}
              </div>
              <div className="t-meta" style={{ marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={{ padding: "var(--pad-section) 0" }}>
        <div className="shell">
          <div style={{ maxWidth: 720 }}>
            <div className="t-eyebrow">The mechanism</div>
            <h2
              className="t-display"
              style={{ fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.05, margin: "16px 0 12px" }}
            >
              The track record{" "}
              <em style={{ fontStyle: "italic" }}>writes itself</em>.
            </h2>
            <p
              className="t-body"
              style={{ fontSize: 16, color: "var(--text-mute)", margin: 0, maxWidth: 620 }}
            >
              No self-reporting. No edits after the move. Three layers of public verification turn opinions into receipts.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 18,
              marginTop: 56,
            }}
          >
            {[
              { n: "01", t: "Publish a call", d: "Set ticker, direction, target price, and timeframe. The price locks at publish. There is no edit button.", Icon: PenLine },
              { n: "02", t: "The market grades", d: "When the window closes, Stoa pulls the verified price and assigns Hit, Near, Partial, or Miss. Automatically.", Icon: BarChart3 },
              { n: "03", t: "Your Elo updates", d: "Every resolved call moves your rating on a 600–1400 scale. Subscribers see the whole record. Past, present, permanent.", Icon: TrendingUp },
            ].map(({ n, t, d, Icon }) => (
              <div key={n} className="surface" style={{ padding: 28 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 28,
                  }}
                >
                  <span
                    className="t-num"
                    style={{ fontSize: 13, color: "var(--gold-hex)", letterSpacing: "0.16em" }}
                  >
                    STEP {n}
                  </span>
                  <Icon size={20} strokeWidth={1.4} color="var(--text-mute)" />
                </div>
                <h3
                  className="t-title"
                  style={{ fontSize: 22, lineHeight: 1.2, margin: "0 0 12px" }}
                >
                  {t}
                </h3>
                <p
                  className="t-body"
                  style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-mute)", margin: 0 }}
                >
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ───────────────────────────────────── */}
      <section
        style={{
          background: "var(--bg-soft)",
          borderTop: "0.5px solid var(--border-rgba)",
          borderBottom: "0.5px solid var(--border-rgba)",
          padding: "var(--pad-section) 0",
        }}
      >
        <div
          className="shell"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 80,
            alignItems: "start",
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <div className="t-eyebrow">Why Stoa</div>
            <h2
              className="t-display"
              style={{ fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.05, margin: "16px 0 12px" }}
            >
              Built for finance.
              <br />Not adapted for it.
            </h2>
            <p
              className="t-body"
              style={{ fontSize: 16, color: "var(--text-mute)", margin: 0 }}
            >
              Substack is a blog. Seeking Alpha owns your audience. Twitter forgets every wrong call. Stoa is the only platform that pairs a real research editor with a permanent, public track record.
            </p>
          </div>

          <div className="surface" style={{ padding: 0 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                borderBottom: "0.5px solid var(--border-rgba)",
                background: "var(--bg-elev)",
              }}
            >
              <div className="t-meta" style={{ padding: "14px 20px", fontSize: 11 }}>
                FEATURE
              </div>
              {["Stoa", "Substack", "Seeking Alpha"].map((c, i) => (
                <div
                  key={c}
                  style={{
                    padding: "14px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    textAlign: "center",
                    color: i === 0 ? "var(--gold-hex)" : "var(--text-mute)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
            {COMPARISON.map(([feat, stoa, sub, sa], idx) => (
              <div
                key={feat}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                  borderBottom:
                    idx < COMPARISON.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
                }}
              >
                <div style={{ padding: "16px 20px", fontSize: 13.5 }}>{feat}</div>
                {[stoa, sub, sa].map((v, ci) => (
                  <div
                    key={ci}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 12px" }}
                  >
                    {v === true && (
                      <Check
                        size={16}
                        strokeWidth={1.6}
                        color={ci === 0 ? "var(--rolex-green)" : "var(--text-mute)"}
                      />
                    )}
                    {v === false && (
                      <span style={{ width: 14, height: 1, background: "var(--border-strong)" }} />
                    )}
                    {v === "partial" && (
                      <span className="t-meta" style={{ fontSize: 11 }}>partial</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANALYST SPOTLIGHT ────────────────────────────── */}
      <section style={{ padding: "var(--pad-section) 0" }}>
        <div className="shell">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              marginBottom: 44,
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 560 }}>
              <div className="t-eyebrow">The leaderboard</div>
              <h2
                className="t-display"
                style={{
                  fontSize: "clamp(28px, 3.6vw, 46px)",
                  lineHeight: 1.05,
                  margin: "16px 0 12px",
                }}
              >
                No followers required. Just results.
              </h2>
              <p
                className="t-body"
                style={{ fontSize: 16, color: "var(--text-mute)", margin: 0 }}
              >
                A new researcher with a 90% record outranks a 50,000-follower account at 60%.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate("/leaderboard")}>
              View leaderboard <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {SPOTLIGHT_ANALYSTS.map((a) => (
              <SpotlightCard key={a.name} a={a} onSubscribe={primaryAction} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL DARK CTA ──────────────────────────────── */}
      <section
        className="dark ambient"
        style={{
          background: "var(--deepest-navy)",
          color: "#fff",
          padding: "120px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="shell"
          style={{ textAlign: "center", padding: 0, position: "relative", zIndex: 1 }}
        >
          <h2
            className="t-display"
            style={{
              fontSize: "clamp(40px, 5.5vw, 68px)",
              lineHeight: 1.05,
              color: "rgba(255,255,255,0.95)",
              margin: 0,
            }}
          >
            Your track record
            <br />
            <span style={{ color: "var(--gold-light-hex)", fontStyle: "italic" }}>
              is the product.
            </span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.6)",
              maxWidth: 540,
              margin: "26px auto 38px",
            }}
          >
            Stop posting alpha for free on Twitter. Publish where the record matters.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button className="btn btn-gold btn-lg" onClick={primaryAction}>
              Start publishing <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-lg"
              style={{
                background: "transparent",
                color: "#fff",
                border: "0.5px solid rgba(255,255,255,0.24)",
              }}
              onClick={primaryAction}
            >
              Browse research
            </button>
          </div>
          <p
            className="t-meta"
            style={{ marginTop: 22, color: "rgba(255,255,255,0.4)" }}
          >
            Free forever for readers · No credit card required
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "0.5px solid var(--border-rgba)",
          padding: "56px 0 40px",
        }}
      >
        <div className="shell">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 64,
              marginBottom: 40,
            }}
          >
            <div>
              <StoaLogo size={22} textSize="text-sm" />
              <p
                className="t-body"
                style={{
                  fontSize: 13,
                  color: "var(--text-mute)",
                  maxWidth: 280,
                  marginTop: 16,
                  lineHeight: 1.6,
                }}
              >
                Think clearly. Invest better. The research platform where the record is permanent and public.
              </p>
              <p
                className="t-meta"
                style={{ marginTop: 16, fontSize: 11, color: "var(--text-faint)" }}
              >
                Not financial advice. All predictions are user-generated content. Past performance does not guarantee future results.
              </p>
            </div>
            {[
              { t: "Platform", l: [["Feed", "/feed"], ["Leaderboard", "/leaderboard"], ["Markets", "/stocks"], ["Pricing", "/pricing"]] },
              { t: "Analysts", l: [["Start publishing", "/become-analyst"], ["Studio", "/dashboard"], ["Scoring", "/scoring"], ["Analytics", "/analytics"]] },
              { t: "Company", l: [["About", "/about"], ["How it works", "/how-it-works"], ["Terms", "/terms"], ["Privacy", "/privacy"]] },
            ].map((c) => (
              <div key={c.t}>
                <div className="t-eyebrow" style={{ marginBottom: 14 }}>
                  {c.t}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {c.l.map(([x, path]) => (
                    <button
                      key={x}
                      className="t-body"
                      onClick={() => navigate(path)}
                      style={{
                        fontSize: 13,
                        color: "var(--text-mute)",
                        cursor: "pointer",
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        textAlign: "left",
                      }}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hr" style={{ marginBottom: 22 }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="t-meta">© 2026 STOA Research</span>
            <span className="t-meta">Made for researchers, by researchers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
