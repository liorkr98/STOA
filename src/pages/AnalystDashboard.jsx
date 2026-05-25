import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, PenLine, Lock, FileText, Users, BarChart3, Wallet as WalletIcon,
  Settings as SettingsIcon, TrendingUp, Plus, ArrowRight, MoreHorizontal,
  MessageCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Avatar } from "@/components/AnalystCard";
import TrackChart from "@/components/charts/TrackChart";
import LockedPredictionCard from "@/components/PredictionCard";
import { loadMyWallet } from "@/lib/walletService";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import TwitsPanel from "@/components/dashboard/TwitsPanel";
import RevenueInsightsPanel from "@/components/dashboard/RevenueInsightsPanel";
import DashboardDMs from "@/components/dashboard/DashboardDMs";

// ── Map Prediction entity → LockedPredictionCard call shape ──────────────────
function predToCall(p) {
  const status = (p.status || "active") === "active" ? "open" : "resolved";
  const outcome = (p.outcome || "").toLowerCase();
  const grade = status === "open" ? "OPEN"
    : outcome === "hit" ? "HIT"
    : outcome === "near" ? "NEAR"
    : outcome === "partial" ? "PARTIAL"
    : "MISS";
  const entry = Number(p.entry_price || p.locked_entry_price || 0);
  const target = Number(p.target_price || 0);
  const exit = Number(p.exit_price || p.current_price || 0);
  const change = entry && exit
    ? ((exit - entry) / entry) * 100 * (p.direction === "Short" ? -1 : 1) : 0;
  const created = p.created_date ? new Date(p.created_date) : new Date();
  const totalDays = p.timeframe_days || 90;
  // Days remaining = (window length) - (days since the prediction was locked).
  // Clamped to >=0 so an overdue-but-still-open call shows "0 days" rather
  // than a negative number.
  const elapsedDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
  const daysRemaining = status === "open" ? Math.max(0, totalDays - elapsedDays) : 0;
  return {
    id: p.id?.toString()?.slice(0, 6) || "p",
    ticker: p.ticker,
    dir: (p.direction || "LONG").toUpperCase(),
    entry, target, exit,
    change: Number(change.toFixed(1)),
    grade, status,
    date: created.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    year: created.getFullYear(),
    days: totalDays,
    daysRemaining,
    thesis: p.thesis || p.headline || "",
  };
}

const NAV = [
  { id: "overview",     icon: Home,         label: "Overview" },
  { id: "compose",      icon: PenLine,      label: "Compose" },
  { id: "predictions",  icon: Lock,         label: "Predictions" },
  { id: "publications", icon: FileText,     label: "Publications" },
  { id: "audience",     icon: Users,        label: "Audience" },
  { id: "messages",     icon: MessageCircle,label: "Messages" },
  { id: "analytics",    icon: BarChart3,    label: "Analytics" },
  { id: "earnings",     icon: WalletIcon,   label: "Earnings" },
  { id: "settings",     icon: SettingsIcon, label: "Settings" },
];

// ── Studio sidebar (embedded so we don't depend on a router-coupled one) ─────
function Sidebar({ section, setSection, analyst, counts }) {
  return (
    <aside style={{
      borderRight: "0.5px solid var(--border-rgba)",
      padding: "28px 18px",
      background: "var(--bg-elev)",
      position: "sticky", top: 64, alignSelf: "flex-start",
      height: "calc(100vh - 64px)", overflowY: "auto",
      width: 240, flexShrink: 0,
    }}>
      <div className="t-eyebrow" style={{ marginBottom: 18, paddingLeft: 10 }}>Studio</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((it) => {
          const Icon = it.icon;
          const active = section === it.id;
          const count = counts[it.id];
          return (
            <button
              key={it.id}
              onClick={() => setSection(it.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 10px", borderRadius: 6,
                background: active ? "var(--bg-soft)" : "transparent",
                color: active ? "var(--text)" : "var(--text-mute)",
                fontSize: 13, fontWeight: 500, fontFamily: "var(--f-sans)",
                border: 0, cursor: "pointer", textAlign: "left",
                transition: "background var(--t-fast) var(--ease), color var(--t-fast) var(--ease)",
              }}
            >
              <Icon size={14} strokeWidth={1.55}/>
              <span>{it.label}</span>
              {count != null && (
                <span className="t-num" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-meta)" }}>
                  {count >= 1000 ? (count / 1000).toFixed(1) + "k" : count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hr" style={{ margin: "20px 0" }}/>

      {analyst && (
        <div style={{ padding: "10px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar a={{ initials: analyst.initials, avatarColor: "var(--primary-blue)" }} size="sm"/>
            <div style={{ minWidth: 0 }}>
              <div className="t-title" style={{ fontSize: 12.5 }}>{analyst.name}</div>
              <div className="t-meta" style={{ fontSize: 10.5 }}>{analyst.tier} {analyst.rank ? `· #${analyst.rank}` : ""}</div>
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginTop: 12, padding: "8px 10px",
            borderRadius: 6, background: "var(--bg-soft)",
          }}>
            <span style={{ fontSize: 11, color: "var(--text-mute)" }}>Elo</span>
            <span className="t-num" style={{ fontSize: 12, color: "var(--primary-blue)" }}>{analyst.elo}</span>
            {analyst.weekDelta != null && (
              <span className="t-num" style={{
                fontSize: 11, marginLeft: "auto",
                color: analyst.weekDelta >= 0 ? "var(--rolex-green)" : "var(--velvet-red)",
              }}>
                {analyst.weekDelta >= 0 ? "+" : ""}{analyst.weekDelta} wk
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function Overview({ analyst, kpis, trackSeries, openCalls, topReports, navigate }) {
  const now = new Date();
  return (
    <div>
      {/* Navy hero banner */}
      <section className="ambient" style={{
        background: "var(--deepest-navy)", color: "#fff",
        padding: "44px 32px 60px",
        position: "relative", overflow: "hidden",
        borderRadius: 12,
        marginBottom: 0,
      }}>
        <style>{`
          .studio-hero::before { background: var(--primary-blue); opacity: 0.22; }
          .studio-hero::after  { background: var(--gold-hex); opacity: 0.10; }
        `}</style>
        <div className="studio-hero ambient" style={{ position: "absolute", inset: 0, padding: 0 }}/>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="t-eyebrow" style={{ color: "var(--gold-light-hex)", marginBottom: 10 }}>Studio</div>
            <h1 className="t-display" style={{ fontSize: 36, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
              Welcome back, {analyst.first}.
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "10px 0 0", lineHeight: 1.55 }}>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-sm"
              onClick={() => navigate("/editor")}
              style={{
                background: "transparent",
                color: "#fff",
                border: "0.5px solid rgba(255,255,255,0.25)",
              }}
            >
              <Plus size={13} strokeWidth={1.7}/> New prediction
            </button>
            <button className="btn btn-gold btn-sm" onClick={() => navigate("/editor")}>
              <PenLine size={13} strokeWidth={1.7}/> Compose report
            </button>
          </div>
        </div>
      </section>

      {/* KPI cards — sit on the bottom edge of the banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: -30, marginBottom: 28, position: "relative", zIndex: 2 }}>
        {kpis.map((s) => {
          const Icon = s.icon;
          const color = s.tone === "green" ? "var(--rolex-green)"
            : s.tone === "navy" ? "var(--primary-blue)"
            : s.tone === "gold" ? "var(--gold-hex)"
            : "var(--text)";
          return (
            <div key={s.l} className="surface" style={{ padding: 18, background: "var(--bg-elev)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span className="t-meta">{s.l}</span>
                {Icon && <Icon size={14} strokeWidth={1.5} style={{ color: "var(--text-meta)" }}/>}
              </div>
              <div className="t-num" style={{ fontSize: 28, color, letterSpacing: "-0.02em" }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 4, fontSize: 11 }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two col: chart + insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 28 }}>
        <div className="surface" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div className="t-eyebrow">Elo trajectory · 12 weeks</div>
              <div className="t-num" style={{ fontSize: 26, color: "var(--primary-blue)", marginTop: 6 }}>
                {analyst.elo}
                <span className="t-num" style={{ fontSize: 13, color: "var(--rolex-green)", marginLeft: 6 }}>
                  {analyst.weekDelta != null && analyst.weekDelta >= 0 ? "+" : ""}{analyst.weekDelta ?? 0}
                </span>
              </div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            {trackSeries.length > 0 ? (
              <TrackChart data={trackSeries} height={200}/>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="t-meta">No Elo history yet.</span>
              </div>
            )}
          </div>
        </div>

        <div className="surface" style={{ padding: 22 }}>
          <div className="t-eyebrow" style={{ marginBottom: 14 }}>Insights · this week</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { c: "var(--rolex-green)", h: `${openCalls.length} open positions`, t: openCalls.length ? "Tracking toward window close." : "No open calls right now — publish to update your record." },
              { c: "var(--primary-blue)", h: "Subscriber pulse", t: `${analyst.subscribers || 0} subscribers active.` },
              { c: "var(--gold-hex)", h: "Audit trail intact", t: "Every call you've published is locked at entry and graded on close." },
            ].map((i, idx) => (
              <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ width: 6, height: 6, background: i.c, borderRadius: "50%", marginTop: 6, flexShrink: 0 }}/>
                <div>
                  <div className="t-body" style={{ fontSize: 13, color: "var(--text)", marginBottom: 2 }}>{i.h}</div>
                  <div className="t-meta" style={{ fontSize: 12, lineHeight: 1.5 }}>{i.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open predictions */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="t-title" style={{ fontSize: 17, margin: 0 }}>Open predictions</h3>
        <button className="btn btn-text btn-sm">Manage all <ArrowRight size={12}/></button>
      </div>
      {openCalls.length === 0 ? (
        <div className="surface" style={{ padding: 32, textAlign: "center", marginBottom: 28 }}>
          <span className="t-meta">No open positions yet.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {openCalls.slice(0, 4).map((c) => (
            <LockedPredictionCard key={c.id} call={c} compact/>
          ))}
        </div>
      )}

      {/* Top reports */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="t-title" style={{ fontSize: 17, margin: 0 }}>Top reports · last 30 days</h3>
        <button className="btn btn-text btn-sm" onClick={() => navigate("/analytics")}>
          Analytics <ArrowRight size={12}/>
        </button>
      </div>
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        {topReports.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <span className="t-meta">No reports published yet.</span>
          </div>
        ) : (
          topReports.map((r, i, arr) => (
            <Link
              key={r.id}
              to={`/report?id=${r.id}`}
              style={{
                display: "flex", alignItems: "center", padding: "16px 22px", gap: 22,
                borderBottom: i < arr.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
                textDecoration: "none", color: "inherit",
              }}
            >
              <div className="t-meta" style={{ width: 22 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div className="t-body" style={{ fontSize: 14, color: "var(--text)" }}>{r.title}</div>
                <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                  {r.created_date ? new Date(r.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </div>
              </div>
              <div style={{ width: 80, textAlign: "right" }}>
                <div className="t-num" style={{ fontSize: 13 }}>{(r.views || 0).toLocaleString()}</div>
                <div className="t-meta" style={{ fontSize: 10.5 }}>Reads</div>
              </div>
              <div style={{ width: 80, textAlign: "right" }}>
                <div className="t-num" style={{ fontSize: 13, color: "var(--primary-blue)" }}>{r.likes || 0}</div>
                <div className="t-meta" style={{ fontSize: 10.5 }}>Likes</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// ── Audience ─────────────────────────────────────────────────────────────────
function Audience({ subscribers }) {
  const stats = [
    { l: "Subscribers", v: subscribers.length.toLocaleString(), sub: "+ recently joined", tone: "navy" },
    { l: "Free followers", v: "—", sub: "Public reach" },
    { l: "Conversion", v: "—", sub: "Free → paid" },
    { l: "Churn · 30d", v: "—", sub: "" },
  ];
  return (
    <div>
      <h1 className="t-display" style={{ fontSize: 28, margin: "0 0 24px" }}>Audience</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.l} className="surface" style={{ padding: 18 }}>
            <div className="t-meta">{s.l}</div>
            <div className="t-num" style={{
              fontSize: 26, marginTop: 6,
              color: s.tone === "navy" ? "var(--primary-blue)" : "var(--text)",
            }}>{s.v}</div>
            <div className="t-meta" style={{ fontSize: 11, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 22px", borderBottom: "0.5px solid var(--border-rgba)" }}>
          <h3 className="t-title" style={{ fontSize: 15, margin: 0 }}>Recent subscribers</h3>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost btn-sm">Export CSV</button>
        </div>
        {subscribers.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <span className="t-meta">No subscribers yet.</span>
          </div>
        ) : (
          subscribers.slice(0, 10).map((s, i, arr) => {
            const name = s.subscriber_name || s.subscriber_email?.split("@")[0] || "Subscriber";
            const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={s.id || i} style={{
                display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1fr 0.6fr",
                padding: "12px 22px", alignItems: "center",
                borderBottom: i < arr.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="sm"/>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text)" }}>{name}</div>
                    <div className="t-meta" style={{ fontSize: 11 }}>{s.subscriber_email}</div>
                  </div>
                </div>
                <div className="t-meta" style={{ fontSize: 12 }}>
                  {s.created_date ? new Date(s.created_date).toLocaleDateString() : "—"}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-body)" }}>
                  {s.plan || "Premium"}
                </div>
                <div className="t-num" style={{ fontSize: 13, color: "var(--gold-hex)" }}>
                  ${s.lifetime_amount || s.monthly_amount || "—"}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: 28, padding: 0 }} aria-label="Subscriber options">
                    <MoreHorizontal size={14}/>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Earnings ─────────────────────────────────────────────────────────────────
function Earnings({ wallet, lifetime }) {
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const series = wallet?.history || months.map((m) => ({ m, v: 0 }));
  const max = Math.max(...series.map((s) => s.v || 0), 1000);

  return (
    <div>
      <h1 className="t-display" style={{ fontSize: 28, margin: "0 0 24px" }}>Earnings</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 22 }}>
        <div className="surface ambient" style={{
          padding: 28,
          background: "var(--deepest-navy)", color: "#fff",
          borderColor: "rgba(255,255,255,0.10)",
        }}>
          <style>{`
            .earn-amb::before { background: var(--gold-hex); opacity: 0.18; }
            .earn-amb::after { background: var(--primary-blue); opacity: 0.22; }
          `}</style>
          <div className="earn-amb ambient" style={{ position: "absolute", inset: 0, padding: 0 }}/>
          <div className="t-eyebrow" style={{ color: "var(--gold-light-hex)" }}>Available balance</div>
          <div className="t-num" style={{
            fontSize: 56, color: "var(--gold-light-hex)",
            letterSpacing: "-0.025em", marginTop: 8,
          }}>
            ${Math.floor(wallet?.balance || 0).toLocaleString()}.
            <span style={{ fontSize: 32, opacity: 0.6 }}>
              {String((((wallet?.balance || 0) * 100) % 100).toFixed(0)).padStart(2, "0")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 14, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            <span>Next payout via Stripe</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button className="btn btn-gold btn-sm">Withdraw <ArrowRight size={13}/></button>
            <Link
              to="/wallet"
              className="btn btn-sm"
              style={{ background: "rgba(255,255,255,0.10)", color: "#fff", borderRadius: 6, textDecoration: "none" }}
            >
              Transaction history
            </Link>
          </div>
        </div>

        <div className="surface" style={{ padding: 22 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Lifetime · paid to you</div>
          <div className="t-num" style={{ fontSize: 36, color: "var(--text)", letterSpacing: "-0.02em" }}>
            ${lifetime.toLocaleString()}
          </div>
          <div className="t-meta" style={{ marginTop: 8 }}>
            Stoa fee · 10% · ${Math.round(lifetime * 0.111).toLocaleString()} retained
          </div>
        </div>
      </div>

      {/* Payout history — keeps Earnings focused on the wallet/cashflow view.
          Revenue analytics charts moved to the Analytics tab. */}
      <h3 className="t-title" style={{ fontSize: 17, margin: "20px 0 12px" }}>
        Recent payouts
      </h3>
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        {(wallet?.payouts || []).length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <span className="t-meta">No payouts yet. They'll appear here as soon as you withdraw to Stripe.</span>
          </div>
        ) : (
          (wallet.payouts || []).slice(0, 8).map((p, i, arr) => (
            <div
              key={p.id || i}
              style={{
                display: "flex", alignItems: "center", padding: "14px 22px", gap: 20,
                borderBottom: i < arr.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="t-body" style={{ fontSize: 13 }}>{p.description || "Stripe payout"}</div>
                <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                  {p.date ? new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </div>
              </div>
              <div className="t-num" style={{ fontSize: 14, color: "var(--text)" }}>
                ${(p.amount || 0).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Revenue chart — extracted so Analytics can render it without dragging
// in the rest of the Earnings wallet card. Same look & data series. ─────
function RevenueChart({ wallet }) {
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const series = wallet?.history || months.map((m) => ({ m, v: 0 }));
  const max = Math.max(...series.map((s) => s.v || 0), 1000);
  return (
    <div>
      <h3 className="t-title" style={{ fontSize: 17, margin: "0 0 12px" }}>
        Revenue · last 6 months
      </h3>
      <div className="surface" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 220 }}>
          {series.map((m, i) => (
            <div key={m.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", maxWidth: 60, marginInline: "auto" }}>
                <div style={{
                  width: "100%",
                  height: `${(m.v / max) * 100}%`,
                  background: i === series.length - 1 ? "var(--gold-hex)" : "var(--primary-blue)",
                  opacity: i === series.length - 1 ? 0.95 : 0.45,
                  borderRadius: "4px 4px 0 0",
                  position: "relative",
                }}>
                  <span className="t-num" style={{
                    position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                    fontSize: 11,
                    color: i === series.length - 1 ? "var(--gold-hex)" : "var(--text-mute)",
                  }}>
                    ${(m.v / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
              <span className="t-meta" style={{ fontSize: 11 }}>{m.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Predictions section ──────────────────────────────────────────────────────
function PredictionsStudio({ openCalls, resolvedCalls, navigate }) {
  const total = openCalls.length + resolvedCalls.length;
  const hits = resolvedCalls.filter((c) => c.grade === "HIT" || c.grade === "NEAR").length;
  const hitRate = resolvedCalls.length ? Math.round((hits / resolvedCalls.length) * 100) : 0;
  const avgReturn = resolvedCalls.length
    ? resolvedCalls.reduce((s, c) => s + c.change, 0) / resolvedCalls.length
    : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="t-display" style={{ fontSize: 28, margin: 0 }}>Predictions</h1>
        <button className="btn btn-gold btn-sm" onClick={() => navigate("/editor")}>
          <Plus size={13} strokeWidth={1.7}/> New prediction
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
        {[
          ["Open", openCalls.length, "var(--primary-blue)"],
          ["Resolved", resolvedCalls.length, "var(--rolex-green)"],
          ["Hit rate", `${hitRate}%`, "var(--rolex-green)"],
          ["Avg. return", `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%`, avgReturn >= 0 ? "var(--rolex-green)" : "var(--velvet-red)"],
        ].map(([l, v, c]) => (
          <div key={l} className="surface" style={{ padding: 16, flex: 1 }}>
            <div className="t-meta">{l}</div>
            <div className="t-num" style={{ fontSize: 24, color: c, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <h3 className="t-title" style={{ fontSize: 17, margin: "20px 0 12px" }}>Open</h3>
      {openCalls.length === 0 ? (
        <div className="surface" style={{ padding: 32, textAlign: "center", marginBottom: 28 }}>
          <span className="t-meta">No open positions.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {openCalls.map((c) => <LockedPredictionCard key={c.id} call={c}/>)}
        </div>
      )}

      <h3 className="t-title" style={{ fontSize: 17, margin: "20px 0 12px" }}>Recently resolved</h3>
      {resolvedCalls.length === 0 ? (
        <div className="surface" style={{ padding: 32, textAlign: "center" }}>
          <span className="t-meta">No resolved calls yet.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {resolvedCalls.slice(0, 6).map((c) => <LockedPredictionCard key={c.id} call={c} compact/>)}
        </div>
      )}
    </div>
  );
}

function Placeholder({ name }) {
  return (
    <div className="surface" style={{
      padding: 80, display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 10, textAlign: "center",
    }}>
      <h2 className="t-display" style={{ fontSize: 28, margin: 0, textTransform: "capitalize" }}>{name}</h2>
      <p className="t-meta">Coming soon — full screen design pending.</p>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
// Monetization controls — subscription price, payout details. The
// subscription price is the per-month USD figure shown on the analyst's
// public profile and used by SubscribeCTA / WalletConfirmDialog.
function StudioSettings({ user }) {
  const [price, setPrice] = useState(user?.monthly_price ?? 9);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  useEffect(() => {
    if (user?.monthly_price != null) setPrice(user.monthly_price);
  }, [user?.monthly_price]);

  const save = async () => {
    const v = Math.min(200, Math.max(5, Number(price) || 5));
    setSaving(true);
    try {
      await base44.auth.updateMyUserData({ monthly_price: v });
      setSavedMsg("Saved.");
      setTimeout(() => setSavedMsg(null), 2200);
    } catch {
      setSavedMsg("Save failed.");
      setTimeout(() => setSavedMsg(null), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <h1 className="t-display" style={{ fontSize: 28, margin: 0 }}>Settings</h1>

      <div className="surface" style={{ padding: 24 }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Monetization</div>
        <h3 className="t-title" style={{ fontSize: 18, margin: "0 0 4px" }}>Monthly subscription price</h3>
        <p className="t-meta" style={{ fontSize: 12, lineHeight: 1.5, margin: "0 0 18px" }}>
          The price shown on your public profile. Subscribers pay this every
          month for full access to your reports and DMs. You keep 90% — Stoa
          fee is 10%.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center",
            border: "0.5px solid var(--border-strong)",
            borderRadius: 6,
            background: "var(--bg-elev)",
            padding: "0 14px",
            height: 44,
          }}>
            <span className="t-num" style={{ fontSize: 22, color: "var(--gold-hex)" }}>$</span>
            <input
              type="number"
              min={5}
              max={200}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{
                width: 80, height: 38,
                border: 0, outline: 0, background: "transparent",
                padding: "0 6px",
                fontFamily: "var(--f-mono)", fontSize: 22,
                color: "var(--text)", textAlign: "right",
              }}
            />
            <span className="t-meta" style={{ fontSize: 12, marginLeft: 6 }}>/ mo</span>
          </div>
          <button
            className="btn btn-gold btn-sm"
            onClick={save}
            disabled={saving || !(Number(price) >= 5 && Number(price) <= 200)}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {savedMsg && (
            <span className="t-meta" style={{ fontSize: 11.5, color: savedMsg === "Saved." ? "var(--rolex-green)" : "var(--velvet-red)" }}>
              {savedMsg}
            </span>
          )}
        </div>
        <p className="t-meta" style={{ fontSize: 11, marginTop: 10 }}>
          Range: $5 – $200 / month. Existing subscribers keep their old price
          until they cancel and re-subscribe.
        </p>
      </div>

      <div className="surface" style={{ padding: 24 }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Payout</div>
        <h3 className="t-title" style={{ fontSize: 18, margin: "0 0 4px" }}>Withdrawals via Stripe</h3>
        <p className="t-meta" style={{ fontSize: 12, lineHeight: 1.55, margin: 0 }}>
          Stripe Express is the only payout method. Manage your connected
          account from the Earnings tab.
        </p>
      </div>
    </div>
  );
}

/**
 * AnalystDashboard — Studio (v3 rebuild).
 * Layout per prototype/src/screens/dashboard.jsx: 240px left sidebar +
 * flexible main with Overview / Compose / Predictions / Audience /
 * Earnings tabs.
 */
export default function AnalystDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [section, setSection] = useState("overview");
  const [myReports, setMyReports] = useState([]);
  const [myPredictions, setMyPredictions] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    Promise.all([
      base44.entities.Report.filter({ created_by: user.email }, "-created_date", 200).catch(() => []),
      base44.entities.Prediction.filter({ created_by: user.email }, "-created_date", 200).catch(() => []),
      base44.entities.Subscription.filter({ analyst_email: user.email, status: "active" }, "-created_date", 200).catch(() => []),
      base44.entities.User.filter({ email: user.email }).catch(() => []),
      loadMyWallet ? loadMyWallet().catch(() => null) : Promise.resolve(null),
    ]).then(([reports, preds, subs, users, w]) => {
      if (cancelled) return;
      setMyReports(reports || []);
      setMyPredictions(preds || []);
      setSubscribers(subs || []);
      setProfile(users?.[0] || null);
      setWallet(w);
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user?.email]);

  const calls = useMemo(() => myPredictions.map(predToCall), [myPredictions]);
  const openCalls = calls.filter((c) => c.status === "open");
  const resolvedCalls = calls.filter((c) => c.status === "resolved");
  const publishedReports = myReports.filter((r) => r.status === "published");
  const topReports = [...publishedReports].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  const elo = profile?.elo ?? Math.round(((profile?.accuracy_score || 60) / 100) * 800 + 600);
  const weekDelta = profile?.elo_week_delta || 0;
  const rank = profile?.rank || profile?.leaderboard_rank;
  const tier = elo >= 1200 ? "Stoic" : elo >= 1000 ? "Disciple" : elo >= 800 ? "Adept" : "Novitiate";
  const firstName = (profile?.full_name || user?.full_name || user?.email?.split("@")[0] || "Researcher").split(" ")[0];
  const initials = (profile?.full_name || user?.full_name || user?.email || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const analyst = {
    name: profile?.full_name || user?.full_name || user?.email,
    first: firstName,
    initials, tier, rank, elo, weekDelta,
    subscribers: subscribers.length,
  };

  const trackSeries = useMemo(() => {
    const N = 12;
    const start = Math.max(600, elo - 200);
    return Array.from({ length: N }, (_, i) => Math.round(start + ((elo - start) * i) / (N - 1)));
  }, [elo]);

  const kpis = [
    { l: "Elo this week", v: weekDelta >= 0 ? `+${weekDelta}` : `${weekDelta}`, sub: `${elo} current`, tone: weekDelta >= 0 ? "green" : "red", icon: TrendingUp },
    { l: "New subscribers", v: `+${subscribers.filter((s) => new Date(s.created_date) > new Date(Date.now() - 30 * 86400e3)).length}`, sub: `${subscribers.length} total`, tone: "navy", icon: Users },
    { l: "Revenue · 30d", v: `$${Math.round((wallet?.month_revenue || 0)).toLocaleString()}`, sub: "Net of platform fee", tone: "gold", icon: WalletIcon },
    { l: "Open predictions", v: openCalls.length, sub: `${resolvedCalls.length} resolved`, icon: Lock },
  ];

  const lifetime = (wallet?.lifetime_earnings)
    ?? subscribers.reduce((s, x) => s + (x.lifetime_amount || x.monthly_amount || 0), 0);

  const counts = {
    predictions: openCalls.length,
    publications: publishedReports.length,
    audience: subscribers.length,
  };

  return (
    <div className="page" style={{ background: "var(--bg)", display: "flex", minHeight: "calc(100vh - 64px)" }}>
      <Sidebar section={section} setSection={setSection} analyst={analyst} counts={counts}/>

      <main style={{ flex: 1, padding: "32px 40px 80px", maxWidth: 1080 }}>
        {loading && (
          <div style={{ padding: 60, textAlign: "center" }}>
            <span className="t-meta">Loading studio…</span>
          </div>
        )}
        {!loading && section === "overview" && (
          <Overview analyst={analyst} kpis={kpis} trackSeries={trackSeries}
            openCalls={openCalls} topReports={topReports} navigate={navigate}/>
        )}
        {!loading && section === "compose" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h1 className="t-display" style={{ fontSize: 28, margin: 0 }}>Compose</h1>
              <button className="btn btn-gold btn-sm" onClick={() => navigate("/editor")}>
                Open full editor <ArrowRight size={12}/>
              </button>
            </div>
            <div className="surface" style={{ padding: 32, textAlign: "center" }}>
              <p className="t-body" style={{ fontSize: 14, color: "var(--text-mute)" }}>
                Drafts and quick compose live in the full editor.
              </p>
              <button className="btn btn-gold btn-sm" style={{ marginTop: 12 }} onClick={() => navigate("/editor")}>
                <PenLine size={13}/> Start a draft
              </button>
            </div>
          </div>
        )}
        {!loading && section === "predictions" && (
          <PredictionsStudio openCalls={openCalls} resolvedCalls={resolvedCalls} navigate={navigate}/>
        )}
        {!loading && section === "publications" && (
          <div>
            <h1 className="t-display" style={{ fontSize: 28, margin: "0 0 24px" }}>Publications</h1>
            <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
              {publishedReports.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <span className="t-meta">No reports published yet.</span>
                </div>
              ) : (
                publishedReports.map((r, i, arr) => (
                  <Link
                    key={r.id}
                    to={`/report?id=${r.id}`}
                    style={{
                      display: "flex", padding: "16px 22px", gap: 22, alignItems: "center",
                      borderBottom: i < arr.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
                      textDecoration: "none", color: "inherit",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="t-body" style={{ fontSize: 14, color: "var(--text)" }}>{r.title}</div>
                      <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                        {new Date(r.created_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="t-num" style={{ fontSize: 13, width: 80, textAlign: "right" }}>
                      {(r.views || 0).toLocaleString()}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
        {!loading && section === "audience" && <Audience subscribers={subscribers}/>}
        {!loading && section === "messages" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h1 className="t-display" style={{ fontSize: 28, margin: "0 0 4px" }}>Messages</h1>
              <p className="t-meta">Private threads with your subscribers.</p>
            </div>
            <DashboardDMs subscribers={subscribers} currentUser={user}/>
          </div>
        )}
        {!loading && section === "earnings" && (
          <Earnings wallet={wallet} lifetime={lifetime}/>
        )}
        {!loading && section === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <h1 className="t-display" style={{ fontSize: 28, margin: "0 0 8px" }}>Analytics</h1>
            {/* Revenue analytics live here, not in Earnings. Earnings stays
                focused on balance + withdrawal + payout history. */}
            <RevenueChart wallet={wallet}/>
            <RevenueInsightsPanel/>
            <TwitsPanel currentUser={user}/>
            <WatchlistPanel reports={myReports}/>
          </div>
        )}
        {!loading && section === "settings" && <StudioSettings user={user}/>}
      </main>
    </div>
  );
}
