import React, { useEffect, useRef, useState } from "react";

const COLORS = [
  { label: "Black",  value: "#000000" },
  { label: "White",  value: "#ffffff" },
  { label: "Red",    value: "#ef4444" },
  { label: "Green",  value: "#22c55e" },
  { label: "Blue",   value: "#3b82f6" },
  { label: "Amber",  value: "#f59e0b" },
  { label: "Purple", value: "#a855f7" },
  { label: "Gray",   value: "#6b7280" },
];

const SIZES = [
  { label: "Small",  value: "1" },
  { label: "Normal", value: "3" },
  { label: "Large",  value: "5" },
  { label: "XLarge", value: "7" },
];

function ToolbarBtn({ onClick, title, active, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6, border: "none",
        background: active ? "rgba(255,255,255,0.25)" : "transparent",
        color: "white", cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 13,
        fontWeight: 600,
      }}
      onMouseEnter={e => { if (!active) e.target.style.background = "rgba(255,255,255,0.15)"; }}
      onMouseLeave={e => { if (!active) e.target.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

export default function FloatingToolbar({ onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim() === "") {
        setVisible(false);
        setShowColors(false);
        setShowSizes(false);
        return;
      }
      // Check if selection is inside a contentEditable
      const node = sel.anchorNode;
      let el = node?.nodeType === 3 ? node.parentElement : node;
      let inEditor = false;
      while (el) {
        if (el.contentEditable === "true") { inEditor = true; break; }
        el = el.parentElement;
      }
      if (!inEditor) { setVisible(false); return; }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width) { setVisible(false); return; }

      const toolbarW = 300;
      let left = rect.left + rect.width / 2 - toolbarW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - toolbarW - 8));
      setPos({ top: rect.top + window.scrollY - 44, left });
      setVisible(true);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const cmd = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) cmd("createLink", url);
  };

  const clearFormat = () => {
    cmd("removeFormat");
    cmd("unlink");
  };

  if (!visible) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: "#1a1a2e",
        color: "white",
        borderRadius: 8,
        padding: "4px 6px",
        display: "flex",
        gap: 2,
        alignItems: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        userSelect: "none",
      }}
    >
      <ToolbarBtn onClick={() => cmd("bold")} title="Bold (Cmd+B)"><strong>B</strong></ToolbarBtn>
      <ToolbarBtn onClick={() => cmd("italic")} title="Italic (Cmd+I)"><em>I</em></ToolbarBtn>
      <ToolbarBtn onClick={() => cmd("underline")} title="Underline"><span style={{ textDecoration: "underline" }}>U</span></ToolbarBtn>
      <ToolbarBtn onClick={() => cmd("strikeThrough")} title="Strikethrough"><span style={{ textDecoration: "line-through" }}>S</span></ToolbarBtn>
      <ToolbarBtn onClick={() => cmd("formatBlock", "pre")} title="Inline code">&lt;&gt;</ToolbarBtn>

      <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />

      {/* Font size */}
      <div style={{ position: "relative" }}>
        <ToolbarBtn onClick={() => { setShowSizes(v => !v); setShowColors(false); }} title="Font size">A↕</ToolbarBtn>
        {showSizes && (
          <div style={{
            position: "absolute", top: 32, left: 0, background: "#1a1a2e",
            borderRadius: 6, padding: 4, zIndex: 10000, minWidth: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
            {SIZES.map(s => (
              <button
                key={s.value}
                onMouseDown={e => { e.preventDefault(); cmd("fontSize", s.value); setShowSizes(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "4px 8px", background: "transparent", border: "none",
                  color: "white", cursor: "pointer", borderRadius: 4, fontSize: 12,
                }}
                onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >{s.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Color picker */}
      <div style={{ position: "relative" }}>
        <ToolbarBtn onClick={() => { setShowColors(v => !v); setShowSizes(false); }} title="Text color">🎨</ToolbarBtn>
        {showColors && (
          <div style={{
            position: "absolute", top: 32, left: 0, background: "#1a1a2e",
            borderRadius: 6, padding: 6, zIndex: 10000,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
            {COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                onMouseDown={e => { e.preventDefault(); cmd("foreColor", c.value); setShowColors(false); }}
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: c.value, border: "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ToolbarBtn onClick={insertLink} title="Insert link">🔗</ToolbarBtn>
      <ToolbarBtn onClick={clearFormat} title="Clear formatting">✕</ToolbarBtn>
    </div>
  );
}