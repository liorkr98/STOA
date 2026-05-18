import React from "react";
import { Link } from "react-router-dom";
import { Flame, BarChart3 } from "lucide-react";
import { analystHref } from "@/lib/analystSlug";

export function TrendingDivider({ report }) {
  if (!report) return null;
  return (
    <div className="surface p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Flame size={14} className="text-accent" />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
          Trending Right Now
        </span>
      </div>
      <Link to={`/report?id=${report.id}`} className="block no-underline">
        <p className="font-serif text-[15px] text-foreground leading-snug line-clamp-2 mb-1">
          {report.title}
        </p>
        <p className="text-[11px] text-muted-foreground">
          <span className="font-display">{report.likes || 0}</span> likes · {report.author_name || "Researcher"}
        </p>
        <p className="text-[11px] text-primary font-medium mt-1.5">Join the conversation →</p>
      </Link>
    </div>
  );
}

export function AnalystSpotlight({ analyst }) {
  if (!analyst) return null;
  const name = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
  return (
    <div className="surface p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 size={14} className="text-accent" />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
          Researcher Spotlight
        </span>
      </div>
      <Link to={analystHref(analyst)} className="flex items-center gap-2.5 no-underline">
        <div className="w-10 h-10 rounded-full bg-secondary shrink-0 flex items-center justify-center text-[14px] font-medium text-primary overflow-hidden">
          {analyst.picture ? (
            <img src={analyst.picture} alt={name} className="w-full h-full object-cover" />
          ) : (
            name[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[14px] text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-display">{analyst.accuracy_score?.toFixed(1)}%</span> accuracy ·{" "}
            {analyst.accuracy_tier || "Building"}
          </p>
        </div>
        <span className="text-[11px] font-medium text-primary border border-primary/40 rounded-sm px-2.5 py-0.5">
          Follow
        </span>
      </Link>
    </div>
  );
}
