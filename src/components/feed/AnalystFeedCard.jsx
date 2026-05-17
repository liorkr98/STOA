import React from "react";
import { Link } from "react-router-dom";
import { computeAnalystTier } from "@/lib/analystTier";
import { Target, TrendingUp, Heart, Users } from "lucide-react";
import { getAnalystSlug, analystHref } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";

export default function AnalystFeedCard({ analyst, allReports = [] }) {
  if (!analyst) return null;

  const displayName = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
  const slug = getAnalystSlug(analyst);

  // Count total likes from their reports
  const totalLikes = allReports
    .filter(r => r.created_by === analyst.email)
    .reduce((sum, r) => sum + (r.likes || 0), 0);

  // Count predictions
  const predictions = allReports.filter(r => r.created_by === analyst.email && r.prediction_action);

  const tier = computeAnalystTier(analyst, allReports);

  return (
    <Link
      to={analystHref(analyst)}
      className="block bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        {(analyst.profile_picture_url || analyst.picture)
          ? <img src={analyst.profile_picture_url || analyst.picture} alt={displayName} className="w-12 h-12 rounded-full object-cover border border-border" />
          : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">{displayName[0]}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-sm">{displayName}</p>
            {tier && <AccuracyTierBadge tierData={tier} size="sm" />}
          </div>
          {analyst.tagline && <p className="text-xs text-muted-foreground truncate">{analyst.tagline}</p>}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Predictions</span>
          </div>
          <p className="text-sm font-bold text-foreground">{predictions.length}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Heart className="w-3 h-3 text-destructive" />
            <span className="text-xs text-muted-foreground">Total Likes</span>
          </div>
          <p className="text-sm font-bold text-foreground">{totalLikes}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-gain" />
            <span className="text-xs text-muted-foreground">Accuracy</span>
          </div>
          <p className="text-sm font-bold text-gain">{analyst.accuracy_score ? analyst.accuracy_score.toFixed(1) : "—"}%</p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
          <p className="text-sm font-bold text-foreground">{(analyst.followers_count || 0).toLocaleString()}</p>
        </div>
      </div>
    </Link>
  );
}