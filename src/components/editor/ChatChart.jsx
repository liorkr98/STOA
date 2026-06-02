import React, { useState, useEffect, useRef } from "react";
import { Loader2, TrendingUp, TrendingDown, ExternalLink, GripHorizontal } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Timeframe â†’ days mapping
const TF_DAYS = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

async function fetchHistorical(ticker, days) {
  const fromUnix = Math.floor((Date.now() - days * 86400 * 1000) / 1000);
  const toUnix   = Math.floor(Date.now() / 1000);
  const interval = days <= 7 ? "1h" : days <= 30 ? "1d" : "1d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${fromUnix}&period2=${toUnix}&interval=${interval}`;
  const r = await base44.functions.invoke("proxyFetch", { url, headers: { "User-Agent": "Mozilla/5.0" } });
  const result = r?.data?.chart?.result?.[0];
  if (!result) return null;
  const ts = result.timestamp || [];
  const close = result.indicators?.quote?.[0]?.close || [];
  const pts = ts.map((t, i) => ({ t: t * 1000, p: close[i] })).filter(d => d.p != null);
  return {
    points: pts,
    meta:   result.meta || {},
  };
}

/**
 * In-chat chart. Renders when the AI emits a [CHART:TICKER] directive.
 * Pure SVG, no chart library. Fetches daily candles from Yahoo via the
 * existing proxyFetch and draws a compact line chart with header.
 */
export default function ChatChart({ ticker, timeframe = "1M" }) {
  const tf = TF_DAYS[timeframe] ? timeframe : "1M";
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(Math.max(240, e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchHistorical(ticker, TF_DAYS[tf])
      .then(d => {
        if (!d || d.points.length === 0) setError("No data");
        else setData(d);
      })
      .catch(() => setError("Could not load"))
      .finally(() => setLoading(false));
  }, [ticker, tf]);

  const H = 130;
  const padL = 6, padR = 6, padT = 6, padB = 16;
  const innerW = width - padL - padR;
  const innerH = H - padT - padB;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 my-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading chart for ${ticker}â€¦
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 my-2 text-xs text-muted-foreground">
        Could not load chart for ${ticker}.
      </div>
    );
  }

  const pts = data.points;
  const first = pts[0].p;
  const last  = pts[pts.length - 1].p;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = change >= 0;
  const color = isUp ? "#16a34a" : "#dc2626";
  const name = data.meta?.longName || data.meta?.shortName || ticker;

  // Scale
  const prices = pts.map(p => p.p);
  const minY = Math.min(...prices);
  const maxY = Math.max(...prices);
  const pad = (maxY - minY) * 0.1 || 1;
  const yMin = minY - pad, yMax = maxY + pad;
  const minT = pts[0].t, maxT = pts[pts.length - 1].t;
  const tRange = (maxT - minT) || 1;

  const xFor = t => padL + ((t - minT) / tRange) * innerW;
  const yFor = p => padT + ((yMax - p) / (yMax - yMin)) * innerH;

  const linePath = pts.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(d.t).toFixed(1)},${yFor(d.p).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xFor(pts[pts.length - 1].t).toFixed(1)},${padT + innerH} L${xFor(pts[0].t).toFixed(1)},${padT + innerH} Z`;
  const gradId = `chat-grad-${ticker}-${tf}`;

  // Drag-to-report: when the user drags this chart into the report editor,
  // we tell the editor to insert it as a real interactive stockchart block.
  const handleDragStart = (e) => {
    e.dataTransfer.setData("ai-type", "stockchart");
    e.dataTransfer.setData("ai-text", ticker);
    e.dataTransfer.effectAllowed = "copy";
    // Optional: a nicer ghost image showing the ticker
    const ghost = document.createElement("div");
    ghost.textContent = `ðŸ“Š ${ticker}`;
    ghost.style.cssText = "position:absolute;top:-1000px;padding:8px 12px;background:#0f172a;color:white;font:bold 12px ui-monospace;border-radius:8px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 30, 15);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-card border border-border rounded-xl my-2 overflow-hidden hover:border-primary/30 transition-all group cursor-grab active:cursor-grabbing"
      title="Drag to report Â· Click to open full chart"
    >
      {/* Header â€” click navigates, drag uses the parent's listener */}
      <a
        href={`/stock?ticker=${ticker}`}
        onClick={e => e.stopPropagation()}
        className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-extrabold text-sm">${ticker}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{tf}</span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-bold text-sm">${last.toFixed(2)}</p>
          <p className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${isUp ? "text-gain" : "text-loss"}`}>
            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isUp ? "+" : ""}{change.toFixed(2)}%
          </p>
        </div>
      </a>

      {/* SVG chart */}
      <div ref={containerRef} className="px-1">
        <svg width={width} height={H} className="block">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>

      {/* Drag hint footer â€” appears on hover */}
      <div className="px-3 py-1 border-t border-border bg-secondary/30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
          <GripHorizontal className="w-2.5 h-2.5" /> Drag to report
        </span>
        <a href={`/stock?ticker=${ticker}`} onClick={e => e.stopPropagation()} className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
          Open <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
}

