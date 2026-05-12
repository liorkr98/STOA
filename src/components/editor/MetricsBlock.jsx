import React, { useState } from "react";

function parseMetrics(content) {
  if (!content) return [];
  return content
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const parts = line.split("|");
      return {
        label: parts[0]?.trim() || "",
        value: parts[1]?.trim() || "",
        change: parts[2]?.trim() || "",
      };
    })
    .filter(r => r.label && r.value);
}

const DEFAULT_CONTENT =
  "P/E Ratio | 24.5x | +2.1%\nRevenue | $85.2B | +12.3%\nEPS | $3.40 | +8.7%\nGross Margin | 42.1% | -0.3%";

export default function MetricsBlock({ block, onChange, onDelete }) {
  const [editing, setEditing] = useState(!block.content);
  const rows = parseMetrics(block.content);
  const cols = Math.min(rows.length, 4);

  return (
    <div className="group relative rounded-xl border border-border overflow-hidden my-2">
      {/* Header */}
      <div className="flex items-center justify-between bg-secondary px-4 py-2 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Key Financial Metrics
        </span>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(e => !e)}
            className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border bg-card transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            onClick={onDelete}
            className="text-[10px] text-muted-foreground hover:text-loss px-2 py-0.5 rounded border border-border bg-card transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      {rows.length > 0 ? (
        <div
          className="grid divide-border"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {rows.map((row, i) => {
            const isPos = row.change.startsWith("+");
            const isNeg = row.change.startsWith("-");
            return (
              <div
                key={i}
                className="px-4 py-3 border-r border-b border-border last:border-r-0"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  {row.label}
                </p>
                <p className="text-base font-bold text-foreground leading-tight">
                  {row.value}
                </p>
                {row.change && (
                  <p
                    className={`text-xs font-semibold mt-0.5 ${
                      isPos ? "text-gain" : isNeg ? "text-loss" : "text-muted-foreground"
                    }`}
                  >
                    {row.change}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Click <strong>Edit</strong> to add financial metrics.
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-border bg-secondary/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-2">
            Format:{" "}
            <code className="bg-card px-1 rounded font-mono">
              Label | Value | Change
            </code>{" "}
            — one metric per line
          </p>
          <textarea
            autoFocus
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
            rows={Math.max(4, rows.length + 1)}
            value={block.content || ""}
            onChange={e => onChange({ ...block, content: e.target.value })}
            placeholder={DEFAULT_CONTENT}
          />
        </div>
      )}
    </div>
  );
}
