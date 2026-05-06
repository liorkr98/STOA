import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import TradingViewWidget from "@/components/feed/TradingViewWidget";

export default function StockChartBlock({ block, onDelete, onChange }) {
  const initialTicker = block?.ticker || block?.content || "AAPL";
  const [ticker, setTicker] = useState(initialTicker);
  const [inputTicker, setInputTicker] = useState(initialTicker);
  const [height, setHeight] = useState(block?.height || 380);
  const [width, setWidth] = useState(block?.width || 100); // percentage
  const [showControls, setShowControls] = useState(true);

  const notify = (patch) => {
    if (onChange) onChange({ ...block, ticker, content: ticker, height, width, ...patch });
  };

  const applyTicker = () => {
    const t = inputTicker.trim().toUpperCase();
    if (t) {
      setTicker(t);
      notify({ ticker: t, content: t });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-2">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Input
          value={inputTicker}
          onChange={e => setInputTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && applyTicker()}
          placeholder="TICKER"
          className="w-24 h-7 text-sm font-mono"
        />
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={applyTicker}>
          <Search className="w-3.5 h-3.5" />
        </Button>
        <span className="font-mono font-bold text-sm text-primary">{ticker}</span>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden sm:inline">W: {width}%</span>
            <input
              type="range" min={30} max={100} step={5} value={width}
              onChange={e => {
                const v = Number(e.target.value);
                setWidth(v);
                notify({ width: v });
              }}
              className="w-16 h-1 accent-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden sm:inline">H: {height}px</span>
            <input
              type="range" min={200} max={700} step={20} value={height}
              onChange={e => {
                const h = Number(e.target.value);
                setHeight(h);
                notify({ height: h });
              }}
              className="w-16 h-1 accent-primary"
            />
          </div>
          <button
            onClick={() => setShowControls(v => !v)}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            {showControls ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-loss" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden mx-auto"
        style={{ width: `${width}%`, height: `${height}px` }}
      >
        <TradingViewWidget ticker={ticker} containerHeight={height} />
      </div>
    </div>
  );
}