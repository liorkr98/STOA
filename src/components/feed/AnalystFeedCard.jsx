import React from "react";
import { Link } from "react-router-dom";
import { computeAnalystTier } from "@/lib/analystTier";
import { Target, TrendingUp, Heart, Users } from "lucide-react";
import { getAnalystSlug, analystHref } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";

export default function AnalystFeedCard({ analyst, allReports = [] }) {
  if (!analyst) return null;

  const displayName = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";

  const totalLikes = allReports
    .filter(r => r.created_by === analyst.email)
    .reduce((sum, r) => sum + (r.likes || 0), 0);

  const predictions = allReports.filter(r => r.created_by === analyst.email && r.prediction_action);

  const tier = computeAnalystTier(analyst, allReports);

  return (
    <Link
      to={analystHref(analyst)}
      className="block surface surface-interactive p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        {(analyst.profile_picture_url || analyst.picture)
          ? <img src={analyst.profile_picture_url || analyst.picture} alt={displayName} className="w-12 h-12 rounded-full object-cover border border-border" />
          : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary flex-shrink-0 font-serif">{displayName[0]}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-serif text-[14px] text-foreground">{displayName}</p>
            {tier && <AccuracyTierBadge tierData={tier} size="sm" />}
          </div>
          {analyst.tagline && <p className="text-xs text-muted-foreground truncate">{analyst.tagline}</p>}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/60 rounded-tag border border-border/60 p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Predictions</span>
          </div>
          <p className="text-sm font-medium font-display text-foreground">{predictions.length}</p>
        </div>
        <div className="bg-secondary/60 rounded-tag border border-border/60 p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Heart className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Total Likes</span>
          </div>
          <p className="text-sm font-medium font-display text-foreground">{totalLikes}</p>
        </div>
        <div className="bg-secondary/60 rounded-tag border border-border/60 p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-gain" />
            <span className="text-xs text-muted-foreground">Accuracy</span>
          </div>
          <p className="text-sm font-medium font-display text-gain">{analyst.accuracy_score ? analyst.accuracy_score.toFixed(1) : "—"}%</p>
        </div>
        <div className="bg-secondary/60 rounded-tag border border-border/60 p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
          <p className="text-sm font-medium font-display text-foreground">{(analyst.followers_count || 0).toLocaleString()}</p>
        </div>
      </div>
    </Link>
  );
}
