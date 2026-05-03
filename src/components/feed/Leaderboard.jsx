import React from "react";
import { MOCK_ANALYSTS } from "@/lib/mockData";
import { Trophy, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-400"];

export default function Leaderboard() {
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
            className="flex items-center gap-3 w-full text-left hover:bg-secondary rounded-lg p-1.5 -mx-1.5 transition-colors"
          >
            <span className={`text-xs font-bold w-4 text-center ${RANK_COLORS[index] || "text-muted-foreground"}`}>
              {index + 1}
            </span>
            <img src={analyst.avatar} alt={analyst.name} className="w-7 h-7 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{analyst.name}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-gain" />
                <span className="text-[10px] text-gain font-medium">{analyst.accuracy}%</span>
                <span className="text-[10px] text-muted-foreground">+{analyst.yearlyYield}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}