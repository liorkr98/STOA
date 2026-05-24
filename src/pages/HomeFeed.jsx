import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Filter, ChevronDown, Clock, Eye, MessageSquare, Lock, ArrowRight,
} from "lucide-react";
import { Avatar } from "@/components/AnalystCard";
import { analystHref } from "@/lib/analystSlug";

// ── Filter sectors (top of feed) ─────────────────────────────────────────────
const FILTERS = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech" },
  { id: "macro", label: "Macro" },
  { id: "energy", label: "Energy" },
  { id: "crypto", label: "Crypto" },
  { id: "auto", label: "Auto & Industrial" },
];

const TRENDING_TICKERS = [
  { ticker: "NVDA", change: 3.2,  vol: "Heavy" },
  { ticker: "TSM",  change: 2.1,  vol: "Normal" },
  { ticker: "TLT",  change: -0.8, vol: "Heavy" },
  { ticker: "META", change: 1.4,  vol: "Normal" },
  { ticker: "BTC",  change: 4.8,  vol: "Heavy" },
  { ticker: "GLD",  change: 0.6,  vol: "Light" },
];

function sectorMatch(report, sector) {
  if (sector === "all") return true;
  const txt = (report.industry || report.sector || report.tags || "")
    .toString().toLowerCase();
  return txt.includes(sector);
}

function kindBadge(kind) {
  const k = (kind || "REPORT").toUpperCase();
  if (k === "CALL")
    return { color: "var(--gold-hex)", border: "0.5px solid rgba(212,175,55,0.45)", background: "rgba(212,175,55,0.06)" };
  if (k === "POST")
    return { color: "var(--text-mute)", border: "0.5px solid var(--border-strong)", background: "var(--bg-soft)" };
  return { color: "var(--primary-blue)", border: "0.5px solid rgba(30,58,138,0.25)", background: "rgba(30,58,138,0.04)" };
}

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── A single feed article card ───────────────────────────────────────────────
function FeedItem({ report, author, onOpen }) {
  const kind = (report.kind || (report.is_quick_post ? "POST" : "REPORT")).toUpperCase();
  const ks = kindBadge(kind);
  const tickers = report.prediction_ticker
    ? [report.prediction_ticker]
    : (report.tickers || []).slice(0, 3);
  const dir = report.prediction_action; // "Long" | "Short" | "Hold"
  const isLong = dir === "Long";
  const isShort = dir === "Short";
  const hasPrediction = !!dir && tickers.length > 0;

  const elo = author?.elo ?? Math.round((author?.accuracy_score || 60) * 10);
  const accuracy = author?.accuracy_score || 0;
  const authorName = author?.full_name || report.author_name || "Researcher";
  const initials = (authorName || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <article
      className="surface surface-interactive"
      style={{ padding: 24, cursor: "pointer" }}
      onClick={onOpen}
    >
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="md"/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="t-title" style={{ fontSize: 14 }}>{authorName}</span>
            {author?.title && (<>
              <span className="t-meta">·</span>
              <span className="t-meta">{author.title}</span>
            </>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            {elo > 0 && (
              <span className="t-meta" style={{ fontSize: 11 }}>
                Elo <span className="t-num" style={{ color: "var(--primary-blue)" }}>{elo}</span>
              </span>
            )}
            {accuracy > 0 && (<>
              <span className="t-meta">·</span>
              <span className="t-meta" style={{ fontSize: 11 }}>{accuracy}% accuracy</span>
            </>)}
            <span className="t-meta">·</span>
            <span className="t-meta" style={{ fontSize: 11 }}>{timeAgo(report.created_date)}</span>
          </div>
        </div>
        <span style={{
          height: 22, padding: "0 8px", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 4,
          display: "inline-flex", alignItems: "center", ...ks,
        }}>
          {report.is_premium && (
            <span style={{ width: 5, height: 5, background: "var(--gold-hex)", borderRadius: "50%", marginRight: 6 }}/>
          )}
          {kind}
        </span>
      </div>

      {/* Headline */}
      <h2 className="t-title" style={{ fontSize: 22, lineHeight: 1.25, margin: "0 0 10px", letterSpacing: "-0.012em" }}>
        {report.title}
      </h2>

      {report.excerpt && (
        <p className="t-body" style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--text-mute)", margin: "0 0 18px" }}>
          {report.excerpt}
        </p>
      )}

      {/* Locked prediction summary */}
      {hasPrediction && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", background: "var(--bg-elev)",
          border: "0.5px solid var(--border-rgba)", borderRadius: 8,
          marginBottom: 16,
        }}>
          <Lock size={14} strokeWidth={1.5} style={{ color: "var(--text-meta)" }}/>
          <span className="t-meta" style={{ fontSize: 11 }}>LOCKED PREDICTION</span>
          <div className="vr" style={{ height: 14 }}/>
          <span className={`tag ${isLong ? "tag-long" : isShort ? "tag-short" : "tag-hold"}`}>
            {dir.toUpperCase()} {tickers[0]}
          </span>
          {report.prediction_target_price && report.prediction_entry_price && (<>
            <div style={{ flex: 1 }}/>
            <span className="t-meta" style={{ fontSize: 11 }}>Target</span>
            <span className="t-num" style={{ fontSize: 13, color: "var(--text)" }}>
              ${Number(report.prediction_target_price).toFixed(2)}
            </span>
          </>)}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 14 }}>
          {report.read_time_min && (
            <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={12} strokeWidth={1.5}/> {report.read_time_min} min
            </span>
          )}
          {report.views != null && (
            <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Eye size={12} strokeWidth={1.5}/>
              {report.views >= 1000 ? `${(report.views/1000).toFixed(1)}k` : report.views}
            </span>
          )}
          {report.comment_count != null && (
            <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={12} strokeWidth={1.5}/> {report.comment_count}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tickers.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

/**
 * HomeFeed — discover feed (v3 rebuild).
 * Layout per prototype/src/screens/explore.jsx: section banner, view toggle,
 * filter chips, 2-col grid (sticky leaderboard rail + main feed).
 */
export default function HomeFeed() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeSector, setActiveSector] = useState("all");
  // Views: trending (default), following (authed only), subscriptions (authed
  // only), analysts (grid). Following + Subscriptions restored from backup.
  const [view, setView] = useState("trending");
  const [reports, setReports] = useState([]);
  const [topAnalysts, setTopAnalysts] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  // Following + Subscription state — restored from backup
  const [followedEmails, setFollowedEmails] = useState(new Set());
  const [subscribedEmails, setSubscribedEmails] = useState(new Set());

  useEffect(() => {
    base44.entities.Report.filter({ status: "published" }, "-created_date", 200)
      .then((d) => setReports(d || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 50)
      .then((d) => {
        const users = d || [];
        setTopAnalysts(users.filter((u) => u.accuracy_score > 0).slice(0, 10));
        const map = {};
        users.forEach((u) => { if (u.email) map[u.email] = u; });
        setUserMap(map);
      })
      .catch(() => {});
  }, []);

  // Follows + subscriptions, so Following/Subscriptions tabs can filter
  // the feed to people the current user actually cares about.
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    Promise.all([
      base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 100).catch(() => []),
      base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 100).catch(() => []),
    ]).then(([follows, subs]) => {
      setFollowedEmails(new Set((follows || []).map((f) => f.analyst_email)));
      setSubscribedEmails(new Set((subs || []).map((s) => s.analyst_email)));
    });
  }, [isAuthenticated, user?.email]);

  const filteredReports = useMemo(() => {
    let next = reports.filter((r) => sectorMatch(r, activeSector));
    if (view === "following") next = next.filter((r) => followedEmails.has(r.created_by));
    if (view === "subscriptions") next = next.filter((r) => subscribedEmails.has(r.created_by));
    return next.slice(0, 30);
  }, [reports, activeSector, view, followedEmails, subscribedEmails]);

  const leaderboard = useMemo(() => topAnalysts.slice(0, 6), [topAnalysts]);

  const goPublish = () => {
    if (isAuthenticated) navigate("/dashboard");
    else navigate("/signin");
  };

  return (
    <div className="page" style={{ background: "var(--bg)" }}>
      {/* Section banner */}
      <section style={{ padding: "40px 0 28px", borderBottom: "0.5px solid var(--border-rgba)" }}>
        <div className="shell">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 12 }}>The Stoa</div>
              <h1 className="t-display" style={{ fontSize: 44, margin: 0 }}>
                Read what's <em style={{ fontStyle: "italic" }}>working</em>.
              </h1>
              <p className="t-body" style={{ fontSize: 15, color: "var(--text-mute)", margin: "10px 0 0", maxWidth: 540 }}>
                Live research from analysts ranked by their record. Every prediction in this feed is locked and grading toward a public Elo.
              </p>
            </div>

            <div style={{
              display: "flex", gap: 8, padding: 4,
              border: "0.5px solid var(--border-strong)", borderRadius: 8,
              background: "var(--bg-elev)",
            }}>
              {[
                { id: "trending", label: "Trending" },
                ...(isAuthenticated ? [
                  { id: "following", label: "Following" },
                  { id: "subscriptions", label: "Subscriptions" },
                ] : []),
                { id: "analysts", label: "Researchers" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className="btn btn-sm"
                  style={{
                    background: view === v.id ? "var(--deepest-navy)" : "transparent",
                    color: view === v.id ? "#fff" : "var(--text-mute)",
                    borderRadius: 6, height: 28, padding: "0 12px",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filter row */}
      <section style={{ padding: "20px 0", borderBottom: "0.5px solid var(--border-rgba)", background: "var(--bg)" }}>
        <div className="shell" style={{ display: "flex", gap: 22, justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveSector(f.id)}
                className="btn btn-sm"
                style={{
                  background: activeSector === f.id ? "var(--bg-soft)" : "transparent",
                  border: "0.5px solid",
                  borderColor: activeSector === f.id ? "var(--border-strong)" : "var(--border-rgba)",
                  color: activeSector === f.id ? "var(--text)" : "var(--text-mute)",
                  height: 30, padding: "0 12px", fontWeight: 500,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn btn-ghost btn-sm">
              <Filter size={14}/> Filters · 0
            </button>
            <span className="t-meta">Sorted by</span>
            <button className="btn btn-sm" style={{ color: "var(--text)", padding: "0 10px" }}>
              Elo · descending <ChevronDown size={12}/>
            </button>
          </div>
        </div>
      </section>

      {/* Main 2-col */}
      <div className="shell" style={{
        display: "grid", gridTemplateColumns: "1fr 1.7fr",
        gap: 36, padding: "32px 32px 80px",
      }}>
        {/* Left rail */}
        <aside style={{
          position: "sticky", top: 78, alignSelf: "start",
          maxHeight: "calc(100vh - 100px)", overflowY: "auto", paddingRight: 4,
        }}>
          {/* Mini leaderboard */}
          <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--border-rgba)", display: "flex", alignItems: "center" }}>
              <span className="t-eyebrow">Leaderboard · this month</span>
              <div style={{ flex: 1 }}/>
              <span className="t-meta" style={{ color: "var(--gold-hex)" }}>Top 25</span>
            </div>
            <div>
              {leaderboard.length === 0 && (
                <div style={{ padding: 18 }}>
                  <span className="t-meta">Loading…</span>
                </div>
              )}
              {leaderboard.map((u, i) => {
                const elo = u.elo ?? Math.round((u.accuracy_score || 60) * 10);
                const initials = (u.full_name || u.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={u.email || i}
                    to={analystHref ? analystHref(u) : `/analyst/${u.username || u.email}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 18px",
                      borderBottom: i < leaderboard.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
                      transition: "background var(--t-fast) var(--ease)",
                      textDecoration: "none", color: "inherit",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-soft)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span className="t-num" style={{ fontSize: 12, width: 22, color: "var(--text-meta)" }}>#{i + 1}</span>
                    <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="sm"/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t-title" style={{ fontSize: 13.5, lineHeight: 1.2 }}>{u.full_name || u.email?.split("@")[0]}</div>
                      <div className="t-meta" style={{ fontSize: 11 }}>{u.bio?.slice(0, 32) || u.title || "Researcher"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="t-num" style={{ fontSize: 13, color: "var(--primary-blue)" }}>{elo}</div>
                      <div className="t-meta" style={{ fontSize: 10 }}>{u.accuracy_score || 0}%</div>
                    </div>
                  </Link>
                );
              })}
              <div style={{ display: "flex", justifyContent: "center", padding: 12, borderTop: "0.5px solid var(--border-rgba)" }}>
                <Link to="/leaderboard" className="btn btn-text btn-sm" style={{ textDecoration: "none" }}>
                  View all ranked <ArrowRight size={12}/>
                </Link>
              </div>
            </div>
          </div>

          {/* Trending tickers */}
          <div className="surface" style={{ padding: 0, marginTop: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--border-rgba)", display: "flex", alignItems: "center" }}>
              <span className="t-eyebrow">Trending tickers</span>
              <div style={{ flex: 1 }}/>
              <span className="t-meta">24h</span>
            </div>
            <div>
              {TRENDING_TICKERS.map((t, i) => (
                <Link
                  key={t.ticker}
                  to={`/stock/${t.ticker}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 18px",
                    borderBottom: i < TRENDING_TICKERS.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
                    textDecoration: "none", color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="t-num" style={{ fontSize: 13, width: 48, color: "var(--text)" }}>{t.ticker}</span>
                    <span className="t-meta" style={{ fontSize: 11 }}>{t.vol} vol</span>
                  </div>
                  <span className="t-num" style={{ fontSize: 13, color: t.change >= 0 ? "var(--rolex-green)" : "var(--velvet-red)" }}>
                    {t.change >= 0 ? "+" : ""}{t.change.toFixed(1)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Promo */}
          <div className="surface" style={{
            padding: 22, marginTop: 16,
            background: "var(--deepest-navy)",
            borderColor: "rgba(255,255,255,0.10)",
            color: "#fff",
          }}>
            <div className="t-eyebrow" style={{ color: "var(--gold-light-hex)" }}>For Researchers</div>
            <h4 className="t-title" style={{ fontSize: 17, color: "#fff", margin: "8px 0 8px" }}>Publish where the record matters.</h4>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", lineHeight: 1.55, margin: "0 0 14px" }}>
              Keep 90%. Own your audience. Let your Elo do the marketing.
            </p>
            <button className="btn btn-gold btn-sm" onClick={goPublish}>
              Start publishing <ArrowRight size={12}/>
            </button>
          </div>
        </aside>

        {/* Feed */}
        <main>
          {loading && (
            <div style={{ padding: 60, textAlign: "center" }}>
              <span className="t-meta">Loading research…</span>
            </div>
          )}

          {!loading && view !== "analysts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredReports.length === 0 ? (
                <div className="surface" style={{ padding: 60, textAlign: "center" }}>
                  <span className="t-meta">No reports match those filters yet.</span>
                </div>
              ) : (
                filteredReports.map((r) => (
                  <FeedItem
                    key={r.id}
                    report={r}
                    author={userMap[r.created_by]}
                    onOpen={() => navigate(`/report?id=${r.id}`)}
                  />
                ))
              )}
            </div>
          )}

          {!loading && view === "analysts" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {topAnalysts.length === 0 ? (
                <div className="surface" style={{ padding: 40, textAlign: "center", gridColumn: "1 / -1" }}>
                  <span className="t-meta">No researchers yet.</span>
                </div>
              ) : (
                topAnalysts.slice(0, 20).map((u) => {
                  const elo = u.elo ?? Math.round((u.accuracy_score || 60) * 10);
                  const initials = (u.full_name || u.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Link
                      key={u.email}
                      to={analystHref ? analystHref(u) : `/analyst/${u.username || u.email}`}
                      className="surface surface-interactive"
                      style={{ padding: 22, cursor: "pointer", textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="lg"/>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="t-title" style={{ fontSize: 16 }}>{u.full_name || u.email?.split("@")[0]}</div>
                          <div className="t-meta" style={{ fontSize: 12 }}>{u.bio?.slice(0, 60) || "Researcher"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, padding: "12px 0", borderTop: "0.5px solid var(--border-rgba)", borderBottom: "0.5px solid var(--border-rgba)", marginBottom: 14 }}>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div className="t-num" style={{ fontSize: 18, color: "var(--primary-blue)" }}>{elo}</div>
                          <div className="t-meta" style={{ fontSize: 10 }}>Elo</div>
                        </div>
                        <div className="vr"/>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div className="t-num" style={{ fontSize: 18, color: "var(--rolex-green)" }}>{u.accuracy_score || 0}%</div>
                          <div className="t-meta" style={{ fontSize: 10 }}>Accuracy</div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
