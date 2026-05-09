import React, { useState } from "react";
import { Heart, MessageCircle, TrendingUp, TrendingDown, Minus, Lock, Clock, Eye } from "lucide-react";
import { formatDistanceToNow, format, differenceInHours } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import TickerTag from "./TickerTag";
import ShareMenu from "./ShareMenu";
import { getAnalystSlug } from "@/lib/analystSlug";

// --- Config ---
const ACTION_CONFIG = {
  Long:  { color: "text-white", bg: "bg-[#22c55e]", border: "border-[#22c55e]", icon: TrendingUp,  arrow: "📈" },
  Short: { color: "text-white", bg: "bg-[#ef4444]", border: "border-[#ef4444]", icon: TrendingDown, arrow: "📉" },
  Hold:  { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", icon: Minus,  arrow: "—" },
};

const TIER_CONFIG = {
  Elite:    { label: "⭐ Elite",    className: "bg-amber-50 text-amber-700 border-amber-300" },
  Expert:   { label: "Expert",      className: "bg-blue-50 text-blue-700 border-blue-300" },
  Strong:   { label: "Strong",      className: "bg-green-50 text-green-700 border-green-300" },
  Average:  { label: "Average",     className: "bg-gray-100 text-gray-600 border-gray-300" },
  Building: { label: "Building",    className: "bg-gray-100 text-gray-500 border-gray-200" },
};

// Format follower count
function fmtFollowers(n) {
  if (!n) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

// Upside % calculation
function calcUpside(action, lockPrice, targetPrice) {
  if (!lockPrice || !targetPrice) return null;
  if (action === "Long") return ((targetPrice - lockPrice) / lockPrice * 100).toFixed(1);
  if (action === "Short") return ((lockPrice - targetPrice) / lockPrice * 100).toFixed(1);
  return null;
}

// Live P&L from resolved/lock price
function calcPnL(action, lockPrice, resolvedPrice) {
  if (!lockPrice || !resolvedPrice) return null;
  if (action === "Long") return ((resolvedPrice - lockPrice) / lockPrice * 100).toFixed(1);
  if (action === "Short") return ((lockPrice - resolvedPrice) / lockPrice * 100).toFixed(1);
  return null;
}

export default function ReportCard({ report, compact = false, isSubscribed = false, currentUserEmail = null, followedEmails = [] }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes || 0);
  const [vote, setVote] = useState(null); // "long" | "short" | "neutral"
  const navigate = useNavigate();

  const authorName = report.author_name || report.created_by?.split("@")[0] || "Analyst";
  const authorAvatar = report.author_avatar || null;
  const authorEmail = report.created_by || "";
  const isPremium = report.is_premium || false;
  const isLocked = isPremium && !isSubscribed;

  const tier = report.author_tier || null;
  const tierCfg = TIER_CONFIG[tier] || null;
  const winStreak = report.author_win_streak || 0;
  const followersCount = report.author_followers || null;
  const isFollowing = followedEmails.includes(authorEmail);

  const publishedDate = report.created_date;
  const hoursAgo = publishedDate ? differenceInHours(new Date(), new Date(publishedDate)) : 999;
  const isNew = hoursAgo < 2;
  const isLive = isNew;

  // Prediction info
  const hasPredict = !!report.prediction_action;
  const action = report.prediction_action;
  const ticker = report.prediction_ticker;
  const lockPrice = report.prediction_lock_price;
  const targetPrice = report.prediction_target_price;
  const resolvedPrice = report.prediction_resolved_price;
  const outcome = report.prediction_outcome;
  const isPending = outcome === "pending" || !outcome;

  const actionCfg = ACTION_CONFIG[action] || ACTION_CONFIG.Hold;
  const upside = calcUpside(action, lockPrice, targetPrice);
  const pnl = calcPnL(action, lockPrice, resolvedPrice);

  // Expiry within 24h
  const lockTime = report.prediction_lock_time ? new Date(report.prediction_lock_time) : null;
  const resolvedTime = report.prediction_resolved_time ? new Date(report.prediction_resolved_time) : null;
  const expiresInH = lockTime && isPending ? Math.round((lockTime.getTime() + 7 * 24 * 3600 * 1000 - Date.now()) / 3600000) : null;
  const expiringSoon = expiresInH != null && expiresInH > 0 && expiresInH <= 24;

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
  };

  const handleVote = (e, v) => {
    e.stopPropagation();
    setVote(v === vote ? null : v);
  };

  // Outcome badge
  const OutcomeBadge = () => {
    if (isPending) return null;
    if (outcome === "hit" || outcome === "near") {
      const pnlLabel = pnl != null ? ` +${pnl}%` : "";
      return (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#22c55e] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
          ✅ HIT{pnlLabel}
        </div>
      );
    }
    if (outcome === "miss") {
      return (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#ef4444] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
          ❌ MISS
        </div>
      );
    }
    if (outcome === "partial") {
      return (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
          ⚡ PARTIAL
        </div>
      );
    }
    return null;
  };

  // Live P&L badge (only for active/pending predictions)
  const PnLBadge = () => {
    if (!isPending || !hasPredict || !pnl) return null;
    const isPos = parseFloat(pnl) >= 0;
    return (
      <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPos ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30" : "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"}`}>
        {isPos ? "+" : ""}{pnl}% since call
      </div>
    );
  };

  const tickers = Array.isArray(report.tickers)
    ? report.tickers
    : (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="relative bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer group"
    >
      {/* Outcome badge overlay (resolved) */}
      {!isPending && <OutcomeBadge />}
      {/* Live P&L badge (active pending) */}
      {isPending && hasPredict && <PnLBadge />}

      {/* Premium badge top-left */}
      {isPremium && (
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Lock className="w-2.5 h-2.5" /> PREMIUM
        </div>
      )}

      {/* Row 1: Author header */}
      <div className={`flex items-start gap-2.5 mb-3 ${isPremium ? "mt-5" : ""}`}>
        <Link
          to={`/analyst/${getAnalystSlug({ full_name: authorName, email: authorEmail })}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
            {authorAvatar
              ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              : authorName[0]?.toUpperCase()}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <Link
              to={`/analyst/${getAnalystSlug({ full_name: authorName, email: authorEmail })}`}
              onClick={e => e.stopPropagation()}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              {authorName}
            </Link>
            {/* Tier badge */}
            {tierCfg && (
              <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${tierCfg.className}`}>
                {tierCfg.label}
              </span>
            )}
            {/* Win streak */}
            {winStreak >= 2 && (
              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0 rounded-full">
                🔥 x{winStreak} Streak
              </span>
            )}
            {/* LIVE badge */}
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                LIVE
              </span>
            )}
            {/* NEW badge */}
            {isNew && !isLive && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0 rounded-full">NEW</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            {followersCount && <span>{fmtFollowers(followersCount)} followers</span>}
            {followersCount && <span>·</span>}
            <span>{publishedDate ? formatDistanceToNow(new Date(publishedDate), { addSuffix: true }) : ""}</span>
          </div>
        </div>

        {/* Expiring soon badge */}
        {expiringSoon && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-shrink-0">
            <Clock className="w-2.5 h-2.5" /> ⏰ {expiresInH}h
          </span>
        )}
      </div>

      {/* Row 2: Prediction pill */}
      {hasPredict && (
        <div className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full border mb-3 ${actionCfg.bg} ${actionCfg.border} ${actionCfg.color}`}>
          {actionCfg.arrow} {action} ${ticker}
          {targetPrice && !isLocked && (
            <span className="font-semibold">→ ${targetPrice}</span>
          )}
          {upside && !isLocked && (
            <span className="font-normal text-xs opacity-90">
              ({action === "Long" ? "+" : "-"}{Math.abs(upside)}% upside)
            </span>
          )}
          {isLocked && targetPrice && (
            <span className="flex items-center gap-0.5 opacity-70 text-xs">
              <Lock className="w-3 h-3" /> Target hidden
            </span>
          )}
        </div>
      )}

      {/* Row 3: Title */}
      <h3 className="font-bold text-[17px] leading-snug text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {report.title}
      </h3>

      {/* Row 4: Excerpt — blurred for locked premium */}
      {!compact && report.excerpt && (
        <div className="mb-3 relative">
          <p className={`text-sm text-muted-foreground leading-relaxed line-clamp-3 ${isLocked ? "blur-sm select-none" : ""}`}>
            {report.excerpt}
          </p>
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <div className="bg-card/95 border border-border rounded-xl px-4 py-2.5 text-center shadow-md">
                <Lock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground mb-1.5">Subscribe to {authorName} to unlock</p>
                <Link
                  to={`/analyst/${getAnalystSlug({ full_name: authorName, email: authorEmail })}`}
                  className="inline-block text-xs font-bold bg-primary text-white rounded-full px-3 py-1 hover:bg-primary/90 transition-colors"
                >
                  Subscribe
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* "See how this played out" teaser for pending resolved predictions */}
      {hasPredict && isPending && !isLocked && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 border border-dashed border-border rounded-lg px-3 py-2 bg-secondary/50">
          <Eye className="w-3.5 h-3.5" />
          <span>See how this played out →</span>
        </div>
      )}

      {/* Quick poll for active predictions */}
      {hasPredict && isPending && !compact && (
        <div className="mb-3 p-3 bg-secondary rounded-xl" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-foreground mb-2">Do you agree with this call?</p>
          {!vote ? (
            <div className="flex gap-2">
              {[
                { id: "long", label: "📈 Long" },
                { id: "short", label: "📉 Short" },
                { id: "neutral", label: "🤔 Neutral" },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={e => handleVote(e, opt.id)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {[
                { id: "long", label: "📈 Long", pct: 68 },
                { id: "short", label: "📉 Short", pct: 21 },
                { id: "neutral", label: "🤔 Neutral", pct: 11 },
              ].map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-[10px] w-16 text-muted-foreground">{opt.label}</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${vote === opt.id ? "bg-primary" : "bg-muted-foreground/40"}`}
                      style={{ width: `${opt.pct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold w-8 text-right ${vote === opt.id ? "text-primary" : "text-muted-foreground"}`}>{opt.pct}%</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground mt-1">142 votes</p>
            </div>
          )}
        </div>
      )}

      {/* Tickers row */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
          {tickers.map(t => <TickerTag key={t} ticker={t} />)}
        </div>
      )}

      {/* Row 5: Footer */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/40">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-[#ef4444]" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-[#ef4444]" : ""}`} />
          {likeCount}
        </button>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/report?id=${report.id}#comments`); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
        {isPremium && report.price && (
          <span className="text-xs font-bold text-amber-600">${report.price}</span>
        )}
        <span onClick={e => e.stopPropagation()} className="ml-auto">
          <ShareMenu title={report.title} reportId={report.id} />
        </span>
      </div>
    </div>
  );
}