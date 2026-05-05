import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { setMeta, injectJsonLd } from "@/lib/seo";
import {
  ArrowLeft, Heart, Lock, Loader2, Sparkles,
  CheckCircle2, AlertTriangle, Info, MessageSquareQuote, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import PredictionBadge from "@/components/feed/PredictionBadge";
import TickerTag from "@/components/feed/TickerTag";
import ShareMenu from "@/components/feed/ShareMenu";
import CommentsSection from "@/components/report/CommentsSection";
import FactChecker from "@/components/report/FactChecker";
import TradingViewWidget from "@/components/feed/TradingViewWidget";

// ─── Claim type config ───────────────────────────────────────────────────────
const TYPE_CONFIG = {
  Fact:       { icon: CheckCircle2,      color: "text-gain",      bg: "bg-gain/10 border-gain/20",       label: "Verified Fact" },
  Opinion:    { icon: MessageSquareQuote, color: "text-blue-600",  bg: "bg-blue-50 border-blue-200",      label: "Opinion" },
  Misleading: { icon: AlertTriangle,     color: "text-loss",      bg: "bg-loss/10 border-loss/20",       label: "Potentially Misleading" },
  Unverified: { icon: Info,              color: "text-amber-600", bg: "bg-amber-50 border-amber-200",    label: "Unverified" },
};

// ─── Community Notes under Opinion claims ────────────────────────────────────
function ClaimWithNotes({ claim }) {
  const cfg = TYPE_CONFIG[claim.type] || TYPE_CONFIG.Unverified;
  const Icon = cfg.icon;
  const [notes, setNotes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [noteText, setNoteText] = useState("");

  const submitNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { id: Date.now(), text: noteText.trim(), time: "just now" }]);
    setNoteText("");
    setShowAdd(false);
  };

  return (
    <div className={`rounded-xl border p-3 text-xs ${cfg.bg}`}>
      <div className="flex gap-2">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-bold text-[11px] ${cfg.color}`}>{cfg.label}</span>
            {claim.confidence && (
              <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ml-auto ${
                claim.confidence === "high" ? "bg-gain/10 text-gain" :
                claim.confidence === "medium" ? "bg-amber-50 text-amber-700" :
                "bg-muted text-muted-foreground"
              }`}>{claim.confidence} confidence</span>
            )}
          </div>
          <p className="text-foreground/85 leading-relaxed">{claim.text}</p>
          {claim.note && <p className="text-muted-foreground mt-1 italic">{claim.note}</p>}
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
            <button onClick={() => setShowAdd(true)} className="text-[10px] text-blue-600 hover:underline mt-0.5">+ Add a note</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Saved fact-check panel ──────────────────────────────────────────────────
function SavedFactCheck({ claims }) {
  const [open, setOpen] = useState(true);
  const summary = {
    Fact:       claims.filter(c => c.type === "Fact").length,
    Opinion:    claims.filter(c => c.type === "Opinion").length,
    Misleading: claims.filter(c => c.type === "Misleading").length,
    Unverified: claims.filter(c => c.type === "Unverified").length,
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <h4 className="font-semibold text-sm">AI Fact Check</h4>
            <p className="text-[10px] text-muted-foreground">Powered by Claude · Checked at publish time</p>
          </div>
        </div>
        <button onClick={() => setOpen(v => !v)} className="text-xs text-muted-foreground hover:text-foreground">
          {open ? <X className="w-3.5 h-3.5" /> : "Show"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(summary).filter(([, v]) => v > 0).map(([type, count]) => {
          const cfg = TYPE_CONFIG[type];
          return (
            <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
              {count} {cfg.label}{count > 1 ? "s" : ""}
            </span>
          );
        })}
      </div>
      {open && (
        <div className="space-y-2">
          {claims.map((claim, i) => <ClaimWithNotes key={i} claim={claim} />)}
        </div>
      )}
    </div>
  );
}

// ─── Block renderer ──────────────────────────────────────────────────────────
function BlockRenderer({ blocks }) {
  if (!blocks?.length) return <p className="text-muted-foreground italic text-sm">This report has no content yet.</p>;
  return (
    <div className="space-y-4">
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
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");
  const isPaid = urlParams.get("paid") === "true";

  const [report, setReport] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!reportId) { setError("No report ID specified."); setLoading(false); return; }
    base44.entities.Report.get(reportId)
      .then(data => {
        if (!data) { setError("Report not found."); return; }
        setReport(data);
        setLikeCount(data.likes || 0);
        if (data.content_blocks) {
          try {
            const parsed = JSON.parse(data.content_blocks);
            setBlocks(Array.isArray(parsed) ? parsed : []);
          } catch {
            setBlocks([{ type: "text", content: data.content_blocks, id: 0 }]);
          }
        }
      })
      .catch(() => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, [reportId]);

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
      "author": { "@type": "Person", "name": report.author_name },
      "datePublished": report.created_date,
      "publisher": { "@type": "Organization", "name": "STOA", "url": "https://stakify-f5b3c3a0.base44.app" },
      "description": report.excerpt,
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
      <button onClick={() => navigate(-1)} className="text-primary hover:underline text-sm">Go Back</button>
    </div>
  );

  const authorName = report.author_name || report.created_by?.split("@")[0] || "Analyst";
  const authorAvatar = report.author_avatar;
  const isPremium = report.is_premium || false;
  const publishedDate = report.created_date;

  const canSeeTarget = !isPremium || isPaid;

  const prediction = report.prediction_action ? {
    action: report.prediction_action,
    ticker: report.prediction_ticker,
    targetPrice: canSeeTarget ? report.prediction_target_price : null,
    lockPrice: canSeeTarget ? report.prediction_lock_price : null,
    lockTime: report.prediction_lock_time,
    timeframe: report.prediction_timeframe,
    outcome: null,
  } : null;

  const plainText = [report.title, ...blocks.map(b => b.content || "")].filter(Boolean).join("\n\n");

  // tickers is stored as a comma-separated string
  const tickers = (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
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
          <button
            onClick={() => { setLiked(v => !v); setLikeCount(p => liked ? p - 1 : p + 1); }}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-loss" : "text-muted-foreground"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-loss" : ""}`} /> {likeCount}
          </button>
          <ShareMenu title={report.title} reportId={report.id} />
        </div>
      </div>

      {prediction && <PredictionBadge prediction={prediction} />}

      <div className="mb-8">
        {(!isPremium || isPaid) ? (
          <BlockRenderer blocks={blocks} />
        ) : (
          <>
            {report.excerpt && <p className="text-foreground/90 leading-relaxed mb-4">{report.excerpt}</p>}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center my-8">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-base mb-2">This is a Premium Report</h3>
              <p className="text-sm text-muted-foreground mb-4">Unlock the full analysis, DCF model, and detailed catalysts.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => navigate(`/pay?mode=report&id=${report.id}&title=${encodeURIComponent(report.title)}&price=${report.price || 4.99}&analyst=${encodeURIComponent(authorName)}`)
                } className="bg-amber-500 hover:bg-amber-600 text-white">
                  Unlock for ${report.price || 4.99}
                </Button>
                <Button variant="outline" onClick={() => navigate(`/pay?mode=analyst&analyst=${encodeURIComponent(authorName)}`)}>
                  Subscribe from $9/mo
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {(!isPremium || isPaid) && (
        <div className="mb-8">
          {savedClaims ? (
            <SavedFactCheck claims={savedClaims} />
          ) : plainText.length > 50 ? (
            <FactChecker reportContent={plainText} />
          ) : null}
        </div>
      )}

      <CommentsSection reportId={report.id} />
    </div>
  );
}