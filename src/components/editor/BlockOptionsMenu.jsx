import React, { useRef, useEffect } from "react";

const ALL_TYPES = [
  { type: "text",       label: "Text" },
  { type: "heading",    label: "Heading 1" },
  { type: "heading2",   label: "Heading 2" },
  { type: "bullets",    label: "Bullet List" },
  { type: "numbered",   label: "Numbered List" },
  { type: "quote",      label: "Quote" },
  { type: "callout",    label: "Callout" },
  { type: "divider",    label: "Divider" },
  { type: "table",      label: "Table" },
  { type: "stockchart", label: "Stock Chart" },
  { type: "image",      label: "Image" },
];

export default function BlockOptionsMenu({ currentType, onTurnInto, onDuplicate, onDelete, onMoveUp, onMoveDown, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-8 top-0 z-50 bg-card border border-border rounded-xl shadow-xl w-52 py-1 overflow-hidden"
    >
      <div className="px-3 py-1 text-[10px] text-muted-foreground font-medium tracking-wider uppercase border-b border-border mb-1">
        Turn into
      </div>
      <div className="max-h-40 overflow-y-auto">
        {ALL_TYPES.filter(t => t.type !== currentType).map(t => (
          <button
            key={t.type}
            onMouseDown={e => { e.preventDefault(); onTurnInto(t.type); onClose(); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="border-t border-border mt-1 pt-1">
        <button onMouseDown={e => { e.preventDefault(); onDuplicate(); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary transition-colors">Duplicate</button>
        <button onMouseDown={e => { e.preventDefault(); onMoveUp(); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary transition-colors">Move up</button>
        <button onMouseDown={e => { e.preventDefault(); onMoveDown(); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary transition-colors">Move down</button>
        <button onMouseDown={e => { e.preventDefault(); onDelete(); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary text-loss transition-colors">Delete</button>
      </div>
    </div>
  );
}