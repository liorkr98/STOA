import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

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

// ── Dynamic exchange resolution via Yahoo Finance ────────────
const exchangeCache = {};

async function resolveExchangeForTicker(ticker) {
  if (!ticker) return "NASDAQ";
  if (exchangeCache[ticker]) return exchangeCache[ticker];

  try {
    const res = await base44.functions.invoke("proxyFetch", {
      url: `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}?interval=1d&range=1d`,
    });
    const meta = res?.data?.chart?.result?.[0]?.meta;
    if (!meta) return "NASDAQ";

    const exchangeName = meta.fullExchangeName || meta.exchangeName || "";
    const shortExchange = meta.exchange || "";
    let tvExchange = "NASDAQ";

    if (exchangeName.includes("NYSE") && !exchangeName.includes("NASDAQ")) tvExchange = "NYSE";
    else if (exchangeName.includes("NASDAQ")) tvExchange = "NASDAQ";
    else if (exchangeName.includes("AMEX") || exchangeName.includes("American")) tvExchange = "AMEX";
    else if (exchangeName.includes("OTC") || exchangeName.includes("Pink")) tvExchange = "OTC";
    else if (exchangeName.includes("TSX") || exchangeName.includes("Toronto")) tvExchange = "TSX";
    else if (exchangeName.includes("LSE") || exchangeName.includes("London")) tvExchange = "LSE";
    else if (shortExchange === "NYQ" || shortExchange === "NYS") tvExchange = "NYSE";
    else if (shortExchange === "NMS" || shortExchange === "NGM" || shortExchange === "NCM") tvExchange = "NASDAQ";
    else if (shortExchange === "ASE") tvExchange = "AMEX";

    exchangeCache[ticker] = tvExchange;
    return tvExchange;
  } catch {
    return "NASDAQ";
  }
}

// Unique container ID per ticker instance
let _chartCount = 0;

export default function TradingViewWidget({ ticker = "NVDA", containerHeight = 380 }) {
   const [interval, setInterval] = useState("D");
   const [style, setStyle] = useState("1");
   const [containerId] = useState(() => `tv_chart_${++_chartCount}`);
   const scriptRef = useRef(null);
   const [chartHeight, setChartHeight] = useState(containerHeight - 50);

  useEffect(() => {
    setChartHeight(containerHeight - 50);
  }, [containerHeight]);

  useEffect(() => {
    let cancelled = false;

    async function initChart() {
      const exchange = await resolveExchangeForTicker(ticker);
      if (cancelled) return;
      const symbol = `${exchange}:${ticker.toUpperCase()}`;

      // Remove previous script
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      const containerEl = document.getElementById(containerId);
      if (containerEl) containerEl.innerHTML = "";

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: false,
        width: "100%",
        height: chartHeight,
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
        disabled_features: [
          "use_localstorage_for_settings",
          "header_compare",
          "header_screenshot",
          "header_undo_redo",
        ],
        enabled_features: [],
      });

      const containerEl2 = document.getElementById(containerId);
      if (containerEl2) containerEl2.appendChild(script);
      scriptRef.current = script;
    }

    initChart();

    return () => {
      cancelled = true;
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      const c = document.getElementById(containerId);
      if (c) c.innerHTML = "";
    };
  }, [ticker, interval, style, containerId, chartHeight]);

  return (
    <div className="w-full h-full rounded-xl border border-border overflow-hidden bg-card flex flex-col">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40 flex-shrink-0">
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
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
        className="flex-1 overflow-hidden"
      />
    </div>
  );
}