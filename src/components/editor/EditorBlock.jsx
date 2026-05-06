import React, { useRef, useCallback, useEffect, useState } from "react";
import { Trash2, GripVertical, Plus, Type, List, Quote, AlignLeft } from "lucide-react";
import BlockTypeMenu from "./BlockTypeMenu";

const BLOCK_STYLES = {
  heading: "text-2xl font-bold text-foreground leading-tight",
  text:    "text-[15px] text-foreground/90 leading-relaxed",
  bullets: "text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap",
  quote:   "text-[15px] text-foreground/75 italic border-l-4 border-primary/40 pl-4 py-1",
};

const PLACEHOLDERS = {
  heading: "Heading...",
  text:    "Write your analysis... (type / for commands)",
  bullets: "• Add bullet points...",
  quote:   "Notable quote or key statistic...",
};

const BLOCK_ICONS = {
  heading: Type,
  text:    AlignLeft,
  bullets: List,
  quote:   Quote,
};

export default function EditorBlock({ block, onChange, onDelete, onEnter, onInsertBlock }) {
  const ref       = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== block.content) {
      ref.current.innerText = block.content || "";
    }
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current || !block || typeof block !== "object") return;
    const text = ref.current.innerText;
    onChange({ ...block, content: text });
    setShowMenu(text === "/");
  }, [block, onChange]);

  const handleKeyDown = (e) => {
    if (!block || typeof block !== "object") return;
    if (e.key === "Enter" && !e.shiftKey && block.type !== "bullets") {
      e.preventDefault();
      if (onEnter) onEnter();
    }
    if (e.key === "Backspace" && !block.content) {
      e.preventDefault();
      onDelete();
    }
    if (e.key === "Escape") setShowMenu(false);
  };

  const handleInsert = (type) => {
    if (onInsertBlock) onInsertBlock(block.id, type);
    else if (onEnter) onEnter();
    setShowMenu(false);
  };

  const BlockIcon = BLOCK_ICONS[block.type] || AlignLeft;

  return (
    <div
      className="group relative flex gap-2 items-start py-1.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left controls */}
      <div className={`flex items-center gap-0.5 flex-shrink-0 pt-0.5 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
        <button className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing" title="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="p-0.5 text-muted-foreground/40 hover:text-primary rounded transition-colors"
            title="Add block below"
          >
            <Plus className="w-4 h-4" />
          </button>
          {showMenu && (
            <BlockTypeMenu onSelect={(type) => handleInsert(type)} onClose={() => setShowMenu(false)} />
          )}
        </div>
      </div>

      {/* Block type indicator */}
      <div className={`flex-shrink-0 pt-0.5 transition-opacity ${isHovered ? "opacity-40" : "opacity-0"}`}>
        <BlockIcon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="relative flex-1 min-w-0">
        {showMenu && (
          <BlockTypeMenu
            onSelect={(type) => {
              onChange({ ...block, content: "" });
              if (ref.current) ref.current.innerText = "";
              handleInsert(type);
            }}
            onClose={() => setShowMenu(false)}
          />
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder={PLACEHOLDERS[block.type] || "Write..."}
          className={`flex-1 min-h-[1.5em] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 ${BLOCK_STYLES[block.type] || BLOCK_STYLES.text}`}
        />
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete()}
        className="opacity-0 group-hover:opacity-100 transition-opacity pt-0.5 p-1 text-muted-foreground/40 hover:text-loss flex-shrink-0 rounded hover:bg-loss/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}