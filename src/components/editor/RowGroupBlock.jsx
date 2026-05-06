import React, { useState } from "react";
import { Columns2, Columns3, Trash2, GripVertical } from "lucide-react";
import EditorBlock from "./EditorBlock";
import StockChartBlock from "./StockChartBlock";
import ImageBlock from "./ImageBlock";

/**
 * Renders a horizontal row of 2 or 3 blocks side by side.
 * Each block keeps its full functionality inside a resizable column.
 */
export default function RowGroupBlock({ blocks, onUpdate, onDelete, onInsertAfter, onUngroup }) {
  const colClass = blocks.length === 2 ? "w-1/2" : "w-1/3";

  const renderBlock = (block) => {
    if (!block) return null;
    if (block.type === "stockchart") {
      return (
        <StockChartBlock
          block={block}
          onChange={(u) => onUpdate(block.id, u)}
          onDelete={() => onDelete(block.id)}
        />
      );
    }
    if (block.type === "image") {
      return (
        <ImageBlock
          block={block}
          onChange={(u) => onUpdate(block.id, u)}
          onDelete={() => onDelete(block.id)}
        />
      );
    }
    return (
      <EditorBlock
        block={block}
        onChange={(u) => onUpdate(block.id, u)}
        onDelete={() => onDelete(block.id)}
        onEnter={() => onInsertAfter(block.id, "text")}
      />
    );
  };

  return (
    <div className="group/row relative mb-2">
      {/* Ungroup button */}
      <button
        onClick={onUngroup}
        className="absolute -top-2 right-0 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground bg-card border border-border rounded px-2 py-0.5 flex items-center gap-1"
        title="Split into separate rows"
      >
        {blocks.length === 2 ? <Columns2 className="w-3 h-3" /> : <Columns3 className="w-3 h-3" />}
        Ungroup
      </button>

      <div className="flex gap-3 items-stretch">
        {blocks.map((block) => (
          <div key={block.id} className={`${colClass} min-w-0 flex-shrink-0`}>
            {renderBlock(block)}
          </div>
        ))}
      </div>
    </div>
  );
}