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
import ShareModal from "@/components/profile/ShareModal";
import WalletConfirmDialog from "@/components/wallet/WalletConfirmDialog";
import FactChecker from "@/components/report/FactChecker";
import CommentsSection from "@/components/report/CommentsSection";
import PredictionTrajectoryChart from "@/components/report/PredictionTrajectoryChart";
import ExportPDFButton from "@/components/report/ExportPDFButton";
import BackButton from "@/components/BackButton";
import TranslateButton from "@/components/report/TranslateButton";

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
  const [showShare, setShowShare] = useState(false);
  const [showWalletConfirm, setShowWalletConfirm] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [author, setAuthor] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [moreReports, setMoreReports] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Translation state
  const [translatedData, setTranslatedData] = useState(null); // { title, excerpt, blocks, lang }
  const displayTitle   = translatedData?.title   || report?.title;
  const displayExcerpt = translatedData?.excerpt  || report?.excerpt;
  const displayBlocks  = translatedData?.blocks   || blocks;

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
        setCommentCount(data.comment_count || 0);
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

  const handleSubscribe = () => {
    if (!currentUser) { navigate("/signin"); return; }
    if (subscribed) return;
    setShowWalletConfirm(true);
  };

  const confirmSubscribe = async () => {
    try {
      await subscribeAnalyst(report.created_by, author?.monthly_price || 9);
      setSubscribed(true);
      toast.success("Subscribed.");
    } catch (e) {
      toast.error(e?.message || "Subscribe failed");
      throw e;
    }
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
      <section style={{ padding: "20px 0 16px", borderBottom: "0.5px solid var(--border-rgba)" }}>
        <div className="shell" style={{ marginBottom: 10 }}>
          <BackButton fallback="/feed" />
        </div>
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
            <TranslateButton
              title={report?.title}
              excerpt={report?.excerpt}
              blocks={blocks}
              onTranslated={setTranslatedData}
              onReset={() => setTranslatedData(null)}
              isTranslated={!!translatedData}
              translatedLang={translatedData?.lang}
            />
            <ExportPDFButton report={report} blocks={blocks}/>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)} aria-label="Share report">
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
          {displayTitle}
        </h1>

        {(displayExcerpt) && (
          <p style={{
            fontFamily: "var(--f-serif)", fontStyle: "italic",
            fontSize: 19, lineHeight: 1.5, color: "var(--text-mute)",
            margin: "0 0 32px",
          }}>
            {displayExcerpt}
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

        {/* Locked Prediction Receipt — entry/target/stop locked at publish.
            Live price + % change render below the 4-cell grid; sentiment
            color (rolex-green / velvet-red) applies because the live delta
            IS sentiment. Timeframe progress bar shows elapsed-of-window;
            outcome tag flips to Hit / Near / Partial / Miss when resolved. */}
        {dir && ticker && report.prediction_entry_price && (() => {
          const entry = Number(report.prediction_entry_price);
          const target = report.prediction_target_price ? Number(report.prediction_target_price) : null;
          const stop = report.prediction_stop_price ? Number(report.prediction_stop_price) : null;
          const isShort = dir === "Short";
          // % change from entry → live. For shorts, profit is when price drops,
          // so we flip the sign so green/red still encode "good for the call".
          const liveDelta = livePrice != null && entry
            ? ((livePrice - entry) / entry) * 100 * (isShort ? -1 : 1)
            : null;
          const deltaPos = liveDelta != null && liveDelta >= 0;

          // Timeframe progress — parses "30d" / "90d" / "6m" / a number.
          const tfRaw = report.prediction_timeframe || "";
          const tfDays =
            typeof tfRaw === "number" ? tfRaw :
            /^\d+$/.test(tfRaw) ? Number(tfRaw) :
            /(\d+)\s*d/i.test(tfRaw) ? Number(RegExp.$1) :
            /(\d+)\s*w/i.test(tfRaw) ? Number(RegExp.$1) * 7 :
            /(\d+)\s*m/i.test(tfRaw) ? Number(RegExp.$1) * 30 :
            null;
          const publishedAt = report.published_date || report.created_date;
          const elapsedDays = publishedAt
            ? Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000))
            : null;
          const tfPct = tfDays && elapsedDays != null
            ? Math.min(100, Math.max(0, (elapsedDays / tfDays) * 100))
            : null;
          const expired = tfDays != null && elapsedDays != null && elapsedDays >= tfDays;

          const outcome = (report.prediction_outcome || "").toLowerCase();
          const outcomeTag =
            outcome === "hit" ? { cls: "tag-hit", label: "Resolved · Hit" } :
            outcome === "near" ? { cls: "tag-near", label: "Resolved · Near" } :
            outcome === "partial" ? { cls: "tag-partial", label: "Resolved · Partial" } :
            outcome === "miss" ? { cls: "tag-miss", label: "Resolved · Miss" } :
            null;

          return (
            <div className="surface surface-gold-edge" style={{ padding: 22, marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span className="receipt">
                  <Lock size={12} strokeWidth={1.5}/>
                  LOCKED PREDICTION · IMMUTABLE
                </span>
                {outcomeTag ? (
                  <span className={`tag ${outcomeTag.cls}`}>{outcomeTag.label}</span>
                ) : (
                  <span className="tag tag-open">Tracking</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                <span className={`tag ${dir === "Long" ? "tag-long" : isShort ? "tag-short" : "tag-hold"}`} style={{ height: 26, padding: "0 10px", fontSize: 11 }}>
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
                marginBottom: 16,
              }}>
                {[
                  ["Entry", `$${entry.toFixed(2)}`],
                  ["Target", target != null ? `$${target.toFixed(2)}` : "—"],
                  ["Stop", stop != null ? `$${stop.toFixed(2)}` : "—"],
                  ["Now", livePrice != null ? `$${Number(livePrice).toFixed(2)}` : "—",
                    livePrice != null ? (deltaPos ? "pos" : "neg") : ""],
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

              {/* Live delta row — % change from entry colored by sentiment.
                  Hidden until the live price has resolved. */}
              {liveDelta != null && !outcomeTag && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px",
                  background: deltaPos ? "rgba(14,107,69,0.06)" : "rgba(146,43,62,0.06)",
                  border: "0.5px solid",
                  borderColor: deltaPos ? "rgba(14,107,69,0.32)" : "rgba(146,43,62,0.32)",
                  borderRadius: 6,
                  marginBottom: 12,
                }}>
                  <span className="pulse-dot" style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: deltaPos ? "var(--rolex-green)" : "var(--velvet-red)",
                  }}/>
                  <span className="t-meta" style={{ fontSize: 11 }}>LIVE</span>
                  <span className="t-num" style={{
                    fontSize: 14,
                    color: deltaPos ? "var(--rolex-green)" : "var(--velvet-red)",
                  }}>
                    {deltaPos ? "+" : ""}{liveDelta.toFixed(2)}% from entry
                  </span>
                  <span className="t-meta" style={{ fontSize: 11, marginLeft: "auto" }}>
                    {isShort ? "Short P&L" : "Long P&L"}
                  </span>
                </div>
              )}

              {/* Timeframe progress — Day N of M, hairline progress bar.
                  When the window has expired, swap copy for the final outcome
                  hint (the grade tag at the top is the canonical badge). */}
              {tfDays != null && elapsedDays != null && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="t-meta" style={{ fontSize: 11 }}>
                      {expired
                        ? `Window closed · ${tfDays}d total`
                        : `Day ${elapsedDays} of ${tfDays}`}
                    </span>
                    <span className="t-num" style={{ fontSize: 11, color: "var(--text-meta)" }}>
                      {tfPct != null ? `${tfPct.toFixed(0)}%` : ""}
                    </span>
                  </div>
                  <div style={{
                    height: 3,
                    background: "var(--border-rgba)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${tfPct ?? 0}%`,
                      height: "100%",
                      background: expired
                        ? "var(--text-meta)"
                        : "var(--gold-hex)",
                      transition: "width var(--t-base) var(--ease)",
                    }}/>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Body blocks ── */}
        <div className="report-body">
          {displayBlocks.length === 0 ? (
            <p style={{ fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7, color: "var(--text-body)" }}>
              {report.content || report.excerpt || "—"}
            </p>
          ) : (
            displayBlocks.map((b, i) => <Block key={b.id ?? i} block={b} index={i}/>)
          )}
        </div>

        {/* ── Prediction trajectory chart — restored from backup.
            Shows entry → live → target over the timeframe window for any
            report with a locked prediction. */}
        {report.prediction_ticker && report.prediction_entry_price && (
          <div style={{ margin: "32px 0" }}>
            <PredictionTrajectoryChart report={report}/>
          </div>
        )}

        {/* ── Fact-checker — restored from backup.
            Claude + Yahoo Finance + SEC EDGAR claim classification:
            Verified Fact, Opinion, Misleading, Unverified, Yahoo/SEC. */}
        <div style={{ margin: "32px 0" }}>
          <FactChecker
            reportContent={blocks.map((b) => b.content || b.text || "").join("\n\n")}
            content={report.content}
            reportId={report.id}
            reportTitle={report.title}
            onJumpToClaim={() => {}}
          />
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
            aria-pressed={liked}
            style={{
              borderColor: liked ? "var(--gold-hex)" : undefined,
              color: liked ? "var(--gold-hex)" : undefined,
            }}
          >
            <Star size={14} strokeWidth={1.6} style={{ fill: liked ? "var(--gold-hex)" : "transparent" }}/>
            {likeCount.toLocaleString()} found this useful
          </button>
          <button className="btn btn-ghost" onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}>
            <MessageSquare size={13} strokeWidth={1.6}/> {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </button>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)} aria-label="Share report">
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

        {/* ── Discussion / Comments — restored from backup ── */}
        <div style={{ marginTop: 40 }}>
          <CommentsSection
            reportId={report.id}
            reportAuthorEmail={report.created_by}
            reportTitle={report.title}
            onCountChange={(n) => {
              setCommentCount(n);
              base44.entities.Report.update(report.id, { comment_count: n }).catch(() => {});
            }}
          />
        </div>
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

      {/* ── Modals (Share + Wallet confirm) ── */}
      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        url={typeof window !== "undefined" ? window.location.href : ""}
        title={report.title}
        description={report.excerpt || `${authorName} on Stoa`}
      />
      <WalletConfirmDialog
        open={showWalletConfirm}
        onClose={() => setShowWalletConfirm(false)}
        onConfirm={async () => { await confirmSubscribe(); setShowWalletConfirm(false); }}
        title={`Subscribe to ${authorName.split(" ")[0]}`}
        amountUSD={price}
        itemLabel={`${authorName} · monthly subscription`}
        showSplit
        confirmLabel={`Confirm · $${price}/mo`}
      />
    </div>
  );
}

// ── Block renderer (for content_blocks variants) ─────────────────────────────
function Block({ block, index }) {
  const t = block.type || "text";

  // The editor saves `title` and `dek` as the first two blocks; they're
  // also rendered as the H1 + dek above the article, so skip them here to
  // avoid duplicating the headline in the body.
  if (t === "title" || t === "dek") return null;

  if (t === "heading" || t === "h2" || t === "h") {
    return (
      <h2 style={{ fontFamily: "var(--f-serif)", fontWeight: 500, fontSize: 26, lineHeight: 1.25, letterSpacing: "-0.014em", margin: "44px 0 16px", color: "var(--text)" }}>
        {block.content || block.text}
      </h2>
    );
  }
  if (t === "subhead" || t === "h3") {
    return (
      <h3 style={{ fontFamily: "var(--f-serif)", fontWeight: 500, fontSize: 20, lineHeight: 1.35, margin: "32px 0 12px", color: "var(--text)" }}>
        {block.content || block.text}
      </h3>
    );
  }
  if (t === "prediction") {
    return <PredictionReceipt data={block.data || block}/>;
  }
  if (t === "metrics") {
    return <MetricsGrid data={block.data || block.metrics || []} content={block.content}/>;
  }
  if (t === "bullbear" || t === "thesis") {
    const data = block.data || block;
    const bull = data.bull || [];
    const bear = data.bear || [];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "40px 0" }}>
        <div className="surface" style={{ padding: 22, borderColor: "rgba(14,107,69,0.32)", background: "rgba(14,107,69,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} strokeWidth={1.7} style={{ color: "var(--rolex-green)" }}/>
            <span className="t-eyebrow" style={{ color: "var(--rolex-green)" }}>Bull thesis</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontFamily: "var(--f-serif)", fontSize: 14.5, lineHeight: 1.6, color: "var(--text-body)" }}>
            {bull.filter(Boolean).map((x, i) => (
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
            {bear.filter(Boolean).map((x, i) => (
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
  if (t === "stockchart" || t === "graph" || t === "chart") {
    const ticker = block.ticker || block.data?.ticker;
    if (!ticker) return null;
    return (
      <figure style={{ margin: "32px 0" }}>
        <iframe
          title={`${ticker} chart`}
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tv_${ticker}&symbol=${ticker}&interval=D&hidesidetoolbar=1&theme=light&style=2&timezone=Etc/UTC`}
          style={{ width: "100%", height: 360, border: "0.5px solid var(--border-rgba)", borderRadius: 8 }}
        />
        <figcaption className="t-meta" style={{ marginTop: 8, textAlign: "center" }}>{ticker} · daily chart</figcaption>
      </figure>
    );
  }
  if (t === "comparechart") {
    const tickers = block.tickers || block.data?.tickers || [];
    return (
      <div className="surface" style={{ padding: 20, margin: "32px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Comparison</div>
        <div className="t-meta" style={{ fontSize: 12 }}>
          {tickers.length ? tickers.join(" vs ") : "No tickers selected"}
        </div>
      </div>
    );
  }
  if (t === "quote" || t === "pull" || t === "pullquote") {
    return (
      <blockquote style={{
        margin: "32px -24px",
        padding: "0 0 0 24px",
        borderLeft: "0.5px solid var(--gold-hex)",
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

// ── Inline prediction receipt (published-report variant) ──────────────
// Shows ticker · direction · entry (locked) · target · stop · timeframe ·
// live price tracking with % change. Used when an analyst inserts a
// Prediction block inside the report body.
function PredictionReceipt({ data }) {
  const [live, setLive] = useState(null);
  const ticker = (data?.ticker || "").toUpperCase();
  const dir = (data?.dir || data?.direction || "LONG").toUpperCase();
  const entry = Number(data?.entry || data?.entry_price || 0);
  const target = Number(data?.target || data?.target_price || 0);
  const stop = Number(data?.stop || data?.stop_price || 0);
  const days = Number(data?.days || data?.timeframe_days || 90);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    import("@/lib/stockData").then(({ fetchQuote }) =>
      fetchQuote(ticker).then((q) => { if (!cancelled) setLive(q); }).catch(() => {})
    );
    return () => { cancelled = true; };
  }, [ticker]);

  if (!ticker) return null;

  const livePrice = live?.price;
  const changePct = livePrice && entry ? ((livePrice - entry) / entry) * 100 : null;
  const positive = dir === "LONG" ? (changePct ?? 0) >= 0 : (changePct ?? 0) <= 0;

  return (
    <div
      style={{
        margin: "32px 0",
        background: "var(--bg-elev)",
        border: "0.5px solid rgba(212,175,55,0.32)",
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", padding: "12px 18px",
          background: "rgba(212,175,55,0.06)",
          borderBottom: "0.5px solid rgba(212,175,55,0.16)",
          gap: 10,
        }}
      >
        <Lock size={12} strokeWidth={1.6} style={{ color: "var(--gold-hex)" }}/>
        <span className="receipt" style={{ color: "var(--gold-hex)", fontSize: 10.5 }}>
          LOCKED PREDICTION · {ticker} · {days} DAY WINDOW
        </span>
        <div style={{ flex: 1 }}/>
        <span
          className="tag"
          style={{
            background: dir === "LONG" ? "rgba(14,107,69,0.08)" : "rgba(146,43,62,0.08)",
            borderColor: dir === "LONG" ? "rgba(14,107,69,0.32)" : "rgba(146,43,62,0.32)",
            color: dir === "LONG" ? "var(--rolex-green)" : "var(--velvet-red)",
          }}
        >
          {dir}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--border-rgba)" }}>
        {[
          { label: "Entry (locked)", value: entry ? `$${entry.toFixed(2)}` : "—" },
          { label: "Target", value: target ? `$${target.toFixed(2)}` : "—" },
          { label: "Stop", value: stop ? `$${stop.toFixed(2)}` : "—" },
          {
            label: "Now",
            value: livePrice ? `$${livePrice.toFixed(2)}` : "…",
            sub: changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : null,
            subColor: positive ? "var(--rolex-green)" : "var(--velvet-red)",
          },
        ].map((c, i) => (
          <div key={i} style={{ background: "var(--bg-elev)", padding: "14px 16px" }}>
            <div className="t-meta" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em" }}>{c.label}</div>
            <div className="t-num" style={{ fontSize: 18, marginTop: 4, color: "var(--text)" }}>{c.value}</div>
            {c.sub && (
              <div className="t-num" style={{ fontSize: 11, color: c.subColor, marginTop: 2 }}>{c.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline metrics grid (published-report variant) ────────────────────
// Accepts either the editor's `data` array ([{label,value,delta}]) or the
// MetricsBlock pipe-delimited string in `content`.
function MetricsGrid({ data, content }) {
  let rows = [];
  if (Array.isArray(data) && data.length) {
    rows = data.map((m) => ({ label: m.label, value: m.value, delta: m.delta || m.change || "" }));
  } else if (typeof content === "string" && content.trim()) {
    rows = content.split("\n").filter(Boolean).map((line) => {
      const parts = line.split("|");
      return { label: (parts[0] || "").trim(), value: (parts[1] || "").trim(), delta: (parts[2] || "").trim() };
    }).filter((r) => r.label && r.value);
  }
  if (rows.length === 0) return null;
  const cols = Math.min(rows.length, 4);
  return (
    <div className="surface" style={{ padding: 0, margin: "32px 0", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "0.5px solid var(--border-rgba)", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="t-eyebrow">Key metrics</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1, background: "var(--border-rgba)" }}>
        {rows.map((m, i) => {
          const isPos = m.delta?.startsWith("+");
          const isNeg = m.delta?.startsWith("-");
          return (
            <div key={i} style={{ background: "var(--bg-elev)", padding: "14px 16px" }}>
              <div className="t-meta" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em" }}>{m.label}</div>
              <div className="t-num" style={{ fontSize: 17, marginTop: 4, color: "var(--text)" }}>{m.value}</div>
              {m.delta && (
                <div className="t-num" style={{ fontSize: 11, color: isPos ? "var(--rolex-green)" : isNeg ? "var(--velvet-red)" : "var(--text-meta)", marginTop: 2 }}>
                  {m.delta}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
