import React, { useState, useEffect, useRef } from "react";

const COMMANDS = [
  // Text
  { type: "text",       label: "Paragraph",      desc: "Plain text block",          icon: "¶",  group: "Text" },
  { type: "heading",    label: "Heading 1",       desc: "Large section title",       icon: "H1", group: "Text" },
  { type: "heading2",   label: "Heading 2",       desc: "Sub-section title",         icon: "H2", group: "Text" },
  { type: "bullets",    label: "Bullet List",     desc: "Unordered list",            icon: "—",  group: "Text" },
  { type: "numbered",   label: "Numbered List",   desc: "Ordered list",              icon: "1.", group: "Text" },
  { type: "quote",      label: "Block Quote",     desc: "Key quote or statistic",    icon: '"',  group: "Text" },
  { type: "callout",    label: "Callout",         desc: "Highlighted note box",      icon: "!",  group: "Text" },
  { type: "divider",    label: "Divider",         desc: "Horizontal rule",           icon: "──", group: "Text" },
  // Finance
  { type: "metrics",    label: "Key Metrics",     desc: "Financial data grid",       icon: "%",  group: "Finance" },
  { type: "thesis",     label: "Bull / Bear",     desc: "Investment thesis split",   icon: "±",  group: "Finance" },
  { type: "stockchart", label: "Stock Chart",     desc: "Live TradingView chart",    icon: "↗",  group: "Finance" },
  { type: "table",      label: "Data Table",      desc: "Comparison table",          icon: "⊞",  group: "Finance" },
  // Media
  { type: "image",      label: "Image",           desc: "Upload or embed image",     icon: "▣",  group: "Media" },
  { type: "columns",    label: "Text + Media",    desc: "Two-column layout",         icon: "▌▐", group: "Media" },
];

const GROUPS = ["Text", "Finance", "Media"];

export default function SlashCommandMenu({ filter = "", onSelect, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef(null);

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(filter.toLowerCase()) ||
    c.desc.toLowerCase().includes(filter.toLowerCase()) ||
    c.group.toLowerCase().includes(filter.toLowerCase())
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

  const groupsInResult = filter
    ? [null]
    : GROUPS.filter(g => filtered.some(c => c.group === g));

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl w-72 py-1.5 overflow-hidden"
    >
      {filter ? (
        <>
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border mb-1 font-medium tracking-wider uppercase">
            Blocks · "{filter}"
          </div>
          {filtered.map((cmd, i) => (
            <CommandRow key={cmd.type} cmd={cmd} active={i === activeIdx} onSelect={onSelect} />
          ))}
        </>
      ) : (
        groupsInResult.map(group => (
          <div key={group}>
            <div className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              {group}
            </div>
            {filtered.filter(c => c.group === group).map(cmd => {
              const globalIdx = filtered.indexOf(cmd);
              return (
                <CommandRow key={cmd.type} cmd={cmd} active={globalIdx === activeIdx} onSelect={onSelect} />
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

function CommandRow({ cmd, active, onSelect }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.type); }}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
        active ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
      }`}
    >
      <span className="w-7 h-7 flex items-center justify-center text-xs font-medium bg-secondary rounded-lg flex-shrink-0 font-display tracking-tighter">
        {cmd.icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium">{cmd.label}</div>
        <div className="text-[10px] text-muted-foreground">{cmd.desc}</div>
      </div>
    </button>
  );
}
