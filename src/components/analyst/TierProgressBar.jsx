import React from "react";
import { computeTierProgress } from "@/lib/analystTier";

export default function TierProgressBar({ user, allReports }) {
  const { current, next, requirements } = computeTierProgress(user, allReports || []);

  if (!next) {
    return (
      <div className="surface p-4 mb-4">
        <p className="text-sm font-medium mb-1">
          Tier: <span className="text-accent">{current.label}</span>
        </p>
        <p className="text-xs text-muted-foreground">You've reached the highest tier. 👑</p>
      </div>
    );
  }

  return (
    <div className="surface p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-serif text-[14px] text-foreground">{current.label}</span>
        <span className="text-xs text-muted-foreground">→ Next:</span>
        <span className="font-serif text-[14px] text-primary">{next.label}</span>
      </div>
      <div className="space-y-2.5">
        {requirements.map(req => {
          const pct = Math.min(100, (req.current / req.required) * 100);
          return (
            <div key={req.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <span aria-hidden="true">{req.met ? "✓" : "○"}</span>
                  <span className="text-muted-foreground">{req.label}</span>
                </span>
                <span className={`font-medium font-display ${req.met ? "text-foreground" : "text-foreground"}`}>
                  {req.current}{req.isPercent ? "%" : ""} / {req.required}{req.isPercent ? "%" : ""}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-tag overflow-hidden">
                <div
                  className={`h-full rounded-tag transition-all ${req.met ? "bg-accent" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
