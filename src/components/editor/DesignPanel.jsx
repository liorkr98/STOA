import React from "react";
import { Palette, Type, Layout, Sun } from "lucide-react";

export const REPORT_THEMES = [
  { id: "default",  label: "Clean",     bg: "#ffffff", text: "#0f172a", accent: "#3b82f6", border: "#e2e8f0" },
  { id: "dark",     label: "Dark",      bg: "#0f172a", text: "#f1f5f9", accent: "#60a5fa", border: "#1e293b" },
  { id: "warm",     label: "Warm",      bg: "#fffbf5", text: "#1c1917", accent: "#d97706", border: "#fde68a" },
  { id: "forest",   label: "Forest",    bg: "#f0fdf4", text: "#14532d", accent: "#16a34a", border: "#bbf7d0" },
  { id: "slate",    label: "Slate",     bg: "#f8fafc", text: "#1e293b", accent: "#475569", border: "#cbd5e1" },
  { id: "rose",     label: "Rose",      bg: "#fff1f2", text: "#1c0a0e", accent: "#e11d48", border: "#fecdd3" },
];

export const REPORT_FONTS = [
  { id: "inter",    label: "Inter",      style: { fontFamily: "'Inter', sans-serif" } },
  { id: "georgia",  label: "Georgia",    style: { fontFamily: "Georgia, serif" } },
  { id: "mono",     label: "Mono",       style: { fontFamily: "'Courier New', monospace" } },
  { id: "system",   label: "System",     style: { fontFamily: "system-ui, sans-serif" } },
];

export const REPORT_LAYOUTS = [
  { id: "standard", label: "Standard",  desc: "Centered, readable column" },
  { id: "wide",     label: "Wide",      desc: "Full-width, editorial feel" },
  { id: "compact",  label: "Compact",   desc: "Tight spacing, dense" },
];

export default function DesignPanel({ theme, font, layout, onThemeChange, onFontChange, onLayoutChange }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Palette className="w-3.5 h-3.5 text-primary" /> Design
      </h3>

      {/* Theme */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
          <Sun className="w-3 h-3" /> Theme
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {REPORT_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              title={t.label}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                theme === t.id ? "border-primary" : "border-border hover:border-primary/30"
              }`}
            >
              {/* Color swatch */}
              <div className="w-full h-7 rounded-lg border border-black/10 overflow-hidden flex">
                <div className="flex-1" style={{ background: t.bg }} />
                <div className="w-3" style={{ background: t.accent }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
          <Type className="w-3 h-3" /> Font
        </label>
        <div className="space-y-1">
          {REPORT_FONTS.map(f => (
            <button
              key={f.id}
              onClick={() => onFontChange(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-sm ${
                font === f.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
            >
              <span style={f.style} className="text-sm">{f.label}</span>
              <span style={f.style} className="text-xs opacity-60">Aa</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
          <Layout className="w-3 h-3" /> Layout
        </label>
        <div className="space-y-1">
          {REPORT_LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => onLayoutChange(l.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                layout === l.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
            >
              <span className="text-xs font-medium">{l.label}</span>
              <span className="text-[10px] opacity-60">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}