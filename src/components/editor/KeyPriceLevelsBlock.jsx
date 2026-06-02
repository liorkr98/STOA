import React, { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Target, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KeyPriceLevelsBlock — editor and reader for the Key Price Levels block.
 *
 * Data shape:
 * {
 *   ticker: string,
 *   currentPrice: number | null,
 *   levels: [
 *     { id, label, price, type: "support"|"resistance"|"target"|"stop"|"breakout"|"entry", note }
 *   ]
 * }
 */

const LEVEL_TYPES = [
  { value: "support",    label: "Support",    color: "text-gain",         bg: "bg-gain/10",    border: "border-gain/25",    icon: Shield },
  { value: "resistance", label: "Resistance", color: "text-loss",         bg: "bg-loss/10",    border: "border-loss/25",    icon: TrendingDown },
  { value: "target",     label: "Target",     color: "text-amber-600",    bg: "bg-amber-50",   border: "border-amber-200",  icon: Target },
  { value: "breakout",   label: "Breakout",   color: "text-blue-600",     bg: "bg-blue-50",    border: "border-blue-200",   icon: Zap },
  { value: "entry",      label: "Entry",      color: "text-primary",      bg: "bg-primary/10", border: "border-primary/25", icon: TrendingUp },
  { value: "stop",       label: "Stop Loss",  color: "text-muted-foreground", bg: "bg-secondary", border: "border-border",   icon: Minus },
];

function getTypeCfg(type) {
  return LEVEL_TYPES.find(t => t.value === type) || LEVEL_TYPES[0];
}

let _uid = 0;
const uid = () => `kpl_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;

// ── Editor mode ───────────────────────────────────────────────────────────────
export function KeyPriceLevelsEditor({ block, onChange }) {
  const data = block.data || { ticker: "", currentPrice: null, levels: [] };
  const levels = data.levels || [];

  const update = (patch) => onChange({ ...block, data: { ...data, ...patch } });

  const addLevel = () => {
    const newLevel = { id: uid(), label: "Key Level", price: "", type: "support", note: "" };
    update({ levels: [...levels, newLevel] });
  };

  const updateLevel = (id, patch) => {
    update({ levels: levels.map(l => l.id === id ? { ...l, ...patch } : l) });
  };

  const removeLevel = (id) => {
    update({ levels: levels.filter(l => l.id !== id) });
  };

  return (
    <div className="border border-border/80 rounded-xl overflow-hidden my-3" style={{ background: "var(--bg-soft, #f8fafc)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-secondary/40">
        <Zap className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Price Levels</span>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="text"
            value={data.ticker || ""}
            onChange={e => update({ ticker: e.target.value.toUpperCase() })}
            placeholder="TICKER"
            className="h-6 w-20 text-[11px] font-mono font-bold bg-card border border-border rounded px-2 uppercase"
          />
          <input
            type="number"
            value={data.currentPrice || ""}
            onChange={e => update({ currentPrice: e.target.value ? Number(e.target.value) : null })}
            placeholder="Current $"
            className="h-6 w-24 text-[11px] font-mono bg-card border border-border rounded px-2"
          />
        </div>
      </div>

      {/* Levels list */}
      <div className="p-3 space-y-2">
        {levels.length === 0 && (
          <p className="text-[12px] text-muted-foreground text-center py-4">
            Add key price levels — support, resistance, targets, and breakouts.
          </p>
        )}
        {levels.map((level) => {
          const cfg = getTypeCfg(level.type);
          return (
            <div key={level.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <select
                value={level.type}
                onChange={e => updateLevel(level.id, { type: e.target.value })}
                className="text-[11px] font-semibold bg-transparent border-none outline-none cursor-pointer text-muted-foreground"
              >
                {LEVEL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <span className="text-border">|</span>
              <span className="text-[11px] text-muted-foreground">$</span>
              <input
                type="number"
                value={level.price}
                onChange={e => updateLevel(level.id, { price: e.target.value })}
                placeholder="0.00"
                className="w-24 text-[13px] font-mono font-bold bg-transparent border-none outline-none text-foreground"
              />
              <input
                type="text"
                value={level.label}
                onChange={e => updateLevel(level.id, { label: e.target.value })}
                placeholder="Label…"
                className="flex-1 text-[12px] bg-transparent border-none outline-none text-foreground"
              />
              <input
                type="text"
                value={level.note || ""}
                onChange={e => updateLevel(level.id, { note: e.target.value })}
                placeholder="Note (optional)…"
                className="flex-1 text-[11px] bg-transparent border-none outline-none text-muted-foreground hidden md:block"
              />
              <button
                onClick={() => removeLevel(level.id)}
                className="p-1 text-muted-foreground hover:text-loss transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        <button
          onClick={addLevel}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-[12px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Price Level
        </button>
      </div>
    </div>
  );
}

// ── Reader (published) mode ───────────────────────────────────────────────────
export function KeyPriceLevelsReader({ block }) {
  const data = block.data || {};
  const levels = (data.levels || []).filter(l => l.price && Number(l.price) > 0);
  if (levels.length === 0) return null;

  const ticker = data.ticker || "";
  const currentPrice = data.currentPrice ? Number(data.currentPrice) : null;

  // Sort levels by price descending for visual timeline
  const sorted = [...levels].sort((a, b) => Number(b.price) - Number(a.price));

  // Price range for proportional positioning
  const prices = sorted.map(l => Number(l.price));
  if (currentPrice) prices.push(currentPrice);
  const minPrice = Math.min(...prices) * 0.985;
  const maxPrice = Math.max(...prices) * 1.015;
  const range = maxPrice - minPrice || 1;
  const pct = (p) => ((Number(p) - minPrice) / range) * 100;

  return (
    <div className="my-8 rounded-2xl border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60 bg-secondary/30">
        <Zap className="w-4 h-4 text-amber-600" />
        <div>
          <span className="text-sm font-bold text-foreground">Key Price Levels</span>
          {ticker && <span className="ml-2 text-xs font-mono font-bold text-primary">${ticker}</span>}
        </div>
        {currentPrice && (
          <div className="ml-auto text-right">
            <span className="text-[10px] text-muted-foreground">Current</span>
            <p className="text-sm font-bold font-mono">${currentPrice.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Visual price timeline */}
      <div className="px-5 py-6">
        {/* Price axis + levels */}
        <div className="relative" style={{ height: Math.max(180, levels.length * 52) }}>
          {/* Center axis line */}
          <div className="absolute left-[120px] top-0 bottom-0 w-px bg-border/60" />

          {/* Current price marker */}
          {currentPrice && (
            <div
              className="absolute left-0 right-0 flex items-center gap-3"
              style={{ top: `${100 - pct(currentPrice)}%`, transform: "translateY(-50%)" }}
            >
              <div className="w-[112px] text-right">
                <span className="text-[10px] font-bold text-foreground bg-card border border-border rounded px-1.5 py-0.5">
                  NOW ${currentPrice.toFixed(2)}
                </span>
              </div>
              <div className="absolute left-[120px] right-0 border-t-2 border-dashed border-foreground/30" />
              <div className="absolute left-[116px] w-2 h-2 rounded-full bg-foreground" />
            </div>
          )}

          {/* Level rows */}
          {sorted.map((level, i) => {
            const cfg = getTypeCfg(level.type);
            const Icon = cfg.icon;
            const price = Number(level.price);
            const pctPos = 100 - pct(price);
            const isAboveCurrent = currentPrice ? price > currentPrice : true;

            return (
              <div
                key={level.id}
                className="absolute left-0 right-0 flex items-center gap-3"
                style={{ top: `${pctPos}%`, transform: "translateY(-50%)" }}
              >
                {/* Price label */}
                <div className="w-[112px] text-right flex-shrink-0">
                  <span className={cn("text-[11px] font-bold font-mono", cfg.color)}>
                    ${price.toFixed(2)}
                  </span>
                </div>

                {/* Dot on axis */}
                <div className={cn("absolute left-[117px] w-3 h-3 rounded-full border-2 border-card z-10", cfg.bg.replace("/10", ""), `border-${cfg.color.replace("text-", "")}`)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full mx-auto mt-0.5", cfg.bg)} />
                </div>

                {/* Horizontal line */}
                <div className={cn("absolute left-[120px] right-0 border-t border-dashed", cfg.border)} />

                {/* Label chip */}
                <div
                  className={cn("absolute right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border", cfg.bg, cfg.border, cfg.color)}
                >
                  <Icon className="w-3 h-3" />
                  {level.label}
                  {level.note && <span className="text-muted-foreground font-normal hidden md:inline">— {level.note}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap gap-3">
          {LEVEL_TYPES.filter(t => levels.some(l => l.type === t.value)).map(t => {
            const Icon = t.icon;
            return (
              <div key={t.value} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border", t.bg, t.border, t.color)}>
                <Icon className="w-3 h-3" /> {t.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
