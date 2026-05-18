import React from "react";
import { Type, List, Quote, BarChart3, Image, Heading } from "lucide-react";

const BLOCK_TYPES = [
  { type: "text", label: "Text", icon: Type, desc: "Plain paragraph" },
  { type: "heading", label: "Heading", icon: Heading, desc: "Section header" },
  { type: "bullets", label: "Bullet List", icon: List, desc: "List of points" },
  { type: "quote", label: "Quote", icon: Quote, desc: "Pull quote" },
  { type: "stockchart", label: "Stock Chart", icon: BarChart3, desc: "TradingView chart" },
  { type: "image", label: "Image", icon: Image, desc: "Upload image" },
];

export default function BlockTypeMenu({ onSelect, onClose }) {
  return (
    <div
 className="absolute left-6 top-full z-30 bg-card border border-border rounded-xl py-1 w-52 mt-1"
      onMouseDown={e => e.preventDefault()}
    >
      {BLOCK_TYPES.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.type}
            onMouseDown={() => { onSelect(item.type); onClose(); }}
 className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-secondary text-sm transition-colors"
          >
 <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div>
 <p className="font-medium text-xs">{item.label}</p>
 <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}