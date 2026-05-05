import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Lock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import PredictionBadge from "@/components/feed/PredictionBadge";
import TickerTag from "@/components/feed/TickerTag";
import ShareMenu from "@/components/feed/ShareMenu";
import CommentsSection from "@/components/report/CommentsSection";
import FactChecker from "@/components/report/FactChecker";

function BlockRenderer({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "heading") return <h2 key={i} className="text-xl font-bold text-foreground mt-6 mb-2">{block.content}</h2>;
        if (block.type === "bullets") return (
          <ul key={i} className="list-disc list-inside space-y-1">
            {block.content.split("\n").filter(Boolean).map((line, j) => (
              <li key={j} className="text-foreground/90 text-sm leading-relaxed">{line.replace(/^•\s*/, "")}</li>
            ))}
          </ul>
        );
        if (block.type === "quote") return (
          <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic text-foreground/80 text-sm">{block.content}</blockquote>
        );
        return <p key={i} className="text-foreground/90 leading-relaxed text-sm">{block.content}</p>;
      })}
    </div>
  );
}

export default function ReportView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");
  const isPaid = urlParams.get("paid") === "true";

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!reportId) { setError("No report ID specified."); setLoading(false); return; }
    base44.entities.Report.filter({ id: reportId })
      .then(results => {
        const r = results?.[0];
        if (!r) { setError("Report not found."); return; }
        setReport(r);
        setLikeCount(r.likes || 0);
      })
      .catch(() => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, [reportId]);

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

  // Parse content_blocks from JSON string
  let blocks = [];
  try { blocks = report.content_blocks ? JSON.parse(report.content_blocks) : []; } catch { blocks = []; }

  const authorName = report.author_name || report.created_by?.split("@")[0] || "Analyst";
  const authorAvatar = report.author_avatar;
  const isPremium = report.is_premium || false;
  const publishedDate = report.created_date;

  // Build plain text for FactChecker
  const plainText = [report.title, ...blocks.map(b => b.content || "")].filter(Boolean).join("\n\n");

  const prediction = report.prediction_action ? {
    action: report.prediction_action,
    ticker: report.prediction_ticker,
    targetPrice: report.prediction_target_price,
    timeframe: report.prediction_timeframe,
    outcome: null,
  } : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </button>

      {(report.tickers || []).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {report.tickers.map(t => <TickerTag key={t} ticker={t} />)}
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{report.title}</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button onClick={() => navigate(`/analyst?id=${report.created_by}`)} className="flex items-center gap-2">
          {authorAvatar
            ? <img src={authorAvatar} alt={authorName} className="w-8 h-8 rounded-full object-cover" />
            : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{authorName[0]?.toUpperCase()}</div>
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
            <Heart className={`w-4 h-4 ${liked ? "fill-loss" : ""}`} />
            {likeCount}
          </button>
          <ShareMenu title={report.title} reportId={report.id} />
        </div>
      </div>

      {prediction && <PredictionBadge prediction={prediction} />}

      <div className="prose prose-sm max-w-none mb-8">
        {(!isPremium || isPaid) ? (
          blocks.length > 0
            ? <BlockRenderer blocks={blocks} />
            : report.excerpt
              ? <p className="text-foreground/90 leading-relaxed">{report.excerpt}</p>
              : <p className="text-muted-foreground italic">No content available.</p>
        ) : (
          <>
            {report.excerpt && <p className="text-foreground/90 leading-relaxed mb-4">{report.excerpt}</p>}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center my-8">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-base mb-2">This is a Premium Report</h3>
              <p className="text-sm text-muted-foreground mb-4">Unlock the full analysis, DCF model, and detailed catalysts.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => navigate(`/pay?mode=report&id=${report.id}&title=${encodeURIComponent(report.title)}&price=${report.price || 4.99}&analyst=${encodeURIComponent(authorName)}`)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
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

      {(!isPremium || isPaid) && plainText.length > 50 && (
        <div className="mb-8">
          <FactChecker reportContent={plainText} />
        </div>
      )}

      <CommentsSection reportId={report.id} />
    </div>
  );
}