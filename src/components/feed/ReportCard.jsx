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
  const [likeCount, setLikeCount] = useState(report.likes);
  const navigate = useNavigate();

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const actionCfg = ACTION_CONFIG[report.prediction?.action] || ACTION_CONFIG.Hold;
  const ActionIcon = actionCfg.icon;

  return (
    <div
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/analyst?id=${report.author.id}`); }}
            className="flex-shrink-0"
          >
            <img src={report.author.avatar} alt={report.author.name} className="w-9 h-9 rounded-full border border-border" />
          </button>
          <div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/analyst?id=${report.author.id}`); }}
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors block"
            >
              {report.author.name}
            </button>
            <span className="text-xs text-muted-foreground">{report.author.accuracy}% accuracy</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {report.isPremium && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Premium</Badge>
          )}
          {report.prediction && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${actionCfg.bg} ${actionCfg.color}`}>
              <ActionIcon className="w-3 h-3" />
              {report.prediction.action} ${report.prediction.ticker}
            </span>
          )}
          <span className="text-xs text-muted-foreground hidden sm:block">
            {format(new Date(report.publishedAt), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <h3 className="font-bold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
        {report.title}
      </h3>
      {!compact && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{report.excerpt}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
        {report.tickers.map((t) => <TickerTag key={t} ticker={t} />)}
      </div>

      {report.prediction && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border mb-3 ${actionCfg.bg}`}>
          <ActionIcon className={`w-3.5 h-3.5 ${actionCfg.color}`} />
          <span className={`font-semibold ${actionCfg.color}`}>{report.prediction.action}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono font-bold text-foreground">${report.prediction.ticker}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-semibold text-foreground">${report.prediction.targetPrice}</span>
          <span className="text-muted-foreground ml-auto">{report.prediction.timeframe}</span>
        </div>
      )}

      {report.prediction?.outcome && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${report.prediction.outcome === "hit" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
          {report.prediction.outcome === "hit"
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <XCircle className="w-3.5 h-3.5" />
          }
          <span className="font-semibold">{report.prediction.outcomeNote}</span>
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
        {report.isPremium && (
          <span className="text-xs font-semibold text-amber-600 ml-auto">${report.price}</span>
        )}
        <span onClick={e => e.stopPropagation()} className={report.isPremium ? "" : "ml-auto"}>
          <ShareMenu title={report.title} reportId={report.id} />
        </span>
      </div>
    </div>
  );
}