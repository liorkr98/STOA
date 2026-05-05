import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// All major tickers for stock search
const TICKER_NAMES = {
  NVDA: "NVIDIA", AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet", META: "Meta",
  AMZN: "Amazon", TSLA: "Tesla", AMD: "AMD", INTC: "Intel", QCOM: "Qualcomm",
  AVGO: "Broadcom", ARM: "Arm Holdings", PLTR: "Palantir", CRM: "Salesforce",
  ADBE: "Adobe", ORCL: "Oracle", SNOW: "Snowflake", SHOP: "Shopify", UBER: "Uber",
  JPM: "JPMorgan", BAC: "Bank of America", GS: "Goldman Sachs", MS: "Morgan Stanley",
  WFC: "Wells Fargo", V: "Visa", MA: "Mastercard", PYPL: "PayPal", SQ: "Block",
  COIN: "Coinbase", MSTR: "MicroStrategy", XOM: "ExxonMobil", CVX: "Chevron",
  JNJ: "Johnson & Johnson", PFE: "Pfizer", LLY: "Eli Lilly", KO: "Coca-Cola",
  MCD: "McDonald's", WMT: "Walmart", CAT: "Caterpillar", BA: "Boeing",
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [analysts, setAnalysts] = useState([]);
  const [reports, setReports] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setAnalysts([]); setReports([]); return; }
    // Fetch real analysts and reports
    const q = query.toLowerCase();
    Promise.all([
      base44.entities.User.list("-accuracy_score", 50).catch(() => []),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 50).catch(() => []),
    ]).then(([users, reps]) => {
      setAnalysts((users || []).filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      ).slice(0, 3));
      setReports((reps || []).filter(r =>
        (r.title || "").toLowerCase().includes(q) ||
        (r.tickers || []).some(t => t.toLowerCase().includes(q))
      ).slice(0, 3));
    });
  }, [query]);

  const stockResults = query.length > 0
    ? Object.entries(TICKER_NAMES).filter(([t, name]) =>
        t.includes(query.toUpperCase()) || name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const hasResults = stockResults.length > 0 || analysts.length > 0 || reports.length > 0;

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
      {query && <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
      {open && hasResults && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {stockResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/50">Stocks</div>
              {stockResults.map(([ticker, name]) => (
                <button key={ticker} onClick={() => go(`/stock?ticker=${ticker}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                  <span className="font-mono font-bold text-sm w-14">{ticker}</span>
                  <span className="text-sm text-muted-foreground flex-1">{name}</span>
                </button>
              ))}
            </>
          )}
          {analysts.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/50">Analysts</div>
              {analysts.map((analyst) => (
                <button key={analyst.id} onClick={() => go(`/analyst?id=${analyst.id}`)}
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
              {reports.map((report) => (
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