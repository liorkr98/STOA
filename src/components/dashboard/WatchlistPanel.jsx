import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, X, TrendingUp, TrendingDown, Minus, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "stoa_watchlist";

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveWatchlist(tickers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
}

function PriceRow({ ticker, reports, onRemove }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getStockData", { ticker });
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [ticker]);

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
      <div className="w-16 shrink-0">
        <Link to={`/stock/${ticker}`} className="font-mono font-bold text-sm text-primary hover:underline">
          {ticker}
        </Link>
      </div>

      {/* Price */}
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

      {/* Related reports */}
      {relatedReports.length > 0 && (
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            {relatedReports.slice(0, 2).map(r => (
              <Link key={r.id} to={`/report?id=${r.id}`}
                className="text-[10px] text-primary hover:underline border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded-full max-w-[100px] truncate block"
                title={r.title}>
                {r.title?.slice(0, 18)}{r.title?.length > 18 ? "…" : ""}
              </Link>
            ))}
            {relatedReports.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{relatedReports.length - 2}</span>
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
  const [tickers, setTickers] = useState(loadWatchlist);
  const [input, setInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const addTicker = () => {
    const t = input.trim().toUpperCase().replace(/[^A-Z.]/g, "");
    if (!t || tickers.includes(t)) { setInput(""); return; }
    const next = [...tickers, t];
    setTickers(next);
    saveWatchlist(next);
    setInput("");
  };

  const removeTicker = (t) => {
    const next = tickers.filter(x => x !== t);
    setTickers(next);
    saveWatchlist(next);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Watchlist</h2>
          <span className="text-xs text-muted-foreground">{tickers.length} tickers</span>
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Refresh prices">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add ticker */}
      <div className="flex gap-2 mb-3">
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

      {tickers.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Add tickers to track live prices and link to your reports.</p>
        </div>
      ) : (
        <div key={refreshKey}>
          {tickers.map(ticker => (
            <PriceRow key={ticker + refreshKey} ticker={ticker} reports={reports} onRemove={removeTicker} />
          ))}
        </div>
      )}
    </div>
  );
}