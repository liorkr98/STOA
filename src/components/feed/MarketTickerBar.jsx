import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const TICKERS = [
  { symbol: "^GSPC",    label: "S&P 500" },
  { symbol: "^NDX",     label: "Nasdaq 100" },
  { symbol: "^DJI",     label: "Dow Jones" },
  { symbol: "^RUT",     label: "Russell 2000" },
  { symbol: "BTC-USD",  label: "Bitcoin" },
  { symbol: "ETH-USD",  label: "Ethereum" },
  { symbol: "GC=F",     label: "Gold" },
  { symbol: "CL=F",     label: "WTI Oil" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "DX-Y.NYB", label: "DXY" },
];

function fmt(price, symbol) {
  if (price == null) return "—";
  if (symbol === "EURUSD=X") return price.toFixed(4);
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(2);
}

// Sparkline color comes from the parent via `currentColor`, which lets us
// drive it from text-gain / text-loss tokens instead of inlining hex.
function Sparkline({ closes }) {
  if (!closes || closes.length < 4) return null;
  const W = 52, H = 20, pad = 1;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes.map((v, i) => {
    const x = pad + (i / (closes.length - 1)) * (W - pad * 2);
    const y = (H - pad) - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const fillId = `sf-${Math.random().toString(36).slice(2)}`;
  const lastPt = closes.map((v, i) => ({
    x: pad + (i / (closes.length - 1)) * (W - pad * 2),
    y: (H - pad) - ((v - min) / range) * (H - pad * 2),
  }));
  const fillPath = `M ${lastPt[0].x.toFixed(1)},${H} ` +
    lastPt.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L ${lastPt[lastPt.length - 1].x.toFixed(1)},${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block shrink-0">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${fillId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TickerItem({ item }) {
  const isUp = (item.change ?? 0) >= 0;
  return (
    <div className="flex items-center gap-2.5 px-5 border-r border-border/30 shrink-0 h-11">
      <div className="flex flex-col justify-center leading-none">
        <span className="text-[11px] font-medium text-foreground">{item.label}</span>
        {item.price != null && (
          <span className="text-[10px] text-muted-foreground mt-0.5 font-display">
            {fmt(item.price, item.symbol)}
          </span>
        )}
      </div>
      <span className={`shrink-0 inline-flex items-center gap-1 ${isUp ? "text-gain" : "text-loss"}`}>
        {item.change != null && (
          <span className="text-[10px] font-medium font-display">
            {isUp ? "+" : ""}{item.change.toFixed(2)}%
          </span>
        )}
        <Sparkline closes={item.closes} />
      </span>
    </div>
  );
}

export default function MarketTickerBar() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const symbols = TICKERS.map(t => t.symbol).join(",");

    base44.functions.invoke("proxyFetch", {
      url: `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=5m`,
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then(res => {
      const results = res.data?.spark?.result || [];
      const parsed = TICKERS.map(ticker => {
        const found = results.find(r => r.symbol === ticker.symbol);
        const resp = found?.response?.[0];
        const meta = resp?.meta;
        const raw = resp?.indicators?.quote?.[0]?.close || [];
        const closes = raw.filter(v => v != null);
        const price = meta?.regularMarketPrice ?? null;
        const prev = meta?.chartPreviousClose ?? null;
        const change = price != null && prev != null && prev !== 0
          ? ((price - prev) / prev) * 100
          : null;
        return { ...ticker, price, change, closes };
      });
      setItems(parsed);
      setLoaded(true);
    }).catch(() => {
      // Fallback: show tickers without data
      setItems(TICKERS.map(t => ({ ...t, price: null, change: null, closes: [] })));
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="border-b border-border bg-card/80 h-11 flex items-center gap-6 px-4 overflow-hidden">
        {TICKERS.map(t => (
          <div key={t.symbol} className="flex items-center gap-2 shrink-0 animate-pulse">
            <div className="h-3 w-14 bg-muted rounded-tag" />
            <div className="h-3 w-8 bg-muted/60 rounded-tag" />
          </div>
        ))}
      </div>
    );
  }

  // Duplicate list for seamless infinite scroll
  const loop = [...items, ...items];
  const totalItems = items.length;
  // Estimate width: ~160px per item
  const halfWidth = totalItems * 160;

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-sm overflow-hidden select-none">
      <div
        className="flex"
        style={{
          width: `${halfWidth * 2}px`,
          animation: `ticker-marquee ${totalItems * 4}s linear infinite`,
        }}
      >
        {loop.map((item, idx) => (
          <TickerItem key={`${item.symbol}-${idx}`} item={item} />
        ))}
      </div>
      <style>{`
        @keyframes ticker-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${halfWidth}px); }
        }
      `}</style>
    </div>
  );
}
