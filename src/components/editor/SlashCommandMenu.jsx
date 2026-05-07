import React, { useState, useEffect, useRef } from "react";

const COMMANDS = [
  { type: "text",       label: "Text",        desc: "Paragraph",      icon: "📝" },
  { type: "heading",    label: "Heading 1",   desc: "Big title",      icon: "H1" },
  { type: "heading2",   label: "Heading 2",   desc: "Section",        icon: "H2" },
  { type: "bullets",    label: "Bullet List", desc: "Bullet list",    icon: "•" },
  { type: "numbered",   label: "Numbered",    desc: "Ordered list",   icon: "1." },
  { type: "quote",      label: "Quote",       desc: "Callout",        icon: "\"" },
  { type: "callout",    label: "Callout",     desc: "Highlighted box", icon: "📋" },
  { type: "divider",    label: "Divider",     desc: "Horizontal rule", icon: "━" },
  { type: "table",      label: "Table",       desc: "Simple table",   icon: "⊞" },
  { type: "stockchart", label: "Stock Chart", desc: "TradingView",    icon: "📊" },
  { type: "image",      label: "Image",       desc: "Upload / URL",   icon: "📷" },
];

export default function SlashCommandMenu({ filter = "", onSelect, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef(null);

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(filter.toLowerCase()) ||
    c.desc.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => { setActiveIdx(0); }, [filter]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIdx]) onSelect(filtered[activeIdx].type); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [filtered, activeIdx, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl w-72 py-1 overflow-hidden"
    >
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border mb-1 font-medium tracking-wider uppercase">
        Blocks {filter && `· "${filter}"`}
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.type}
          onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.type); }}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
          }`}
        >
          <span className="w-7 h-7 flex items-center justify-center text-sm bg-secondary rounded-lg flex-shrink-0">
            {cmd.icon}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold">{cmd.label}</div>
            <div className="text-[10px] text-muted-foreground">{cmd.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}