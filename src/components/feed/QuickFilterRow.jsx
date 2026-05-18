import React from "react";

const FILTERS = [
  { id: "all",     label: "All" },
  { id: "long",    label: "📈 Long" },
  { id: "short",   label: "📉 Short" },
  { id: "trending",label: "🔥 Hot" },
  { id: "Tech",    label: "Tech" },
  { id: "Finance", label: "Finance" },
  { id: "Energy",  label: "Energy" },
  { id: "small",   label: "Small Cap" },
];

export default function QuickFilterRow({ active, onChange }) {
  return (
    <div
      className="qfr flex gap-2 overflow-x-auto py-3"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style>{`.qfr::-webkit-scrollbar{display:none}`}</style>
      {FILTERS.map(f => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`shrink-0 whitespace-nowrap rounded-tag border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
