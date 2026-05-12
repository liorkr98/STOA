import React, { useEffect, useRef } from "react";

export default function MarketTickerBar() {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
        { proName: "FOREXCOM:DJI", title: "Dow Jones" },
        { proName: "TVC:VIX", title: "VIX" },
        { proName: "BINANCE:BTCUSDT", title: "BTC" },
        { proName: "BINANCE:ETHUSDT", title: "ETH" },
        { proName: "TVC:GOLD", title: "Gold" },
        { proName: "TVC:TNX", title: "10Y Yield" },
      ],
      showSymbolLogo: false,
      colorTheme: "light",
      isTransparent: true,
      displayMode: "compact",
      locale: "en",
    });

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    ref.current.appendChild(widget);
    ref.current.appendChild(script);
  }, []);

  return (
    <div className="border-b border-border bg-card/70 backdrop-blur-sm">
      <div
        ref={ref}
        className="tradingview-widget-container max-w-7xl mx-auto"
        style={{ height: 46, overflow: "hidden" }}
      />
    </div>
  );
}
