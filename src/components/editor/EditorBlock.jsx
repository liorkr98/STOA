import React, { useRef, useCallback, useEffect, useState } from "react";
import { Trash2, GripVertical, Plus } from "lucide-react";
import BlockTypeMenu from "./BlockTypeMenu";

const BLOCK_STYLES = {
  heading: "text-xl font-bold text-foreground",
  text: "text-sm text-foreground/90 leading-relaxed",
  bullets: "text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap",
  quote: "text-sm text-foreground/80 italic border-l-4 border-primary/40 pl-4",
};
const PLACEHOLDERS = {
  heading: "Heading...",
  text: "Write your analysis... (type / for blocks)",
  bullets: "• Add bullet points...",
  quote: "Add a quote...",
};

export default function EditorBlock({ block, onChange, onDelete, onEnter, onInsertBlock, index }) {
  const ref = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== block.content) {
      ref.current.innerText = block.content || "";
    }
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (!ref.current || !block || typeof block !== 'object') return;
    const text = ref.current.innerText;
    onChange({ ...block, content: text });
    setShowMenu(text === "/");
  }, [block, onChange]);

  const handleKeyDown = (e) => {
    if (!block || typeof block !== 'object') return;
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

  return (
    <div
      className="group relative flex gap-2 items-start py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); }}
    >
      {/* Left controls: drag + add */}
      <div className={`flex items-center gap-0.5 flex-shrink-0 mt-0.5 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
        <button className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab" title="Drag to reorder">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="p-0.5 text-muted-foreground/50 hover:text-primary rounded transition-colors"
            title="Add block below"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <BlockTypeMenu
              onSelect={(type) => handleInsert(type)}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </div>

      <div className="relative flex-1 min-w-0">
        {/* Slash command menu — appears below cursor */}
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
          className={`flex-1 min-h-[1.5em] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 ${BLOCK_STYLES[block.type] || BLOCK_STYLES.text}`}
        />
      </div>

      <button
        onClick={() => onDelete()}
        className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-0.5 text-muted-foreground hover:text-loss flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}