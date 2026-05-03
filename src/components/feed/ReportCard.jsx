import React, { useState } from "react";
import { Heart, MessageCircle, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import TickerTag from "./TickerTag";
import ShareMenu from "./ShareMenu";

const ACTION_CONFIG = {
  Long: { color: "text-gain", bg: "bg-gain/10 border-gain/20", icon: TrendingUp },
  Short: { color: "text-loss", bg: "bg-loss/10 border-loss/20", icon: TrendingDown },
  Hold: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Minus },
};

export default function ReportCard({ report, compact = false }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes || 0);
  const navigate = useNavigate();

  // Normalize entity fields vs legacy fields
  const authorName = report.author_name || report.created_by?.split("@")[0] || "Analyst";
  const authorAvatar = report.author_avatar || null;
  const isPremium = report.is_premium || report.isPremium || false;
  const prediction = report.prediction_action ? {
    action: report.prediction_action,
    ticker: report.prediction_ticker,
    targetPrice: report.prediction_target_price,
    timeframe: report.prediction_timeframe,
  } : report.prediction || null;
  const publishedDate = report.created_date || report.publishedAt;

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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
            {authorAvatar
              ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              : authorName[0]?.toUpperCase()
            }
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground block">{authorName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPremium && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Premium</Badge>
          )}
          {prediction && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${actionCfg.bg} ${actionCfg.color}`}>
              <ActionIcon className="w-3 h-3" />
              {prediction.action} ${prediction.ticker}
            </span>
          )}
          {publishedDate && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {format(new Date(publishedDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
        {report.title}
      </h3>
      {!compact && report.excerpt && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{report.excerpt}</p>
      )}

      {(report.tickers || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
          {(report.tickers || []).map((t) => <TickerTag key={t} ticker={t} />)}
        </div>
      )}

      {prediction && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border mb-3 ${actionCfg.bg}`}>
          <ActionIcon className={`w-3.5 h-3.5 ${actionCfg.color}`} />
          <span className={`font-semibold ${actionCfg.color}`}>{prediction.action}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono font-bold text-foreground">${prediction.ticker}</span>
          {prediction.targetPrice && <>
            <span className="text-muted-foreground">→</span>
            <span className="font-semibold text-foreground">${prediction.targetPrice}</span>
          </>}
          {prediction.timeframe && <span className="text-muted-foreground ml-auto">{prediction.timeframe}</span>}
        </div>
      )}

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