import React from "react";
import { Link } from "react-router-dom";
import { Flame, BarChart3, UserPlus } from "lucide-react";
import { getAnalystSlug } from "@/lib/analystSlug";

export function TrendingDivider({ report }) {
  if (!report) return null;
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">🔥 Trending This Week</span>
      </div>
      <Link to={`/report?id=${report.id}`} className="block">
        <p className="text-sm font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">{report.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{report.likes || 0} likes · {report.author_name || "Analyst"}</p>
      </Link>
    </div>
  );
}

export function AnalystSpotlight({ analyst }) {
  if (!analyst) return null;
  const name = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wide">📊 Analyst Spotlight</span>
      </div>
      <Link to={`/analyst/${getAnalystSlug(analyst)}`} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
          {analyst.picture
            ? <img src={analyst.picture} alt={name} className="w-full h-full object-cover" />
            : name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{analyst.accuracy_score?.toFixed(1)}% accuracy · {analyst.accuracy_tier || "Building"}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-white border border-primary/20 rounded-full px-2.5 py-1">
          <UserPlus className="w-3 h-3" /> Follow
        </span>
      </Link>
    </div>
  );
}