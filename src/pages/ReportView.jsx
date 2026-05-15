import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { setMeta, injectJsonLd } from "@/lib/seo";
import {
  ArrowLeft, Heart, Lock, Loader2, Sparkles,
  CheckCircle2, AlertTriangle, Info, MessageSquareQuote, X,
  Eye, BarChart2, Target, ShieldAlert, TrendingUp, Lightbulb, ChevronRight,
  Flag, ExternalLink, RefreshCw, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import PredictionBadge from "@/components/feed/PredictionBadge";
import TickerTag from "@/components/feed/TickerTag";
import ShareMenu from "@/components/feed/ShareMenu";
import CommentsSection from "@/components/report/CommentsSection";
import FactChecker from "@/components/report/FactChecker";
import PredictionTrajectoryChart from "@/components/report/PredictionTrajectoryChart";
import WalletConfirmDialog from "@/components/wallet/WalletConfirmDialog";
import { buyReport, subscribeAnalyst } from "@/lib/walletService";
import { toast } from "sonner";
import TradingViewWidget from "@/components/feed/TradingViewWidget";
import ExportPDFButton from "@/components/report/ExportPDFButton";
import useGoBack from "@/hooks/useGoBack";
import { avatarUrl } from "@/lib/avatarUrl";

// ─── Claim type config ───────────────────────────────────────────────────────
const TYPE_CONFIG = {
  Fact:             { icon: CheckCircle2,       color: "text-gain",        bg: "bg-gain/10 border-gain/20",         label: "Verified Fact" },
  Opinion:          { icon: MessageSquareQuote, color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",        label: "Opinion" },
  Misleading:       { icon: AlertTriangle,      color: "text-loss",        bg: "bg-loss/10 border-loss/20",         label: "Potentially Misleading" },
  Unverified:       { icon: Info,               color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",      label: "Unverified" },
  "Yahoo-Verified": { icon: TrendingUp,         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  label: "Yahoo Finance Verified" },
  "Yahoo-Disputed": { icon: AlertTriangle,      color: "text-orange-600",  bg: "bg-orange-50 border-orange-200",    label: "Disputed by Yahoo Finance" },
  "SEC-Verified":   { icon: CheckCircle2,       color: "text-violet-700",  bg: "bg-violet-50 border-violet-200",   label: "SEC Filing Verified" },
  "SEC-Disputed":   { icon: AlertTriangle,      color: "text-red-700",     bg: "bg-red-50 border-red-200",         label: "Disputed by SEC Filing" },
};

// ─── Community Notes under Opinion claims ────────────────────────────────────
function ClaimWithNotes({ claim }) {
  const cfg = TYPE_CONFIG[claim.type] || TYPE_CONFIG.Unverified;
  const Icon = cfg.icon;
  const [notes, setNotes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const submitNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { id: Date.now(), text: noteText.trim(), time: "just now" }]);
    setNoteText("");
    setShowAdd(false);
  };

  const handleReportMistake = async () => {
    try {
      await base44.integrations.Core.SendEmail({
        to: "baramsalem1@gmail.com",
        subject: `AI Fact Check Dispute — ${claim.type}`,
        body: `A user flagged a potential AI fact-check mistake.\n\nClaim type: ${claim.type}\nConfidence: ${claim.confidence || "N/A"}\n\nClaim text:\n"${claim.text}"\n\nAI note: ${claim.note || "N/A"}\n\nPlease review this claim.`,
      });
      setReportSent(true);
      toast.success("Thanks! We'll review this claim.");
    } catch {
      toast.error("Failed to send. Please try again.");
    }
  };

  return (
    <div className={`rounded-xl border p-3 text-xs ${cfg.bg}`}>
      <div className="flex gap-2">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`font-bold text-[11px] ${cfg.color}`}>{cfg.label}</span>
            {/* "Unverified — high confidence" is self-contradictory: by definition we
                couldn't verify the claim. Suppress the confidence chip for that case. */}
            {claim.confidence && claim.type !== "Unverified" && (
              <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${
                claim.confidence === "high" ? "bg-gain/10 text-gain" :
                claim.confidence === "medium" ? "bg-amber-50 text-amber-700" :
                "bg-muted text-muted-foreground"
              }`}>{claim.confidence} confidence</span>
            )}
            {claim.yahooData && (
              <a
                href={`https://finance.yahoo.com/quote/${claim.yahooTicker}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[9px] text-blue-600 hover:underline"
              >
                <ExternalLink className="w-2.5 h-2.5" />Yahoo Finance
              </a>
            )}
          </div>

          <p className="text-foreground/85 leading-relaxed">{claim.text}</p>
          {claim.note && <p className="text-muted-foreground mt-1 italic">{claim.note}</p>}

          {claim.yahooCheck && (
            <div className={`mt-1.5 p-1.5 rounded-lg text-[10px] ${
              claim.yahooCheck.match ? "bg-gain/10 text-gain" : "bg-orange-50 text-orange-700"
            }`}>
              <strong>Yahoo Finance:</strong> {claim.yahooCheck.detail}
            </div>
          )}

          {claim.secCheck && (
            <div className={`mt-1.5 p-1.5 rounded-lg text-[10px] ${
              claim.secCheck.match ? "bg-violet-50 text-violet-700" : "bg-red-50 text-red-700"
            }`}>
              <strong>SEC EDGAR:</strong> {claim.secCheck.detail}
              {claim.secCheck.edgarLink && (
                <a
                  href={claim.secCheck.edgarLink}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-1.5 underline opacity-70 hover:opacity-100 inline-flex items-center gap-0.5"
                >
                  <ExternalLink className="w-2.5 h-2.5 inline" /> View 10-K
                </a>
              )}
            </div>
          )}

          {/* AI mistaken? — amber pill */}
          <div className="mt-2">
            {reportSent ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" /> Reported — thanks!
              </span>
            ) : (
              <button
                onClick={handleReportMistake}
                aria-label="Report AI mistake for this claim"
                className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded-full font-medium transition-colors"
              >
                <Flag className="w-2.5 h-2.5" aria-hidden="true" /> AI mistaken? Report us
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Community Notes — only for Opinion */}
      {claim.type === "Opinion" && (
        <div className="mt-2 ml-5 pl-2 border-l-2 border-blue-200">
          <p className="text-[10px] font-semibold text-blue-600 mb-1 flex items-center gap-1">
            <MessageSquareQuote className="w-3 h-3" /> Community Notes
          </p>
          {notes.length === 0 && !showAdd && (
            <p className="text-[10px] text-muted-foreground">No community notes yet.</p>
          )}
          {notes.map(note => (
            <div key={note.id} className="mb-1">
              <p className="text-[11px] text-foreground/80">{note.text}</p>
              <p className="text-[9px] text-muted-foreground">{note.time}</p>
            </div>
          ))}
          {showAdd ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitNote()}
                placeholder="Add context or a correction..."
                className="flex-1 text-[11px] border border-blue-200 rounded-lg px-2 py-1 bg-white/80 focus:outline-none focus:ring-1 focus:ring-blue-300"
                autoFocus
              />
              <button onClick={submitNote} className="text-[10px] text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-lg">Post</button>
              <button onClick={() => setShowAdd(false)} className="text-[10px] text-muted-foreground px-1"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="text-[10px] text-blue-600 hover:underline mt.0.5">+ Add a note</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Saved fact-check panel ──────────────────────────────────────────────────
function SavedFactCheck({ claims, reportContent }) {
  const [open, setOpen]           = useState(true);
  const [activeFilter, setFilter] = useState(null);
  const [showLive, setShowLive]   = useState(false);

  const summary = Object.fromEntries(
    Object.keys(TYPE_CONFIG).map(t => [t, claims.filter(c => c.type === t).length])
  );

  const visible = activeFilter
    ? claims.filter(c => c.type === activeFilter)
    : claims;

  const toggleFilter = (type) => setFilter(prev => prev === type ? null : type);

  if (showLive) {
    return <FactChecker reportContent={reportContent} />;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <h4 className="font-semibold text-sm">AI Fact Check</h4>
            <p className="text-[10px] text-muted-foreground">Claude AI · Yahoo Finance · SEC EDGAR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLive(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 hover:border-primary/40 transition-colors"
            title="Re-run fact check with latest data"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Re-run
          </button>
          <button onClick={() => setOpen(v => !v)} className="text-xs text-muted-foreground hover:text-foreground">
            {open ? <X className="w-3.5 h-3.5" /> : "Show"}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(summary).filter(([, v]) => v > 0).map(([type, count]) => {
          const cfg = TYPE_CONFIG[type];
          if (!cfg) return null;
          const isActive = activeFilter === type;
          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${cfg.bg} ${cfg.color} ${
                isActive ? "ring-2 ring-offset-1 ring-current opacity-100" : "opacity-70 hover:opacity-100"
              }`}
              title={isActive ? "Clear filter" : `Show only ${cfg.label}s`}
            >
              {count} {cfg.label}{count > 1 ? "s" : ""}
              {isActive && " ×"}
            </button>
          );
        })}
        {activeFilter && (
          <button
            onClick={() => setFilter(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full border border-border"
          >
            Show all ({claims.length})
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-2">
          {visible.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No {TYPE_CONFIG[activeFilter]?.label}s in this report.
            </p>
          ) : (
            visible.map((claim, i) => <ClaimWithNotes key={i} claim={claim} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Block renderer ──────────────────────────────────────────────────────────
function BlockRenderer({ blocks }) {
  if (!blocks?.length) return <p className="text-muted-foreground italic text-sm">This report has no content yet.</p>;
  return (
    <div className="space-y-4 report-body">
      {blocks.map((block, i) => {
        const content = block.content ?? "";
        if (block.type === "heading") return (
          <h2 key={i} className="text-xl font-bold text-foreground mt-6 mb-2">{content}</h2>
        );
        if (block.type === "bullets") return (
          <ul key={i} className="list-disc list-inside space-y-1 pl-2">
            {content.split("\n").filter(Boolean).map((line, j) => (
              <li key={j} className="text-foreground/90 text-sm leading-relaxed">{line.replace(/^[•\-]\s*/, "")}</li>
            ))}
          </ul>
        );
        if (block.type === "quote") return (
          <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic text-foreground/80 text-sm">{content}</blockquote>
        );
        if (block.type === "stockchart") {
          const chartTicker = block.ticker || block.content || "SPY";
          const chartHeight = block.height || 420;
          return (
            <div key={i} className="my-4 rounded-xl overflow-hidden border border-border">
              {block.snapshot_url ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border">
                    <span className="font-mono font-bold text-sm text-primary">{chartTicker}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">Chart snapshot at publish time</span>
                  </div>
                  <img src={block.snapshot_url} alt={`${chartTicker} chart`} loading="lazy" className="w-full object-cover" style={{ height: chartHeight }} />
                  <div className="px-3 py-2 border-t border-border">
                    <a href={`/stock?ticker=${chartTicker}`} className="text-xs text-primary hover:underline">View live chart for ${chartTicker} →</a>
                  </div>
                </>
              ) : (
                <TradingViewWidget ticker={chartTicker} height={chartHeight} />
              )}
            </div>
          );
        }
        if (block.type === "image" && block.content) return (
          <img key={i} src={block.content} alt="" className="rounded-xl max-w-full" />
        );
        // Always render text blocks — even if content seems empty show nothing rather than skip
        if (!block.content && block.content !== 0) return null;
        return <p key={i} className="text-foreground/90 leading-relaxed text-sm whitespace-pre-line">{block.content}</p>;
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ReportView() {
  const navigate = useNavigate();
  const goBack   = useGoBack("/feed");
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");
  const isPaid = urlParams.get("paid") === "true";

  const [report, setReport] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showSubDialog,    setShowSubDialog]    = useState(false);
  const [unlockedNow, setUnlockedNow] = useState(false); // optimistic reveal after purchase
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting,         setDeleting]         = useState(false);
  // Like helpers (imported inline to avoid circular deps)
  const isLikedKey = (id) => `stoa_liked_${currentUser?.email || "anon"}_${id}`;
  const checkLiked = (id) => localStorage.getItem(isLikedKey(id)) === '1';
  const writeLiked = (id, val) => val ? localStorage.setItem(isLikedKey(id), '1') : localStorage.removeItem(isLikedKey(id));
  const [viewCount, setViewCount] = useState(0);
  const [authorUser, setAuthorUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [moreReports, setMoreReports] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reportId || reportId === "undefined" || reportId === "null") {
      setError("No report ID specified.");
      setLoading(false);
      return;
    }
    const loadReport = async () => {
      let data = await base44.entities.Report.get(reportId).catch(() => null);
      // Fallback: try filter if get() is blocked by RLS
      if (!data) {
        const results = await base44.entities.Report.filter({ status: "published" }, "-created_date", 200).catch(() => []);
        data = (results || []).find(r => r.id === reportId) || null;
      }
      return data;
    };
    loadReport()
      .then(async data => {
        if (!data) { setError("Report not found."); return; }
        setReport(data);
        setLikeCount(data.likes || 0);
        setViewCount(data.views || 0);
        setLiked(checkLiked(reportId));
        base44.analytics.track({ eventName: "report_viewed", properties: { report_id: reportId, is_premium: data.is_premium || false } });
        if (data.content_blocks) {
          try {
            const parsed = JSON.parse(data.content_blocks);
            setBlocks(Array.isArray(parsed) ? parsed : []);
          } catch {
            setBlocks([{ type: "text", content: data.content_blocks, id: 0 }]);
          }
        }
        // Fetch author user for avatar fallback + more reports
        if (data.created_by) {
          const users = await base44.entities.User.filter({ email: data.created_by }).catch(() => []);
          if (users?.[0]) setAuthorUser(users[0]);
          base44.entities.Report.filter({ created_by: data.created_by, status: "published" }, "-created_date", 5)
            .then(more => setMoreReports((more || []).filter(r => r.id !== reportId).slice(0, 3)))
            .catch(() => {});
        }
      })
      .catch(() => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, [reportId]);  // eslint-disable-line

  // Track view — runs once per session, skips if viewer is the author
  useEffect(() => {
    if (!report || !reportId) return;
    const viewedKey = `viewed_${reportId}`;
    if (sessionStorage.getItem(viewedKey)) return;
    if (currentUser?.email && report.created_by === currentUser.email) return; // skip own views
    sessionStorage.setItem(viewedKey, '1');
    const newViews = (report.views || 0) + 1;
    setViewCount(newViews);
    base44.entities.ReportView.create({
      report_id: report.id,
      analyst_email: report.created_by,
      viewer_email: currentUser?.email || null,
      viewed_at: new Date().toISOString(),
    }).catch(() => {});
    base44.entities.Report.update(report.id, { views: newViews }).catch(() => {});
  }, [report?.id, currentUser?.email]);

  // Fetch live price for prediction badge
  useEffect(() => {
    if (!report?.prediction_ticker) return;
    base44.functions.invoke("proxyFetch", {
      url: `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${report.prediction_ticker}?modules=price`,
    }).then(res => {
      const price = res?.data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (price) setLivePrice(price);
    }).catch(() => {});
  }, [report?.prediction_ticker]);

  // SEO: dynamic meta + JSON-LD
  useEffect(() => {
    if (!report) return;
    setMeta({
      title: report.title,
      description: report.excerpt || `${report.author_name} on STOA: ${report.title}`,
      type: "article",
    });
    injectJsonLd("jsonld-report", {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": report.title,
      "author": {
        "@type": "Person",
        "name": report.author_name,
        "url": `${window.location.origin}/analyst/${(report.created_by || "").split("@")[0]}`,
      },
      "datePublished": report.created_date,
      "dateModified":  report.updated_date || report.created_date,
      "publisher": {
        "@type": "Organization",
        "name": "STOA",
        "url": "https://stoamarket.ai",
        "logo": { "@type": "ImageObject", "url": "https://stoamarket.ai/og-image.png" },
      },
      "description":      report.excerpt,
      "keywords":         (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean),
      "image":            report.author_avatar || "https://stoamarket.ai/og-image.png",
      "mainEntityOfPage": window.location.href,
      "about":            (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean).map(ticker => ({
        "@type":       "Corporation",
        "tickerSymbol": ticker,
      })),
    });
  }, [report]);

  const savedClaims = useMemo(() => {
    if (!report?.fact_check_results) return null;
    try { return JSON.parse(report.fact_check_results)?.claims || null; }
    catch { return null; }
  }, [report]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !report) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground mb-4">{error || "Report not found."}</p>
      <button onClick={goBack} className="text-primary hover:underline text-sm">Go Back</button>
    </div>
  );

  const authorName = report.author_name || authorUser?.full_name || report.created_by?.split("@")[0] || "Researcher";
  const authorAvatar = report.author_avatar || avatarUrl(authorUser);
  const isPremium = report.is_premium || false;
  const publishedDate = report.created_date;

  const isAuthor = currentUser && report.created_by === currentUser.email;
  const isAdmin  = currentUser?.role === "admin";
  const canSeeTarget = !isPremium || isPaid || isAuthor || unlockedNow;
  // Locked prediction = a prediction was logged to the analyst's track record.
  // We detect this by the presence of a lock_time + lock_price.
  const hasLockedPrediction = !!(report.prediction_lock_time && report.prediction_lock_price);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      // Admins: hard-delete unconditionally.
      // Authors (non-admin): hard-delete IF no locked prediction. Otherwise
      // blank the content (soft delete) so the prediction row stays in their
      // track record. This is enforced client-side; the RLS already allows
      // deletes from both creator and admin.
      if (isAdmin || !hasLockedPrediction) {
        await base44.entities.Report.delete(report.id);
        toast.success("Report deleted");
      } else {
        await base44.entities.Report.update(report.id, {
          is_content_deleted: true,
          content_blocks: "[]",
          excerpt: "",
          title: report.title ? `${report.title} (deleted)` : "Deleted report",
        });
        toast.success("Report content removed. Your prediction stays in your track record.");
      }
      navigate(isAdmin ? "/feed" : "/analyst", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Failed to delete report");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  const prediction = report.prediction_action ? {
    action: report.prediction_action,
    ticker: report.prediction_ticker,
    targetPrice: canSeeTarget ? report.prediction_target_price : null,
    lockPrice: report.prediction_lock_price,
    lockTime: report.prediction_lock_time,
    timeframe: report.prediction_timeframe,
    outcome: report.prediction_outcome || null,
    resolvedPrice: report.prediction_resolved_price || null,
  } : null;

  const plainText = [report.title, ...blocks.map(b => b.content || "")].filter(Boolean).join("\n\n");

  // tickers is stored as a comma-separated string
  const tickers = (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tickers.map(t => <TickerTag key={t} ticker={t} />)}
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{report.title}</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button onClick={() => navigate(`/analyst?id=${report.created_by}`)} className="flex items-center gap-2">
          {authorAvatar
            ? <img src={authorAvatar} alt={authorName} loading="lazy" className="w-8 h-8 rounded-full object-cover border border-border" />
            : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {(authorName[0] || "A").toUpperCase()}
              </div>
          }
          <div>
            <p className="text-sm font-semibold hover:text-primary transition-colors">{authorName}</p>
            {report.author_accuracy > 0 && <p className="text-xs text-muted-foreground">{report.author_accuracy}% Acc.</p>}
          </div>
        </button>
        {publishedDate && (
          <span className="text-xs text-muted-foreground">{format(new Date(publishedDate), "MMMM d, yyyy · h:mm a")}</span>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="w-3.5 h-3.5" /> {viewCount}
          </span>
          <button
            onClick={async () => {
              if (!currentUser) return;
              // Guard: prevent double-like
              if (checkLiked(report.id) && !liked) { setLiked(true); return; }
              const newLiked = !liked;
              const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
              setLiked(newLiked);
              setLikeCount(newCount);
              writeLiked(report.id, newLiked);
              await base44.entities.Report.update(report.id, { likes: newCount });
              if (newLiked && report.created_by && report.created_by !== currentUser.email) {
                base44.entities.Notification.create({
                  user_email: report.created_by,
                  type: "like",
                  title: `${currentUser.full_name || currentUser.email?.split("@")[0]} liked your report`,
                  body: report.title?.slice(0, 80) || "",
                  link: `/report?id=${report.id}`,
                }).catch(() => {});
              }
              base44.analytics.track({ eventName: "report_liked", properties: { report_id: report.id } });
            }}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-loss" : "text-muted-foreground"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-loss" : ""}`} /> {likeCount}
          </button>
          <ShareMenu title={report.title} reportId={report.id} />
          {(isAuthor || (!isPremium)) && (
            <ExportPDFButton report={report} blocks={blocks} />
          )}
          {(isAuthor || isAdmin) && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              title={isAdmin && !isAuthor ? "Delete (admin)" : "Delete report"}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-loss transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
             onClick={() => !deleting && setShowDeleteDialog(false)}>
          <div onClick={(e) => e.stopPropagation()}
               className="surface max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-loss" />
              <h3 className="text-lg font-bold">Delete this report?</h3>
            </div>
            {/* Three explanations: admin override, author with lock, author without lock. */}
            {isAdmin && !isAuthor ? (
              <p className="text-sm text-muted-foreground mb-5">
                You're deleting this as an admin. The report, its content, and any
                prediction block will be permanently removed. This cannot be undone.
              </p>
            ) : hasLockedPrediction ? (
              <p className="text-sm text-muted-foreground mb-5">
                This report contains a <strong>locked prediction</strong> that's already in your track record.
                Your prediction will <strong>stay</strong> in your track record — only the report
                content will be removed. The report will show as "deleted" to readers.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-5">
                This report has no locked prediction yet, so it will be permanently
                deleted. This cannot be undone.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" disabled={deleting}
                      onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={deleting}
                      className="bg-loss text-white hover:bg-loss/90">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {prediction && <PredictionBadge prediction={prediction} currentPrice={livePrice} />}

      {/* Visual proof — trajectory of the underlying since lock */}
      {report.prediction_lock_price && report.prediction_lock_time && (
        <div className="my-6">
          <PredictionTrajectoryChart report={report} />
        </div>
      )}

      <div className="mb-8">
        {report.is_content_deleted ? (
          <div className="surface p-6 text-center">
            <Trash2 className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              The author has deleted this report's content. The locked prediction
              remains in their track record below.
            </p>
          </div>
        ) : (!isPremium || isPaid || isAuthor || unlockedNow) ? (
          <BlockRenderer blocks={blocks} />
        ) : (
          <>
            {/* Show excerpt + first ~2 blocks blurred as preview */}
            {report.excerpt && (
              <p className="text-foreground/90 leading-relaxed mb-4 text-base">{report.excerpt}</p>
            )}

            {/* Blurred content preview */}
            {blocks.length > 0 && (
              <div className="relative mb-0 overflow-hidden rounded-xl" style={{ maxHeight: 220 }}>
                <div className="pointer-events-none select-none">
                  <BlockRenderer blocks={blocks.slice(0, 3)} />
                </div>
                {/* gradient fade */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
                <div className="absolute inset-0 backdrop-blur-[3px] bg-background/20" />
              </div>
            )}

            {/* Paywall card */}
            <div className="relative rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 mt-0">
              {/* Premium badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
                  Premium Report
                </span>
              </div>

              <div className="text-center pt-2">
                <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-1">Full Analysis Locked</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                  Get the complete research: valuation model, price target, catalysts, risks, and analyst conviction.
                </p>

                {/* What's inside */}
                <div className="grid grid-cols-2 gap-2 mb-5 text-left max-w-sm mx-auto">
                  {[
                    { icon: BarChart2, label: "Full valuation model" },
                    { icon: Target, label: "Price target & catalysts" },
                    { icon: ShieldAlert, label: "Key risks breakdown" },
                    { icon: TrendingUp, label: "Technical setup" },
                    { icon: Lightbulb, label: "Researcher conviction score" },
                    { icon: Lock, label: "Locked prediction" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-foreground/80">
                      <Icon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => setShowUnlockDialog(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2 px-6 shadow-md"
                    size="lg"
                  >
                    <Lock className="w-4 h-4" />
                    Unlock for ${report.price || 4.99}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSubDialog(true)}
                    className="border-amber-300 gap-2 px-6"
                    size="lg"
                  >
                    Subscribe · $9/mo
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground mt-3">
                  Paid from your wallet · One-time unlock or unlimited access via subscription
                </p>
              </div>
            </div>

            {/* Analyst trust bar */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
              {authorAvatar
                ? <img src={authorAvatar} alt={authorName} className="w-9 h-9 rounded-full object-cover border border-border" />
                : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{(authorName[0] || "A").toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {report.author_accuracy > 0 ? `${report.author_accuracy}% prediction accuracy` : "Verified researcher on STOA"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs shrink-0"
                onClick={() => navigate(`/analyst?id=${report.created_by}`)}
              >
                View Profile
              </Button>
            </div>
          </>
        )}
      </div>

      {(!isPremium || isPaid || isAuthor) && (
        <div className="mb-8">
          {savedClaims ? (
            <SavedFactCheck claims={savedClaims} reportContent={plainText} />
          ) : plainText.length > 50 ? (
            <FactChecker reportContent={plainText} />
          ) : null}
        </div>
      )}

      <CommentsSection reportId={report.id} reportAuthorEmail={report.created_by} reportTitle={report.title} />

      {/* More from this analyst */}
      {moreReports.length > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">More from {authorName}</h3>
            <button
              onClick={() => navigate(`/analyst?id=${report.created_by}`)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View profile <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {moreReports.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/report?id=${r.id}`)}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/40 transition-all group"
              >
                {r.prediction_direction && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                    r.prediction_direction === "LONG" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {r.prediction_direction}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.created_date ? new Date(r.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                    {r.stock_ticker ? ` · ${r.stock_ticker}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wallet-based unlock dialog */}
      <WalletConfirmDialog
        open={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onConfirm={async () => {
          const res = await buyReport({
            authorEmail:   report.created_by,
            reportId:      report.id,
            reportTitle:   report.title,
            priceUSD:      report.price || 4.99,
          });
          if (!res.ok) {
            if (res.reason === "insufficient") {
              toast.error(`Need $${res.needed.toFixed(2)} more in wallet.`, {
                action: { label: "Top up", onClick: () => navigate("/pay?mode=deposit") },
                duration: 6000,
              });
            }
            return;
          }
          setUnlockedNow(true);
          setShowUnlockDialog(false);
          toast.success("Report unlocked");
        }}
        title="Unlock report"
        amountUSD={report.price || 4.99}
        itemLabel={`${report.title} · by ${authorName}`}
        showSplit={true}
        confirmLabel="Unlock"
      />

      {/* Wallet-based subscribe dialog */}
      <WalletConfirmDialog
        open={showSubDialog}
        onClose={() => setShowSubDialog(false)}
        onConfirm={async () => {
          const res = await subscribeAnalyst({
            analystEmail:    report.created_by,
            analystName:     authorName,
            monthlyPriceUSD: 9,
          });
          if (!res.ok) {
            if (res.reason === "insufficient") {
              toast.error(`Need $${res.needed.toFixed(2)} more in wallet.`, {
                action: { label: "Top up", onClick: () => navigate("/pay?mode=deposit") },
                duration: 6000,
              });
            }
            return;
          }
          setUnlockedNow(true);
          setShowSubDialog(false);
          toast.success(`Subscribed to ${authorName}!`);
        }}
        title={`Subscribe to ${authorName}`}
        amountUSD={9}
        itemLabel={`${authorName} · Monthly subscription · Full access to all reports`}
        showSplit={true}
        confirmLabel="Subscribe"
      />
    </div>
  );
}