import React from "react";
import { cn } from "@/lib/utils";

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
    <div className="flex gap-2 overflow-x-auto py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {FILTERS.map(f => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
