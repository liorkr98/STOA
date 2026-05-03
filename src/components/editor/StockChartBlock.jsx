import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";
import TradingViewWidget from "@/components/feed/TradingViewWidget";

export default function StockChartBlock({ onDelete }) {
  const [ticker, setTicker] = useState("AAPL");
  const [inputTicker, setInputTicker] = useState("AAPL");

  const applyTicker = () => {
    const t = inputTicker.trim().toUpperCase();
    if (t) setTicker(t);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          value={inputTicker}
          onChange={e => setInputTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && applyTicker()}
          placeholder="TICKER"
          className="w-24 h-8 text-sm font-mono"
        />
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={applyTicker}>
          <Search className="w-3.5 h-3.5" />
        </Button>
        <span className="font-mono font-bold text-sm text-primary ml-1">{ticker}</span>
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-loss ml-auto"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* TradingView chart — same as StockPage */}
      <div className="rounded-lg overflow-hidden" style={{ height: 380 }}>
        <TradingViewWidget ticker={ticker} height={380} />
      </div>
    </div>
  );
}