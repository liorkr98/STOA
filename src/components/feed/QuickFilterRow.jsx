import React from "react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "long", label: "📈 Long Only" },
  { id: "short", label: "📉 Short Only" },
  { id: "trending", label: "🔥 Trending" },
  { id: "Tech", label: "Tech" },
  { id: "Finance", label: "Finance" },
  { id: "Energy", label: "Energy" },
  { id: "small", label: "Small Cap" },
  { id: "large", label: "Large Cap" },
];

export default function QuickFilterRow({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-4">
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
            active === f.id
              ? "bg-primary text-white border-primary"
              : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}