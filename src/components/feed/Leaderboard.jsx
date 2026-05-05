import React, { useState, useEffect } from "react";
import { Trophy, TrendingUp, Loader2, PenLine } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SECTORS = ["All", "AI & Semiconductors", "Big Tech", "EV & Clean Energy", "Financials", "Crypto & Web3", "Consumer Tech", "E-Commerce", "Healthcare"];
const TIME_PERIODS = ["All Time", "This Month", "This Week"];

const RANK_REWARDS = {
  1: { label: "500 AI Credits/mo", color: "bg-amber-50 text-amber-700 border-amber-200" },
  2: { label: "250 AI Credits/mo", color: "bg-slate-100 text-slate-600 border-slate-200" },
  3: { label: "100 AI Credits/mo", color: "bg-orange-50 text-orange-600 border-orange-200" },
};

const RANK_MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-1 animate-pulse">
      <div className="w-4 h-3 bg-secondary rounded" />
      <div className="w-7 h-7 rounded-full bg-secondary" />
      <div className="flex-1 space-y-1">
        <div className="h-2.5 bg-secondary rounded w-24" />
        <div className="h-2 bg-secondary rounded w-16" />
      </div>
      <div className="h-2.5 bg-secondary rounded w-10" />
    </div>
  );
}

function AccuracyColor(pct) {
  if (pct >= 80) return "text-gain";
  if (pct >= 60) return "text-amber-600";
  return "text-loss";
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("All Time");
  const [sector, setSector] = useState("All");

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 20)
      .then(data => {
        setAnalysts((data || []).filter(u => u.accuracy_score > 0));
      })
      .catch(() => setAnalysts([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter by sector
  const filtered = analysts.filter(a =>
    sector === "All" || (a.specialties || []).some(s => s === sector)
  );

  // Sort by period (mock: shuffle slightly for non-all-time)
  const sorted = [...filtered].sort((a, b) => {
    if (period === "This Week") return (b.reports || 0) - (a.reports || 0);
    if (period === "This Month") return (b.yearlyYield || 0) - (a.yearlyYield || 0);
    return (b.accuracy_score || 0) - (a.accuracy_score || 0);
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Top Analysts</h3>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {TIME_PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${period === p ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="h-7 text-[10px]">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            {SECTORS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">Be the first analyst on the leaderboard</p>
          <Link to="/editor" className="text-xs text-primary font-medium hover:underline">Start Writing →</Link>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sorted.slice(0, 8).map((analyst, index) => {
            const rank = index + 1;
            const reward = RANK_REWARDS[rank];
            const accPct = analyst.accuracy_score || 0;
            return (
              <button
                key={analyst.id}
                onClick={() => navigate(`/analyst?id=${analyst.id}`)}
                className="flex items-center gap-2 w-full text-left hover:bg-secondary rounded-lg p-1.5 transition-colors"
              >
                <span className="text-xs font-bold w-5 text-center flex-shrink-0">
                  {RANK_MEDALS[rank] || <span className="text-muted-foreground">{rank}</span>}
                </span>
                <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {analyst.avatar || analyst.full_name ? (
                    analyst.avatar
                      ? <img src={analyst.avatar} alt={analyst.full_name} className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{analyst.full_name?.[0]}</span>
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{analyst.full_name || analyst.name}</p>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-semibold ${AccuracyColor(accPct)}`}>{accPct.toFixed(1)}%</span>
                    {reward && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-[9px] font-semibold px-1.5 py-0 rounded-full border ${reward.color}`}>
                              ⚡ {reward.label.split(" ")[0]}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs max-w-[200px]">
                            <p className="font-semibold">{reward.label}</p>
                            <p className="text-muted-foreground mt-0.5">Top analysts earn monthly AI credits for the report editor (template generation, fact checker, AI assistant).</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-gain font-semibold flex-shrink-0">
                  <TrendingUp className="w-2.5 h-2.5" />
                  +{(analyst.yearlyYield || 0).toFixed(1)}%
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <Link to="/leaderboard" className="text-[11px] text-primary hover:underline font-medium">View Full Leaderboard →</Link>
      </div>
    </div>
  );
}