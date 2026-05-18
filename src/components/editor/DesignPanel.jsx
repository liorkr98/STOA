import React, { useState } from "react";
import { Palette, Type, Layout, Building2, ChevronDown, ChevronUp, Check } from "lucide-react";

export const REPORT_THEMES = [
  {
    id: "default",
    label: "Bloomberg",
    desc: "Clean institutional",
    bg: "#ffffff",
    text: "#0f172a",
    accent: "#1d4ed8",
    border: "#e2e8f0",
    cardBg: "#f8fafc",
    headingFont: "bold",
  },
  {
    id: "cream",
    label: "Substack",
    desc: "Warm editorial",
    bg: "#faf8f4",
    text: "#1c1917",
    accent: "#1d4ed8",
    border: "#e8e0d5",
    cardBg: "#f5f0e8",
    headingFont: "bold",
  },
  {
    id: "dark",
    label: "Dark Pro",
    desc: "Modern dark",
    bg: "#0f172a",
    text: "#f1f5f9",
    accent: "#60a5fa",
    border: "#1e293b",
    cardBg: "#1e293b",
    headingFont: "bold",
  },
  {
    id: "midnight",
    label: "Midnight",
    desc: "Deep navy",
    bg: "#0a0e27",
    text: "#e2e8f0",
    accent: "#818cf8",
    border: "#1e2040",
    cardBg: "#131728",
    headingFont: "bold",
  },
  {
    id: "terminal",
    label: "Terminal",
    desc: "Bloomberg green",
    bg: "#0a0f0a",
    text: "#00e676",
    accent: "#00e676",
    border: "#002200",
    cardBg: "#001100",
    headingFont: "bold",
  },
  {
    id: "slate",
    label: "Slate",
    desc: "Cool professional",
    bg: "#f8fafc",
    text: "#1e293b",
    accent: "#475569",
    border: "#cbd5e1",
    cardBg: "#f1f5f9",
    headingFont: "bold",
  },
  {
    id: "warm",
    label: "Parchment",
    desc: "Classic report",
    bg: "#fffbf5",
    text: "#1c1917",
    accent: "#b45309",
    border: "#f0e6d3",
    cardBg: "#fef3c7",
    headingFont: "bold",
  },
  {
    id: "forest",
    label: "Forest",
    desc: "ESG / green",
    bg: "#052e16",
    text: "#dcfce7",
    accent: "#22c55e",
    border: "#166534",
    cardBg: "#14532d",
    headingFont: "bold",
  },
];

export const REPORT_FONTS = [
  { id: "inter",        label: "Inter",        sample: "The quick brown fox",         style: { fontFamily: "'Inter', sans-serif" } },
  { id: "georgia",      label: "Georgia",       sample: "The quick brown fox",         style: { fontFamily: "Georgia, serif" } },
  { id: "merriweather", label: "Merriweather",  sample: "The quick brown fox",         style: { fontFamily: "'Merriweather', serif" } },
  { id: "sora",         label: "Sora",          sample: "The quick brown fox",         style: { fontFamily: "'Sora', sans-serif" } },
  { id: "mono",         label: "Mono",          sample: "The quick brown fox",         style: { fontFamily: "'Courier New', monospace" } },
  { id: "system",       label: "System UI",     sample: "The quick brown fox",         style: { fontFamily: "system-ui, sans-serif" } },
];

export const REPORT_LAYOUTS = [
  { id: "standard",  label: "Standard",  desc: "680px · Readable",     preview: "▌▌▌▌▌▌▌▌▌" },
  { id: "wide",      label: "Wide",      desc: "Full width · Data",     preview: "▌▌▌▌▌▌▌▌▌▌▌▌" },
  { id: "compact",   label: "Compact",   desc: "560px · Newsletter",    preview: "▌▌▌▌▌▌▌" },
  { id: "magazine",  label: "Magazine",  desc: "2-col · Long reads",    preview: "▌▌▌▌ ▌▌▌▌" },
];

const BRAND_ACCENTS = [
  "#1d4ed8","#2563eb","#0ea5e9","#0891b2","#0f766e",
  "#059669","#16a34a","#ca8a04","#d97706","#b45309",
  "#dc2626","#e11d48","#c026d3","#7c3aed","#4f46e5",
  "#64748b","#374151","#1e293b","#0f172a","#000000",
];

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function DesignPanel({
  theme, font, layout, accentColor,
  onThemeChange, onFontChange, onLayoutChange, onAccentColorChange,
  brandName, brandLogo, reportFooter,
  onBrandNameChange, onBrandLogoChange, onReportFooterChange,
}) {
  const [customHex, setCustomHex] = useState(accentColor || "#1d4ed8");

  const handleHexChange = (val) => {
    setCustomHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onAccentColorChange?.(val);
    }
  };

  return (
    <div className="space-y-3">

      {/* ── Themes ── */}
      <Section title="Theme" icon={Palette} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              style={{
                background: t.bg,
                border: `2px solid ${theme === t.id ? t.accent : t.border}`,
                boxShadow: theme === t.id ? `0 0 0 2px ${t.accent}33` : "none",
              }}
              className="rounded-xl p-3 text-left transition-all relative overflow-hidden"
              title={t.desc}
            >
              {/* Accent strip */}
              <div style={{ background: t.accent, height: 3, borderRadius: 2, marginBottom: 7, width: "55%" }} />
              {/* Fake text lines */}
              <div style={{ background: t.text, height: 2, borderRadius: 1, marginBottom: 4, width: "80%", opacity: 0.7 }} />
              <div style={{ background: t.text, height: 2, borderRadius: 1, marginBottom: 6, width: "50%", opacity: 0.3 }} />
              {/* Label */}
              <div style={{ color: t.text, fontSize: 10, fontWeight: 700, letterSpacing: 0 }}>{t.label}</div>
              <div style={{ color: t.text, fontSize: 8, opacity: 0.5, marginTop: 1 }}>{t.desc}</div>
              {/* Check mark */}
              {theme === t.id && (
                <div
                  style={{ background: t.accent, position: "absolute", top: 6, right: 6, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Check style={{ width: 10, height: 10, color: "#fff" }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Accent Color ── */}
      <Section title="Accent Color" icon={Palette} defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {BRAND_ACCENTS.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => { onAccentColorChange?.(c); setCustomHex(c); }}
              style={{
                background: c,
                width: 24,
                height: 24,
                borderRadius: 6,
                border: accentColor === c ? "2px solid white" : "2px solid transparent",
                outline: accentColor === c ? `2px solid ${c}` : "none",
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md border border-border flex-shrink-0" style={{ background: accentColor }} />
          <input
            type="text"
            value={customHex}
            onChange={e => handleHexChange(e.target.value)}
            placeholder="#1d4ed8"
            className="flex-1 text-xs font-display border border-border rounded-lg px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            maxLength={7}
          />
          <input
            type="color"
            value={accentColor || "#1d4ed8"}
            onChange={e => { onAccentColorChange?.(e.target.value); setCustomHex(e.target.value); }}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
            title="Pick color"
          />
        </div>
      </Section>

      {/* ── Typography ── */}
      <Section title="Typography" icon={Type} defaultOpen={false}>
        <div className="space-y-2">
          {REPORT_FONTS.map(f => (
            <button
              key={f.id}
              onClick={() => onFontChange(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                font === f.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="text-left">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{f.label}</div>
                <div style={f.style} className="text-sm text-foreground">{f.sample}</div>
              </div>
              {font === f.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Layout ── */}
      <Section title="Layout Width" icon={Layout} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => onLayoutChange(l.id)}
              className={`flex flex-col items-start px-3 py-3 rounded-xl border transition-all ${
                layout === l.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
            >
              <span className="text-xs font-display tracking-tighter mb-1.5 opacity-60">{l.preview}</span>
              <span className="text-xs font-medium">{l.label}</span>
              <span className="text-[9px] opacity-60 mt-0.5">{l.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Brand Identity ── */}
      <Section title="Brand Identity" icon={Building2} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5 block">
              Brand / Firm Name
            </label>
            <input
              type="text"
              value={brandName || ""}
              onChange={e => onBrandNameChange?.(e.target.value)}
              placeholder="e.g. Acme Capital Research"
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5 block">
              Logo URL
            </label>
            <input
              type="text"
              value={brandLogo || ""}
              onChange={e => onBrandLogoChange?.(e.target.value)}
              placeholder="https://your-logo.png"
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {brandLogo && (
              <div className="mt-2 p-2 bg-secondary rounded-lg flex items-center justify-center">
                <img src={brandLogo} alt="Brand logo" className="max-h-10 object-contain" onError={e => e.currentTarget.style.display = "none"} />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5 block">
              Report Footer / Disclaimer
            </label>
            <textarea
              value={reportFooter || ""}
              onChange={e => onReportFooterChange?.(e.target.value)}
              placeholder="© 2026 Acme Capital Research. For informational purposes only."
              rows={2}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </Section>

    </div>
  );
}
