import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getAnalystSlug } from "@/lib/analystSlug";

export default function SearchBar() {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [stocks, setStocks]     = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [reports, setReports]   = useState([]);
  const debounceRef = useRef(null);
  const ref         = useRef(null);
  const navigate    = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setStocks([]); setAnalysts([]); setReports([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = query.toLowerCase();

      // Run all three in parallel
      const [stockData, users, reps] = await Promise.all([
        base44.functions.invoke("proxyFetch", {
          url: `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`,
          headers: { "User-Agent": "Mozilla/5.0" },
        }).then(r => (r.data?.quotes || []).filter(s => s.quoteType === "EQUITY").slice(0, 5)).catch(() => []),
        base44.entities.User.list("-accuracy_score", 50).catch(() => []),
        base44.entities.Report.filter({ status: "published" }, "-created_date", 50).catch(() => []),
      ]);

      setStocks(stockData);
      setAnalysts((users || []).filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      ).slice(0, 3));
      setReports((reps || []).filter(r =>
        (r.title || "").toLowerCase().includes(q) ||
        (Array.isArray(r.tickers) ? r.tickers : (r.tickers || "").split(",").map(t => t.trim()).filter(Boolean))
          .some(t => t.toLowerCase().includes(q))
      ).slice(0, 3));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const hasResults = stocks.length > 0 || analysts.length > 0 || reports.length > 0;
  const go = (path) => { navigate(path); setQuery(""); setOpen(false); };

  return (
    <div ref={ref} className="relative w-full">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search stocks, analysts, reports..."
        className="w-full pl-9 pr-8 py-2 text-sm bg-secondary border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
      />
      {query && (
        <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {open && hasResults && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">

          {stocks.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/50">Stocks</div>
              {stocks.map(s => (
                <button key={s.symbol} onClick={() => go(`/stock?ticker=${s.symbol}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                  <span className="font-mono font-bold text-sm w-14 flex-shrink-0">{s.symbol}</span>
                  <span className="text-sm text-muted-foreground flex-1 truncate">{s.shortname || s.longname || s.symbol}</span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{s.exchange}</span>
                </button>
              ))}
            </>
          )}

          {analysts.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/50">Analysts</div>
              {analysts.map(analyst => (
                <button key={analyst.id} onClick={() => go(`/analyst/${getAnalystSlug(analyst)}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                  {analyst.picture
                    ? <img src={analyst.picture} alt={analyst.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {(analyst.full_name || analyst.email || "?")[0].toUpperCase()}
                      </div>
                  }
                  <div>
                    <p className="text-sm font-medium">{analyst.full_name || analyst.email?.split("@")[0]}</p>
                    {analyst.accuracy_score > 0 && <p className="text-xs text-muted-foreground">{analyst.accuracy_score.toFixed(1)}% accuracy</p>}
                  </div>
                </button>
              ))}
            </>
          )}

          {reports.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/50">Reports</div>
              {reports.map(report => (
                <button key={report.id} onClick={() => go(`/report?id=${report.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.author_name || "Analyst"}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}