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
      className="absolute left-0 top-full mt-1 z-50 w-72 py-1.5 overflow-hidden surface"
      style={{ background: "var(--bg-elev)" }}
    >
      {filter ? (
        <>
          <div className="px-3 py-1.5 t-eyebrow" style={{ borderBottom: "0.5px solid var(--border-rgba)", marginBottom: 4 }}>
            Blocks · "{filter}"
          </div>
          {filtered.map((cmd, i) => (
            <CommandRow key={cmd.type} cmd={cmd} active={i === activeIdx} onSelect={onSelect} />
          ))}
        </>
      ) : (
        groupsInResult.map(group => (
          <div key={group}>
            <div className="px-3 pt-2 pb-1 t-eyebrow">{group}</div>
            {filtered.filter(c => c.group === group).map(cmd => {
              const globalIdx = filtered.indexOf(cmd);
              return (
                <CommandRow key={cmd.type} cmd={cmd} active={globalIdx === activeIdx} onSelect={onSelect} />
              );
            })}
          </div>
        ))
      )}
      {/* Footer hint per spec: ↑↓ navigate / ↵ insert / esc close */}
      <div
        className="t-meta"
        style={{
          display: "flex",
          gap: 12,
          padding: "8px 12px",
          marginTop: 4,
          borderTop: "0.5px solid var(--border-rgba)",
          fontSize: 10,
        }}
      >
        <span>↑↓ navigate</span>
        <span>↵ insert</span>
        <span>esc close</span>
      </div>
    </div>
  );
}

function CommandRow({ cmd, active, onSelect }) {
  // Finance items get a gold-tinted icon tile per design handoff v2 spec.
  const isFinance = cmd.group === "Finance";
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.type); }}
      className="w-full flex items-center gap-3 px-3 py-2 text-left"
      style={{
        background: active ? "var(--bg-soft)" : "transparent",
        color: active ? "var(--text)" : "var(--text-body)",
        transition: "background var(--t-fast) var(--ease), color var(--t-fast) var(--ease)",
        border: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-softer)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="w-7 h-7 flex items-center justify-center flex-shrink-0 t-num"
        style={{
          fontSize: 12,
          background: isFinance ? "rgba(212,175,55,0.15)" : "var(--bg-soft)",
          color: isFinance ? "var(--gold-hex)" : "var(--text)",
          border: `0.5px solid ${isFinance ? "rgba(212,175,55,0.35)" : "var(--border-rgba)"}`,
          borderRadius: 6,
          letterSpacing: 0,
        }}
      >
        {cmd.icon}
      </span>
      <div className="min-w-0" style={{ flex: 1 }}>
        <div className="t-body" style={{ fontSize: 12, fontWeight: 500 }}>{cmd.label}</div>
        <div className="t-meta" style={{ fontSize: 10 }}>{cmd.desc}</div>
      </div>
      {isFinance && (
        <span
          className="tag"
          style={{ height: 16, padding: "0 5px", fontSize: 9, letterSpacing: "0.06em", color: "var(--gold-hex)", borderColor: "rgba(212,175,55,0.35)", background: "rgba(212,175,55,0.08)" }}
        >
          Finance
        </span>
      )}
    </button>
  );
}
