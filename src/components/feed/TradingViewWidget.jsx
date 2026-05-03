import React, { useEffect, useRef, useState } from "react";

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
  { label: "Heikin Ashi", value: "8" },
];

// Exchange prefixes for common tickers
function resolveSymbol(ticker) {
  const upper = ticker.toUpperCase();
  const NASDAQ = ["NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "GOOG", "TSLA", "AMD", "INTC", "QCOM", "AVGO", "ARM", "PLTR", "COIN", "NFLX", "SHOP", "RIVN"];
  const NYSE = ["JPM", "BAC", "GS", "MS", "WFC", "BRK.B", "XOM", "CVX", "JNJ", "PG", "KO", "DIS"];
  const CRYPTO = ["BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "DOGE", "AVAX"];
  if (NASDAQ.includes(upper)) return `NASDAQ:${upper}`;
  if (NYSE.includes(upper)) return `NYSE:${upper}`;
  if (CRYPTO.includes(upper)) return `BINANCE:${upper}USDT`;
  return `NASDAQ:${upper}`;
}

export default function TradingViewWidget({ ticker = "NVDA", height = 600 }) {
  const containerRef = useRef(null);
  const [interval, setInterval] = useState("D");
  const [style, setStyle] = useState("1");
  const [showDrawing, setShowDrawing] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: resolveSymbol(ticker),
      interval,
      timezone: "Etc/UTC",
      theme: "light",
      style,
      locale: "en",
      allow_symbol_change: true,
      save_image: true,
      hide_side_toolbar: !showDrawing,
      withdateranges: true,
      calendar: false,
      studies: [
        "STD;MACD",
        "STD;RSI",
        "STD;Volume"
      ],
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [ticker, interval, style, showDrawing]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
        {/* Interval */}
        <div className="flex gap-0.5">
          {INTERVALS.map(i => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${interval === i.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {i.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Chart style */}
        <div className="flex gap-0.5">
          {CHART_STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${style === s.value ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1.5 items-center">
          {/* Drawing tools toggle */}
          <button
            onClick={() => setShowDrawing(!showDrawing)}
            className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-all ${showDrawing ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30"}`}
          >
            ✏️ Drawing Tools
          </button>
          <span className="text-[10px] text-muted-foreground hidden sm:block">Powered by TradingView</span>
        </div>
      </div>

      {/* TradingView embed */}
      <div
        className="tradingview-widget-container"
        ref={containerRef}
        style={{ height, width: "100%" }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: "calc(100% - 32px)", width: "100%" }}
        />
      </div>
    </div>
  );
}