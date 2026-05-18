import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { TrendingUp, Trophy, Flame, Zap } from "lucide-react";
import { analystHref } from "@/lib/analystSlug";
import { computeScore } from "@/lib/scoringEngine";

const TIME_PERIODS = ["All Time", "This Month", "This Week"];
const RANK_MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
const RANK_REWARDS = {
  1: { label: "500 AI Credits/mo" },
  2: { label: "250 AI Credits/mo" },
  3: { label: "100 AI Credits/mo" },
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="h-4 w-4 rounded-tag shimmer" />
      <div className="h-8 w-8 rounded-full shimmer" />
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-2.5 w-20 rounded-tag shimmer" />
        <div className="h-2 w-14 rounded-tag shimmer" />
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
      base44.entities.User.list("-accuracy_score", 50),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 500),
    ]).then(([users, reports]) => {
      setAnalysts(users || []);
      setAllReports(reports || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Only show researchers with at least 3 resolved predictions — same gate as /leaderboard.
  const MIN_RESOLVED = 3;
  const qualifiedAnalysts = React.useMemo(() => {
    const resolvedCount = {};
    for (const r of allReports) {
      if (!r.created_by) continue;
      if (r.prediction_outcome && r.prediction_outcome !== "pending") {
        resolvedCount[r.created_by] = (resolvedCount[r.created_by] || 0) + 1;
      }
    }
    return analysts.filter(a => (resolvedCount[a.email] || 0) >= MIN_RESOLVED);
  }, [analysts, allReports]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 100)
      .then(data => setFollowedEmails((data || []).map(f => f.analyst_email)))
      .catch(() => {});
  }, [isAuthenticated, user]);

  const analystScores = React.useMemo(() => {
    const map = {};
    qualifiedAnalysts.forEach(a => {
      const mine = allReports.filter(r => r.created_by === a.email);
      map[a.email] = computeScore(mine);
    });
    return map;
  }, [qualifiedAnalysts, allReports]);

  const sorted = [...qualifiedAnalysts].sort((a, b) => {
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
    <div className="surface p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Trophy size={15} className="text-accent" />
        <span className="font-serif text-[14px] text-foreground">Top Researchers</span>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {TIME_PERIODS.map(p => {
          const isActive = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-tag border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[12px] text-muted-foreground mb-1.5">
            Leaderboard populates as researchers resolve predictions.
          </p>
          <Link to="/editor" className="text-[12px] text-primary font-medium no-underline">
            Start Writing →
          </Link>
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
                onClick={() => navigate(analystHref(analyst))}
                className="flex items-center gap-2 px-1.5 py-2 rounded-tag cursor-pointer hover:bg-secondary/60 transition-colors"
              >
                <span className="w-4.5 text-center shrink-0 text-[12px] font-medium text-muted-foreground">
                  {RANK_MEDALS[rank] || rank}
                </span>

                <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary shrink-0 flex items-center justify-center text-[12px] font-medium text-primary">
                  {(analyst.profile_picture_url || analyst.picture)
                    ? <img src={analyst.profile_picture_url || analyst.picture} alt={name} className="w-full h-full object-cover" />
                    : analyst.avatar
                      ? <img src={analyst.avatar} alt={name} className="w-full h-full object-cover" />
                      : name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {s.rawWR != null && (
                      <span className="text-[10px] font-medium text-muted-foreground font-display">
                        {(s.rawWR * 100).toFixed(0)}% WR
                      </span>
                    )}
                    {analyst.win_streak >= 2 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-accent">
                        <Flame size={9} className="inline" />
                        <span className="font-display">{analyst.win_streak}</span>
                      </span>
                    )}
                    {reward && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-accent">
                        <Zap size={9} className="inline" />
                        {reward.label.split(" ")[0]} cr.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {s.profitFactor != null ? (
                    <div className="text-[10px] font-medium text-foreground font-display">
                      {s.profitFactor.toFixed(1)}x PF
                    </div>
                  ) : s.avgReturn != null ? (
                    <div className={`flex items-center gap-0.5 text-[10px] font-medium font-display ${
                      s.avgReturn >= 0 ? "text-gain" : "text-loss"
                    }`}>
                      <TrendingUp size={10} />
                      {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn.toFixed(1)}%
                    </div>
                  ) : null}
                  <span className="text-[9px] font-medium text-primary font-display">
                    {s.score ?? "—"}
                  </span>
                  {isAuthenticated && user?.email !== analyst.email && (
                    <button
                      onClick={e => handleFollow(e, analyst)}
                      className={`rounded-tag border text-[9px] font-medium px-2 py-0.5 transition-colors ${
                        isFollowing
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-transparent text-primary border-primary/60 hover:bg-primary/10"
                      }`}
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

      <div className="mt-3 pt-3 border-t border-border/60">
        <Link to="/leaderboard" className="text-[11px] text-primary font-medium no-underline">
          View Full Leaderboard →
        </Link>
      </div>
    </div>
  );
}
