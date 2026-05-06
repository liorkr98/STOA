import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import EditorBlock from "./EditorBlock";
import StockChartBlock from "./StockChartBlock";
import ImageBlock from "./ImageBlock";

export default function DraggableBlockList({ blocks, onReorder, onUpdate, onDelete, onInsertAfter }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(blocks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="editor-blocks">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-1 mb-4 transition-colors ${snapshot.isDraggingOver ? "bg-primary/3 rounded-xl" : ""}`}
          >
            {blocks.map((block, index) => {
              if (!block || typeof block !== "object" || !block.type) return null;
              return (
                <Draggable key={String(block.id)} draggableId={String(block.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative group/draggable flex items-start gap-1 ${
                        snapshot.isDragging ? "opacity-80 shadow-lg rounded-xl bg-card ring-2 ring-primary/20" : ""
                      }`}
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