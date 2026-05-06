import { useEffect, useRef, useState } from "react";

const EXCHANGE_MAP = {
  NMS: "NASDAQ", NYQ: "NYSE", NGM: "NASDAQ", ASE: "AMEX",
  NASDAQ: "NASDAQ", NYSE: "NYSE", AMEX: "AMEX",
  "NasdaqGS": "NASDAQ", "NasdaqCM": "NASDAQ", "NasdaqNM": "NASDAQ",
  "NASDAQ Global Select Market": "NASDAQ",
  "New York Stock Exchange": "NYSE",
  "NYSE American": "AMEX",
};

const INTERVALS = [
  { label: "1D", val: "D" },
  { label: "1W", val: "W" },
  { label: "1M", val: "M" },
  { label: "3M", val: "3M" },
  { label: "1Y", val: "12M" },
  { label: "5Y", val: "60M" },
];

let chartSeq = 0;

export default function StockChart({ ticker, exchange }) {
  const containerRef = useRef(null);
  const widgetRef    = useRef(null);
  const [interval, setInterval] = useState("D");
  const [containerId] = useState(() => `tv_chart_${++chartSeq}`);

  const ex = EXCHANGE_MAP[exchange] || "NASDAQ";
  const symbol = `${ex}:${ticker}`;

  useEffect(() => {
    function init() {
      if (!containerRef.current || !window.TradingView) return;
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch (e) {}
        widgetRef.current = null;
      }
      containerRef.current.innerHTML = "";

      widgetRef.current = new window.TradingView.widget({
        autosize:   false,
        width:      "100%",
        height:     580,
        symbol:     symbol,
        interval:   interval,
        timezone:   "Etc/UTC",
        theme:      "light",
        style:      "1",
        locale:     "en",
        studies:    [],
        hide_top_toolbar:    false,
        hide_side_toolbar:   false,
        allow_symbol_change: false,
        enable_publishing:   false,
        disabled_features: [
          "header_compare",
          "header_screenshot",
          "use_localstorage_for_settings",
        ],
        enabled_features: [],
        overrides: { "volumePaneSize": "medium" },
        container_id: containerId,
      });
    }

    if (window.TradingView) {
      init();
    } else {
      const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.onload = init;
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", init);
      }
    }

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch (e) {}
        widgetRef.current = null;
      }
    };
  }, [symbol, interval, containerId]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* interval toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-secondary/30">
        {INTERVALS.map(i => (
          <button
            key={i.val}
            onClick={() => setInterval(i.val)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              interval === i.val
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {i.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">Powered by TradingView</span>
      </div>
      <div
        ref={containerRef}
        id={containerId}
        style={{ width: "100%", height: 580 }}
      />
    </div>
  );
}