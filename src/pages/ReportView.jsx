import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronRight, Lock, Bookmark, Share2, Clock, Star, MessageSquare,
  ArrowRight, TrendingUp, TrendingDown,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { setMeta, injectJsonLd } from "@/lib/seo";
import { toast } from "sonner";
import { subscribeAnalyst } from "@/lib/walletService";
import { Avatar } from "@/components/AnalystCard";

/**
 * ReportView — long-form research reading view (v3 rebuild).
 * Layout per prototype/src/screens/report.jsx: 720px centered column, drop
 * cap first paragraph, Locked Prediction Receipt, pull quotes, bull/bear
 * blocks, reactions row, end-of-article subscribe card, sticky bottom CTA
 * for non-subscribers.
 *
 * Wires to existing Report / ReportView / User / Subscription entities.
 */
export default function ReportView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");

  const [report, setReport] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [author, setAuthor] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [moreReports, setMoreReports] = useState([]);
  const [subscribed, setSubscribed] = useState(false);

  const likedKey = (id) => `stoa_liked_${currentUser?.email || "anon"}_${id}`;

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // ── Load report ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!reportId || reportId === "undefined" || reportId === "null") {
      setError("No report ID specified.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let data = await base44.entities.Report.get(reportId).catch(() => null);
        if (!data) {
          const results = await base44.entities.Report.filter({ status: "published" }, "-created_date", 200).catch(() => []);
          data = (results || []).find((r) => r.id === reportId) || null;
        }
        if (cancelled) return;
        if (!data) { setError("Report not found."); return; }
        setReport(data);
        setLikeCount(data.likes || 0);
        setViewCount(data.views || 0);
        setLiked(localStorage.getItem(likedKey(reportId)) === "1");

        try { base44.analytics?.track?.({ eventName: "report_viewed", properties: { report_id: reportId } }); } catch {}

        if (data.content_blocks) {
          try {
            const parsed = JSON.parse(data.content_blocks);
            setBlocks(Array.isArray(parsed) ? parsed : []);
          } catch {
            setBlocks([{ type: "text", content: data.content_blocks, id: 0 }]);
          }
        } else if (data.content) {
          setBlocks([{ type: "text", content: data.content, id: 0 }]);
        }

        if (data.created_by) {
          base44.entities.User.filter({ email: data.created_by }).then((users) => {
            if (!cancelled && users?.[0]) setAuthor(users[0]);
          }).catch(() => {});
          base44.entities.Report
            .filter({ created_by: data.created_by, status: "published" }, "-created_date", 5)
            .then((more) => !cancelled && setMoreReports((more || []).filter((r) => r.id !== reportId).slice(0, 3)))
            .catch(() => {});
        }
      } catch {
        if (!cancelled) setError("Failed to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);  

  // ── View tracking (once per session, skip own views) ────────────────────
  useEffect(() => {
    if (!report || !reportId) return;
    const key = `viewed_${reportId}`;
    if (sessionStorage.getItem(key)) return;
    if (currentUser?.email && report.created_by === currentUser.email) return;
    sessionStorage.setItem(key, "1");
    const newViews = (report.views || 0) + 1;
    setViewCount(newViews);
    base44.entities.ReportView?.create({
      report_id: report.id,
      analyst_email: report.created_by,
      viewer_email: currentUser?.email || null,
      viewed_at: new Date().toISOString(),
    }).catch(() => {});
    base44.entities.Report.update(report.id, { views: newViews }).catch(() => {});
  }, [report?.id, currentUser?.email]);  

  // ── Live price for the prediction ticker ────────────────────────────────
  useEffect(() => {
    if (!report?.prediction_ticker) return;
    base44.functions.invoke("proxyFetch", {
      url: `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${report.prediction_ticker}?modules=price`,
    })
      .then((res) => {
        const p = res?.data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
        if (p) setLivePrice(p);
      })
      .catch(() => {});
  }, [report?.prediction_ticker]);

  // ── Subscription status ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.email || !report?.created_by) return;
    base44.entities.Subscription
      .filter({ subscriber_email: currentUser.email, analyst_email: report.created_by, status: "active" })
      .then((subs) => setSubscribed((subs || []).length > 0))
      .catch(() => {});
  }, [currentUser?.email, report?.created_by]);

  // ── SEO meta ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!report) return;
    setMeta({
      title: report.title,
      description: report.excerpt || `${report.author_name || "STOA"}: ${report.title}`,
      type: "article",
    });
    injectJsonLd?.("jsonld-report", {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: report.title,
      author: { "@type": "Person", name: report.author_name },
    });
  }, [report]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleLike = async () => {
    if (!report) return;
    const next = !liked;
    setLiked(next);
    const newCount = Math.max(0, likeCount + (next ? 1 : -1));
    setLikeCount(newCount);
    localStorage.setItem(likedKey(reportId), next ? "1" : "");
    if (!next) localStorage.removeItem(likedKey(reportId));
    base44.entities.Report.update(report.id, { likes: newCount }).catch(() => {});
  };

  const handleSubscribe = async () => {
    if (!currentUser) { navigate("/signin"); return; }
    if (subscribed) return;
    try {
      await subscribeAnalyst(report.created_by, author?.monthly_price || 9);
      setSubscribed(true);
      toast.success("Subscribed.");
    } catch (e) { toast.error(e?.message || "Subscribe failed"); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const authorName = author?.full_name || report?.author_name || "Researcher";
  const elo = author?.elo ?? Math.round(((author?.accuracy_score || 60) / 100) * 800 + 600);
  const accuracy = author?.accuracy_score || 0;
  const price = author?.monthly_price || 9;
  const initials = authorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const isPremium = report?.is_premium;
  const kind = (report?.kind || (report?.is_quick_post ? "POST" : "Research Report")).replace(/_/g, " ");
  const dir = report?.prediction_action;
  const ticker = report?.prediction_ticker;

  // ── Loading / error ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 120 }}>
        <span className="t-meta">Loading report…</span>
      </div>
    );
  }
  if (error || !report) {
    return (
      <div className="page" style={{ padding: 120, textAlign: "center" }}>
        <h2 className="t-display" style={{ fontSize: 28 }}>{error || "Report not found"}</h2>
        <p className="t-meta" style={{ marginTop: 8 }}>
          Try <Link to="/feed">browsing the feed</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: "var(--bg)" }}>
      {/* ── Breadcrumb ── */}
      <section style={{ padding: "28px 0 16px", borderBottom: "0.5px solid var(--border-rgba)" }}>
        <div className="shell" style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="t-meta" style={{ cursor: "pointer" }} onClick={() => navigate("/feed")}>
              Discover
            </span>
            <ChevronRight size={12} style={{ color: "var(--text-meta)" }}/>
            <span className="t-meta" style={{ cursor: "pointer" }} onClick={() => navigate(`/analyst/${author?.username || author?.email}`)}>
              {authorName}
            </span>
            <ChevronRight size={12} style={{ color: "var(--text-meta)" }}/>
            <span className="t-meta" style={{ color: "var(--text)" }}>
              {report.title?.slice(0, 60)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSaved(!saved)}>
              <Bookmark size={13} strokeWidth={1.6} style={{ fill: saved ? "var(--primary-blue)" : "transparent" }}/>
              {saved ? "Saved" : "Save"}
            </button>
            <button className="btn btn-ghost btn-sm">
              <Share2 size={13} strokeWidth={1.6}/> Share
            </button>
          </div>
        </div>
      </section>

      {/* ── Article ── */}
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "56px 32px 48px" }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span className="tag" style={{ borderColor: "rgba(30,58,138,0.25)", color: "var(--primary-blue)" }}>
            {kind}
          </span>
          {isPremium && <span className="badge-founding">Premium</span>}
          {report.read_time_min && (<>
            <span className="t-meta">·</span>
            <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={12} strokeWidth={1.5}/> {report.read_time_min} min read
            </span>
          </>)}
        </div>

        <h1 className="t-display" style={{
          fontSize: "clamp(36px, 5vw, 52px)",
          lineHeight: 1.05,
          margin: "0 0 18px",
          letterSpacing: "-0.022em",
        }}>
          {report.title}
        </h1>

        {report.excerpt && (
          <p style={{
            fontFamily: "var(--f-serif)", fontStyle: "italic",
            fontSize: 19, lineHeight: 1.5, color: "var(--text-mute)",
            margin: "0 0 32px",
          }}>
            {report.excerpt}
          </p>
        )}

        {/* Author bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 0",
          borderTop: "0.5px solid var(--border-rgba)",
          borderBottom: "0.5px solid var(--border-rgba)",
          marginBottom: 40,
        }}>
          <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="md"/>
          <div>
            <div className="t-title" style={{ fontSize: 14 }}>{authorName}</div>
            <div className="t-meta" style={{ display: "flex", gap: 8, marginTop: 1 }}>
              {elo > 0 && (<>
                <span>Elo <span className="t-num" style={{ color: "var(--primary-blue)" }}>{elo}</span></span>
                <span>·</span>
              </>)}
              {accuracy > 0 && (<>
                <span>{accuracy}% accuracy</span>
                <span>·</span>
              </>)}
              <span>{new Date(report.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}/>
          {!subscribed && (
            <button className="btn btn-gold btn-sm" onClick={handleSubscribe}>
              Subscribe · ${price}/mo
            </button>
          )}
        </div>

        {/* Locked Prediction Receipt */}
        {dir && ticker && report.prediction_entry_price && (
          <div className="surface" style={{ padding: 22, marginBottom: 40, background: "var(--bg-elev)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="receipt">
                <Lock size={12} strokeWidth={1.5}/>
                LOCKED PREDICTION · IMMUTABLE
              </span>
              {report.prediction_outcome === "hit" || report.prediction_outcome === "near" ? (
                <span className="tag tag-hit">Resolved · Hit</span>
              ) : report.prediction_outcome === "miss" ? (
                <span className="tag tag-miss">Resolved · Miss</span>
              ) : (
                <span className="tag tag-open">Tracking</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span className={`tag ${dir === "Long" ? "tag-long" : dir === "Short" ? "tag-short" : "tag-hold"}`} style={{ height: 26, padding: "0 10px", fontSize: 11 }}>
                {dir.toUpperCase()} {ticker}
              </span>
              {report.prediction_timeframe && (
                <span className="t-meta">{report.prediction_timeframe} window</span>
              )}
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1, background: "var(--border-rgba)",
              border: "0.5px solid var(--border-rgba)",
              borderRadius: 6, overflow: "hidden",
            }}>
              {[
                ["Entry", `$${Number(report.prediction_entry_price).toFixed(2)}`],
                ["Target", report.prediction_target_price ? `$${Number(report.prediction_target_price).toFixed(2)}` : "—"],
                ["Stop", report.prediction_stop_price ? `$${Number(report.prediction_stop_price).toFixed(2)}` : "—"],
                ["Now", livePrice ? `$${Number(livePrice).toFixed(2)}` : "—",
                  livePrice && livePrice >= report.prediction_entry_price ? "pos" : livePrice ? "neg" : ""],
              ].map(([l, v, tone], i) => (
                <div key={i} style={{ background: "var(--bg-elev)", padding: "12px" }}>
                  <div className="t-meta" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em" }}>{l}</div>
                  <div className="t-num" style={{
                    fontSize: 16, marginTop: 4,
                    color: tone === "pos" ? "var(--rolex-green)" : tone === "neg" ? "var(--velvet-red)" : "var(--text)",
                  }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Body blocks ── */}
        <div className="report-body">
          {blocks.length === 0 ? (
            <p style={{ fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7, color: "var(--text-body)" }}>
              {report.content || report.excerpt || "—"}
            </p>
          ) : (
            blocks.map((b, i) => <Block key={b.id ?? i} block={b} index={i}/>)
          )}
        </div>

        {/* ── Reactions row ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "28px 0",
          borderTop: "0.5px solid var(--border-rgba)",
          borderBottom: "0.5px solid var(--border-rgba)",
          marginTop: 48,
        }}>
          <button onClick={toggleLike} className="btn btn-ghost"
            style={{
              borderColor: liked ? "var(--gold-hex)" : undefined,
              color: liked ? "var(--gold-hex)" : undefined,
            }}
          >
            <Star size={14} strokeWidth={1.6} style={{ fill: liked ? "var(--gold-hex)" : "transparent" }}/>
            {likeCount.toLocaleString()} found this useful
          </button>
          <button onClick={() => setSaved(!saved)} className="btn btn-ghost"
            style={{
              borderColor: saved ? "var(--primary-blue)" : undefined,
              color: saved ? "var(--primary-blue)" : undefined,
            }}
          >
            <Bookmark size={13} strokeWidth={1.6}/> {saved ? "Saved" : "Save"}
          </button>
          {report.comment_count != null && (
            <button className="btn btn-ghost">
              <MessageSquare size={13} strokeWidth={1.6}/> {report.comment_count} comments
            </button>
          )}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost btn-sm">
            <Share2 size={13} strokeWidth={1.6}/>
          </button>
        </div>

        {/* ── End-of-article subscribe ── */}
        {!subscribed && (
          <div className="surface ambient" style={{ padding: 32, marginTop: 32, textAlign: "center" }}>
            <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="lg" ring/>
            <h3 className="t-title" style={{ fontSize: 22, margin: "16px 0 8px" }}>
              Read everything {authorName.split(" ")[0]} publishes
            </h3>
            <p className="t-body" style={{ fontSize: 14, color: "var(--text-mute)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
              All reports, every locked call, and direct messages.{" "}
              {elo > 0 && (<>
                <span className="t-num" style={{ color: "var(--primary-blue)" }}>{elo}</span> Elo,{" "}
              </>)}
              {accuracy > 0 && `${accuracy}% accuracy.`}
            </p>
            <button className="btn btn-gold btn-lg" onClick={handleSubscribe}>
              Subscribe · ${price}/mo <ArrowRight size={14}/>
            </button>
            <p className="t-meta" style={{ marginTop: 14, fontSize: 11 }}>
              Cancel anytime · 90% goes to {authorName.split(" ")[0]}
            </p>
          </div>
        )}
      </article>

      {/* ── More from analyst ── */}
      {moreReports.length > 0 && (
        <section style={{
          background: "var(--bg-soft)",
          borderTop: "0.5px solid var(--border-rgba)",
          padding: "64px 0",
        }}>
          <div className="shell">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 className="t-title" style={{ fontSize: 22, margin: 0 }}>
                More from {authorName.split(" ")[0]}
              </h3>
              <button className="btn btn-text btn-sm"
                onClick={() => navigate(`/analyst/${author?.username || author?.email}`)}>
                All research <ArrowRight size={12}/>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {moreReports.map((r) => (
                <article
                  key={r.id}
                  className="surface surface-interactive"
                  style={{ padding: 22, cursor: "pointer" }}
                  onClick={() => navigate(`/report?id=${r.id}`)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span className="tag" style={{ color: "var(--primary-blue)", borderColor: "rgba(30,58,138,0.25)" }}>
                      {(r.kind || "REPORT").toUpperCase()}
                    </span>
                    <span className="t-meta">·</span>
                    <span className="t-meta">
                      {new Date(r.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="t-title" style={{ fontSize: 16, lineHeight: 1.3, margin: "0 0 8px" }}>
                    {r.title}
                  </h4>
                  {r.excerpt && (
                    <p className="t-body" style={{
                      fontSize: 13, color: "var(--text-mute)",
                      lineHeight: 1.55, margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {r.excerpt}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky bottom subscribe CTA for non-subscribers */}
      {!subscribed && currentUser && currentUser.email !== report.created_by && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 40,
          background: "color-mix(in srgb, var(--bg) 92%, transparent)",
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
          borderTop: "0.5px solid var(--border-rgba)",
          padding: "12px 24px",
        }}>
          <div className="shell" style={{ display: "flex", alignItems: "center", gap: 16, padding: 0 }}>
            <span className="t-meta">Subscribe to {authorName.split(" ")[0]}</span>
            <div style={{ flex: 1 }}/>
            <button className="btn btn-gold btn-sm" onClick={handleSubscribe}>
              Subscribe · ${price}/mo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Block renderer (for content_blocks variants) ─────────────────────────────
function Block({ block, index }) {
  const t = block.type || "text";

  if (t === "heading" || t === "h2") {
    return (
      <h2 className="t-title" style={{ fontSize: 22, lineHeight: 1.3, margin: "40px 0 16px" }}>
        {block.content || block.text}
      </h2>
    );
  }
  if (t === "subhead" || t === "h3") {
    return (
      <h3 className="t-title" style={{ fontSize: 18, lineHeight: 1.35, margin: "32px 0 12px" }}>
        {block.content || block.text}
      </h3>
    );
  }
  if (t === "quote" || t === "pull") {
    return (
      <blockquote style={{
        margin: "32px -24px",
        padding: "0 0 0 24px",
        borderLeft: "1px solid var(--gold-hex)",
      }}>
        <p style={{
          fontFamily: "var(--f-serif)", fontStyle: "italic",
          fontSize: 24, lineHeight: 1.35, color: "var(--text)",
          margin: 0, letterSpacing: "-0.014em",
        }}>
          {block.content || block.text}
        </p>
      </blockquote>
    );
  }
  if (t === "callout") {
    return (
      <div className="surface" style={{ padding: 18, margin: "24px 0", background: "var(--bg-elev)" }}>
        <p className="t-body" style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {block.content || block.text}
        </p>
      </div>
    );
  }
  if (t === "thesis") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "40px 0" }}>
        <div className="surface" style={{ padding: 22, borderColor: "rgba(14,107,69,0.32)", background: "rgba(14,107,69,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} strokeWidth={1.7} style={{ color: "var(--rolex-green)" }}/>
            <span className="t-eyebrow" style={{ color: "var(--rolex-green)" }}>Bull thesis</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontFamily: "var(--f-serif)", fontSize: 14.5, lineHeight: 1.6, color: "var(--text-body)" }}>
            {(block.bull || []).map((x, i) => (
              <li key={i} style={{ marginBottom: 8, paddingLeft: 14, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, top: 8, width: 6, height: 1, background: "var(--rolex-green)" }}/>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="surface" style={{ padding: 22, borderColor: "rgba(146,43,62,0.32)", background: "rgba(146,43,62,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <TrendingDown size={14} strokeWidth={1.7} style={{ color: "var(--velvet-red)" }}/>
            <span className="t-eyebrow" style={{ color: "var(--velvet-red)" }}>Bear thesis</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontFamily: "var(--f-serif)", fontSize: 14.5, lineHeight: 1.6, color: "var(--text-body)" }}>
            {(block.bear || []).map((x, i) => (
              <li key={i} style={{ marginBottom: 8, paddingLeft: 14, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, top: 8, width: 6, height: 1, background: "var(--velvet-red)" }}/>
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (t === "bullets") {
    const items = block.content?.split("\n").filter(Boolean) || block.items || [];
    return (
      <ul style={{ fontFamily: "var(--f-serif)", fontSize: 17, lineHeight: 1.7, color: "var(--text-body)", paddingLeft: 22, margin: "0 0 22px" }}>
        {items.map((x, i) => <li key={i} style={{ marginBottom: 8 }}>{x}</li>)}
      </ul>
    );
  }
  if (t === "image") {
    return (
      <figure style={{ margin: "32px 0" }}>
        <img src={block.url || block.src} alt={block.caption || ""} style={{ width: "100%", borderRadius: 8 }}/>
        {block.caption && (
          <figcaption className="t-meta" style={{ marginTop: 8, textAlign: "center" }}>{block.caption}</figcaption>
        )}
      </figure>
    );
  }
  // text / paragraph — apply drop cap to first paragraph
  const text = block.content || block.text || "";
  if (index === 0 && text) {
    return (
      <p style={{
        fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7,
        color: "var(--text-body)", margin: "0 0 22px",
      }}>
        <span style={{
          fontSize: 64, fontFamily: "var(--f-serif)", fontWeight: 500,
          lineHeight: 0.9, float: "left", paddingTop: 6, paddingRight: 10,
          color: "var(--text)",
        }}>{text[0]}</span>
        {text.slice(1)}
      </p>
    );
  }
  return (
    <p style={{
      fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7,
      color: "var(--text-body)", margin: "0 0 22px",
    }}>
      {text}
    </p>
  );
}
