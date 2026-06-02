import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { TrendingUp, Trophy } from "lucide-react";
import AccuracyTierBadge from "./AccuracyTierBadge";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAnalystStats } from "@/lib/analystStats";
import { computeScore } from "@/lib/scoringEngine";
import { cn } from "@/lib/utils";

const TIME_PERIODS = ["All Time", "This Month", "This Week"];
const RANK_MEDALS  = { 1: "🥇", 2: "🥈", 3: "🥉" };
const RANK_REWARDS = {
  1: { label: "500 AI Credits/mo" },
  2: { label: "250 AI Credits/mo" },
  3: { label: "100 AI Credits/mo" },
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="w-4 h-4 rounded bg-muted animate-pulse" />
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 flex flex-col gap-1">
        <div className="w-20 h-2.5 rounded bg-muted animate-pulse" />
        <div className="w-14 h-2 rounded bg-muted/60 animate-pulse" />
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
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-amber-500" />
        <span className="text-sm font-bold text-foreground">Top Researchers</span>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {TIME_PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
              period === p
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-1">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-1.5">Be the first on the leaderboard</p>
          <Link to="/editor" className="text-xs text-primary font-semibold hover:underline">Start Writing →</Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.slice(0, 8).map((analyst, index) => {
            const rank = index + 1;
            const name = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
            const isFollowing = followedEmails.includes(analyst.email);
            const reward = RANK_REWARDS[rank];
            const s = analystScores[analyst.email] || {};

            return (
              <div
                key={analyst.id}
                onClick={() => navigate(`/analyst/${getAnalystSlug(analyst)}`)}
                className="flex items-center gap-2 px-1.5 py-2 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors group"
              >
                {/* Rank */}
                <span className="text-xs font-bold w-4 text-center flex-shrink-0 text-muted-foreground">
                  {RANK_MEDALS[rank] || rank}
                </span>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {analyst.picture
                    ? <img src={analyst.picture} alt={name} className="w-full h-full object-cover" />
                    : analyst.avatar
                      ? <img src={analyst.avatar} alt={name} className="w-full h-full object-cover" />
                      : name[0]}
                </div>

                {/* Name + stats */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {s.rawWR != null && (
                      <span className={cn("text-[10px] font-bold", s.rawWR >= 0.6 ? "text-gain" : s.rawWR >= 0.45 ? "text-amber-600" : "text-loss")}>
                        {(s.rawWR * 100).toFixed(0)}% WR
                      </span>
                    )}
                    {analyst.win_streak >= 2 && (
                      <span className="text-[9px] font-bold text-orange-600">🔥{analyst.win_streak}</span>
                    )}
                    {reward && (
                      <span className="text-[9px] text-amber-600 font-semibold">⚡ {reward.label.split(" ")[0]} cr.</span>
                    )}
                  </div>
                </div>

                {/* Right: score + follow */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {s.profitFactor != null ? (
                    <span className={cn("text-[10px] font-bold tabular-nums", s.profitFactor >= 2 ? "text-gain" : s.profitFactor >= 1 ? "text-amber-600" : "text-loss")}>
                      {s.profitFactor.toFixed(1)}x PF
                    </span>
                  ) : s.avgReturn != null ? (
                    <span className={cn("flex items-center gap-0.5 text-[10px] font-bold tabular-nums", s.avgReturn >= 0 ? "text-gain" : "text-loss")}>
                      <TrendingUp size={9} />
                      {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn.toFixed(1)}%
                    </span>
                  ) : null}
                  <span className="text-[9px] font-bold text-primary tabular-nums">
                    {s.score ?? "—"}
                  </span>
                  {isAuthenticated && user?.email !== analyst.email && (
                    <button
                      onClick={e => handleFollow(e, analyst)}
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded border transition-all",
                        isFollowing
                          ? "border-gain/30 text-gain bg-gain/10"
                          : "border-primary/30 text-primary hover:bg-primary/5"
                      )}
                    >
                      {isFollowing ? "✓" : "Follow"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <Link to="/leaderboard" className="text-[11px] text-primary font-semibold hover:underline">
          View Full Leaderboard →
        </Link>
      </div>
    </div>
  );
}
