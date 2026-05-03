import React from "react";
import { MOCK_ANALYSTS } from "@/lib/mockData";
import { Trophy, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Leaderboard() {
  const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-400"];
  const navigate = useNavigate();
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Top Analysts</h3>
      </div>
      <div className="space-y-1">
        {MOCK_ANALYSTS.slice(0, 8).map((analyst, index) => (
          <button
            key={analyst.id}
            onClick={() => navigate(`/analyst?id=${analyst.id}`)}
            className="flex items-center gap-3 w-full text-left hover:bg-secondary rounded-lg p-1 -m-1 transition-colors"
          >
            <span className={`text-xs font-bold w-4 text-center flex-shrink-0 ${RANK_COLORS[index] || "text-muted-foreground"}`}>{index + 1}</span>
            <img src={analyst.avatar} alt={analyst.name} className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{analyst.name}</p>
              <p className="text-[10px] text-muted-foreground">{analyst.accuracy}%</p>
            </div>
            <div className="flex items-center gap-0.5 text-[10px] text-gain font-semibold flex-shrink-0">
              <TrendingUp className="w-2.5 h-2.5" />
              +{analyst.yearlyYield}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}