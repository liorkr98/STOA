import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from "@/api/base44Client";

const PAGE_SIZE = 50;

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

export default function StocksPage() {
  const navigate = useNavigate();
  const [topStocks, setTopStocks]       = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [search, setSearch]             = useState("");
  const [exchange, setExchange]         = useState("ALL");
  const [loading, setLoading]           = useState(true);
  const [searching, setSearching]       = useState(false);
  const [page, setPage]                 = useState(0);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchTopStocks()
      .then(setTopStocks)
      .finally(() => setLoading(false));
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
  const filtered = sourceList.filter(s =>
    exchange === "ALL" || (s.exchange || "").toUpperCase().includes(exchange)
  );
  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const isLoading   = loading || searching;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">US Stock Market</h1>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading stocks..."
            : searchResults !== null
              ? `${filtered.length} results for "${search}"`
              : "Most active US stocks · Search for any ticker or company"}
        </p>
      </div>

      {/* Search + Exchange filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker or company name..." className="pl-9" />
        </div>
        {["ALL", "NYSE", "NASDAQ", "AMEX"].map(ex => (
          <button key={ex} onClick={() => setExchange(ex)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              exchange === ex ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}>{ex}</button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : paginated.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {search ? `No results for "${search}".` : "No stocks found."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {paginated.map(stock => {
              const isUp = (stock.change ?? 0) >= 0;
              return (
                <button key={stock.symbol}
                  onClick={() => navigate(`/stock?ticker=${stock.symbol}`)}
                  className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-mono font-bold text-sm">{stock.symbol}</span>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded truncate max-w-[60px]">{stock.exchange}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{stock.name}</p>
                  {stock.price != null && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">${Number(stock.price).toFixed(2)}</p>
                      {stock.change != null && (
                        <span className={`text-[10px] font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
                          {isUp ? "+" : ""}{Number(stock.change).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
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