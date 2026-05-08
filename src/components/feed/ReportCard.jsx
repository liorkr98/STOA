import React, { useState } from "react";
import { Heart, MessageCircle, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Lock, BadgeCheck, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import TickerTag from "./TickerTag";
import ShareMenu from "./ShareMenu";

const ACTION_CONFIG = {
  Long: { color: "text-gain", bg: "bg-gain/10 border-gain/20", icon: TrendingUp, arrow: "↑" },
  Short: { color: "text-loss", bg: "bg-loss/10 border-loss/20", icon: TrendingDown, arrow: "↓" },
  Hold: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Minus, arrow: "—" },
};

function AccuracyBadge({ accuracy }) {
  if (!accuracy) return null;
  const color = accuracy >= 80 ? "text-gain" : accuracy >= 60 ? "text-amber-600" : "text-loss";
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${color}`}>
      <BadgeCheck className="w-3 h-3" />
      {accuracy}% Acc.
    </span>
  );
}

export default function ReportCard({ report, compact = false }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes || 0);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const authorName = report.author_name || report.author?.name || report.created_by?.split("@")[0] || "Analyst";
  const authorAvatar = report.author_avatar || report.author?.avatar || null;
  const authorAccuracy = report.author?.accuracy || null;
  const isPremium = report.is_premium || report.isPremium || false;

  const prediction = report.prediction_action ? {
    action: report.prediction_action,
    ticker: report.prediction_ticker,
    targetPrice: report.prediction_target_price,
    timeframe: report.prediction_timeframe,
    outcome: null,
  } : report.prediction || null;

  const publishedDate = report.created_date || report.publishedAt;
  const predictionOutcome = prediction?.outcome;

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const actionCfg = ACTION_CONFIG[prediction?.action] || ACTION_CONFIG.Hold;
  const ActionIcon = actionCfg.icon;

  return (
    <div
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Top row: author + premium badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          to={`/analyst?id=${report.created_by || report.author?.id || ""}`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
            {authorAvatar
              ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              : authorName[0]?.toUpperCase()
            }
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground block">{authorName}</span>
            <AccuracyBadge accuracy={authorAccuracy} />
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPremium && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Lock className="w-2.5 h-2.5" /> Premium
            </span>
          )}
          {publishedDate && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {format(new Date(publishedDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Prominent prediction badge — right below author */}
      {prediction && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border mb-3 ${actionCfg.bg} ${actionCfg.color}`}>
          <ActionIcon className="w-3.5 h-3.5" />
          {actionCfg.arrow} {prediction.action} ${prediction.ticker}
          {prediction.targetPrice && !isPremium && (
            <span className="font-semibold ml-0.5">→ ${prediction.targetPrice}</span>
          )}
          {isPremium && (
            <span className="flex items-center gap-0.5 ml-0.5 opacity-60"><Lock className="w-3 h-3" /> Target hidden</span>
          )}
          {predictionOutcome === "hit" && (
            <span className="flex items-center gap-0.5 ml-1 text-gain text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Hit
            </span>
          )}
          {predictionOutcome === "miss" && (
            <span className="flex items-center gap-0.5 ml-1 text-loss text-[10px]">
              <XCircle className="w-3 h-3" /> Miss
            </span>
          )}
        </div>
      )}

      <h3 className="font-bold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
        {report.title}
      </h3>
      {!compact && report.excerpt && (
        <div className="mb-3">
          <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {report.excerpt}
          </p>
          {report.excerpt.length > 120 && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary font-medium mt-1.5 transition-colors"
            >
              {expanded ? (
                <><span>Show less</span><span className="text-[10px]">↑</span></>
              ) : (
                <><span>Read more</span><span className="text-[10px]">↓</span></>
              )}
            </button>
          )}
        </div>
      )}

      {(() => {
        const tickers = Array.isArray(report.tickers)
          ? report.tickers
          : (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean);
        return tickers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
            {tickers.map(t => <TickerTag key={t} ticker={t} />)}
          </div>
        ) : null;
      })()}

      <div className="flex items-center gap-4 mt-2">
        <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-loss" : "text-muted-foreground hover:text-foreground"}`}>
          <Heart className={`w-4 h-4 ${liked ? "fill-loss" : ""}`} />
          {likeCount}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/report?id=${report.id}#comments`); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
        {isPremium && report.price && (
          <span className="text-xs font-semibold text-amber-600 ml-auto">${report.price}</span>
        )}
        <span onClick={e => e.stopPropagation()} className={isPremium && report.price ? "" : "ml-auto"}>
          <ShareMenu title={report.title} reportId={report.id} />
        </span>
      </div>
    </div>
  );
}