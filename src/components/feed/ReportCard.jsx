import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { differenceInHours } from "date-fns";
import { Lock, MessageCircle, Heart, Share2, Bookmark, CreditCard, TrendingUp, TrendingDown, Minus, Eye, CheckCircle, XCircle, AlertCircle, Flame, Radio } from "lucide-react";
import AccuracyTierBadge from "./AccuracyTierBadge";
import { computeAnalystTier } from "@/lib/analystTier";
import InlineFollowButton from "./InlineFollowButton";
import { isExtendedHours } from "@/lib/marketStatus";
import { isReportLiked, setReportLiked } from "@/lib/likeUtils";
import { isReportSaved, setReportSaved } from "@/lib/bookmarkUtils";
import TickerTag from "./TickerTag";
import ShareMenu from "./ShareMenu";
import { getAnalystSlug } from "@/lib/analystSlug";
import { cn } from "@/lib/utils";

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function calcUpside(action, lock, target) {
  if (!lock || !target) return null;
  if (action === "Long")  return ((target - lock) / lock * 100).toFixed(1);
  if (action === "Short") return ((lock - target) / lock * 100).toFixed(1);
  return null;
}

function calcPnL(action, lock, resolved) {
  if (!lock || !resolved) return null;
  if (action === "Long")  return ((resolved - lock) / lock * 100).toFixed(1);
  if (action === "Short") return ((lock - resolved) / lock * 100).toFixed(1);
  return null;
}

function getPostsThisWeek(email, allReports) {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return (allReports || []).filter(r => r.created_by === email && new Date(r.created_date).getTime() > weekAgo).length;
}

// â”€â”€ sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PredictionPill({ action, ticker, lockPrice, targetPrice, isLocked }) {
  if (!action) return null;
  const upside = calcUpside(action, lockPrice, targetPrice);

  const cfg = {
    Long:  { cls: "bg-gain/10 text-gain border-gain/20",  Icon: TrendingUp },
    Short: { cls: "bg-loss/10 text-loss border-loss/20",  Icon: TrendingDown },
    Hold:  { cls: "bg-secondary text-muted-foreground border-border", Icon: Minus },
  }[action] || { cls: "bg-secondary text-muted-foreground border-border", Icon: Minus };

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold", cfg.cls)}>
        <cfg.Icon size={13} />
        {action} {ticker && `$${ticker}`}
        {targetPrice && !isLocked && (
          <span className="font-semibold opacity-80">â†’ ${targetPrice}</span>
        )}
        {isLocked && (
          <span className="flex items-center gap-1 opacity-60 text-xs">
            <Lock size={11} /> Target hidden
          </span>
        )}
      </span>
      {upside && !isLocked && (
        <span className={cn("text-xs font-bold tabular-nums", action === "Long" ? "text-gain" : "text-loss")}>
          {action === "Long" ? "+" : "-"}{Math.abs(upside)}%{" "}
          <span className="font-normal opacity-70">{action === "Long" ? "upside" : "downside"}</span>
        </span>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome, lockPrice, resolvedPrice, action }) {
  const pnl = calcPnL(action, lockPrice, resolvedPrice);
  if (outcome === "hit" || outcome === "near") {
    return (
      <span className="inline-flex items-center gap-1 bg-gain text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
        <CheckCircle size={11} /> HIT{pnl != null ? ` +${pnl}%` : ""}
      </span>
    );
  }
  if (outcome === "miss") {
    return (
      <span className="inline-flex items-center gap-1 bg-loss text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
        <XCircle size={11} /> MISS
      </span>
    );
  }
  if (outcome === "partial") {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
        <AlertCircle size={11} /> PARTIAL
      </span>
    );
  }
  return null;
}

function PnLBadge({ action, lockPrice, targetPrice }) {
  const pnl = calcUpside(action, lockPrice, targetPrice);
  if (!pnl) return null;
  const isPos = parseFloat(pnl) >= 0;
  const extHours = isExtendedHours();
  return (
    <span className={cn(
      "text-[11px] font-bold px-2 py-1 rounded-md border tabular-nums",
      isPos ? "bg-gain/10 text-gain border-gain/20" : "bg-loss/10 text-loss border-loss/20"
    )}>
      {isPos ? "+" : "-"}{Math.abs(pnl)}% target{extHours ? " (ext)" : ""}
    </span>
  );
}

function QuickPoll({ reportId }) {
  const { user, isAuthenticated } = useAuth();
  const [votes, setVotes] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    base44.entities.Vote.filter({ report_id: reportId })
      .then(data => {
        setVotes(data || []);
        if (isAuthenticated && user) {
          const mv = (data || []).find(v => v.voter_email === user.email);
          setMyVote(mv?.vote || null);
        }
      })
      .catch(() => setVotes([]));
  }, [reportId, isAuthenticated, user?.email]);

  const handleVote = async (e, direction) => {
    e.stopPropagation();
    if (!isAuthenticated || !user || myVote || submitting) return;
    setSubmitting(true);
    const optimistic = { id: "tmp_" + direction, report_id: reportId, voter_email: user.email, vote: direction };
    setVotes(prev => [...(prev || []), optimistic]);
    setMyVote(direction);
    try {
      const created = await base44.entities.Vote.create({ report_id: reportId, voter_email: user.email, vote: direction });
      setVotes(prev => prev.map(v => v.id === optimistic.id ? created : v));
    } catch {
      setVotes(prev => prev.filter(v => v.id !== optimistic.id));
      setMyVote(null);
    } finally {
      setSubmitting(false);
    }
  };

  const opts = [
    { id: "long",    label: "Long" },
    { id: "short",   label: "Short" },
    { id: "neutral", label: "Neutral" },
  ];

  const total = (votes || []).length;
  const pct = (id) => total > 0 ? Math.round((votes || []).filter(v => v.vote === id).length / total * 100) : 0;

  return (
    <div onClick={e => e.stopPropagation()} className="bg-secondary/50 border border-border/60 rounded-lg p-3 mb-3">
      <p className="text-xs font-semibold text-foreground mb-2">Do you agree with this call?</p>
      {!myVote ? (
        <div className="flex gap-2">
          {opts.map(o => (
            <button
              key={o.id}
              onClick={e => handleVote(e, o.id)}
              disabled={submitting || !isAuthenticated}
              className="flex-1 text-xs font-semibold py-1.5 rounded-md border border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all disabled:opacity-50 cursor-pointer"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {opts.map(o => (
            <div key={o.id} className="flex items-center gap-2">
              <span className="text-[10px] w-14 text-muted-foreground flex-shrink-0">{o.label}</span>
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    myVote === o.id ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                  style={{ width: `${pct(o.id)}%` }}
                />
              </div>
              <span className={cn("text-[10px] font-bold w-7 text-right tabular-nums", myVote === o.id ? "text-primary" : "text-muted-foreground")}>
                {pct(o.id)}%
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-0.5">{total} vote{total !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

// â”€â”€ main card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ReportCard({ report, isSubscribed = false, currentUserEmail = null, followedEmails = [], allReports = [], userMap = {} }) {
  const { user, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(() => isReportLiked(report.id, user?.email));
  const [likeCount, setLikeCount] = useState(report.likes || 0);
  const [saved, setSaved] = useState(() => isReportSaved(report.id));
  const navigate = useNavigate();

  const authorUser    = userMap[report.created_by] || {};
  const authorName    = report.author_name || authorUser.full_name || report.created_by?.split("@")[0] || "Researcher";
  const authorAvatar  = report.author_avatar || authorUser.picture || authorUser.profile_picture || null;
  const authorEmail   = report.created_by || "";
  const isPremium     = report.is_premium || false;
  const isLocked      = isPremium && !isSubscribed;
  const isFollowing   = followedEmails.includes(authorEmail);

  const publishedDate = report.created_date;
  const hoursAgo      = publishedDate ? differenceInHours(new Date(), new Date(publishedDate)) : 999;
  const isLive        = hoursAgo < 2;

  const hasPredict    = !!report.prediction_action;
  const action        = report.prediction_action;
  const ticker        = report.prediction_ticker;
  const lockPrice     = report.prediction_lock_price;
  const targetPrice   = report.prediction_target_price;
  const resolvedPrice = report.prediction_resolved_price;
  const outcome       = report.prediction_outcome;
  const isPending     = !outcome || outcome === "pending";

  const winStreak    = report.author_win_streak || 0;
  const postsThisWk  = getPostsThisWeek(authorEmail, allReports);

  const tickers = Array.isArray(report.tickers)
    ? report.tickers
    : (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) return;
    const alreadyLiked = isReportLiked(report.id, user.email);
    if (alreadyLiked && !liked) { setLiked(true); return; }
    if (liked) {
      const newCount = Math.max(0, likeCount - 1);
      setLiked(false); setLikeCount(newCount);
      setReportLiked(report.id, false, user.email);
      await base44.entities.Report.update(report.id, { likes: newCount });
    } else {
      const newCount = likeCount + 1;
      setLiked(true); setLikeCount(newCount);
      setReportLiked(report.id, true, user.email);
      await base44.entities.Report.update(report.id, { likes: newCount });
      if (authorEmail && authorEmail !== user.email) {
        base44.entities.Notification.create({
          user_email: authorEmail, type: "like",
          title: `${user.full_name || user.email?.split("@")[0]} liked your report`,
          body: report.title?.slice(0, 80) || "",
          link: `/report?id=${report.id}`,
        }).catch(() => {});
      }
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) return;
    try {
      if (saved) {
        const savedRecords = await base44.entities.SavedReport.filter({ report_id: report.id, user_email: user.email });
        for (const rec of savedRecords) await base44.entities.SavedReport.delete(rec.id);
        setSaved(false); setReportSaved(report.id, false);
      } else {
        await base44.entities.SavedReport.create({ report_id: report.id, user_email: user.email });
        setSaved(true); setReportSaved(report.id, true);
      }
    } catch {}
  };

  const slug = getAnalystSlug({ full_name: authorName, email: authorEmail });

  return (
    <article
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="group relative bg-card border border-border rounded-xl p-5 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-px hover:border-primary/20"
    >
      {/* Premium accent bar */}
      {isPremium && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-t-xl" />
      )}

      {/* Premium badge */}
      {isPremium && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
          <Lock size={9} /> Premium
        </span>
      )}

      {/* â”€â”€ HEADER â”€â”€ */}
      <div className={cn("flex items-start gap-3 mb-3", isPremium && "mt-1.5")}>
        {/* Avatar */}
        <Link to={`/analyst/${slug}`} onClick={e => e.stopPropagation()} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-border bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden transition-colors group-hover:border-primary/30">
            {authorAvatar
              ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              : <span>{authorName[0]?.toUpperCase()}</span>}
          </div>
        </Link>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/analyst/${slug}`}
              onClick={e => e.stopPropagation()}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors no-underline"
            >
              {authorName}
            </Link>

            {authorUser && (() => {
              const td = computeAnalystTier({ ...authorUser, email: authorEmail }, allReports);
              return <AccuracyTierBadge tierData={td} />;
            })()}

            {winStreak >= 3 && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200/60">
                <Flame size={10} /> {winStreak}
              </span>
            )}

            <InlineFollowButton
              analystEmail={authorEmail}
              analystName={authorName}
              analystAvatar={authorAvatar}
              isFollowing={isFollowing}
            />

            {postsThisWk > 0 && (
              <span className="text-[11px] text-muted-foreground">{postsThisWk} posts this week</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{timeAgo(publishedDate)}</span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Right: outcome / P&L */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {!isPending && (
            <OutcomeBadge
              outcome={outcome}
              lockPrice={lockPrice}
              resolvedPrice={resolvedPrice}
              action={action}
            />
          )}
          {isPending && hasPredict && lockPrice && (
            <PnLBadge action={action} lockPrice={lockPrice} targetPrice={targetPrice} />
          )}
        </div>
      </div>

      {/* â”€â”€ PREDICTION PILL â”€â”€ */}
      {hasPredict && (
        <PredictionPill
          action={action}
          ticker={ticker}
          lockPrice={lockPrice}
          targetPrice={targetPrice}
          isLocked={isLocked}
        />
      )}

      {/* â”€â”€ TITLE â”€â”€ */}
      <h3 className="text-[17px] font-bold leading-snug text-foreground font-serif line-clamp-2 mb-2 group-hover:text-primary/90 transition-colors">
        {report.title}
      </h3>

      {/* â”€â”€ EXCERPT â”€â”€ */}
      {report.excerpt && (
        <div className="mb-3 relative">
          <p className={cn(
            "text-sm text-muted-foreground leading-relaxed line-clamp-3",
            isLocked && "blur-sm select-none pointer-events-none"
          )}>
            {report.excerpt}
          </p>
          {isLocked && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-card/95 rounded-xl border border-border p-4 text-center shadow-lg max-w-[240px] w-full">
                <Lock size={20} className="text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground mb-3">Choose your access option</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/pay?mode=analyst&analyst=${encodeURIComponent(authorName)}&analystEmail=${authorEmail}`);
                    }}
                    className="w-full text-xs font-bold bg-primary text-primary-foreground rounded-lg py-2 px-3 flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
                  >
                    <CreditCard size={13} /> Subscribe to {authorName}
                  </button>
                  {isPremium && report.price && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/pay?mode=report&price=${report.price}&title=${encodeURIComponent(report.title)}&analyst=${encodeURIComponent(authorName)}`);
                      }}
                      className="w-full text-xs font-bold bg-gain text-white rounded-lg py-2 px-3 hover:opacity-90 transition-opacity"
                    >
                      Buy This Report â€” ${report.price}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ QUICK POLL â”€â”€ */}
      {hasPredict && isPending && (
        <QuickPoll reportId={report.id} />
      )}

      {/* â”€â”€ TICKERS â”€â”€ */}
      {tickers.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          className="flex flex-wrap gap-1.5 mb-3 items-center"
        >
          {tickers.map(t => <TickerTag key={t} ticker={t} />)}
          {report.industry && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5">
              {report.industry}
            </span>
          )}
        </div>
      )}

      {/* â”€â”€ FOOTER â”€â”€ */}
      <div className="flex items-center gap-3 pt-3 border-t border-border/60 mt-1 text-muted-foreground">
        <span className="flex items-center gap-1.5 text-xs font-medium pointer-events-none tabular-nums">
          <Eye size={13} /> {report.views || 0}
        </span>

        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-red-500",
            liked ? "text-loss" : "text-muted-foreground"
          )}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
          {likeCount}
        </button>

        <button
          onClick={e => { e.stopPropagation(); navigate(`/report?id=${report.id}#comments`); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle size={14} />
          Comment
        </button>

        {isPremium && report.price && (
          <span className="text-xs font-bold text-amber-600">${report.price}</span>
        )}

        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-amber-500",
            saved ? "text-amber-500" : "text-muted-foreground"
          )}
        >
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
          Save
        </button>

        <span onClick={e => e.stopPropagation()} className="ml-auto">
          <ShareMenu title={report.title} reportId={report.id} />
        </span>
      </div>
    </article>
  );
}

