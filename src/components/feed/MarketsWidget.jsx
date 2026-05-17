import React, { useEffect, useRef, useState, useCallback } from "react";
import { Star, RefreshCw, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

const WATCHLIST_KEY = "stoa_watchlist";

async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const results = await Promise.allSettled(
    symbols.map(async sym => {
      const r = await base44.functions.invoke("getStockData", { ticker: sym });
      const d = r?.data || r;
      return {
        symbol: sym,
        name: d?.companyName || d?.shortName || sym,
        price: d?.price ?? d?.regularMarketPrice ?? null,
        change: d?.regularMarketChangePercent ?? d?.changePercent ?? null,
      };
    })
  );
  return results
    .filter(r => r.status === "fulfilled" && r.value.price != null)
    .map(r => r.value);
}

function WatchlistItem({ entry, live }) {
  const ticker = entry.ticker || entry.symbol;
  const isUp = (live?.change ?? 0) >= 0;
  return (
    <Link
      to={`/stock?ticker=${ticker}`}
      className="flex items-center justify-between py-1.5 group hover:bg-secondary/50 rounded px-1 transition-colors"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors">
          {ticker}
        </span>
        {entry.name && entry.name !== ticker && (
          <span
            className="text-[10px] text-muted-foreground truncate max-w-[110px] whitespace-nowrap"
            title={entry.name}
          >
            {entry.name}
          </span>
        )}
      </div>
      {live?.price != null ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold tabular-nums">${live.price.toFixed(2)}</span>
          <span className={`text-[10px] font-semibold tabular-nums flex items-center gap-0.5 ${isUp ? "text-green-600" : "text-red-500"}`}>
            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isUp ? "+" : ""}{live.change?.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground">—</span>
      )}
    </Link>
  );
}

export default function MarketsWidget() {
  const containerRef = useRef(null);
  const [watchlist, setWatchlist] = useState([]);
  const [watchData, setWatchData] = useState([]);
  const [wlLoading, setWlLoading] = useState(false);

  // Read watchlist from localStorage (and listen for storage changes from other tabs)
  useEffect(() => {
    const read = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
        setWatchlist(stored);
      } catch {}
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (!watchlist.length) { setWatchData([]); return; }
    setWlLoading(true);
    try {
      const symbols = watchlist.map(w => w.ticker || w.symbol).filter(Boolean);
      const data = await fetchQuotes(symbols);
      setWatchData(data);
    } catch {}
    finally { setWlLoading(false); }
  }, [watchlist]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  // TradingView market overview
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "light",
      dateRange: "12M",
      showChart: false,
      locale: "en",
      isTransparent: true,
      showSymbolLogo: false,
      showFloatingTooltip: false,
      width: "100%",
      height: 220,
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
            { s: "FOREXCOM:DJI", d: "Dow Jones" },
          ],
          originalTitle: "Indices",
        },
        {
          title: "Crypto",
          symbols: [
            { s: "BINANCE:BTCUSDT", d: "Bitcoin" },
            { s: "BINANCE:ETHUSDT", d: "Ethereum" },
          ],
          originalTitle: "Crypto",
        },
        {
          title: "Commodities",
          symbols: [
            { s: "TVC:GOLD", d: "Gold" },
            { s: "TVC:USOIL", d: "WTI Oil" },
          ],
          originalTitle: "Commodities",
        },
      ],
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Markets</h3>
      <div ref={containerRef} className="tradingview-widget-container" />

      {/* Watchlist section */}
      {watchlist.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              My Watchlist
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshWatchlist}
                disabled={wlLoading}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh prices"
              >
                <RefreshCw className={`w-3 h-3 ${wlLoading ? "animate-spin" : ""}`} />
              </button>
              <Link to="/stocks" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                Edit <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          <div className="space-y-0.5">
            {watchlist.map(entry => {
              const ticker = entry.ticker || entry.symbol;
              return (
                <WatchlistItem
                  key={ticker}
                  entry={entry}
                  live={watchData.find(d => d.symbol === ticker)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-border">
          <Link
            to="/stocks"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Star className="w-3 h-3" />
            Add stocks to your watchlist
          </Link>
        </div>
      )}
    </div>
  );
}
