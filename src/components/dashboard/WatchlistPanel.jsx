import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, X, TrendingUp, TrendingDown, Minus, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "stoa_watchlist";

// Each entry is { ticker, timeframe }
const TIMEFRAMES = [
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "1Y", label: "1Y" },
];

// Map timeframe to Yahoo Finance range/interval params
const TF_PARAMS = {
  "1D": { range: "1d",  interval: "5m"  },
  "1W": { range: "5d",  interval: "1d"  },
  "1M": { range: "1mo", interval: "1d"  },
  "1Y": { range: "1y",  interval: "1mo" },
};

function loadWatchlist() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Support old format (plain string array)
    return raw.map(e => typeof e === "string" ? { ticker: e, timeframe: "1D" } : e);
  } catch { return []; }
}
function saveWatchlist(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function PriceRow({ entry, reports, onRemove, onTimeframeChange }) {
  const { ticker, timeframe } = entry;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    try {
      const { range, interval } = TF_PARAMS[timeframe] || TF_PARAMS["1D"];
      const res = await base44.functions.invoke("proxyFetch", {
        url: `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}?interval=${interval}&range=${range}`,
      });
      const result = res?.data?.chart?.result?.[0];
      const meta = result?.meta;
      if (!meta) { setData(null); return; }

      const closes = (result?.indicators?.quote?.[0]?.close || []).filter(v => v != null);
      const currentPrice = meta.regularMarketPrice ?? closes[closes.length - 1];

      // For 1D: use chartPreviousClose (previous session close) as base
      // For other timeframes: use the first data point in the range
      let basePrice;
      if (timeframe === "1D") {
        basePrice = meta.chartPreviousClose ?? meta.previousClose ?? closes[0];
      } else {
        basePrice = closes[0];
      }

      const changePercent = basePrice && currentPrice ? ((currentPrice - basePrice) / basePrice) * 100 : null;

      setData({
        price: currentPrice,
        changePercent,
        companyName: meta.longName || meta.shortName || ticker,
      });
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [ticker, timeframe]);

  useEffect(() => { fetchPrice(); }, [fetchPrice]);

  const relatedReports = reports.filter(r => {
    const tickers = (r.tickers || "").split(",").map(t => t.trim().toUpperCase());
    return tickers.includes(ticker.toUpperCase()) ||
      (r.title || "").toUpperCase().includes(ticker.toUpperCase()) ||
      (r.prediction_ticker || "").toUpperCase() === ticker.toUpperCase();
  });

  const change = data?.changePercent;
  const isUp = change > 0;
  const isDown = change < 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      {/* Ticker */}
      <div className="w-14 shrink-0">
        <Link to={`/stock/${ticker}`} className="font-mono font-bold text-sm text-primary hover:underline">
          {ticker}
        </Link>
      </div>

      {/* Price + change */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        ) : data?.price ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">${data.price.toFixed(2)}</span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-gain" : isDown ? "text-loss" : "text-muted-foreground"}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No data</span>
        )}
        {data?.companyName && (
          <p className="text-[10px] text-muted-foreground truncate">{data.companyName}</p>
        )}
      </div>

      {/* Timeframe selector */}
      <div className="flex gap-0.5 shrink-0">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(ticker, tf.value)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
              timeframe === tf.value
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Related reports */}
      {relatedReports.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            {relatedReports.slice(0, 1).map(r => (
              <Link key={r.id} to={`/report?id=${r.id}`}
                className="text-[10px] text-primary hover:underline border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded-full max-w-[80px] truncate block"
                title={r.title}>
                {r.title?.slice(0, 14)}{r.title?.length > 14 ? "…" : ""}
              </Link>
            ))}
            {relatedReports.length > 1 && (
              <span className="text-[10px] text-muted-foreground">+{relatedReports.length - 1}</span>
            )}
          </div>
        </div>
      )}

      {/* Remove */}
      <button onClick={() => onRemove(ticker)}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function WatchlistPanel({ reports = [] }) {
  const [entries, setEntries] = useState(loadWatchlist);
  const [input, setInput] = useState("");
  const [selectedTf, setSelectedTf] = useState("1D");
  const [refreshKey, setRefreshKey] = useState(0);

  const addTicker = () => {
    const t = input.trim().toUpperCase().replace(/[^A-Z.]/g, "");
    if (!t || entries.some(e => e.ticker === t)) { setInput(""); return; }
    const next = [...entries, { ticker: t, timeframe: selectedTf }];
    setEntries(next);
    saveWatchlist(next);
    setInput("");
  };

  const removeTicker = (t) => {
    const next = entries.filter(e => e.ticker !== t);
    setEntries(next);
    saveWatchlist(next);
  };

  const changeTimeframe = (t, tf) => {
    const next = entries.map(e => e.ticker === t ? { ...e, timeframe: tf } : e);
    setEntries(next);
    saveWatchlist(next);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Watchlist</h2>
          <span className="text-xs text-muted-foreground">{entries.length} tickers</span>
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Refresh prices">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add ticker + timeframe selection */}
      <div className="flex gap-2 mb-1">
        <Input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && addTicker()}
          placeholder="Add ticker (e.g. NVDA)"
          className="h-8 text-xs font-mono"
        />
        <Button size="sm" className="h-8 px-3 shrink-0 gap-1" onClick={addTicker}>
          <Plus className="w-3.5 h-3.5" />Add
        </Button>
      </div>
      {/* Default timeframe for new additions */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] text-muted-foreground">Show growth:</span>
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            onClick={() => setSelectedTf(tf.value)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all border ${
              selectedTf === tf.value
                ? "bg-primary text-white border-primary"
                : "text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Add tickers to track live prices and link to your reports.</p>
        </div>
      ) : (
        <div key={refreshKey}>
          {entries.map(entry => (
            <PriceRow
              key={entry.ticker + refreshKey}
              entry={entry}
              reports={reports}
              onRemove={removeTicker}
              onTimeframeChange={changeTimeframe}
            />
          ))}
        </div>
      )}
    </div>
  );
}