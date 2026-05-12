import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, X, TrendingUp, TrendingDown, RefreshCw, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PAGE_SIZE = 50;
const WATCHLIST_KEY = "stoa_watchlist";

// ── Data fetching ────────────────────────────────────────────────────────────
async function fetchTopStocks() {
  const r = await base44.functions.invoke("proxyFetch", {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=100&formatted=false",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const quotes = r.data?.finance?.result?.[0]?.quotes || [];
  return quotes.map(q => ({
    symbol:   q.symbol,
    name:     q.shortName || q.longName || q.symbol,
    exchange: q.fullExchangeName || q.exchange,
    price:    q.regularMarketPrice,
    change:   q.regularMarketChangePercent,
    volume:   q.regularMarketVolume,
    mktCap:   q.marketCap,
  }));
}

async function searchStocks(query) {
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return (r.data?.quotes || [])
    .filter(q => q.quoteType === "EQUITY")
    .map(q => ({
      symbol:   q.symbol,
      name:     q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
      price:    null,
      change:   null,
    }));
}

async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const syms = symbols.join(",");
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&formatted=false`,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return (r.data?.quoteResponse?.result || []).map(q => ({
    symbol:   q.symbol,
    name:     q.shortName || q.longName || q.symbol,
    exchange: q.fullExchangeName || q.exchange,
    price:    q.regularMarketPrice,
    change:   q.regularMarketChangePercent,
    volume:   q.regularMarketVolume,
    mktCap:   q.marketCap,
  }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtCap(n) {
  if (!n) return null;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

// ── Stock card ───────────────────────────────────────────────────────────────
function StockCard({ stock, isWatched, onToggleWatch, onClick }) {
  const isUp = (stock.change ?? 0) >= 0;
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full bg-card border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-1">
          <span className="font-mono font-bold text-sm">{stock.symbol}</span>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded truncate max-w-[60px]">{stock.exchange}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mb-2">{stock.name}</p>
        {stock.price != null && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">${Number(stock.price).toFixed(2)}</p>
            {stock.change != null && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${isUp ? "text-gain" : "text-loss"}`}>
                {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {isUp ? "+" : ""}{Number(stock.change).toFixed(2)}%
              </span>
            )}
          </div>
        )}
        {fmtCap(stock.mktCap) && (
          <p className="text-[10px] text-muted-foreground mt-1">{fmtCap(stock.mktCap)}</p>
        )}
      </button>
      {/* Watchlist star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatch(stock.symbol, stock.name); }}
        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${isWatched ? "opacity-100 text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star className={`w-3.5 h-3.5 ${isWatched ? "fill-amber-500" : ""}`} />
      </button>
    </div>
  );
}

// ── Watchlist row ────────────────────────────────────────────────────────────
function WatchlistRow({ stock, onRemove, onClick }) {
  const isUp = (stock.change ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl hover:border-primary/40 cursor-pointer transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm">{stock.symbol}</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">{stock.name}</span>
        </div>
      </div>
      {stock.price != null ? (
        <>
          <span className="text-sm font-bold">${Number(stock.price).toFixed(2)}</span>
          <span className={`text-xs font-semibold w-16 text-right flex items-center justify-end gap-0.5 ${isUp ? "text-gain" : "text-loss"}`}>
            {isUp ? "+" : ""}{Number(stock.change).toFixed(2)}%
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Loading…</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(stock.symbol); }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-loss transition-all p-1 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function StocksPage() {
  const navigate = useNavigate();

  // ── Watchlist state ─────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); }
    catch { return []; }
  });
  const [watchlistData, setWatchlistData] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  // ── Market state ────────────────────────────────────────────────────────
  const [topStocks, setTopStocks]         = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [search, setSearch]               = useState("");
  const [exchange, setExchange]           = useState("ALL");
  const [loading, setLoading]             = useState(true);
  const [searching, setSearching]         = useState(false);
  const [page, setPage]                   = useState(0);
  const debounceRef = useRef(null);

  // ── Persist watchlist ───────────────────────────────────────────────────
  const saveWatchlist = useCallback((list) => {
    setWatchlist(list);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  }, []);

  const addToWatchlist = useCallback((symbol, name) => {
    setWatchlist(prev => {
      if (prev.find(w => w.symbol === symbol)) return prev;
      const next = [...prev, { symbol, name }];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      toast.success(`${symbol} added to watchlist`);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.symbol !== symbol);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      toast.success(`${symbol} removed`);
      return next;
    });
  }, []);

  const toggleWatch = useCallback((symbol, name) => {
    setWatchlist(prev => {
      const exists = prev.find(w => w.symbol === symbol);
      const next = exists
        ? prev.filter(w => w.symbol !== symbol)
        : [...prev, { symbol, name }];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      toast.success(exists ? `${symbol} removed` : `${symbol} added to watchlist`);
      return next;
    });
  }, []);

  const handleAddManual = async () => {
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    if (watchlist.find(w => w.symbol === sym)) {
      toast.info(`${sym} is already in your watchlist`); return;
    }
    addToWatchlist(sym, sym);
    setAddInput("");
    setShowAddInput(false);
  };

  // ── Fetch watchlist live prices ─────────────────────────────────────────
  const refreshWatchlist = useCallback(async () => {
    if (!watchlist.length) { setWatchlistData([]); return; }
    setWatchlistLoading(true);
    try {
      const data = await fetchQuotes(watchlist.map(w => w.symbol));
      setWatchlistData(data);
    } catch { /* silent */ }
    finally { setWatchlistLoading(false); }
  }, [watchlist]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  // ── Fetch market data ───────────────────────────────────────────────────
  useEffect(() => {
    fetchTopStocks().then(setTopStocks).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(0);
    if (!search.trim()) { setSearchResults(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchStocks(search.trim());
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => { setPage(0); }, [exchange]);

  const sourceList = searchResults !== null ? searchResults : topStocks;
  const filtered   = sourceList.filter(s =>
    exchange === "ALL" || (s.exchange || "").toUpperCase().includes(exchange)
  );
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const isLoading  = loading || searching;
  const watchedSet = new Set(watchlist.map(w => w.symbol));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Watchlist ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              My Watchlist
              {watchlist.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">({watchlist.length})</span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {watchlist.length > 0 && (
              <button
                onClick={refreshWatchlist}
                disabled={watchlistLoading}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${watchlistLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
            <button
              onClick={() => setShowAddInput(v => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/60 px-2.5 py-1 rounded-lg transition-all"
            >
              <Plus className="w-3 h-3" /> Add ticker
            </button>
          </div>
        </div>

        {/* Manual add input */}
        {showAddInput && (
          <div className="flex gap-2 mb-3">
            <Input
              value={addInput}
              onChange={e => setAddInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleAddManual()}
              placeholder="e.g. NVDA, AAPL, BTC-USD"
              className="max-w-xs font-mono text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleAddManual} disabled={!addInput.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddInput(false); setAddInput(""); }}>Cancel</Button>
          </div>
        )}

        {watchlist.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-6 text-center">
            <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground/70">Star any stock below or type a ticker to add it</p>
          </div>
        ) : watchlistLoading && watchlistData.length === 0 ? (
          <div className="space-y-2">
            {watchlist.slice(0, 4).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-1.5">
            {watchlist.map(w => {
              const live = watchlistData.find(d => d.symbol === w.symbol);
              return (
                <WatchlistRow
                  key={w.symbol}
                  stock={live || w}
                  onRemove={removeFromWatchlist}
                  onClick={() => navigate(`/stock?ticker=${w.symbol}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Market ── */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">US Stock Market</h1>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading stocks..."
            : searchResults !== null
              ? `${filtered.length} results for "${search}"`
              : "Most active US stocks · Star any ticker to add to your watchlist"}
        </p>
      </div>

      {/* Search + Exchange filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker or company name..."
            className="pl-9"
          />
        </div>
        {["ALL", "NYSE", "NASDAQ", "AMEX"].map(ex => (
          <button
            key={ex}
            onClick={() => setExchange(ex)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              exchange === ex
                ? "bg-primary text-white border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Stock grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : paginated.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {search ? `No results for "${search}".` : "No stocks found."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {paginated.map(stock => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                isWatched={watchedSet.has(stock.symbol)}
                onToggleWatch={toggleWatch}
                onClick={() => navigate(`/stock?ticker=${stock.symbol}`)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {filtered.length.toLocaleString()} results
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
