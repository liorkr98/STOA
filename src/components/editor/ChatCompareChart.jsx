import React, { useState, useEffect, useRef } from "react";
import { Loader2, TrendingUp, TrendingDown, ExternalLink, GripHorizontal } from "lucide-react";
import { base44 } from "@/api/base44Client";

const TF_DAYS = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

// Distinct colors for up to 4 series, picked for accessibility on white bg
const LINE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea"];

async function fetchSeries(ticker, days) {
  const fromUnix = Math.floor((Date.now() - days * 86400 * 1000) / 1000);
  const toUnix   = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${fromUnix}&period2=${toUnix}&interval=1d`;
  const r = await base44.functions.invoke("proxyFetch", { url, headers: { "User-Agent": "Mozilla/5.0" } });
  const res = r?.data?.chart?.result?.[0];
  if (!res) return null;
  const ts    = res.timestamp || [];
  const close = res.indicators?.quote?.[0]?.close || [];
  const points = ts.map((t, i) => ({ t: t * 1000, p: close[i] })).filter(d => d.p != null);
  if (points.length === 0) return null;
  return { ticker, points, name: res.meta?.shortName || res.meta?.longName || ticker };
}

/**
 * Multi-ticker comparison chart. Each ticker is normalized to its % change
 * from the first close of the period â€” so NVDA at $200 and MSFT at $400 can
 * be compared on the same Y axis (both start at 0%, diverge from there).
 *
 * Used by the AIChat when the model emits a [COMPARE:NVDA,MSFT:3M] directive.
 */
export default function ChatCompareChart({ tickers = [], timeframe = "1M" }) {
  const tf = TF_DAYS[timeframe] ? timeframe : "1M";
  const [series,  setSeries]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(Math.max(260, e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!tickers || tickers.length === 0) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all(tickers.slice(0, 4).map(t => fetchSeries(t, TF_DAYS[tf])))
      .then(results => {
        const valid = results.filter(r => r && r.points.length > 1);
        if (valid.length === 0) setError("No data");
        else setSeries(valid);
      })
      .catch(() => setError("Could not load"))
      .finally(() => setLoading(false));
  }, [tickers.join(","), tf]);

  const H = 170;
  const padL = 30, padR = 6, padT = 8, padB = 22;
  const innerW = width - padL - padR;
  const innerH = H - padT - padB;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 my-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading {tickers.join(" vs ")}â€¦
      </div>
    );
  }
  if (error || series.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 my-2 text-xs text-muted-foreground">
        Could not load chart for {tickers.join(", ")}.
      </div>
    );
  }

  // Normalize each series to % change from its first close, on a common x-axis
  const normalized = series.map(s => {
    const base = s.points[0].p;
    return {
      ticker: s.ticker,
      name:   s.name,
      points: s.points.map(d => ({ t: d.t, pct: ((d.p - base) / base) * 100 })),
      lastPct: ((s.points[s.points.length - 1].p - base) / base) * 100,
      lastPrice: s.points[s.points.length - 1].p,
    };
  });

  // Time domain is the union of all series (some tickers may have fewer points)
  const allTimes = normalized.flatMap(s => s.points.map(p => p.t));
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const tRange = (maxT - minT) || 1;

  // Y domain: include 0% line and pad
  const allPcts = normalized.flatMap(s => s.points.map(p => p.pct));
  const minY = Math.min(0, ...allPcts);
  const maxY = Math.max(0, ...allPcts);
  const pad = (maxY - minY) * 0.1 || 1;
  const yMin = minY - pad, yMax = maxY + pad;

  const xFor = t => padL + ((t - minT) / tRange) * innerW;
  const yFor = pct => padT + ((yMax - pct) / (yMax - yMin)) * innerH;

  // Y-axis ticks (3 lines: top, 0%, bottom)
  const yTicks = [yMax, 0, yMin].filter((v, i, a) => a.indexOf(v) === i);

  // Drag-to-report: emit a SINGLE "comparechart" block that holds both tickers
  // and the timeframe â€” so the editor renders one integrated comparison chart,
  // not one stockchart per ticker. (Previously each ticker was emitted as its
  // own stockchart, which is why exports showed two separate charts.)
  const handleDragStart = (e) => {
    const tickerList = normalized.map(s => s.ticker);
    const compareBlock = {
      type: "comparechart",
      content: tickerList.join(","),
      tickers: tickerList,
      timeframe: tf,
    };
    e.dataTransfer.setData("ai-blocks", JSON.stringify([compareBlock]));
    e.dataTransfer.setData("ai-type", "comparechart");
    e.dataTransfer.setData("ai-text", tickerList.join(","));
    e.dataTransfer.setData("ai-tickers", tickerList.join(","));
    e.dataTransfer.setData("ai-timeframe", tf);
    e.dataTransfer.effectAllowed = "copy";
    const ghost = document.createElement("div");
    ghost.textContent = `ðŸ“Š ${tickerList.join(" + ")} Â· ${tf}`;
    ghost.style.cssText = "position:absolute;top:-1000px;padding:8px 12px;background:#0f172a;color:white;font:bold 12px ui-monospace;border-radius:8px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 30, 15);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="block bg-card border border-border rounded-xl my-2 overflow-hidden group cursor-grab active:cursor-grabbing"
      title="Drag to report Â· Inserts one chart block per ticker"
    >
      {/* Header / legend */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Compare Â· {tf} normalized return
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {normalized.map((s, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const isUp = s.lastPct >= 0;
            return (
              <a
                key={s.ticker}
                href={`/stock?ticker=${s.ticker}`}
                className="flex items-center gap-1.5 hover:underline group"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="font-display font-medium text-xs">${s.ticker}</span>
                <span className={`text-[10px] font-medium ${isUp ? "text-gain" : "text-loss"}`}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5 inline" /> : <TrendingDown className="w-2.5 h-2.5 inline" />}
                  {isUp ? "+" : ""}{s.lastPct.toFixed(2)}%
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* SVG comparison chart */}
      <div ref={containerRef} className="px-1">
        <svg width={width} height={H} className="block">
          {/* Y-axis grid + labels */}
          {yTicks.map((tick, i) => {
            const y = yFor(tick);
            return (
              <g key={i}>
                <line
                  x1={padL} x2={padL + innerW} y1={y} y2={y}
                  stroke={tick === 0 ? "#cbd5e1" : "#e2e8f0"}
                  strokeWidth={tick === 0 ? "1" : "0.5"}
                  strokeDasharray={tick === 0 ? "0" : "2 3"}
                />
                <text x={padL - 4} y={y + 3} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="ui-monospace, monospace">
                  {tick >= 0 ? "+" : ""}{tick.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Each ticker's line */}
          {normalized.map((s, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const path = s.points
              .map((d, j) => `${j === 0 ? "M" : "L"}${xFor(d.t).toFixed(1)},${yFor(d.pct).toFixed(1)}`)
              .join(" ");
            const lastPt = s.points[s.points.length - 1];
            return (
              <g key={s.ticker}>
                <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={xFor(lastPt.t)} cy={yFor(lastPt.pct)} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* X-axis labels: start + end date */}
          <text x={padL} y={H - 6} fill="#94a3b8" fontSize="9" textAnchor="start">
            {new Date(minT).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
          <text x={padL + innerW} y={H - 6} fill="#94a3b8" fontSize="9" textAnchor="end">
            {new Date(maxT).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        </svg>
      </div>

      {/* Drag hint */}
      <div className="px-3 py-1 border-t border-border bg-secondary/30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
          <GripHorizontal className="w-2.5 h-2.5" /> Drag to report Â· inserts one integrated comparison chart
        </span>
      </div>
    </div>
  );
}

