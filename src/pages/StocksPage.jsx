import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 50;
const FMP_KEY = "3b47f0bc16a0e7e0a65cfe1b37d4c55e";
const VALID_EXCHANGES = new Set(["NYSE", "NASDAQ", "AMEX", "NYSE American", "NYSE MKT"]);

// Normalize exchange to display name
function normalizeExchange(ex) {
  if (!ex) return null;
  if (ex === "NYSE American" || ex === "NYSE MKT") return "AMEX";
  return ex;
}

export default function StocksPage() {
  const navigate = useNavigate();
  const [allTickers, setAllTickers] = useState([]);
  const [search, setSearch] = useState("");
  const [exchange, setExchange] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch(`https://financialmodelingprep.com/api/v3/stock/list?apikey=${FMP_KEY}`)
      .then(res => res.json())
      .then(data => {
        const usStocks = (Array.isArray(data) ? data : [])
          .filter(s => VALID_EXCHANGES.has(s.exchangeShortName))
          .map(s => ({
            symbol: s.symbol,
            name: s.name,
            exchange: normalizeExchange(s.exchangeShortName),
            price: s.price,
          }));
        setAllTickers(usStocks);
      })
      .catch(err => console.error("FMP stock list error:", err))
      .finally(() => setLoading(false));
  }, []);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, exchange]);

  const baseFiltered = allTickers
    .filter(t => exchange === "ALL" || t.exchange === exchange)
    .filter(t => !search ||
      t.symbol?.includes(search.toUpperCase()) ||
      t.name?.toLowerCase().includes(search.toLowerCase())
    );

  const paginated = baseFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(baseFiltered.length / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">US Stock Market</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading stocks..." : `${allTickers.length.toLocaleString()} stocks across NYSE, NASDAQ & AMEX`}
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

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "NYSE Listed", ex: "NYSE" },
            { label: "NASDAQ Listed", ex: "NASDAQ" },
            { label: "AMEX Listed", ex: "AMEX" },
          ].map(({ label, ex }) => (
            <div key={ex} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {allTickers.filter(t => t.exchange === ex).length.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : paginated.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No stocks found.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {paginated.map(stock => (
              <button key={stock.symbol}
                onClick={() => navigate(`/stock?ticker=${stock.symbol}`)}
                className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-mono font-bold text-sm">{stock.symbol}</span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{stock.exchange}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{stock.name}</p>
                {stock.price != null && (
                  <p className="text-sm font-bold">${Number(stock.price).toFixed(2)}</p>
                )}
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} · {baseFiltered.length.toLocaleString()} results
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>Next →</Button>
          </div>
        </>
      )}
    </div>
  );
}