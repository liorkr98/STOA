import React, { useRef, useCallback, useEffect, useState } from "react";
import { GripVertical, MoreVertical, Info } from "lucide-react";
import SlashCommandMenu from "./SlashCommandMenu";
import BlockOptionsMenu from "./BlockOptionsMenu";
import MetricsBlock from "./MetricsBlock";
import ThesisBlock from "./ThesisBlock";

const BLOCK_STYLES = {
  heading:  "text-2xl font-medium font-serif text-foreground leading-tight",
  heading2: "text-xl font-medium font-serif text-foreground leading-snug",
  text:     "text-[15px] text-foreground/90 leading-relaxed",
  bullets:  "text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap",
  numbered: "text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap",
  quote:    "text-[15px] text-foreground/75 italic border-l border-accent/60 pl-4 py-1",
  callout:  "text-[15px] text-foreground/90 leading-relaxed",
  divider:  "",
  table:    "text-[15px] text-foreground/90",
};

const PLACEHOLDERS = {
  heading:  "Heading 1...",
  heading2: "Heading 2...",
  text:     "Write your analysis... (type / for commands)",
  bullets:  "• Bullet point...",
  numbered: "1. List item...",
  quote:    "Notable quote or key statistic...",
  callout:  "Key insight or important note...",
};

function renderBullets(content) {
  const lines = (content || "").split("\n").filter(Boolean);
  return (
    <ul className="list-none space-y-0.5 pl-0">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          <span>{line.replace(/^[•\-]\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}

function renderNumbered(content) {
  const lines = (content || "").split("\n").filter(Boolean);
  return (
    <ol className="list-none space-y-0.5 pl-0">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-primary font-semibold text-sm w-5 flex-shrink-0">{i + 1}.</span>
          <span>{line.replace(/^\d+\.\s*/, "")}</span>
        </li>
      ))}
    </ol>
  );
}

function renderTable(content) {
  const rows = (content || "").split("\n").filter(Boolean).map(r => r.split("|"));
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary">
            {rows[0].map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-foreground border-r border-border last:border-r-0">{cell.trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-r border-border last:border-r-0">{cell.trim()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EditorBlock({ block, onChange, onDelete, onEnter, onInsertAfter, onDuplicate, onMoveUp, onMoveDown, onTurnInto, dropIndicator }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (ref.current && block.type !== "divider" && block.type !== "table") {
      if (ref.current.innerText !== (block.content || "")) {
        ref.current.innerText = block.content || "";
      }
    }
  }, [block.content, block.type]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const text = ref.current.innerText;
    onChange({ ...block, content: text });

    // Slash command detection
    if (text === "/") {
      setShowSlash(true);
      setSlashFilter("");
    } else if (text.startsWith("/") && !text.includes(" ")) {
      setShowSlash(true);
      setSlashFilter(text.slice(1));
    } else {
      setShowSlash(false);
    }

    // Markdown shortcuts
    if (text === "# " || text === "# ") {
      ref.current.innerText = "";
      onChange({ ...block, content: "", type: "heading" });
    } else if (text === "## ") {
      ref.current.innerText = "";
      onChange({ ...block, content: "", type: "heading2" });
    } else if (text === "- " || text === "• ") {
      ref.current.innerText = "";
      onChange({ ...block, content: "", type: "bullets" });
    } else if (text === "> ") {
      ref.current.innerText = "";
      onChange({ ...block, content: "", type: "quote" });
    } else if (text === "---") {
      onChange({ ...block, content: "", type: "divider" });
    }
  }, [block, onChange]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "bullets" && block.type !== "numbered" && block.type !== "text") {
      e.preventDefault();
      if (onEnter) onEnter();
    }
    if (e.key === "Backspace" && !block.content) {
      e.preventDefault();
      onDelete();
    }
    if (e.key === "Escape") { setShowSlash(false); setShowOptions(false); }
    // Cmd+B, Cmd+I
    if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); document.execCommand("bold"); }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); document.execCommand("italic"); }
    if ((e.metaKey || e.ctrlKey) && e.key === "u") { e.preventDefault(); document.execCommand("underline"); }
  };

  const handleSlashSelect = (type) => {
    setShowSlash(false);
    if (ref.current) ref.current.innerText = "";
    if (type === "divider") {
      onChange({ ...block, type: "divider", content: "" });
    } else if (type === "table") {
      onChange({ ...block, type: "table", content: "Header 1|Header 2|Header 3\nValue 1|Value 2|Value 3" });
    } else if (type === "callout") {
      onChange({ ...block, type: "callout", content: "" });
    } else if (type === "metrics") {
      onChange({ ...block, type: "metrics", content: "P/E Ratio | 24.5x | +2.1%\nRevenue | $85.2B | +12.3%\nEPS | $3.40 | +8.7%\nGross Margin | 42.1% | -0.3%" });
    } else if (type === "thesis") {
      onChange({ ...block, type: "thesis", content: "Bull: Strong market position and durable pricing power\nBull: Growing TAM with expanding product suite\nBear: Multiple compression risk at current valuation\nBear: Increasing competition from well-funded entrants" });
    } else {
      onChange({ ...block, type, content: "" });
      if (["stockchart", "image"].includes(type) && onInsertAfter) {
        onInsertAfter(block.id, type);
      }
    }
  };

  // Finance block types — delegate to dedicated components
  if (block.type === "metrics") {
    return (
      <MetricsBlock
        block={block}
        onChange={onChange}
        onDelete={onDelete}
      />
    );
  }

  if (block.type === "thesis") {
    return (
      <ThesisBlock
        block={block}
        onChange={onChange}
        onDelete={onDelete}
      />
    );
  }

  // Special non-editable block types
  if (block.type === "divider") {
    return (
      <div
        className="group relative py-3 flex items-center gap-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {dropIndicator && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />}
        <div className="flex-1 border-t border-border" />
        <button onClick={onDelete} className={`text-muted-foreground/40 hover:text-foreground text-[10px] transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>✕</button>
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div
        className="group relative py-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {dropIndicator && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />}
        {renderTable(block.content)}
        <div className={`flex gap-2 mt-1 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
          <textarea
            className="text-xs text-muted-foreground bg-secondary/50 rounded p-2 w-full resize-none border border-border"
            rows={3}
            value={block.content || ""}
            onChange={e => onChange({ ...block, content: e.target.value })}
            placeholder="Header1|Header2\nVal1|Val2"
          />
          <button onClick={onDelete} className="text-muted-foreground/40 hover:text-loss self-start">✕</button>
        </div>
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div
        className="group relative py-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {dropIndicator && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />}
        <div className="flex gap-3 bg-primary/5 border-l-4 border-primary/50 rounded-r-xl p-3">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            data-placeholder={PLACEHOLDERS.callout}
            className={`flex-1 min-h-[1.5em] outline-none text-foreground text-sm leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 ${focused ? "border-l-0" : ""}`}
          />
          <button onClick={onDelete} className={`text-muted-foreground/40 hover:text-loss self-start transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>✕</button>
        </div>
      </div>
    );
  }

  if (block.type === "bullets") {
    return (
      <div
        className="group relative flex gap-2 items-start py-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {dropIndicator && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />}
        <div className={`flex items-center gap-0.5 flex-shrink-0 pt-1 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
          <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
          <div className="relative">
            <button onClick={() => setShowOptions(v => !v)} className="p-0.5 text-muted-foreground/40 hover:text-primary rounded"><MoreVertical className="w-3.5 h-3.5" /></button>
            {showOptions && <BlockOptionsMenu currentType={block.type} onTurnInto={t => { onTurnInto(block.id, t); setShowOptions(false); }} onDuplicate={() => { onDuplicate(block.id); setShowOptions(false); }} onDelete={() => { onDelete(); setShowOptions(false); }} onMoveUp={() => { onMoveUp(block.id); setShowOptions(false); }} onMoveDown={() => { onMoveDown(block.id); setShowOptions(false); }} onClose={() => setShowOptions(false)} />}
          </div>
        </div>
        <div className={`relative flex-1 min-w-0 ${focused ? "border-l-[3px] border-primary pl-2" : "pl-0"} transition-all duration-150`}>
          {showSlash && <SlashCommandMenu filter={slashFilter} onSelect={handleSlashSelect} onClose={() => setShowSlash(false)} />}
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            data-placeholder={PLACEHOLDERS[block.type] || "Write..."}
            className={`min-h-[1.5em] outline-none whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 ${BLOCK_STYLES[block.type] || BLOCK_STYLES.text}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex gap-2 items-start py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {dropIndicator && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />}
      {/* Left controls */}
      <div className={`flex items-center gap-0.5 flex-shrink-0 pt-0.5 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
        <div className="relative">
          <button onClick={() => setShowOptions(v => !v)} className="p-0.5 text-muted-foreground/40 hover:text-primary rounded transition-colors"><MoreVertical className="w-3.5 h-3.5" /></button>
          {showOptions && (
            <BlockOptionsMenu
              currentType={block.type}
              onTurnInto={t => { onTurnInto(block.id, t); setShowOptions(false); }}
              onDuplicate={() => { onDuplicate(block.id); setShowOptions(false); }}
              onDelete={() => { onDelete(); setShowOptions(false); }}
              onMoveUp={() => { onMoveUp(block.id); setShowOptions(false); }}
              onMoveDown={() => { onMoveDown(block.id); setShowOptions(false); }}
              onClose={() => setShowOptions(false)}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`relative flex-1 min-w-0 ${focused ? "border-l-[3px] border-primary pl-2" : "pl-0"} transition-all duration-150`}>
        {showSlash && (
          <SlashCommandMenu
            filter={slashFilter}
            onSelect={handleSlashSelect}
            onClose={() => setShowSlash(false)}
          />
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          data-placeholder={PLACEHOLDERS[block.type] || "Write..."}
          className={`min-h-[1.5em] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 ${BLOCK_STYLES[block.type] || BLOCK_STYLES.text}`}
        />
      </div>
    </div>
  );
}