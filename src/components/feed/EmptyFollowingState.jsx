import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { analystHref } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";

export default function EmptyFollowingState({ onFollow }) {
  const [topAnalysts, setTopAnalysts] = useState([]);

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 5)
      .then(data => setTopAnalysts((data || []).filter(u => u.accuracy_score > 0).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="py-6">
      <div className="surface p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Flame size={14} className="text-accent" />
          <p className="font-serif text-[15px] text-foreground">Hot right now</p>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Follow top researchers to see their reports here
        </p>

        <div className="flex flex-col gap-2.5">
          {topAnalysts.map(a => {
            const name = a.full_name || a.email?.split("@")[0] || "Researcher";
            return (
              <div
                key={a.id}
                className="flex items-center gap-2.5 bg-background/40 rounded-tag border border-border/50 px-3 py-2.5"
              >
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-[13px] font-medium text-primary overflow-hidden shrink-0">
                  {a.picture ? (
                    <img src={a.picture} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    name[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={analystHref(a)}
                    className="font-serif text-[13px] text-foreground no-underline"
                  >
                    {name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <AccuracyTierBadge user={a} />
                  </div>
                </div>
                <button
                  onClick={() => onFollow && onFollow(a)}
                  className="shrink-0 rounded-sm bg-primary text-primary-foreground text-[11px] font-medium px-3 py-1 hover:bg-primary/90 transition-colors"
                >
                  Follow
                </button>
              </div>
            );
          })}
        </div>

        {topAnalysts.length > 0 && (
          <Link
            to="/leaderboard"
            className="block mt-3 text-[12px] text-primary font-medium no-underline"
          >
            + Discover all researchers →
          </Link>
        )}
      </div>
    </div>
  );
}
