import React, { useState, useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { MOCK_STOCKS } from "@/lib/mockData";

const RANGES = ["1mo", "3mo", "6mo", "1y"];

// Generate mock candlestick data for a ticker
function generateMockCandles(ticker, days = 90) {
  const stock = MOCK_STOCKS[ticker] || { price: 100, changePercent: 0 };
  const candles = [];
  let price = stock.price * 0.85;
  const now = Math.floor(Date.now() / 1000);
  for (let i = days; i >= 0; i--) {
    const time = now - i * 86400;
    const change = (Math.random() - 0.48) * price * 0.025;
    const open = price;
    const close = Math.max(1, price + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    candles.push({ time, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume: Math.floor(Math.random() * 50e6 + 10e6) });
    price = close;
  }
  return candles;
}

export default function StockChartBlock({ onDelete }) {
  const [ticker, setTicker] = useState("AAPL");
  const [inputTicker, setInputTicker] = useState("AAPL");
  const [range, setRange] = useState("3mo");
  const [loading, setLoading] = useState(false);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const rangeDays = { "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365 };

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const candles = generateMockCandles(ticker, rangeDays[range] || 90);
    const stock = MOCK_STOCKS[ticker] || {};
    const isUp = (stock.changePercent || 0) >= 0;
    const upColor = "#22c55e";
    const downColor = "#ef4444";

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#64748b", fontSize: 11 },
      grid: { vertLines: { color: "rgba(100,116,139,0.1)" }, horzLines: { color: "rgba(100,116,139,0.1)" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      width: chartContainerRef.current.clientWidth,
      height: 220,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({ upColor, downColor, borderUpColor: upColor, borderDownColor: downColor, wickUpColor: upColor, wickDownColor: downColor });
    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "volume", color: "#94a3b8" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    candleSeries.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
    volumeSeries.setData(candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)" })));
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    observer.observe(chartContainerRef.current);
    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, [ticker, range]);

  const stock = MOCK_STOCKS[ticker];
  const isUp = stock ? stock.changePercent >= 0 : true;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Input
          value={inputTicker}
          onChange={e => setInputTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && setTicker(inputTicker.trim())}
          placeholder="TICKER"
          className="w-24 h-8 text-sm font-mono"
        />
        {stock && (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm">{ticker}</span>
            <span className="text-sm">${stock.price.toFixed(2)}</span>
            {isUp ? <TrendingUp className="w-3.5 h-3.5 text-gain" /> : <TrendingDown className="w-3.5 h-3.5 text-loss" />}
            <span className={`text-xs font-medium ${isUp ? "text-gain" : "text-loss"}`}>
              {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${range === r ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >{r}</button>
          ))}
          {onDelete && <button onClick={onDelete} className="ml-2 text-muted-foreground hover:text-loss"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}