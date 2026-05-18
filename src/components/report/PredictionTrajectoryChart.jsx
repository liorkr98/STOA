import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, Target, AlertTriangle, Loader2, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { describeSource } from "@/lib/priceLockProvider";

// Fetch historical daily candles from Yahoo Finance (free, no key, via proxy).
async function fetchHistorical(ticker, fromUnix, toUnix) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${fromUnix}&period2=${toUnix}&interval=1d`;
  const r = await base44.functions.invoke("proxyFetch", { url, headers: { "User-Agent": "Mozilla/5.0" } });
  const result = r?.data?.chart?.result?.[0];
  if (!result) return [];
  const ts    = result.timestamp || [];
  const close = result.indicators?.quote?.[0]?.close || [];
  return ts.map((t, i) => ({ t: t * 1000, p: close[i] })).filter(d => d.p != null);
}

/**
 * Visual proof of a prediction's trajectory.
 *
 * Renders an SVG line chart of the underlying ticker from the lock moment to
 * either the resolve moment (resolved predictions) or now (active). Overlays
 * the analyst's commitments — lock price, target price, stop loss — as
 * horizontal reference lines so a visitor can see at a glance whether the
 * call is winning, losing, or already played out.
 *
 * Props:
 *   report — the Report entity (must have prediction_lock_price + prediction_lock_time + prediction_ticker)
 *   compact — boolean, smaller height variant for inline use
 */
export default function PredictionTrajectoryChart({ report, compact = false }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(640);

  const ticker      = report?.prediction_ticker || report?.stock_ticker;
  const lockPrice   = report?.prediction_lock_price;
  const lockTime    = report?.prediction_lock_time;
  const targetPrice = report?.prediction_target_price;
  const stopLoss    = report?.prediction_stop_loss;
  const action      = report?.prediction_action; // "Long" | "Short" | "Hold"
  const outcome     = report?.prediction_outcome;
  const resolvedPrice = report?.prediction_resolved_price;
  const resolvedTime  = report?.prediction_resolved_time;
  const lockSource    = report?.prediction_lock_source;

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(Math.max(280, e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ticker || !lockTime) { setLoading(false); return; }
    const fromUnix = Math.floor(new Date(lockTime).getTime() / 1000);
    const toUnix   = Math.floor((resolvedTime ? new Date(resolvedTime).getTime() : Date.now()) / 1000);
    if (toUnix - fromUnix < 86400) {
      // Less than a day — extend by a day so the chart isn't empty
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchHistorical(ticker, fromUnix, toUnix)
      .then(d => setData(d))
      .catch(() => setError("Could not load price history"))
      .finally(() => setLoading(false));
  }, [ticker, lockTime, resolvedTime]);

  if (!ticker || !lockPrice || !lockTime) return null;

  // ── Compute chart geometry ──────────────────────────────────────────────────
  const H = compact ? 160 : 240;
  const padL = 50, padR = 18, padT = 16, padB = 28;
  const innerW = width - padL - padR;
  const innerH = H - padT - padB;

  // Reference lines: lock + target + stop.
  // Target is gold accent (premium achievement signal, not market gain).
  // Stop is muted neutral (not market red — the stop is a discipline marker,
  // not an "incurred loss"). Lock stays warm neutral.
  const refLines = [
    { value: lockPrice,  label: "Lock",  color: "#5C5B58", solid: true,  icon: "🔒" },
    targetPrice && { value: targetPrice, label: "Target", color: "#D4AF37", solid: false },
    stopLoss    && { value: stopLoss,    label: "Stop",   color: "#8A8884", solid: false },
  ].filter(Boolean);

  // Compose Y-axis range — include all data points, lock, target, stop
  const allPrices = [
    ...data.map(d => d.p),
    ...refLines.map(r => r.value),
  ].filter(v => v != null);
  const minY = Math.min(...allPrices);
  const maxY = Math.max(...allPrices);
  const range = (maxY - minY) || 1;
  const padY = range * 0.08;
  const yMin = minY - padY;
  const yMax = maxY + padY;

  const minT = data.length ? data[0].t : new Date(lockTime).getTime();
  const maxT = data.length ? data[data.length - 1].t : Date.now();
  const tRange = (maxT - minT) || 1;

  const xFor = t => padL + ((t - minT) / tRange) * innerW;
  const yFor = p => padT + ((yMax - p) / (yMax - yMin)) * innerH;

  // Build price line path
  const linePath = data.length > 0
    ? data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(d.t).toFixed(1)},${yFor(d.p).toFixed(1)}`).join(" ")
    : "";

  // Area under the line (gradient fill)
  const areaPath = data.length > 0
    ? `${linePath} L${xFor(data[data.length-1].t).toFixed(1)},${padT + innerH} L${xFor(data[0].t).toFixed(1)},${padT + innerH} Z`
    : "";

  // Current/last point
  const lastPoint = data[data.length - 1];
  const currentPrice = resolvedPrice ?? lastPoint?.p ?? lockPrice;

  // P&L vs lock
  const directionMul = action === "Short" ? -1 : 1;
  const pnlPct = lockPrice > 0
    ? ((currentPrice - lockPrice) / lockPrice) * 100 * directionMul
    : 0;
  const isWinning = pnlPct >= 0;

  // Resolved state styling
  const isResolved = !!resolvedTime && outcome && outcome !== "pending";
  const isHit  = outcome === "hit" || outcome === "near";
  const isMiss = outcome === "miss";

  // ── Header strip ────────────────────────────────────────────────────────────
  const actionIcon  = action === "Long" ? TrendingUp : action === "Short" ? TrendingDown : Minus;
  const ActionIcon  = actionIcon;
  const actionColor = action === "Long" ? "#16a34a" : action === "Short" ? "#dc2626" : "#d97706";

  const sourceInfo = describeSource(lockSource);

  const actionToneClass = action === "Long" ? "text-gain" : action === "Short" ? "text-loss" : "text-muted-foreground";

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="font-serif text-[14px] text-foreground">Prediction Trajectory</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className={`font-display font-medium text-sm ${actionToneClass}`}>
            <ActionIcon className="w-3 h-3 inline mb-0.5" /> {action} ${ticker}
          </span>
        </div>

        {isResolved ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-tag flex items-center gap-1 border ${
            isHit  ? "bg-gain/10 text-gain border-gain/20"
            : isMiss? "bg-loss/10 text-loss border-loss/20"
            : "bg-muted text-foreground border-border"
          }`}>
            {isHit ? <CheckCircle2 className="w-3 h-3" /> : isMiss ? <XCircle className="w-3 h-3" /> : null}
            {outcome.toUpperCase()}
          </span>
        ) : (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-tag flex items-center gap-1 border ${
            isWinning ? "bg-gain/10 text-gain border-gain/20" : "bg-loss/10 text-loss border-loss/20"
          }`}>
            <span className="font-display">{isWinning ? "+" : ""}{pnlPct.toFixed(2)}%</span>
            <span className="text-muted-foreground font-normal">live</span>
          </span>
        )}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="px-2 py-2 bg-background">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: H }}>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || data.length === 0 ? (
          <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: H }}>
            <Clock className="w-4 h-4 mr-2" />
            {error || "Price history will populate as time passes."}
          </div>
        ) : (
          <svg width={width} height={H} className="block">
            <defs>
              <linearGradient id={`grad-${ticker}-${lockTime}`} x1="0" y1="0" x2="0" y2="1">
                {/* Price line stays primary-blue per design spec; the winning/losing
                    state is communicated via the P&L pill in the header instead. */}
                <stop offset="0%"  stopColor="#1E3A8A" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y-axis grid lines (5 ticks) */}
            {Array.from({ length: 5 }).map((_, i) => {
              const ratio = i / 4;
              const y = padT + ratio * innerH;
              const val = yMax - ratio * (yMax - yMin);
              return (
                <g key={i}>
                  <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#E8E6E1" strokeWidth="0.5" strokeDasharray="2 3" />
                  <text x={padL - 6} y={y + 3} fill="#8A8884" fontSize="9" textAnchor="end" fontFamily="ui-monospace, monospace">
                    ${val.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* X-axis: lock date and end date */}
            <text x={padL} y={H - 8} fill="#8A8884" fontSize="9" textAnchor="start">
              {format(new Date(lockTime), "MMM d")}
            </text>
            <text x={padL + innerW} y={H - 8} fill="#8A8884" fontSize="9" textAnchor="end">
              {resolvedTime ? format(new Date(resolvedTime), "MMM d") : "Now"}
            </text>

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill={`url(#grad-${ticker}-${lockTime})`} />}

            {/* Price line */}
            {linePath && <path d={linePath} fill="none" stroke="#1E3A8A" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />}

            {/* Reference lines: lock / target / stop */}
            {refLines.map(ref => {
              const y = yFor(ref.value);
              if (y < padT || y > padT + innerH) return null;
              return (
                <g key={ref.label}>
                  <line
                    x1={padL} x2={padL + innerW} y1={y} y2={y}
                    stroke={ref.color}
                    strokeWidth={ref.solid ? "1.5" : "1"}
                    strokeDasharray={ref.solid ? "0" : "4 3"}
                  />
                  <rect x={padL + innerW - 56} y={y - 8} width="54" height="14" rx="3" fill={ref.color} />
                  <text x={padL + innerW - 29} y={y + 2} fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">
                    {ref.label} ${ref.value.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Current price marker */}
            {lastPoint && (
              <g>
                <circle cx={xFor(lastPoint.t)} cy={yFor(lastPoint.p)} r="4" fill="#1E3A8A" stroke="#FAFAFA" strokeWidth="2" />
                <text x={xFor(lastPoint.t) - 8} y={yFor(lastPoint.p) - 8} fill="#1E3A8A" fontSize="10" fontWeight="500" textAnchor="end" fontFamily="ui-monospace, monospace">
                  ${lastPoint.p.toFixed(2)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Footer — provenance + key facts */}
      <div className="px-5 py-3 border-t border-border/60 bg-secondary/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Lock Price</p>
          <p className="font-display font-medium">${lockPrice.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">{format(new Date(lockTime), "MMM d, h:mm a")}</p>
        </div>
        {targetPrice && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Target</p>
            <p className="font-display font-medium text-accent">${targetPrice.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">
              {lockPrice > 0
                ? `${(((targetPrice - lockPrice) / lockPrice) * 100 * directionMul).toFixed(1)}% from lock`
                : ""}
            </p>
          </div>
        )}
        {stopLoss && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Stop Loss</p>
            <p className="font-display font-medium text-muted-foreground">${stopLoss.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Risk floor</p>
          </div>
        )}
        <div className={`p-2 rounded-tag border ${sourceInfo.bg}`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Data Source</p>
          <p className={`text-xs font-medium ${sourceInfo.color}`}>{sourceInfo.label}</p>
          <p className="text-[10px] text-muted-foreground">{sourceInfo.quality}</p>
        </div>
      </div>
    </div>
  );
}
