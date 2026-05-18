import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function ReportQualityScore({ title, blocks, predictionData, coverImage }) {
  const wordCount = blocks
    .filter(b => ["text", "heading", "bullets", "quote", "callout", "numbered"].includes(b.type))
    .reduce((n, b) => n + (b.content || "").trim().split(/\s+/).filter(Boolean).length, 0);

  const hasChart = blocks.some(b => b.type === "stockchart");

  const checks = [
    { label: "Has title",         pass: !!title?.trim() },
    { label: "Has prediction",    pass: !!predictionData },
    { label: "600+ words",        pass: wordCount >= 600 },
    { label: "Cover image",       pass: !!coverImage },
    { label: "Has stock chart",   pass: hasChart },
  ];

  const score = checks.filter(c => c.pass).length;
  const pct = Math.round((score / checks.length) * 100);

  return (
    <div className="surface p-3">
      <h3 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Report Quality</h3>
      <div className="space-y-1.5 mb-3">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            {c.pass
              ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              : <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
            }
            <span className={`text-xs ${c.pass ? "text-foreground" : "text-muted-foreground/60"}`}>{c.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">Quality: <span className="font-display">{score}/{checks.length}</span></span>
        <span className="text-xs font-medium font-display text-primary">{pct}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-tag overflow-hidden">
        <div
          className="h-full rounded-tag transition-all bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
