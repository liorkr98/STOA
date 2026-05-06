import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const INTERVALS = [
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
  { label: "1M", value: "M" },
  { label: "1H", value: "60" },
  { label: "15m", value: "15" },
];

const CHART_STYLES = [
  { label: "Candles", value: "1" },
  { label: "Line", value: "2" },
  { label: "Area", value: "3" },
  { label: "Bars", value: "0" },
];

// Simple heuristic — TradingView will correct if wrong
function guessSymbol(ticker) {
  const t = ticker.toUpperCase();
  // Well-known NASDAQ
  const nasdaq = ["AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","COST","NFLX","AMD","INTC","QCOM","ADBE","TXN","CSCO","PYPL","SBUX","AMAT"];
  if (nasdaq.includes(t)) return `NASDAQ:${t}`;
  return `NYSE:${t}`;
}

// Unique container ID per ticker instance
let _chartCount = 0;

export default function TradingViewWidget({ ticker = "NVDA" }) {
  const [interval, setInterval] = useState("D");
  const [style, setStyle] = useState("1");
  const [containerId] = useState(() => `tv_chart_${++_chartCount}`);
  const scriptRef = useRef(null);

  useEffect(() => {
    const symbol = guessSymbol(ticker);

    // Remove previous script
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }

    // Clear container content
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: false,
      width: "100%",
      height: 550,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "light",
      style,
      locale: "en",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      container_id: containerId,
      studies: [],
      studies_overrides: {},
      overrides: {
        "mainSeriesProperties.showCountdown": false,
        "volumePaneSize": "medium",
      },
      disabled_features: [
        "use_localstorage_for_settings",
        "header_compare",
        "header_screenshot",
        "header_undo_redo",
      ],
      enabled_features: [],
    });

    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      const c = document.getElementById(containerId);
      if (c) c.innerHTML = "";
    };
  }, [ticker, interval, style, containerId]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
        <div className="flex gap-0.5">
          {INTERVALS.map(i => (
            <button key={i.value} onClick={() => setInterval(i.value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${interval === i.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {i.label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex gap-0.5">
          {CHART_STYLES.map(s => (
            <button key={s.value} onClick={() => setStyle(s.value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${style === s.value ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <span className="text-[10px] text-muted-foreground hidden sm:block">Powered by TradingView</span>
        </div>
      </div>

      {/* TradingView embed — height controlled by widget config, not CSS */}
      <div
        id={containerId}
        style={{ width: "100%", height: "550px", minHeight: "550px" }}
      />
    </div>
  );
}