import React from "react";
import { Palette, Type, Layout } from "lucide-react";

export const REPORT_THEMES = [
  { id: "default",   label: "Clean",     bg: "#ffffff",  text: "#0f172a", accent: "#3b82f6", border: "#e2e8f0", cardBg: "#f8fafc" },
  { id: "dark",      label: "Dark",      bg: "#0f172a",  text: "#f1f5f9", accent: "#60a5fa", border: "#1e293b", cardBg: "#1e293b" },
  { id: "warm",      label: "Warm",      bg: "#fffbf5",  text: "#1c1917", accent: "#d97706", border: "#fde68a", cardBg: "#fef3c7" },
  { id: "forest",    label: "Forest",    bg: "#052e16",  text: "#dcfce7", accent: "#22c55e", border: "#166534", cardBg: "#14532d" },
  { id: "slate",     label: "Slate",     bg: "#f8fafc",  text: "#1e293b", accent: "#475569", border: "#cbd5e1", cardBg: "#f1f5f9" },
  { id: "rose",      label: "Rose",      bg: "#fff1f2",  text: "#1c0a0e", accent: "#e11d48", border: "#fecdd3", cardBg: "#ffe4e6" },
  { id: "midnight",  label: "Midnight",  bg: "#0a0e27",  text: "#e2e8f0", accent: "#818cf8", border: "#1e2040", cardBg: "#131728" },
  { id: "terminal",  label: "Terminal",  bg: "#000000",  text: "#00ff41", accent: "#00ff41", border: "#003311", cardBg: "#001100" },
];

export const REPORT_FONTS = [
  { id: "inter",         label: "Inter",        style: { fontFamily: "'Inter', sans-serif" } },
  { id: "georgia",       label: "Georgia",      style: { fontFamily: "Georgia, serif" } },
  { id: "mono",          label: "Mono",         style: { fontFamily: "'Courier New', monospace" } },
  { id: "sora",          label: "Sora",         style: { fontFamily: "'Sora', sans-serif" } },
  { id: "merriweather",  label: "Merriweather", style: { fontFamily: "'Merriweather', serif" } },
  { id: "system",        label: "System",       style: { fontFamily: "system-ui, sans-serif" } },
];

export const REPORT_LAYOUTS = [
  { id: "standard",  label: "Standard",  desc: "~680px · Readable" },
  { id: "wide",      label: "Wide",      desc: "Full width · Data heavy" },
  { id: "compact",   label: "Compact",   desc: "~560px · Newsletter" },
  { id: "magazine",  label: "Magazine",  desc: "2-col · Long reads" },
];

const ACCENT_COLORS = [
  "#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899","#ef4444",
  "#f97316","#f59e0b","#eab308","#22c55e","#10b981","#14b8a6",
  "#06b6d4","#0ea5e9","#64748b","#1e293b","#78716c","#d97706",
  "#be185d","#7c3aed",
];

export default function DesignPanel({ theme, font, layout, accentColor, onThemeChange, onFontChange, onLayoutChange, onAccentColorChange }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Palette className="w-3.5 h-3.5 text-primary" /> Design
      </h3>

      {/* Accent color */}
      {onAccentColorChange && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block font-medium">Accent Color</label>
          <div className="flex flex-wrap gap-1.5">
            {ACCENT_COLORS.map(c => (
              <button
                key={c}
                title={c}
                onClick={() => onAccentColorChange(c)}
                style={{ background: c, width: 22, height: 22, borderRadius: 5, border: accentColor === c ? "3px solid white" : "2px solid transparent", outline: accentColor === c ? "2px solid " + c : "none" }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block font-medium flex items-center gap-1">
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
        <label className="text-xs text-muted-foreground mb-2 block font-medium flex items-center gap-1">
          <Layout className="w-3 h-3" /> Layout
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {REPORT_LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => onLayoutChange(l.id)}
              className={`flex flex-col items-start px-3 py-2 rounded-lg border transition-all ${
                layout === l.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
            >
              <span className="text-xs font-medium">{l.label}</span>
              <span className="text-[9px] opacity-60">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}