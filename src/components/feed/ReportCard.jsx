import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { differenceInHours } from "date-fns";
import { Lock, MessageCircle, Heart, Share2 } from "lucide-react";
import AccuracyTierBadge from "./AccuracyTierBadge";
import InlineFollowButton from "./InlineFollowButton";
import TickerTag from "./TickerTag";
import ShareMenu from "./ShareMenu";
import { getAnalystSlug } from "@/lib/analystSlug";

// ── helpers ──────────────────────────────────────────────────────────────────
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

// ── sub-components ────────────────────────────────────────────────────────────
function PredictionPill({ action, ticker, lockPrice, targetPrice, isLocked }) {
  if (!action) return null;
  const upside = calcUpside(action, lockPrice, targetPrice);
  const cfg = {
    Long:  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', icon: '📈' },
    Short: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', icon: '📉' },
    Hold:  { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '—' },
  }[action] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '—' };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
      <span style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'8px 14px', borderRadius:8,
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        fontSize:13, fontWeight:700,
      }}>
        {cfg.icon} {action} ${ticker}
        {targetPrice && !isLocked && (
          <span style={{ fontWeight:600 }}>→ ${targetPrice}</span>
        )}
        {isLocked && (
          <span style={{ display:'flex', alignItems:'center', gap:3, opacity:0.7, fontSize:11 }}>
            <Lock size={11} /> Target hidden
          </span>
        )}
      </span>
      {upside && !isLocked && (
        <span style={{
          fontSize:12, fontWeight:700,
          color: action === 'Long' ? '#16a34a' : '#dc2626',
        }}>
          {action === 'Long' ? '+' : '-'}{Math.abs(upside)}% {action === 'Long' ? 'upside' : 'downside'}
        </span>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome, lockPrice, resolvedPrice, action }) {
  const pnl = calcPnL(action, lockPrice, resolvedPrice);
  if (outcome === 'hit' || outcome === 'near') {
    return (
      <span style={{
        background:'#16a34a', color:'#fff', fontSize:12, fontWeight:700,
        padding:'4px 10px', borderRadius:6,
      }}>
        ✅ HIT{pnl != null ? ` +${pnl}%` : ""}
      </span>
    );
  }
  if (outcome === 'miss') {
    return (
      <span style={{
        background:'#dc2626', color:'#fff', fontSize:12, fontWeight:700,
        padding:'4px 10px', borderRadius:6,
      }}>
        ❌ MISS
      </span>
    );
  }
  if (outcome === 'partial') {
    return (
      <span style={{
        background:'#d97706', color:'#fff', fontSize:12, fontWeight:700,
        padding:'4px 10px', borderRadius:6,
      }}>
        ⚡ PARTIAL
      </span>
    );
  }
  return null;
}

function PnLBadge({ action, lockPrice, targetPrice }) {
  const pnl = calcUpside(action, lockPrice, targetPrice);
  if (!pnl) return null;
  const isPos = parseFloat(pnl) >= 0;
  return (
    <span style={{
      fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6,
      background: isPos ? '#f0fdf4' : '#fef2f2',
      color: isPos ? '#16a34a' : '#dc2626',
      border: `1px solid ${isPos ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {isPos ? '+' : '-'}{Math.abs(pnl)}% target
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
    const optimistic = { id: 'tmp_' + direction, report_id: reportId, voter_email: user.email, vote: direction };
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
    { id: 'long',    label: '📈 Long' },
    { id: 'short',   label: '📉 Short' },
    { id: 'neutral', label: '🤔 Neutral' },
  ];

  const total = (votes || []).length;
  const pct = (id) => total > 0 ? Math.round((votes || []).filter(v => v.vote === id).length / total * 100) : 0;

  return (
    <div onClick={e => e.stopPropagation()} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
      <p style={{ fontSize:12, fontWeight:600, color:'#0f172a', marginBottom:8 }}>Do you agree with this call?</p>
      {!myVote ? (
        <div style={{ display:'flex', gap:6 }}>
          {opts.map(o => (
            <button key={o.id} onClick={e => handleVote(e, o.id)} disabled={submitting || !isAuthenticated} style={{
              flex:1, fontSize:12, fontWeight:600, padding:'6px 0',
              borderRadius:6, border:'1px solid #e2e8f0', background:'#fff',
              color:'#475569', cursor: isAuthenticated ? 'pointer' : 'default',
              transition:'all 150ms ease', opacity: submitting ? 0.6 : 1,
            }}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {opts.map(o => (
            <div key={o.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, width:64, color:'#64748b', flexShrink:0 }}>{o.label}</span>
              <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3, width:`${pct(o.id)}%`, background: myVote === o.id ? '#2563eb' : '#94a3b8', transition:'width 400ms ease' }} />
              </div>
              <span style={{ fontSize:10, fontWeight:700, width:28, textAlign:'right', color: myVote === o.id ? '#2563eb' : '#64748b' }}>{pct(o.id)}%</span>
            </div>
          ))}
          <p style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{total} vote{total !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

// ── main card ─────────────────────────────────────────────────────────────────
export default function ReportCard({ report, isSubscribed = false, currentUserEmail = null, followedEmails = [], allReports = [], userMap = {} }) {
  const { user, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes || 0);
  const [likeId, setLikeId] = useState(null);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  // Check if current user already liked this report
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    base44.entities.Like.filter({ report_id: report.id, user_email: user.email })
      .then(data => {
        if (data && data.length > 0) {
          setLiked(true);
          setLikeId(data[0].id);
        }
      })
      .catch(() => {});
  }, [report.id, isAuthenticated, user?.email]);

  const authorUser    = userMap[report.created_by] || {};
  const authorName    = report.author_name || authorUser.full_name || report.created_by?.split("@")[0] || "Analyst";
  // Avatar: prefer report field, fallback to current user profile picture
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
  const isPending     = !outcome || outcome === 'pending';

  const winStreak    = report.author_win_streak || 0;
  const postsThisWk  = getPostsThisWeek(authorEmail, allReports);

  const tickers = Array.isArray(report.tickers)
    ? report.tickers
    : (report.tickers || "").split(",").map(t => t.trim()).filter(Boolean);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) return;
    if (liked) {
      // Unlike
      const newCount = Math.max(0, likeCount - 1);
      setLiked(false);
      setLikeCount(newCount);
      if (likeId) await base44.entities.Like.delete(likeId).catch(() => {});
      await base44.entities.Report.update(report.id, { likes: newCount });
      setLikeId(null);
    } else {
      // Like (only if not already liked)
      const newCount = likeCount + 1;
      setLiked(true);
      setLikeCount(newCount);
      const created = await base44.entities.Like.create({ report_id: report.id, user_email: user.email });
      setLikeId(created?.id || null);
      await base44.entities.Report.update(report.id, { likes: newCount });
    }
  };

  const slug = getAnalystSlug({ full_name: authorName, email: authorEmail });

  return (
    <>
      <style>{`
        @keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
      `}</style>
      <div
        onClick={() => navigate(`/report?id=${report.id}`)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: 20,
          boxShadow: hovered
            ? '0 4px 12px rgba(0,0,0,0.10)'
            : '0 1px 3px rgba(0,0,0,0.06)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'all 200ms ease',
          cursor: 'pointer',
          position: 'relative',
          marginBottom: 12,
        }}
      >
        {/* Premium badge */}
        {isPremium && (
          <span style={{
            position:'absolute', top:12, left:12,
            background:'#d97706', color:'#fff', fontSize:10, fontWeight:700,
            padding:'2px 8px', borderRadius:10, letterSpacing:'0.04em',
          }}>
            ⭐ PREMIUM
          </span>
        )}

        {/* ── HEADER ROW ── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12, marginTop: isPremium ? 22 : 0 }}>
          {/* Avatar */}
          <Link to={`/analyst/${slug}`} onClick={e => e.stopPropagation()} style={{ flexShrink:0 }}>
            <div style={{
              width:40, height:40, borderRadius:'50%', border:'2px solid #e2e8f0',
              background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:700, color:'#2563eb', overflow:'hidden', cursor:'pointer',
            }}>
              {authorAvatar
                ? <img src={authorAvatar} alt={authorName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : authorName[0]?.toUpperCase()}
            </div>
          </Link>

          {/* Name + badges */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <Link
                to={`/analyst/${slug}`}
                onClick={e => e.stopPropagation()}
                style={{ fontSize:14, fontWeight:700, color:'#0f172a', textDecoration:'none' }}
              >
                {authorName}
              </Link>

              {report.author_accuracy != null && (
                <AccuracyTierBadge accuracy={report.author_accuracy} />
              )}

              {/* Win streak */}
              {winStreak >= 3 && (
                <span style={{
                  background:'#fff7ed', color:'#c2410c', fontSize:10, fontWeight:700,
                  padding:'2px 7px', borderRadius:10,
                }}>
                  🔥 x{winStreak}
                </span>
              )}

              <InlineFollowButton
                analystEmail={authorEmail}
                analystName={authorName}
                analystAvatar={authorAvatar}
                isFollowing={isFollowing}
              />

              {postsThisWk > 0 && (
                <span style={{ fontSize:11, color:'#94a3b8' }}>{postsThisWk} posts this week</span>
              )}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>{timeAgo(publishedDate)}</span>
              {isLive && (
                <span style={{
                  background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700,
                  padding:'2px 7px', borderRadius:10,
                  animation:'livePulse 2s infinite',
                }}>
                  🔴 LIVE
                </span>
              )}
            </div>
          </div>

          {/* Right: outcome or P&L badge */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
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
        <h3 style={{
          fontSize:17, fontWeight:700, color:'#0f172a', lineHeight:1.4,
          marginBottom:8, display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {report.title}
        </h3>

        {/* ── EXCERPT ── */}
        {report.excerpt && (
          <div style={{ marginBottom:10, position:'relative' }}>
            <p style={{
              fontSize:14, color:'#475569', lineHeight:1.6,
              display:'-webkit-box', WebkitLineClamp:3,
              WebkitBoxOrient:'vertical', overflow:'hidden',
              filter: isLocked ? 'blur(3px)' : 'none',
              userSelect: isLocked ? 'none' : 'auto',
              pointerEvents: isLocked ? 'none' : 'auto',
            }}>
              {report.excerpt}
            </p>
            {isLocked && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position:'absolute', inset:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >
                <div style={{
                  background:'rgba(255,255,255,0.95)', borderRadius:10,
                  border:'1px solid #e2e8f0', padding:'12px 18px', textAlign:'center',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <Lock size={22} color="#d97706" style={{ marginBottom:6, display:'block', margin:'0 auto 6px' }} />
                  <p style={{ fontSize:12, fontWeight:600, color:'#0f172a', marginBottom:8 }}>
                    Subscribe to {authorName} to read
                  </p>
                  <Link
                    to={`/analyst/${slug}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize:12, fontWeight:700, background:'#2563eb', color:'#fff',
                      borderRadius:6, padding:'5px 14px', textDecoration:'none', display:'inline-block',
                    }}
                  >
                    Subscribe — $29/mo
                  </Link>
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
            style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}
          >
            {tickers.map(t => <TickerTag key={t} ticker={t} />)}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          paddingTop:12, borderTop:'1px solid #f1f5f9', marginTop:4,
        }}>
          <button
            onClick={handleLike}
            style={{
              display:'flex', alignItems:'center', gap:5,
              fontSize:13, fontWeight:600, background:'none', border:'none',
              color: liked ? '#ef4444' : '#94a3b8', cursor:'pointer',
              transition:'color 150ms ease',
            }}
          >
            <Heart size={15} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : '#94a3b8'} />
            {likeCount}
          </button>

          <button
            onClick={e => { e.stopPropagation(); navigate(`/report?id=${report.id}#comments`); }}
            style={{
              display:'flex', alignItems:'center', gap:5,
              fontSize:13, fontWeight:600, background:'none', border:'none',
              color:'#94a3b8', cursor:'pointer', transition:'color 150ms ease',
            }}
          >
            <MessageCircle size={15} />
            Comment
          </button>

          {isPremium && report.price && (
            <span style={{ fontSize:12, fontWeight:700, color:'#d97706' }}>${report.price}</span>
          )}

          <span onClick={e => e.stopPropagation()} style={{ marginLeft:'auto' }}>
            <ShareMenu title={report.title} reportId={report.id} />
          </span>
        </div>
      </div>
    </>
  );
}