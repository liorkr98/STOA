import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, TrendingUp, Loader2, PenLine } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAnalystTier } from "@/lib/analystTier";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];
const RANK_REWARDS = [
  { label: "500 AI Credits/mo", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "250 AI Credits/mo", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "100 AI Credits/mo", color: "bg-orange-50 text-orange-600 border-orange-200" },
];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl animate-pulse">
      <div className="w-8 h-6 bg-secondary rounded" />
      <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-secondary rounded w-32" />
        <div className="h-2.5 bg-secondary rounded w-20" />
      </div>
      <div className="h-3 bg-secondary rounded w-16" />
    </div>
  );
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [analysts, setAnalysts] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.User.list("-accuracy_score", 50),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 500).catch(() => []),
    ]).then(([data, rpts]) => {
      setAnalysts((data || []).filter(u => (u.accuracy_score || 0) > 0));
      setAllReports(rpts || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Top Analysts Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Ranked by prediction accuracy</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-6">
        {[["all", "All Time"], ["month", "This Month"], ["week", "This Week"]].map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${period === key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</div>
      ) : analysts.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-muted-foreground mb-2">No analysts yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Be the first to publish research and claim the #1 spot.</p>
          <button onClick={() => navigate("/editor")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <PenLine className="w-4 h-4" /> Start Writing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {analysts.map((analyst, i) => {
            const rank = i + 1;
            const reward = RANK_REWARDS[i];
            const accPct = analyst.accuracy_score || 0;
            const tier = computeAnalystTier(analyst, allReports);
            return (
              <button key={analyst.id} onClick={() => navigate(`/analyst/${getAnalystSlug(analyst)}`)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all text-left">
                <span className="text-lg font-bold w-8 text-center flex-shrink-0">
                  {rank <= 3 ? RANK_MEDALS[rank - 1] : <span className="text-sm text-muted-foreground font-semibold">#{rank}</span>}
                </span>
                {analyst.picture
                  ? <img src={analyst.picture} alt={analyst.full_name} className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {(analyst.full_name || analyst.email || "?")[0].toUpperCase()}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{analyst.full_name || analyst.email?.split("@")[0]}</p>
                    <AccuracyTierBadge tierData={tier} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{analyst.tagline || "Analyst"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-sm font-bold ${accPct >= 80 ? "text-gain" : accPct >= 60 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {accPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Accuracy</span>
                  {analyst.yearly_yield != null && (
                    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${analyst.yearly_yield >= 0 ? "text-gain" : "text-loss"}`}>
                      <TrendingUp className="w-2.5 h-2.5" />{analyst.yearly_yield >= 0 ? "+" : ""}{analyst.yearly_yield.toFixed(1)}%
                    </span>
                  )}
                  {reward && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${reward.color}`}>⚡ {reward.label}</span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs max-w-[180px]">
                          Top analysts earn monthly AI credits for template generation, fact checker & AI assistant.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}