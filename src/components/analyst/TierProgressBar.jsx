import React from "react";
import { computeTierProgress } from "@/lib/analystTier";

export default function TierProgressBar({ user, allReports }) {
  const { current, next, requirements } = computeTierProgress(user, allReports || []);

  if (!next) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-1">Tier: <span style={{ color: current.color }}>{current.label}</span></p>
        <p className="text-xs text-muted-foreground">You've reached the highest tier. 👑</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold" style={{ color: current.color }}>{current.label}</span>
        <span className="text-xs text-muted-foreground">→ Next:</span>
        <span className="text-sm font-semibold" style={{ color: '#185fa5' }}>{next.label}</span>
      </div>
      <div className="space-y-2.5">
        {requirements.map(req => {
          const pct = Math.min(100, (req.current / req.required) * 100);
          return (
            <div key={req.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <span>{req.met ? '✅' : '⬜'}</span>
                  <span className="text-muted-foreground">{req.label}</span>
                </span>
                <span className={`font-semibold ${req.met ? 'text-gain' : 'text-foreground'}`}>
                  {req.current}{req.isPercent ? '%' : ''} / {req.required}{req.isPercent ? '%' : ''}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: req.met ? '#22c55e' : '#3b82f6',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}