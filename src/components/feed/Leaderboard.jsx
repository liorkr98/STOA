import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { TrendingUp, Trophy } from "lucide-react";
import AccuracyTierBadge from "./AccuracyTierBadge";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAnalystStats } from "@/lib/analystStats";
import { computeScore } from "@/lib/scoringEngine";

const TIME_PERIODS = ["All Time", "This Month", "This Week"];
const RANK_MEDALS  = { 1: "🥇", 2: "🥈", 3: "🥉" };
const RANK_REWARDS = {
  1: { label: "500 AI Credits/mo" },
  2: { label: "250 AI Credits/mo" },
  3: { label: "100 AI Credits/mo" },
};

function SkeletonRow() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
      <div style={{ width:16, height:16, borderRadius:4, background:'#e2e8f0' }} />
      <div style={{ width:32, height:32, borderRadius:'50%', background:'#e2e8f0' }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ width:80, height:10, borderRadius:4, background:'#e2e8f0' }} />
        <div style={{ width:55, height:8, borderRadius:4, background:'#e2e8f0' }} />
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [analysts, setAnalysts] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("All Time");
  const [followedEmails, setFollowedEmails] = useState([]);
  const [followingLoading, setFollowingLoading] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.User.list("-accuracy_score", 20),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 200),
    ]).then(([users, reports]) => {
      setAnalysts((users || []).filter(u => u.accuracy_score > 0));
      setAllReports(reports || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 100)
      .then(data => setFollowedEmails((data || []).map(f => f.analyst_email)))
      .catch(() => {});
  }, [isAuthenticated, user]);

  // Compute new scores from reports for each analyst
  const analystScores = React.useMemo(() => {
    const map = {};
    analysts.forEach(a => {
      const mine = allReports.filter(r => r.created_by === a.email);
      map[a.email] = computeScore(mine);
    });
    return map;
  }, [analysts, allReports]);

  const sorted = [...analysts].sort((a, b) => {
    const sa = analystScores[a.email] || {};
    const sb = analystScores[b.email] || {};
    if (period === "This Week")  return (sb.total || 0) - (sa.total || 0);
    if (period === "This Month") return (sb.avgReturn || 0) - (sa.avgReturn || 0);
    return (sb.score || 0) - (sa.score || 0);
  });

  const handleFollow = async (e, analyst) => {
    e.stopPropagation();
    if (!isAuthenticated || !user || followingLoading[analyst.email]) return;
    setFollowingLoading(p => ({ ...p, [analyst.email]: true }));
    const isNowFollowing = followedEmails.includes(analyst.email);
    setFollowedEmails(p => isNowFollowing ? p.filter(e => e !== analyst.email) : [...p, analyst.email]);
    try {
      if (!isNowFollowing) {
        await base44.entities.Follow.create({
          follower_email: user.email,
          analyst_email: analyst.email,
          analyst_name: analyst.full_name || analyst.email?.split("@")[0],
          analyst_avatar: analyst.picture || "",
        });
      } else {
        const existing = await base44.entities.Follow.filter({ follower_email: user.email, analyst_email: analyst.email });
        if (existing?.[0]) await base44.entities.Follow.delete(existing[0].id);
      }
    } catch {
      setFollowedEmails(p => isNowFollowing ? [...p, analyst.email] : p.filter(e => e !== analyst.email));
    } finally {
      setFollowingLoading(p => ({ ...p, [analyst.email]: false }));
    }
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
        <Trophy size={15} color="#d97706" />
        <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>Top Analysts</span>
      </div>

      {/* Period tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:12, flexWrap:'wrap' }}>
        {TIME_PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
            cursor:'pointer', transition:'all 150ms ease',
            border: period === p ? '1px solid #2563eb' : '1px solid #e2e8f0',
            background: period === p ? '#2563eb' : '#f8fafc',
            color: period === p ? '#fff' : '#64748b',
          }}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <p style={{ fontSize:12, color:'#94a3b8', marginBottom:6 }}>Be the first on the leaderboard</p>
          <Link to="/editor" style={{ fontSize:12, color:'#2563eb', fontWeight:600 }}>Start Writing →</Link>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          {sorted.slice(0, 8).map((analyst, index) => {
            const rank = index + 1;
            const accPct = analyst.accuracy_score || 0;
            const name = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
            const isFollowing = followedEmails.includes(analyst.email);
            const reward = RANK_REWARDS[rank];

            return (
              <div
                key={analyst.id}
                onClick={() => navigate(`/analyst/${getAnalystSlug(analyst)}`)}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'8px 6px', borderRadius:8, cursor:'pointer',
                  transition:'background 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <span style={{ fontSize:12, fontWeight:700, width:18, textAlign:'center', flexShrink:0 }}>
                  {RANK_MEDALS[rank] || <span style={{ color:'#94a3b8' }}>{rank}</span>}
                </span>

                <div style={{
                  width:32, height:32, borderRadius:'50%', overflow:'hidden',
                  background:'#dbeafe', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700, color:'#2563eb',
                }}>
                  {analyst.picture
                    ? <img src={analyst.picture} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : analyst.avatar
                      ? <img src={analyst.avatar} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : name[0]}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                    {(() => {
                      const s = analystScores[analyst.email] || {};
                      return s.rawWR != null ? (
                        <span style={{ fontSize:10, fontWeight:700, color: s.rawWR >= 0.6 ? '#16a34a' : s.rawWR >= 0.45 ? '#d97706' : '#dc2626' }}>
                          {(s.rawWR * 100).toFixed(0)}% WR
                        </span>
                      ) : null;
                    })()}
                    {analyst.win_streak >= 2 && (
                      <span style={{ fontSize:9, fontWeight:700, color:'#c2410c' }}>🔥{analyst.win_streak}</span>
                    )}
                    {reward && (
                      <span style={{ fontSize:9, color:'#d97706', fontWeight:600 }}>⚡ {reward.label.split(' ')[0]} cr.</span>
                    )}
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                  {(() => {
                    const s = analystScores[analyst.email] || {};
                    return s.profitFactor != null ? (
                      <div style={{ fontSize:10, fontWeight:700, color: s.profitFactor >= 2 ? '#16a34a' : s.profitFactor >= 1 ? '#d97706' : '#dc2626' }}>
                        {s.profitFactor.toFixed(1)}x PF
                      </div>
                    ) : s.avgReturn != null ? (
                      <div style={{ display:'flex', alignItems:'center', gap:2, fontSize:10, fontWeight:700, color: s.avgReturn >= 0 ? '#16a34a' : '#dc2626' }}>
                        <TrendingUp size={10} />
                        {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(1)}%
                      </div>
                    ) : null;
                  })()}
                  <span style={{ fontSize:9, fontWeight:700, color:'#2563eb' }}>
                    {(analystScores[analyst.email] || {}).score ?? '—'}
                  </span>
                  {isAuthenticated && user?.email !== analyst.email && (
                    <button
                      onClick={e => handleFollow(e, analyst)}
                      style={{
                        fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, cursor:'pointer',
                        transition:'all 150ms ease',
                        border: isFollowing ? '1px solid #16a34a' : '1px solid #2563eb',
                        background: isFollowing ? '#f0fdf4' : 'transparent',
                        color: isFollowing ? '#16a34a' : '#2563eb',
                      }}
                    >
                      {isFollowing ? '✓' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #e2e8f0' }}>
        <Link to="/leaderboard" style={{ fontSize:11, color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
          View Full Leaderboard →
        </Link>
      </div>
    </div>
  );
}