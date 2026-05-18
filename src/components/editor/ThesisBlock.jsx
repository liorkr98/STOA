import React, { useState } from "react";

function parseThesis(content) {
  const lines = (content || "").split("\n").filter(Boolean);
  const bull = lines
    .filter(l => l.toLowerCase().startsWith("bull:"))
    .map(l => l.slice(5).trim());
  const bear = lines
    .filter(l => l.toLowerCase().startsWith("bear:"))
    .map(l => l.slice(5).trim());
  return { bull, bear };
}

const DEFAULT_CONTENT =
  "Bull: Strong market position and durable pricing power\nBull: Growing TAM with expanding product suite\nBear: Multiple compression risk at current valuation\nBear: Increasing competition from well-funded entrants";

export default function ThesisBlock({ block, onChange, onDelete }) {
  const [editing, setEditing] = useState(!block.content);
  const { bull, bear } = parseThesis(block.content);

  return (
    <div className="group relative surface overflow-hidden my-2">
      {/* Header */}
      <div className="flex items-center justify-between bg-secondary px-4 py-2 border-b border-border">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Investment Thesis
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

      {/* Bull / Bear columns */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Bull Case */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-gain flex-shrink-0" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-gain">
              Bull Case
            </span>
          </div>
          {bull.length > 0 ? (
            <ul className="space-y-2">
              {bull.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                  <span className="mt-2 w-1 h-1 rounded-full bg-gain flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Add bull points in Edit mode.
            </p>
          )}
        </div>

        {/* Bear Case */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-loss flex-shrink-0" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-loss">
              Bear Case
            </span>
          </div>
          {bear.length > 0 ? (
            <ul className="space-y-2">
              {bear.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                  <span className="mt-2 w-1 h-1 rounded-full bg-loss flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Add bear points in Edit mode.
            </p>
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-border bg-secondary/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-2">
            Start each line with{" "}
            <code className="bg-card px-1 rounded font-display">Bull:</code> or{" "}
            <code className="bg-card px-1 rounded font-display">Bear:</code>
          </p>
          <textarea
            autoFocus
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={8}
            value={block.content || ""}
            onChange={e => onChange({ ...block, content: e.target.value })}
            placeholder={DEFAULT_CONTENT}
          />
        </div>
      )}
    </div>
  );
}
