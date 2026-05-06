import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Columns2, Columns3 } from "lucide-react";
import EditorBlock from "./EditorBlock";
import StockChartBlock from "./StockChartBlock";
import ImageBlock from "./ImageBlock";
import RowGroupBlock from "./RowGroupBlock";

// Build display rows: blocks with the same rowGroup value are merged into one row
function buildRows(blocks) {
  const seen = new Set();
  const rows = [];
  for (const b of blocks) {
    if (b.rowGroup) {
      if (!seen.has(b.rowGroup)) {
        seen.add(b.rowGroup);
        rows.push({ type: "group", groupId: b.rowGroup, blocks: blocks.filter(x => x.rowGroup === b.rowGroup) });
      }
    } else {
      rows.push({ type: "single", block: b });
    }
  }
  return rows;
}

let _groupCounter = 0;
const newGroupId = () => `rg_${Date.now()}_${++_groupCounter}`;

export default function DraggableBlockList({ blocks, onReorder, onUpdate, onDelete, onInsertAfter }) {
  const [hoveredId, setHoveredId] = useState(null);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(blocks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered);
  };

  const groupWithNext = (blockId, cols = 2) => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx < 0 || idx + cols - 1 >= blocks.length) return;
    const gid = newGroupId();
    const updated = blocks.map((b, i) => {
      if (i >= idx && i < idx + cols) return { ...b, rowGroup: gid };
      return b;
    });
    onReorder(updated);
  };

  const ungroupBlocks = (groupId) => {
    const updated = blocks.map(b =>
      b.rowGroup === groupId ? { ...b, rowGroup: undefined } : b
    );
    onReorder(updated);
  };

  const rows = buildRows(blocks);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="editor-blocks">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-1 mb-4 transition-colors ${snapshot.isDraggingOver ? "bg-primary/3 rounded-xl" : ""}`}
          >
            {rows.map((row, rowIdx) => {
              if (row.type === "group") {
                return (
                  <RowGroupBlock
                    key={row.groupId}
                    blocks={row.blocks}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onInsertAfter={onInsertAfter}
                    onUngroup={() => ungroupBlocks(row.groupId)}
                  />
                );
              }

              const block = row.block;
              const blockIdx = blocks.findIndex(b => b.id === block.id);
              const canGroup2 = blockIdx < blocks.length - 1 && !blocks[blockIdx + 1]?.rowGroup;
              const canGroup3 = blockIdx < blocks.length - 2 && !blocks[blockIdx + 1]?.rowGroup && !blocks[blockIdx + 2]?.rowGroup;

              return (
                <Draggable key={String(block.id)} draggableId={String(block.id)} index={blockIdx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative group/draggable flex items-start gap-1 ${
                        snapshot.isDragging ? "opacity-80 shadow-lg rounded-xl bg-card ring-2 ring-primary/20" : ""
                      }`}
                      onMouseEnter={() => setHoveredId(block.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Drag handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="flex-shrink-0 mt-2 w-5 h-8 flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing opacity-0 group-hover/draggable:opacity-100 transition-opacity"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Block content */}
                      <div className="flex-1 min-w-0">
                        {block.type === "stockchart" ? (
                          <StockChartBlock
                            block={block}
                            onChange={(u) => onUpdate(block.id, u)}
                            onDelete={() => onDelete(block.id)}
                          />
                        ) : block.type === "image" ? (
                          <ImageBlock
                            block={block}
                            onChange={(u) => onUpdate(block.id, u)}
                            onDelete={() => onDelete(block.id)}
                          />
                        ) : (
                          <EditorBlock
                            block={block}
                            onChange={(u) => onUpdate(block.id, u)}
                            onDelete={() => onDelete(block.id)}
                            onEnter={() => onInsertAfter(block.id, "text")}
                          />
                        )}
                      </div>

                      {/* Column group buttons */}
                      {hoveredId === block.id && (canGroup2 || canGroup3) && (
                        <div className="absolute -bottom-0.5 right-6 flex gap-1 z-10">
                          {canGroup2 && (
                            <button
                              onClick={() => groupWithNext(block.id, 2)}
                              className="flex items-center gap-1 text-[10px] bg-card border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                              title="Place next block side-by-side (2 columns)"
                            >
                              <Columns2 className="w-3 h-3" /> 2 col
                            </button>
                          )}
                          {canGroup3 && (
                            <button
                              onClick={() => groupWithNext(block.id, 3)}
                              className="flex items-center gap-1 text-[10px] bg-card border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                              title="Place next 2 blocks side-by-side (3 columns)"
                            >
                              <Columns3 className="w-3 h-3" /> 3 col
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}