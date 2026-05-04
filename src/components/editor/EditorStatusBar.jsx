import React, { useEffect, useState } from "react";

function countWords(blocks) {
  return blocks
    .filter(b => ["text", "heading", "bullets", "quote"].includes(b.type))
    .map(b => (b.content || "").trim())
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export default function EditorStatusBar({ blocks, lastSaved, hasUnsaved }) {
  const wordCount = countWords(blocks);
  const readTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="flex items-center gap-4 px-1 py-1.5 text-[11px] text-muted-foreground border-t border-border/50 mt-2 mb-4">
      <span>{wordCount} words</span>
      <span>·</span>
      <span>{readTime} min read</span>
      <span className="ml-auto flex items-center gap-1">
        {hasUnsaved ? (
          <span className="text-amber-500">● Unsaved changes</span>
        ) : lastSaved ? (
          <span className="text-gain">✓ Saved {lastSaved}</span>
        ) : (
          <span className="text-muted-foreground/60">Not saved yet</span>
        )}
      </span>
    </div>
  );
}