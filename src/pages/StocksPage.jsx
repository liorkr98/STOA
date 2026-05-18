import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, X, TrendingUp, TrendingDown, RefreshCw, Plus, BarChart3, Zap } from "lucide-react";
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

async function fetchIndexes() {
  const TICKERS = ["SPY", "QQQ", "DIA", "^VIX"];
  const results = await Promise.allSettled(
    TICKERS.map(async sym => {
      const r = await base44.functions.invoke("getStockData", { ticker: sym });
      const d = r?.data || r;
      return {
        symbol: sym === "^VIX" ? "VIX" : sym,
        price:  d?.price ?? d?.regularMarketPrice ?? null,
        change: d?.regularMarketChangePercent ?? d?.changePercent ?? null,
      };
    })
  );
  return results.filter(r => r.status === "fulfilled" && r.value.price != null).map(r => r.value);
}

async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  // Hit Yahoo's chart endpoint directly (via proxyFetch) — same source the
  // ticker detail page uses (lib/stockData.fetchQuote). Previously the
  // watchlist went through the cached getStockData backend function while
  // the detail page hit Yahoo fresh, which is why the same ticker could
  // show -26.49% in the watchlist and -12.20% on its detail page.
  const results = await Promise.allSettled(
    symbols.map(async sym => {
      const r = await base44.functions.invoke("proxyFetch", {
        url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const meta = r?.data?.chart?.result?.[0]?.meta || {};
      const price = meta.regularMarketPrice;
      const prev  = meta.chartPreviousClose;
      const changePct = (price != null && prev) ? ((price - prev) / prev) * 100 : null;
      return {
        symbol: sym,
        name:   meta.longName || meta.shortName || sym,
        price,
        change: changePct,
        volume: meta.regularMarketVolume,
        mktCap: meta.marketCap, // chart endpoint doesn't expose this; null is ok
      };
    })
  );
  return results.filter(r => r.status === "fulfilled" && r.value.price != null).map(r => r.value);
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
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick?.()}
 className={`cursor-pointer bg-card border rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-md ${
          isWatched ? "border-amber-200 bg-amber-50/20" : "border-border hover:border-primary/30"
        }`}
      >
 <div className="flex items-start justify-between mb-2">
          <div>
 <span className="font-display font-medium text-sm tracking-wide">{stock.symbol}</span>
 {isWatched && <span className="ml-1.5 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-tag">Watched</span>}
          </div>
 <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-medium">{stock.exchange}</span>
        </div>
 <p className="text-[11px] text-muted-foreground truncate mb-3 leading-snug">{stock.name}</p>
        {stock.price != null ? (
 <div className="flex items-center justify-between">
 <p className="text-base font-medium tabular-nums">${Number(stock.price).toFixed(2)}</p>
            {stock.change != null && (
 <span className={`text-[11px] font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-tag ${isUp ? "text-green-700 bg-green-50 border border-green-100" : "text-red-600 bg-red-50 border border-red-100"}`}>
 {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {isUp ? "+" : ""}{Number(stock.change).toFixed(2)}%
              </span>
            )}
          </div>
        ) : (
 <div className="h-6 flex items-center">
 <span className="text-xs text-muted-foreground italic">No price</span>
          </div>
        )}
        {fmtCap(stock.mktCap) && (
 <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
 <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Mkt Cap</span>
 <span className="text-xs font-medium text-foreground tabular-nums">{fmtCap(stock.mktCap)}</span>
          </div>
        )}
      </div>
      {/* Star button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleWatch(stock.symbol, stock.name); }}
 className={`absolute top-3 right-3 transition-all p-1.5 rounded-full backdrop-blur-sm border ${
          isWatched
            ? "opacity-100 text-amber-500 bg-amber-50 border-amber-200 "
            : "opacity-0 group-hover:opacity-100 text-muted-foreground bg-card/80 border-transparent hover:border-amber-200 hover:text-amber-500"
        }`}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
 <Star className={`w-3.5 h-3.5 ${isWatched ? "fill-amber-500" : ""}`} />
      </button>
    </div>
  );
}

// ── Watchlist row ────────────────────────────────────────────────────────────
function WatchlistRow({ stock, onRemove, onClick, isLoading }) {
  const isUp = (stock.change ?? 0) >= 0;
  const hasPrice = stock.price != null;
  return (
    <div
      onClick={onClick}
 className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-2xl hover:border-primary/30 hover: cursor-pointer transition-all group"
    >
 <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0A1A3F, #1E3A8A)" }}>
 <span className="text-[10px] font-medium text-white font-display">{stock.symbol?.slice(0, 2)}</span>
      </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-display font-medium text-sm">{stock.symbol}</span>
 <span className="text-xs text-muted-foreground truncate hidden sm:block">{stock.name}</span>
        </div>
      </div>
      {hasPrice ? (
        <>
 <span className="text-sm font-medium tabular-nums">${Number(stock.price).toFixed(2)}</span>
          {fmtCap(stock.mktCap) && (
 <span className="hidden md:inline text-[11px] font-medium text-muted-foreground tabular-nums" title="Market capitalization">
              {fmtCap(stock.mktCap)}
            </span>
          )}
 <span className={`text-xs font-medium w-16 text-right flex items-center justify-end gap-0.5 px-2 py-0.5 rounded-tag ${isUp ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
 {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isUp ? "+" : ""}{Number(stock.change).toFixed(2)}%
          </span>
        </>
      ) : isLoading ? (
 <span className="text-xs text-muted-foreground italic">Loading…</span>
      ) : (
 <span className="text-xs text-muted-foreground">—</span>
      )}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(stock.symbol); }}
 className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50"
      >
 <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function StocksPage() {
  const navigate = useNavigate();

  const [watchlist,       setWatchlist]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); }
    catch { return []; }
  });
  const [watchlistData,   setWatchlistData]   = useState([]);
  const [watchlistLoading,setWatchlistLoading]= useState(false);
  const [addInput,        setAddInput]        = useState("");
  const [showAddInput,    setShowAddInput]    = useState(false);

  const [topStocks,       setTopStocks]       = useState([]);
  const [searchResults,   setSearchResults]   = useState(null);
  const [search,          setSearch]          = useState("");
  const [exchange,        setExchange]        = useState("ALL");
  const [loading,         setLoading]         = useState(true);
  const [searching,       setSearching]       = useState(false);
  const [page,            setPage]            = useState(0);
  const [indexQuotes,     setIndexQuotes]     = useState([]);
  const debounceRef = useRef(null);

  const saveWatchlist = useCallback((list) => {
    setWatchlist(list);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
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

  const removeFromWatchlist = useCallback((symbol) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.symbol !== symbol);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      toast.success(`${symbol} removed`);
      return next;
    });
  }, []);

  const handleAddManual = async () => {
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    if (watchlist.find(w => w.symbol === sym)) { toast.info(`${sym} already in watchlist`); return; }
    setWatchlist(prev => {
      const next = [...prev, { symbol: sym, name: sym }];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`${sym} added to watchlist`);
    setAddInput("");
    setShowAddInput(false);
  };

  const refreshWatchlist = useCallback(async () => {
    if (!watchlist.length) { setWatchlistData([]); return; }
    setWatchlistLoading(true);
    try {
      const data = await fetchQuotes(watchlist.map(w => w.symbol));
      setWatchlistData(data);
    } catch {}
    finally { setWatchlistLoading(false); }
  }, [watchlist]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  useEffect(() => {
    fetchTopStocks().then(setTopStocks).finally(() => setLoading(false));
    fetchIndexes().then(setIndexQuotes).catch(() => {});
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

  const sourceList  = searchResults !== null ? searchResults : topStocks;
  const filtered    = sourceList.filter(s => exchange === "ALL" || (s.exchange || "").toUpperCase().includes(exchange));
  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const isLoading   = loading || searching;
  const watchedSet  = new Set(watchlist.map(w => w.symbol));

  return (
 <div className="max-w-7xl mx-auto px-4 py-8 pb-16">

      {/* ── Dark navy hero ── */}
 <div className="rounded-2xl p-7 mb-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1A3F 0%, #1E3A8A 100%)" }}>
 <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.13) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
 <div className="relative z-10">
 <div className="flex items-center gap-2 mb-4">
 <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
 <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/50">Live Market Data</span>
          </div>
 <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
 <span className="eyebrow" style={{ color: "hsl(var(--accent))" }}>Markets</span>
 <h1 className="text-3xl font-medium text-white mt-1.5 tracking-tight">US Stock Market</h1>
 <p className="text-white/50 text-sm mt-1">Most active stocks · Star any ticker to track live prices</p>
            </div>
            {/* Live index tiles */}
            {indexQuotes.length > 0 && (
 <div className="flex gap-3 flex-wrap">
                {indexQuotes.map(q => {
                  const up = (q.change ?? 0) >= 0;
                  return (
 <div key={q.symbol} className="rounded-xl px-4 py-2.5 border border-white/10 bg-white/5 min-w-[80px]">
 <p className="text-[10px] font-medium uppercase tracking-wide text-white/40 mb-0.5">{q.symbol}</p>
 <p className="text-base font-medium text-white tabular-nums">
                        {q.symbol === "VIX" ? q.price?.toFixed(2) : `$${q.price?.toFixed(2)}`}
                      </p>
 <p className={`text-[11px] font-medium flex items-center gap-0.5 mt-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
 {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {up ? "+" : ""}{q.change?.toFixed(2)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Watchlist ── */}
 <div className="mb-8">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(42 96% 45% / 0.12)" }}>
 <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
 <h2 className="font-medium text-sm leading-tight">My Watchlist</h2>
 <span className="text-[11px] text-muted-foreground">{watchlist.length} stocks tracked</span>
            </div>
          </div>
 <div className="flex items-center gap-2">
            {watchlist.length > 0 && (
              <button
                onClick={refreshWatchlist}
                disabled={watchlistLoading}
 className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                title="Refresh prices"
              >
 <RefreshCw className={`w-3.5 h-3.5 ${watchlistLoading ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={() => setShowAddInput(v => !v)}
 className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all"
              style={{ borderColor: "hsl(var(--accent)/0.4)", color: "hsl(var(--accent))", background: "hsl(var(--accent)/0.08)" }}
            >
 <Plus className="w-3 h-3" /> Add ticker
            </button>
          </div>
        </div>

        {showAddInput && (
 <div className="flex gap-2 mb-4">
            <Input
              value={addInput}
              onChange={e => setAddInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleAddManual()}
              placeholder="e.g. NVDA, AAPL, BTC-USD"
 className="max-w-xs font-display text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleAddManual} disabled={!addInput.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddInput(false); setAddInput(""); }}>Cancel</Button>
          </div>
        )}

        {watchlist.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-border p-8 text-center" style={{ background: "linear-gradient(135deg, hsl(42 96% 45% / 0.03), transparent)" }}>
 <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(42 96% 45% / 0.1)" }}>
 <Star className="w-6 h-6 text-amber-500" />
            </div>
 <p className="text-sm font-medium text-foreground mb-1">Your watchlist is empty</p>
 <p className="text-xs text-muted-foreground">Star any stock below or type a ticker above to track it</p>
          </div>
        ) : watchlistLoading && watchlistData.length === 0 ? (
 <div className="space-y-2">
 {watchlist.slice(0, 4).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
          </div>
        ) : (
 <div className="space-y-2">
            {watchlist.map(w => {
              const live = watchlistData.find(d => d.symbol === w.symbol);
              return (
                <WatchlistRow
                  key={w.symbol}
                  stock={live || w}
                  isLoading={watchlistLoading && !live}
                  onRemove={removeFromWatchlist}
                  onClick={() => navigate(`/stock?ticker=${w.symbol}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Market section header ── */}
 <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
 <h2 className="font-medium text-sm flex items-center gap-2">
 <BarChart3 className="w-4 h-4 text-primary" />
            {loading
              ? "Loading stocks..."
              : searchResults !== null
                ? `${filtered.length} results for "${search}"`
                : "Most Active Stocks"}
          </h2>
          {!loading && searchResults === null && (
 <p className="text-[11px] text-muted-foreground mt-0.5">Ranked by volume · Updated in real time</p>
          )}
        </div>
        {/* Search + Exchange filters */}
 <div className="flex gap-2 flex-wrap">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ticker or company…"
 className="pl-9 h-9 text-sm w-52"
            />
          </div>
 <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl border border-border">
            {["ALL", "NYSE", "NASDAQ", "AMEX"].map(ex => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
 className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  exchange === ex
                    ? "text-white "
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={exchange === ex ? { background: "linear-gradient(135deg, #0A1A3F, #1E3A8A)" } : undefined}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock grid */}
      {isLoading ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
 {Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : paginated.length === 0 ? (
 <div className="text-center py-16 text-sm text-muted-foreground">
          {search ? `No results for "${search}".` : "No stocks found."}
        </div>
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
 <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</Button>
 <span className="text-sm text-muted-foreground tabular-nums">
                Page {page + 1} of {totalPages} · {filtered.length.toLocaleString()} stocks
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
