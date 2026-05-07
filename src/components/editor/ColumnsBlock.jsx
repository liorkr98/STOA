import React, { useState } from "react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import EditorBlock from "./EditorBlock";
import ImageBlock from "./ImageBlock";
import StockChartBlock from "./StockChartBlock";

const RATIOS = [
  { label: "1:1", value: "1:1", grid: "1fr 1fr" },
  { label: "2:1", value: "2:1", grid: "2fr 1fr" },
  { label: "1:2", value: "1:2", grid: "1fr 2fr" },
];

export default function ColumnsBlock({ block, onDelete, updateBlock, insertBlockAfter, duplicateBlock, moveBlock, turnIntoBlock }) {
  const [swapped, setSwapped] = useState(false);
  const ratio = block.ratio || "1:1";
  const gridCols = RATIOS.find(r => r.value === ratio)?.grid || "1fr 1fr";

  const left  = swapped ? block.right  : block.left;
  const right = swapped ? block.left   : block.right;

  const updateLeft  = (patch) => {
    if (swapped) updateBlock(block.id, { right: { ...block.right,  ...patch } });
    else         updateBlock(block.id, { left:  { ...block.left,   ...patch } });
  };
  const updateRight = (patch) => {
    if (swapped) updateBlock(block.id, { left:  { ...block.left,   ...patch } });
    else         updateBlock(block.id, { right: { ...block.right,  ...patch } });
  };

  const handleSwap = () => setSwapped(s => !s);

  return (
    <div className="group relative border border-border rounded-xl p-2 mb-2 bg-card/50">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* Ratio presets */}
        <div className="flex gap-0.5">
          {RATIOS.map(r => (
            <button key={r.value} onClick={() => updateBlock(block.id, { ratio: r.value })}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${ratio === r.value ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={handleSwap}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            title="Swap columns">
            <ArrowLeftRight className="w-3 h-3" /> Swap
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="p-1 rounded text-muted-foreground hover:text-loss transition-colors" title="Delete block">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12, alignItems: "start" }}>
        {/* Left — always text */}
        <div>
          <EditorBlock
            block={{ id: block.id + "_left", type: "text", content: left?.content || "", ...left }}
            onChange={(updated) => updateLeft(updated)}
            onDelete={() => {}}
            onEnter={() => {}}
            onInsertAfter={() => {}}
            onDuplicate={() => {}}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            onTurnInto={() => {}}
          />
        </div>

        {/* Right — image, chart, or picker */}
        <div>
          {!right?.type || right?.type === "empty" ? (
            <div style={{ border: "2px dashed #e2e8f0", borderRadius: 8, padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>Choose right column content</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => updateRight({ type: "image", content: "" })}
                  style={{ padding: "6px 16px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff" }}>
                  📷 Image
                </button>
                <button onClick={() => updateRight({ type: "stockchart", ticker: "", content: "" })}
                  style={{ padding: "6px 16px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff" }}>
                  📊 Chart
                </button>
              </div>
            </div>
          ) : right?.type === "image" ? (
            <ImageBlock
              block={right}
              onChange={(updated) => updateRight(updated)}
              onDelete={() => updateRight({ type: "empty", content: "" })}
            />
          ) : (
            <StockChartBlock
              block={right}
              onChange={(updated) => updateRight(updated)}
              onDelete={() => updateRight({ type: "empty", content: "" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}