import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { differenceInHours } from "date-fns";
import {
  Lock, MessageCircle, Heart, Share2, Bookmark, CreditCard,
  TrendingUp, TrendingDown, Minus, Eye, CheckCircle, XCircle,
  AlertCircle, Flame, Radio,
} from "lucide-react";
import AccuracyTierBadge from "./AccuracyTierBadge";
import { computeAnalystTier } from "@/lib/analystTier";
import InlineFollowButton from "./InlineFollowButton";
import { isExtendedHours } from "@/lib/marketStatus";
import { avatarUrl } from "@/lib/avatarUrl";
import { isReportLiked, setReportLiked } from "@/lib/likeUtils";
import { isReportSaved, setReportSaved } from "@/lib/bookmarkUtils";
import TickerTag from "./TickerTag";
import ShareMenu from "./ShareMenu";
import { getAnalystSlug } from "@/lib/analystSlug";

// Monthly subscription price — mirrors AnalystProfilePage.
const SUBSCRIPTION_PRICE_USD = 9;

// ── helpers ──────────────────────────────────────────────────────────────────
// Parse a date string as UTC even when the server omits the trailing "Z".
function parseUtcDate(s) {
  if (!s) return null;
  if (/Z|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) return new Date(s.replace(" ", "T") + "Z");
  return new Date(s);
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const parsed = parseUtcDate(dateStr);
  if (!parsed) return "";
  const diff = Math.max(0, Date.now() - parsed.getTime());
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

// ── sub-components ────────────────────────────────────────────────────────────
function PredictionPill({ action, ticker, lockPrice, targetPrice, isLocked }) {
  if (!action) return null;
  const upside = calcUpside(action, lockPrice, targetPrice);
  const isLong = action === "Long";
  const isShort = action === "Short";
  const Icon = isLong ? TrendingUp : isShort ? TrendingDown : Minus;
  const tone = isLong
    ? "bg-gain/10 text-gain border-gain/20"
    : isShort
    ? "bg-loss/10 text-loss border-loss/20"
    : "bg-secondary text-foreground border-border";

  return (
    <div className="flex items-center gap-2 flex-wrap mb-2.5">
      <span className={`inline-flex items-center gap-1.5 rounded-tag border px-3 py-1.5 text-[13px] font-medium ${tone}`}>
        <Icon size={13} /> {action} ${ticker}
        {targetPrice && !isLocked && (
          <span className="font-display ml-0.5">→ ${targetPrice}</span>
        )}
        {isLocked && (
          <span className="inline-flex items-center gap-1 opacity-70 text-[11px] ml-0.5">
            <Lock size={11} /> Target hidden
          </span>
        )}
      </span>
      {upside && !isLocked && (
        <span className={`text-[12px] font-medium font-display ${isLong ? "text-gain" : "text-loss"}`}>
          {isLong ? "+" : "-"}{Math.abs(upside)}% {isLong ? "upside" : "downside"}
        </span>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome, lockPrice, resolvedPrice, action }) {
  const pnl = calcPnL(action, lockPrice, resolvedPrice);
  if (outcome === "hit" || outcome === "near") {
    return (
      <span className="inline-flex items-center gap-1 rounded-tag bg-gain/10 text-gain border border-gain/20 px-2.5 py-0.5 text-[12px] font-medium">
        <CheckCircle size={11} /> HIT{pnl != null ? <span className="font-display ml-0.5">+{pnl}%</span> : null}
      </span>
    );
  }
  if (outcome === "miss") {
    return (
      <span className="inline-flex items-center gap-1 rounded-tag bg-loss/10 text-loss border border-loss/20 px-2.5 py-0.5 text-[12px] font-medium">
        <XCircle size={11} /> MISS
      </span>
    );
  }
  if (outcome === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-tag bg-muted text-foreground border border-border px-2.5 py-0.5 text-[12px] font-medium">
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
    <span
      title={extHours ? "Posted during extended-hours trading (pre/post-market). Lock price may move at the open." : undefined}
      className={`rounded-tag border px-2 py-0.5 text-[11px] font-medium font-display ${
        isPos ? "bg-gain/10 text-gain border-gain/20" : "bg-loss/10 text-loss border-loss/20"
      }`}
    >
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
    if (!isAuthenticated || !user || submitting) return;
    if (myVote === direction) return;

    setSubmitting(true);
    const prevVotes = votes;
    const prevMyVote = myVote;

    setMyVote(direction);
    setVotes(prev => {
      const list = prev || [];
      const mine = list.find(v => v.voter_email === user.email);
      if (mine) {
        return list.map(v => v.voter_email === user.email ? { ...v, vote: direction } : v);
      }
      return [...list, { id: "tmp_" + direction, report_id: reportId, voter_email: user.email, vote: direction }];
    });

    try {
      const existing = (prevVotes || []).find(v => v.voter_email === user.email && !String(v.id).startsWith("tmp_"));
      if (existing) {
        const updated = await base44.entities.Vote.update(existing.id, { vote: direction });
        setVotes(prev => prev.map(v => v.id === existing.id ? (updated || { ...v, vote: direction }) : v));
      } else {
        const created = await base44.entities.Vote.create({ report_id: reportId, voter_email: user.email, vote: direction });
        setVotes(prev => prev.map(v => String(v.id).startsWith("tmp_") ? created : v));
      }
    } catch {
      setVotes(prevVotes);
      setMyVote(prevMyVote);
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
    <div onClick={e => e.stopPropagation()} className="rounded-tag border border-border/60 bg-secondary/60 px-3 py-2.5 mb-2.5">
      <p className="text-[12px] font-medium text-foreground mb-2">Do you agree with this call?</p>
      {!myVote ? (
        <div className="flex gap-1.5">
          {opts.map(o => (
            <button
              key={o.id}
              onClick={e => handleVote(e, o.id)}
              disabled={submitting || !isAuthenticated}
              className="flex-1 rounded-sm border border-border bg-background text-muted-foreground text-[12px] font-medium py-1.5 hover:text-foreground hover:bg-background/80 transition-colors disabled:opacity-60"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {opts.map(o => {
            const isMine = myVote === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={e => handleVote(e, o.id)}
                disabled={submitting || !isAuthenticated}
                title={isMine ? "Your current pick" : "Tap to change your vote"}
                className="flex items-center gap-2 bg-transparent border-none p-0 w-full text-left disabled:opacity-60"
                style={{ cursor: isMine || submitting ? "default" : "pointer" }}
              >
                <span className={`text-[10px] w-16 shrink-0 ${isMine ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {isMine ? "✓ " : ""}{o.label}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-tag overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-300 ${isMine ? "bg-primary" : "bg-muted-foreground/40"}`}
                    style={{ width: `${pct(o.id)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium font-display w-7 text-right ${isMine ? "text-primary" : "text-muted-foreground"}`}>
                  {pct(o.id)}%
                </span>
              </button>
            );
          })}
          <p className="text-[10px] text-muted-foreground mt-0.5">
            <span className="font-display">{total}</span> vote{total !== 1 ? "s" : ""} · tap another option to change your vote
          </p>
        </div>
      )}
    </div>
  );
}

// ── main card ─────────────────────────────────────────────────────────────────
export default function ReportCard({ report, isSubscribed = false, currentUserEmail = null, followedEmails = [], allReports = [], userMap = {} }) {
  const { user, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(() => isReportLiked(report.id, user?.email));
  const [likeCount, setLikeCount] = useState(report.likes || 0);
  const [saved, setSaved] = useState(() => isReportSaved(report.id));
  const navigate = useNavigate();

  const authorUser    = userMap[report.created_by] || {};
  const authorName    = report.author_name || authorUser.full_name || report.created_by?.split("@")[0] || "Researcher";
  const authorAvatar  = report.author_avatar || avatarUrl(authorUser);
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

  const subscribePrice = authorUser.subscription_price || SUBSCRIPTION_PRICE_USD;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) return;
    const alreadyLiked = isReportLiked(report.id, user.email);
    if (alreadyLiked && !liked) {
      setLiked(true);
      return;
    }
    if (liked) {
      const newCount = Math.max(0, likeCount - 1);
      setLiked(false);
      setLikeCount(newCount);
      setReportLiked(report.id, false, user.email);
      await base44.entities.Report.update(report.id, { likes: newCount });
    } else {
      const newCount = likeCount + 1;
      setLiked(true);
      setLikeCount(newCount);
      setReportLiked(report.id, true, user.email);
      await base44.entities.Report.update(report.id, { likes: newCount });
      if (authorEmail && authorEmail !== user.email) {
        base44.entities.Notification.create({
          user_email: authorEmail,
          type: "like",
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
        for (const rec of savedRecords) {
          await base44.entities.SavedReport.delete(rec.id);
        }
        setSaved(false);
        setReportSaved(report.id, false);
      } else {
        await base44.entities.SavedReport.create({ report_id: report.id, user_email: user.email });
        setSaved(true);
        setReportSaved(report.id, true);
      }
    } catch {}
  };

  // Use the actual user record's full_name (looked up via userMap by email)
  // — NOT report.author_name. The slug-based URL alone isn't enough when two
  // users share the same name, so we also pass the unique email as a `?u=`
  // disambiguator query param.
  const slug =
    getAnalystSlug({ ...(authorUser || {}), email: authorEmail }) ||
    (authorEmail || "").split("@")[0].toLowerCase();
  const profileHref = authorEmail
    ? `/analyst/${slug}?u=${encodeURIComponent(authorEmail)}`
    : `/analyst/${slug}`;

  return (
    <>
      <style>{`
        @keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
      `}</style>
      <div
        onClick={() => navigate(`/report?id=${report.id}`)}
        className="surface surface-interactive p-5 mb-3 relative"
      >
        {/* Premium badge */}
        {isPremium && (
          <span className="badge-founding absolute top-3 left-3">
            <Lock size={9} /> PREMIUM
          </span>
        )}

        {/* ── HEADER ROW ── */}
        <div className={`flex items-start gap-2.5 mb-3 ${isPremium ? "mt-5" : ""}`}>
          {/* Avatar */}
          <Link to={profileHref} onClick={e => e.stopPropagation()} className="shrink-0">
            <div className="w-10 h-10 rounded-full border border-border/60 bg-secondary flex items-center justify-center text-[14px] font-medium text-primary overflow-hidden cursor-pointer">
              {authorAvatar
                ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                : authorName[0]?.toUpperCase()}
            </div>
          </Link>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={profileHref}
                onClick={e => e.stopPropagation()}
                className="font-serif text-[15px] text-foreground no-underline"
              >
                {authorName}
              </Link>

              {authorUser && (() => {
                const td = computeAnalystTier(
                  { ...authorUser, email: authorEmail },
                  allReports
                );
                return <AccuracyTierBadge tierData={td} />;
              })()}

              {/* Win streak — gold accent, achievement signal (not market sentiment) */}
              {winStreak >= 3 && (
                <span className="inline-flex items-center gap-1 rounded-tag bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 text-[10px] font-medium">
                  <Flame size={10} /> <span className="font-display">{winStreak}</span>
                </span>
              )}

              <InlineFollowButton
                analystEmail={authorEmail}
                analystName={authorName}
                analystAvatar={authorAvatar}
                isFollowing={isFollowing}
              />

              {postsThisWk > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-display">{postsThisWk}</span> posts this week
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] text-muted-foreground">{timeAgo(publishedDate)}</span>
              {isLive && (
                <span
                  className="inline-flex items-center gap-1 rounded-tag bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ animation: "livePulse 2s infinite" }}
                >
                  <Radio size={9} /> LIVE
                </span>
              )}
            </div>
          </div>

          {/* Right: outcome or P&L badge */}
          <div className="flex flex-col items-end gap-1 shrink-0">
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

        {/* ── PREDICTION PILL ── */}
        {hasPredict && (
          <PredictionPill
            action={action}
            ticker={ticker}
            lockPrice={lockPrice}
            targetPrice={targetPrice}
            isLocked={isLocked}
          />
        )}

        {/* ── TITLE ── */}
        <h3 className="font-serif text-[17px] text-foreground leading-snug mb-2 line-clamp-2">
          {report.title}
        </h3>

        {/* ── EXCERPT ── */}
        {report.excerpt && (
          <div className="mb-2.5 relative">
            <p
              className="text-[14px] text-muted-foreground leading-relaxed line-clamp-3"
              style={{
                filter: isLocked ? "blur(3px)" : "none",
                userSelect: isLocked ? "none" : "auto",
                pointerEvents: isLocked ? "none" : "auto",
              }}
            >
              {report.excerpt}
            </p>
            {isLocked && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="surface px-4 py-3 text-center">
                  <Lock size={20} className="text-accent mx-auto mb-1.5" />
                  <p className="text-[12px] font-medium text-foreground mb-2.5">
                    Choose your access option
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/pay?mode=analyst&analyst=${encodeURIComponent(authorName)}&analystEmail=${authorEmail}`);
                      }}
                      className="cta-gold w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5"
                      style={{ borderRadius: 6 }}
                    >
                      <CreditCard size={14} /> Subscribe . ${subscribePrice}/mo
                    </button>
                    {isPremium && report.price && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/pay?mode=report&price=${report.price}&title=${encodeURIComponent(report.title)}&analyst=${encodeURIComponent(authorName)}`);
                        }}
                        className="w-full bg-primary text-primary-foreground text-[12px] font-medium px-3.5 py-1.5 hover:bg-primary/90 transition-colors"
                        style={{ borderRadius: 6 }}
                      >
                        Buy This Report — <span className="font-display">${report.price}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUICK POLL ── */}
        {hasPredict && isPending && (
          <QuickPoll reportId={report.id} />
        )}

        {/* ── TICKERS ── */}
        {tickers.length > 0 && (
          <div
            onClick={e => e.stopPropagation()}
            className="flex flex-wrap gap-1.5 mb-2.5 items-center"
          >
            {tickers.map(t => <TickerTag key={t} ticker={t} />)}
            {report.industry && (
              <span className="rounded-tag border border-border bg-secondary text-muted-foreground text-[10px] font-medium px-1.5 py-0.5">
                {report.industry}
              </span>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="flex items-center gap-3 pt-3 border-t border-border/60 mt-1">
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground pointer-events-none">
            <Eye size={13} /> <span className="font-display">{report.views || 0}</span>
          </span>

          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-1 bg-transparent border-none text-[13px] font-medium cursor-pointer transition-colors ${
              // Filled heart is velvet red — the design system's sentiment-negative
              // token. This is the one deliberate exception where market red shows
              // up outside of Long/Short/Hit/Miss: a red filled heart is a
              // universally understood "favorited" affordance and breaking that
              // convention to satisfy the palette rule would cost recognition.
              liked ? "text-loss" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={liked ? "Unlike this report" : "Like this report"}
            aria-pressed={liked}
          >
            <Heart
              key={liked ? "filled" : "empty"}
              className="scale-pulse"
              size={15}
              fill={liked ? "currentColor" : "none"}
            />
            <span className="font-display" aria-live="polite">{likeCount}</span>
          </button>

          <button
            onClick={e => { e.stopPropagation(); navigate(`/report?id=${report.id}#comments`); }}
            className="inline-flex items-center gap-1 bg-transparent border-none text-[13px] font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <MessageCircle size={15} />
            Comment
          </button>

          {isPremium && report.price && (
            <span className="text-[12px] font-medium text-accent font-display">${report.price}</span>
          )}

          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-1 bg-transparent border-none text-[13px] font-medium cursor-pointer transition-colors ${
              saved ? "text-accent" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={saved ? "Remove from saved" : "Save report"}
            aria-pressed={saved}
          >
            <Bookmark
              key={saved ? "saved" : "unsaved"}
              className="scale-pulse"
              size={15}
              fill={saved ? "currentColor" : "none"}
            />
            Save
          </button>

          <span onClick={e => e.stopPropagation()} className="ml-auto">
            <ShareMenu title={report.title} reportId={report.id} />
          </span>
        </div>
      </div>
    </>
  );
}
