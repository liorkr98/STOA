import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import TradingViewWidget from "@/components/feed/TradingViewWidget";

export default function StockChartBlock({ onDelete }) {
  const [ticker, setTicker] = useState("AAPL");
  const [inputTicker, setInputTicker] = useState("AAPL");
  const [height, setHeight] = useState(380);
  const [showControls, setShowControls] = useState(true);

  const applyTicker = () => {
    const t = inputTicker.trim().toUpperCase();
    if (t) setTicker(t);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-2">
      {/* Header bar */}
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

        <div className="ml-auto flex items-center gap-2">
          {/* Height slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Height: {height}px</span>
            <input
              type="range"
              min={200}
              max={700}
              step={20}
              value={height}
              onChange={e => setHeight(Number(e.target.value))}
              className="w-20 h-1 accent-primary"
            />
          </div>
          <button
            onClick={() => setShowControls(v => !v)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            title={showControls ? "Hide controls" : "Show controls"}
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

      <div className="rounded-lg overflow-hidden" style={{ height }}>
        <TradingViewWidget ticker={ticker} height={height} showControls={showControls} />
      </div>
    </div>
  );
}