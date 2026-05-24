import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Lock, Shield, DollarSign, Check, PenLine, BarChart3,
  TrendingUp, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import StoaLogo from "@/components/StoaLogo";
import AnalystCard from "@/components/AnalystCard";

const SIGNIN_PATH = "/signin";

// Mock analyst spotlight — replaced with live data when ANALYSTS query lands
const SPOTLIGHT_ANALYSTS = [
  {
    id: "mercer", name: "James Mercer", initials: "JM",
    title: "Semiconductor & AI Infrastructure", location: "London",
    elo: 1382, tier: "Stoic", rank: 4, accuracy: 91, resolved: 19,
    subscribers: 1814, price: 28, founding: true, sectors: ["Tech", "Semis"],
    track: [612,640,670,700,720,780,830,870,900,950,1020,1080,1100,1150,1190,1220,1260,1300,1340,1382],
    sparkType: "up",
  },
  {
    id: "chen", name: "Sarah Chen", initials: "SC", title: "Macro & Rates",
    location: "Singapore", elo: 1340, tier: "Stoic", rank: 7,
    accuracy: 88, resolved: 25, subscribers: 3120, price: 24, founding: true,
    sectors: ["Macro", "Rates"],
    track: [620,640,660,700,740,790,820,870,920,970,1010,1060,1100,1140,1190,1230,1280,1310,1330,1340],
    sparkType: "up",
  },
  {
    id: "nair", name: "Priya Nair", initials: "PN", title: "Energy & Commodities",
    location: "Mumbai", elo: 1218, tier: "Disciple", rank: 22,
    accuracy: 85, resolved: 15, subscribers: 942, price: 18, founding: false,
    sectors: ["Energy", "Materials"],
    track: [610,625,650,670,690,720,760,800,830,870,920,960,1000,1050,1090,1130,1160,1190,1210,1218],
    sparkType: "up",
  },
];

// Hero locked-prediction stack — 3 cards, front NVDA hit, two rotated back
function FullLockedCard() {
  return (
    <div className="surface" style={{ padding: 24, background: "var(--bg-elev)", borderColor: "var(--border-strong)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div className="av av-md" style={{ background: "var(--primary-blue)" }}>JM</div>
        <div>
          <div className="t-title" style={{ fontSize: 14 }}>James Mercer</div>
          <div className="t-meta">Elo <span className="t-num" style={{ color: "var(--primary-blue)" }}>1,382</span> · 91% accuracy</div>
        </div>
        <div style={{ flex: 1 }}/>
        <span className="tag tag-long" style={{ height: 26, padding: "0 10px" }}>LONG NVDA</span>
      </div>
      <div className="receipt" style={{ marginBottom: 14 }}>
        <Lock size={12} strokeWidth={1.5}/>
        LOCKED · JAN 15 2025 · 09:32 ET · #C1
      </div>
      <p style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 14.5, lineHeight: 1.55, color: "var(--text-body)", margin: "0 0 18px" }}>
        “AI infrastructure buildout accelerating into Q2. Hyperscaler capex up 40% YoY. The H100 backlog extends 12 months — pricing power intact.”
      </p>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
        background: "var(--border-rgba)", border: "0.5px solid var(--border-rgba)",
        borderRadius: 6, overflow: "hidden", marginBottom: 16,
      }}>
        {[
          ["Entry", "$485.00"],
          ["Target", "$620.00"],
          ["Exit", "$612.40"],
          ["Return", "+26.3%", "pos"],
        ].map(([l, v, t], i) => (
          <div key={i} style={{ background: "var(--bg-elev)", padding: "12px" }}>
            <div className="t-meta" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em" }}>{l}</div>
            <div className="t-num" style={{ fontSize: 15, marginTop: 4, color: t === "pos" ? "var(--rolex-green)" : "var(--text)" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "rgba(14,107,69,0.06)",
        border: "0.5px solid rgba(14,107,69,0.32)",
        borderRadius: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} strokeWidth={1.6} style={{ color: "var(--rolex-green)" }}/>
          <span style={{ fontSize: 12.5, color: "var(--rolex-green)", fontWeight: 500 }}>Resolved · Target hit · 86 days</span>
        </div>
        <span className="t-num" style={{ fontSize: 14, color: "var(--rolex-green)" }}>+26.3%</span>
      </div>
    </div>
  );
}

function MiniLockedCard({ ticker, dir, change, grade = "HIT", date, year }) {
  return (
    <div className="surface" style={{ padding: 16, background: "var(--bg-elev)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="receipt" style={{ fontSize: 10 }}>LOCKED · {date} {year}</span>
        <span className="tag tag-hit" style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}>{grade}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <span className={`tag ${dir === "LONG" ? "tag-long" : "tag-short"}`}>{dir} {ticker}</span>
      </div>
      <div className="t-num" style={{ fontSize: 16, color: "var(--rolex-green)" }}>+{change}%</div>
    </div>
  );
}

function HeroPredictionStack() {
  return (
    <div style={{ position: "relative", height: 480 }}>
      <div style={{ position: "absolute", top: 40, right: -20, width: 320, opacity: 0.55, transform: "rotate(3deg)", filter: "saturate(0.85)" }}>
        <MiniLockedCard ticker="INTC" dir="SHORT" change={18.9} date="Feb 18" year={2025}/>
      </div>
      <div style={{ position: "absolute", top: 14, right: 28, width: 380, opacity: 0.78, transform: "rotate(-1.6deg)" }}>
        <MiniLockedCard ticker="MSFT" dir="LONG" change={16.2} date="Feb 02" year={2025}/>
      </div>
      <div style={{ position: "absolute", top: 60, left: 0, right: 30 }}>
        <FullLockedCard/>
      </div>
    </div>
  );
}

/**
 * LandingPage — public marketing surface (v3 rebuild).
 * Ports prototype/src/screens/landing.jsx with the existing auth wiring.
 *
 * Sections: hero (copy + prediction stack), metrics strip, how it works,
 * comparison table, analyst spotlight, dark navy CTA, footer.
 */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleBrowseAnalysts = () => navigate("/feed");
  const handlePublish = () => {
    if (isAuthenticated) navigate("/dashboard");
    else navigate(SIGNIN_PATH);
  };
  const handleViewLeaderboard = () => navigate("/leaderboard");
  const handleOpenAnalyst = () => navigate("/feed");

  return (
    <div className="page">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="ambient" style={{ padding: "120px 0 80px" }}>
        <div className="shell" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 80, alignItems: "center" }}>
          <div className="fade-up">
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 26, padding: "0 12px",
                border: "0.5px solid rgba(14,107,69,0.32)",
                background: "rgba(14,107,69,0.06)",
                borderRadius: 4, color: "var(--rolex-green)",
                fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
                <span className="pulse-dot" style={{ width: 6, height: 6, background: "var(--rolex-green)", borderRadius: "50%" }}/>
                Live · 1,427 predictions tracking
              </span>
            </div>

            <h1 className="t-display" style={{ fontSize: "clamp(48px, 6.4vw, 78px)", lineHeight: 1.0, margin: 0, color: "var(--text)" }}>
              Think clearly.<br/>
              <em style={{ fontStyle: "italic", color: "var(--gold-hex)", fontWeight: 500 }}>Invest better.</em>
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--text-mute)", margin: "26px 0 36px", maxWidth: 520 }}>
              Stoa is the research platform where every prediction is timestamped, every call is graded, and the track record <em style={{ fontStyle: "italic", color: "var(--text)" }}>is</em> the product. Receipts, not opinions.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
              <button className="btn btn-gold btn-lg" onClick={handleBrowseAnalysts}>
                Browse researchers <ArrowRight size={16}/>
              </button>
              <button className="btn btn-ghost btn-lg" onClick={handlePublish}>
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
                  <Icon size={13} strokeWidth={1.6} style={{ color: "var(--text-meta)" }}/>
                  <span className="t-meta" style={{ fontSize: 12 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <HeroPredictionStack/>
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ────────────────────────────────────────── */}
      <section style={{ borderTop: "0.5px solid var(--border-rgba)", borderBottom: "0.5px solid var(--border-rgba)" }}>
        <div className="shell" style={{ padding: "44px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {[
            { v: "2,417", l: "Reports published" },
            { v: "89%",   l: "Avg. winning accuracy", tone: "green" },
            { v: "142k",  l: "Monthly readers" },
            { v: "$1.4M", l: "Paid to researchers" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "8px 28px", borderRight: i < 3 ? "0.5px solid var(--border-rgba)" : "none" }}>
              <div className="t-num" style={{ fontSize: 36, color: s.tone === "green" ? "var(--rolex-green)" : "var(--text)", letterSpacing: "-0.02em" }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section style={{ padding: "var(--pad-section) 0" }}>
        <div className="shell">
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--text-meta)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500 }}>
              <span style={{ width: 18, height: 1, background: "var(--text-meta)" }}/>
              The mechanism
            </div>
            <h2 className="t-display" style={{ fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.05, margin: "16px 0 12px" }}>
              The track record <em style={{ fontStyle: "italic" }}>writes itself</em>.
            </h2>
            <p className="t-body" style={{ fontSize: 16, color: "var(--text-mute)", margin: 0, maxWidth: 620 }}>
              No self-reporting. No edits after the move. Three layers of public verification turn opinions into receipts.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 56 }}>
            {[
              { n: "01", t: "Publish a call", d: "Set ticker, direction, target price, and timeframe. The price locks at publish. There is no edit button.", Icon: PenLine },
              { n: "02", t: "The market grades", d: "When the window closes, Stoa pulls the verified price and assigns Hit, Near, Partial, or Miss. Automatically.", Icon: BarChart3 },
              { n: "03", t: "Your Elo updates", d: "Every resolved call moves your rating on a 600–1400 scale. Subscribers see the whole record. Past, present, permanent.", Icon: TrendingUp },
            ].map(({ n, t, d, Icon }) => (
              <div key={n} className="surface" style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
                  <span className="t-num" style={{ fontSize: 13, color: "var(--gold-hex)", letterSpacing: "0.16em" }}>STEP {n}</span>
                  <Icon size={20} strokeWidth={1.4} style={{ color: "var(--text-meta)" }}/>
                </div>
                <h3 className="t-title" style={{ fontSize: 22, lineHeight: 1.2, margin: "0 0 12px" }}>{t}</h3>
                <p className="t-body" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-mute)", margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ──────────────────────────────────────────── */}
      <section style={{ background: "var(--bg-soft)", borderTop: "0.5px solid var(--border-rgba)", borderBottom: "0.5px solid var(--border-rgba)", padding: "var(--pad-section) 0" }}>
        <div className="shell" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "start" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--text-meta)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500 }}>
              <span style={{ width: 18, height: 1, background: "var(--text-meta)" }}/>
              Why Stoa
            </div>
            <h2 className="t-display" style={{ fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.05, margin: "16px 0 12px" }}>
              Built for finance.<br/>Not adapted for it.
            </h2>
            <p className="t-body" style={{ fontSize: 16, color: "var(--text-mute)", margin: 0, maxWidth: 620 }}>
              Substack is a blog. Seeking Alpha owns your audience. Twitter forgets every wrong call. Stoa is the only platform that pairs a real research editor with a permanent, public track record.
            </p>
          </div>

          <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", borderBottom: "0.5px solid var(--border-rgba)", background: "var(--bg-elev)" }}>
              <div className="t-meta" style={{ padding: "14px 20px", fontSize: 11 }}>FEATURE</div>
              {["Stoa", "Substack", "Seeking Alpha"].map((c, i) => (
                <div key={c} style={{ padding: "14px 12px", fontSize: 12, fontWeight: 500, textAlign: "center", color: i === 0 ? "var(--gold-hex)" : "var(--text-mute)", letterSpacing: "0.04em" }}>
                  {c}
                </div>
              ))}
            </div>
            {[
              ["Predictions locked on publish",     true, false, false],
              ["Auto-verified track record",        true, false, false],
              ["Modified Elo rating (600–1400)",    true, false, false],
              ["Analyst owns the subscriber list",  true, true,  false],
              ["Keep 90%+ of revenue",              true, true,  false],
              ["Built-in financial research editor",true, false, "partial"],
              ["No follower count required",        true, false, false],
            ].map(([feat, stoa, sub, sa], idx, arr) => (
              <div key={feat} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", borderBottom: idx < arr.length - 1 ? "0.5px solid var(--border-rgba)" : "none" }}>
                <div style={{ padding: "16px 20px", fontSize: 13.5 }}>{feat}</div>
                {[stoa, sub, sa].map((v, ci) => (
                  <div key={ci} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 12px" }}>
                    {v === true && <Check size={16} strokeWidth={1.6} style={{ color: ci === 0 ? "var(--rolex-green)" : "var(--text-mute)" }}/>}
                    {v === false && <span style={{ width: 14, height: 1, background: "var(--border-strong)" }}/>}
                    {v === "partial" && <span className="t-meta" style={{ fontSize: 11 }}>partial</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANALYSTS SPOTLIGHT ──────────────────────────────────── */}
      <section style={{ padding: "var(--pad-section) 0" }}>
        <div className="shell">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44 }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--text-meta)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500 }}>
                <span style={{ width: 18, height: 1, background: "var(--text-meta)" }}/>
                The leaderboard
              </div>
              <h2 className="t-display" style={{ fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.05, margin: "16px 0 12px" }}>
                No followers required. Just results.
              </h2>
              <p className="t-body" style={{ fontSize: 16, color: "var(--text-mute)", margin: 0, maxWidth: 620 }}>
                A new researcher with a 90% record outranks a 50,000-follower account at 60%.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={handleViewLeaderboard}>
              View leaderboard <ArrowRight size={14}/>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {SPOTLIGHT_ANALYSTS.map((a) => (
              <AnalystCard key={a.id} a={a} onOpen={handleOpenAnalyst}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="ambient" style={{ background: "var(--deepest-navy)", color: "#fff", padding: "120px 0", position: "relative", overflow: "hidden" }}>
        <style>{`
          .cta-dark.ambient::before { background: #2E5090; opacity: 0.20; }
          .cta-dark.ambient::after { background: var(--gold-hex); opacity: 0.14; }
        `}</style>
        <div className="shell cta-dark ambient" style={{ textAlign: "center", padding: 0, position: "relative" }}>
          <h2 className="t-display" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", lineHeight: 1.05, color: "rgba(255,255,255,0.95)", margin: 0 }}>
            Your track record<br/>
            <span style={{ color: "var(--gold-light-hex)", fontStyle: "italic" }}>is the product.</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", maxWidth: 540, margin: "26px auto 38px" }}>
            Stop posting alpha for free on Twitter. Publish where the record matters.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button className="btn btn-gold btn-lg" onClick={handlePublish}>
              Start publishing <ArrowRight size={16}/>
            </button>
            <button className="btn btn-lg" style={{ background: "transparent", color: "#fff", border: "0.5px solid rgba(255,255,255,0.24)" }} onClick={handleBrowseAnalysts}>
              Browse research
            </button>
          </div>
          <p className="t-meta" style={{ marginTop: 22, color: "rgba(255,255,255,0.4)" }}>
            Free forever for readers · No credit card required
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ borderTop: "0.5px solid var(--border-rgba)", padding: "56px 0 40px" }}>
        <div className="shell">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 64, marginBottom: 40 }}>
            <div>
              <StoaLogo size={22} textSize="text-base"/>
              <p className="t-body" style={{ fontSize: 13, color: "var(--text-mute)", maxWidth: 280, marginTop: 16, lineHeight: 1.6 }}>
                Think clearly. Invest better. The research platform where the record is permanent and public.
              </p>
              <p className="t-meta" style={{ marginTop: 16, fontSize: 11, color: "var(--text-faint)" }}>
                Not financial advice. All predictions are user-generated content. Past performance does not guarantee future results.
              </p>
            </div>
            {[
              { t: "Platform", l: [["Feed", "/feed"], ["Leaderboard", "/leaderboard"], ["Markets", "/stocks"], ["Pricing", "/pricing"]] },
              { t: "Analysts", l: [["Start publishing", "/become-analyst"], ["Studio", "/dashboard"], ["Scoring", "/scoring"], ["Analytics", "/analytics"]] },
              { t: "Company",  l: [["About", "/about"], ["How it works", "/how-it-works"], ["Terms", "/terms"], ["Privacy", "/privacy"]] },
            ].map((c) => (
              <div key={c.t}>
                <div className="t-eyebrow" style={{ marginBottom: 14 }}>{c.t}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {c.l.map(([label, path]) => (
                    <span
                      key={label}
                      className="t-body"
                      style={{ fontSize: 13, color: "var(--text-mute)", cursor: "pointer" }}
                      onClick={() => navigate(path)}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hr" style={{ marginBottom: 22 }}/>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="t-meta">© 2026 STOA Research</span>
            <span className="t-meta">Made for researchers, by researchers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
