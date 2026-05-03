import React, { useState, useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Trash2, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";

const RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"];
const INTERVALS = { "1d": "5m", "5d": "15m", "1mo": "1d", "3mo": "1d", "6mo": "1d", "1y": "1wk", "2y": "1wk", "5y": "1mo" };

export default function StockChartBlock({ onDelete }) {
  const [ticker, setTicker] = useState("AAPL");
  const [inputTicker, setInputTicker] = useState("AAPL");
  const [range, setRange] = useState("3mo");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const fetchData = async (sym, rng) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getStockData", { ticker: sym, range: rng, interval: INTERVALS[rng] });
      setData(res.data);
    } catch (e) {
      setError(e.message || "Failed to load data");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(ticker, range); }, [ticker, range]);

  useEffect(() => {
    if (!chartContainerRef.current || !data?.candles?.length) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const upColor = "#22c55e";
    const downColor = "#ef4444";

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#64748b", fontSize: 11 },
      grid: { vertLines: { color: "rgba(100,116,139,0.1)" }, horzLines: { color: "rgba(100,116,139,0.1)" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: 260,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({ upColor, downColor, borderUpColor: upColor, borderDownColor: downColor, wickUpColor: upColor, wickDownColor: downColor });
    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "volume", color: "#94a3b8" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    candleSeries.setData(data.candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
    volumeSeries.setData(data.candles.map(c => ({ time: c.time, value: c.volume || 0, color: c.close >= c.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)" })));
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    observer.observe(chartContainerRef.current);

    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, [data]);

  const changePercent = data ? ((data.regularMarketPrice - data.previousClose) / data.previousClose) * 100 : null;
  const isUp = changePercent !== null ? changePercent >= 0 : true;

  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Input value={inputTicker} onChange={e => setInputTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && setTicker(inputTicker.trim().toUpperCase())} placeholder="TICKER" className="w-24 h-8 text-sm font-mono" />
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setTicker(inputTicker.trim().toUpperCase())}>
          <Search className="w-3.5 h-3.5" />
        </Button>
        {data && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-mono font-bold text-sm">{data.symbol}</span>
            <span className="font-bold text-sm">${data.regularMarketPrice?.toFixed(2)}</span>
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? "+" : ""}{changePercent?.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">{data.exchangeName}</span>
          </div>
        )}
        {onDelete && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-loss ml-2" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>}
      </div>

      {/* Range selector */}
      <div className="flex gap-1 mb-2">
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)} className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${range === r ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>{r}</button>
        ))}
      </div>

      {/* Chart area */}
      <div className="relative" style={{ height: 260 }}>
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 rounded-lg"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
        {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-loss">⚠️ {error}</div>}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Footer stats */}
      {data && (
        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
          <span>52W H: ${data.fiftyTwoWeekHigh?.toFixed(2)}</span>
          <span>52W L: ${data.fiftyTwoWeekLow?.toFixed(2)}</span>
          <span>Vol: {data.volume ? (data.volume / 1e6).toFixed(1) + "M" : "—"}</span>
        </div>
      )}
    </div>
  );
}