import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

const STOCKS_BY_SECTOR = {
  Technology: [
    { ticker: "NVDA", name: "NVIDIA Corporation" }, { ticker: "AAPL", name: "Apple Inc." },
    { ticker: "MSFT", name: "Microsoft Corporation" }, { ticker: "GOOGL", name: "Alphabet Inc." },
    { ticker: "META", name: "Meta Platforms" }, { ticker: "AMZN", name: "Amazon.com" },
    { ticker: "TSLA", name: "Tesla, Inc." }, { ticker: "AMD", name: "Advanced Micro Devices" },
    { ticker: "INTC", name: "Intel Corporation" }, { ticker: "QCOM", name: "Qualcomm" },
    { ticker: "AVGO", name: "Broadcom Inc." }, { ticker: "ARM", name: "Arm Holdings" },
    { ticker: "PLTR", name: "Palantir Technologies" }, { ticker: "CRM", name: "Salesforce" },
    { ticker: "ADBE", name: "Adobe Inc." }, { ticker: "ORCL", name: "Oracle Corporation" },
    { ticker: "IBM", name: "IBM" }, { ticker: "SNOW", name: "Snowflake" },
    { ticker: "SHOP", name: "Shopify" }, { ticker: "UBER", name: "Uber Technologies" },
  ],
  Finance: [
    { ticker: "JPM", name: "JPMorgan Chase" }, { ticker: "BAC", name: "Bank of America" },
    { ticker: "GS", name: "Goldman Sachs" }, { ticker: "MS", name: "Morgan Stanley" },
    { ticker: "WFC", name: "Wells Fargo" }, { ticker: "V", name: "Visa Inc." },
    { ticker: "MA", name: "Mastercard" }, { ticker: "PYPL", name: "PayPal" },
    { ticker: "SQ", name: "Block Inc." }, { ticker: "C", name: "Citigroup" },
    { ticker: "AXP", name: "American Express" }, { ticker: "BX", name: "Blackstone" },
    { ticker: "KKR", name: "KKR & Co." }, { ticker: "SCHW", name: "Charles Schwab" },
  ],
  Healthcare: [
    { ticker: "JNJ", name: "Johnson & Johnson" }, { ticker: "UNH", name: "UnitedHealth Group" },
    { ticker: "PFE", name: "Pfizer" }, { ticker: "ABBV", name: "AbbVie" },
    { ticker: "MRK", name: "Merck & Co." }, { ticker: "LLY", name: "Eli Lilly" },
    { ticker: "TMO", name: "Thermo Fisher" }, { ticker: "ABT", name: "Abbott Laboratories" },
    { ticker: "CVS", name: "CVS Health" }, { ticker: "AMGN", name: "Amgen" },
  ],
  Energy: [
    { ticker: "XOM", name: "ExxonMobil" }, { ticker: "CVX", name: "Chevron" },
    { ticker: "COP", name: "ConocoPhillips" }, { ticker: "SLB", name: "SLB" },
    { ticker: "EOG", name: "EOG Resources" }, { ticker: "PSX", name: "Phillips 66" },
    { ticker: "MPC", name: "Marathon Petroleum" }, { ticker: "OXY", name: "Occidental Petroleum" },
    { ticker: "HAL", name: "Halliburton" }, { ticker: "BKR", name: "Baker Hughes" },
  ],
  Consumer: [
    { ticker: "KO", name: "Coca-Cola" }, { ticker: "PEP", name: "PepsiCo" },
    { ticker: "MCD", name: "McDonald's" }, { ticker: "SBUX", name: "Starbucks" },
    { ticker: "NKE", name: "Nike" }, { ticker: "TGT", name: "Target" },
    { ticker: "WMT", name: "Walmart" }, { ticker: "COST", name: "Costco" },
    { ticker: "HD", name: "Home Depot" }, { ticker: "LOW", name: "Lowe's" },
  ],
  Industrial: [
    { ticker: "CAT", name: "Caterpillar" }, { ticker: "DE", name: "Deere & Company" },
    { ticker: "GE", name: "GE Aerospace" }, { ticker: "BA", name: "Boeing" },
    { ticker: "HON", name: "Honeywell" }, { ticker: "MMM", name: "3M" },
    { ticker: "UPS", name: "UPS" }, { ticker: "FDX", name: "FedEx" },
    { ticker: "LMT", name: "Lockheed Martin" }, { ticker: "RTX", name: "RTX Corporation" },
  ],
  Crypto: [
    { ticker: "COIN", name: "Coinbase Global" }, { ticker: "MSTR", name: "MicroStrategy" },
    { ticker: "RIOT", name: "Riot Platforms" }, { ticker: "MARA", name: "Marathon Digital" },
    { ticker: "HUT", name: "Hut 8 Corp" },
  ],
};

const ALL_STOCKS = Object.entries(STOCKS_BY_SECTOR).flatMap(([sector, stocks]) =>
  stocks.map(s => ({ ...s, sector }))
);

const SECTORS = ["All", ...Object.keys(STOCKS_BY_SECTOR)];

function StockCard({ ticker, name, navigate }) {
  return (
    <button
      onClick={() => navigate(`/stock?ticker=${ticker}`)}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all text-left"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-bold text-sm text-foreground">${ticker}</span>
      </div>
      <p className="text-xs text-muted-foreground truncate">{name}</p>
      <p className="text-xs text-muted-foreground mt-1">View Chart →</p>
    </button>
  );
}

export default function StocksPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeSector, setActiveSector] = useState("All");

  const filtered = useMemo(() => {
    let list = activeSector === "All" ? ALL_STOCKS : ALL_STOCKS.filter(s => s.sector === activeSector);
    if (query.trim()) {
      const q = query.trim().toUpperCase();
      list = list.filter(s => s.ticker.includes(q) || s.name.toUpperCase().includes(q));
    }
    return list;
  }, [query, activeSector]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">US Markets</h1>
        <p className="text-sm text-muted-foreground">Browse major US-listed stocks by sector</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by ticker or company name..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Sector tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {SECTORS.map(s => (
          <button key={s} onClick={() => setActiveSector(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${activeSector === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No stocks found for "{query}"</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(s => (
            <StockCard key={s.ticker} ticker={s.ticker} name={s.name} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}