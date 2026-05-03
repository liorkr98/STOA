import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import TradingViewWidget from "@/components/feed/TradingViewWidget";
import ReportCard from "@/components/feed/ReportCard";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const TABS = ["Chart", "Financials", "News", "Reports"];

const TICKER_NAMES = {
  NVDA: "NVIDIA Corporation", AAPL: "Apple Inc.", TSLA: "Tesla, Inc.",
  MSFT: "Microsoft Corporation", GOOGL: "Alphabet Inc.", AMD: "Advanced Micro Devices",
  META: "Meta Platforms", AMZN: "Amazon.com", NFLX: "Netflix", JPM: "JPMorgan Chase",
  COIN: "Coinbase Global", PLTR: "Palantir Technologies", RIVN: "Rivian Automotive",
  SHOP: "Shopify", ARM: "Arm Holdings", INTC: "Intel Corporation", AVGO: "Broadcom Inc.",
  QCOM: "Qualcomm", BAC: "Bank of America", GS: "Goldman Sachs", MS: "Morgan Stanley",
  WFC: "Wells Fargo", DIS: "Walt Disney", UBER: "Uber Technologies", LYFT: "Lyft",
  SNOW: "Snowflake", CRWD: "CrowdStrike", NET: "Cloudflare", DDOG: "Datadog",
  PANW: "Palo Alto Networks", ZM: "Zoom Video", SPOT: "Spotify", ABNB: "Airbnb",
  PYPL: "PayPal", SQ: "Block Inc.", HOOD: "Robinhood", SOFI: "SoFi Technologies",
  NIO: "NIO Inc.", XPEV: "XPeng", LI: "Li Auto", F: "Ford Motor", GM: "General Motors",
  BA: "Boeing", CAT: "Caterpillar", XOM: "ExxonMobil", CVX: "Chevron",
  JNJ: "Johnson & Johnson", PFE: "Pfizer", MRNA: "Moderna",
};

function fmt(n) {
  if (n == null) return "N/A";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

// Resizable chart wrapper
function ResizableChart({ ticker }) {
  const [height, setHeight] = useState(600);
  const [width, setWidth] = useState("100%");
  const resizing = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onMouseDown = useCallback((e) => {
    resizing.current = true;
    startY.current = e.clientY;
    startH.current = height;
    e.preventDefault();
  }, [height]);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizing.current) return;
      const delta = e.clientY - startY.current;
      setHeight(Math.max(300, Math.min(1200, startH.current + delta)));
    };
    const onUp = () => { resizing.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  return (
    <div className="relative" style={{ width }}>
      <TradingViewWidget ticker={ticker} height={height} />
      {/* Vertical resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group z-10"
      >
        <div className="w-12 h-1 bg-border rounded-full group-hover:bg-primary/50 transition-colors" />
      </div>
    </div>
  );
}

export default function StockPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const ticker = urlParams.get("ticker")?.toUpperCase() || "NVDA";
  const [activeTab, setActiveTab] = useState("Chart");
  const [stockData, setStockData] = useState(null);
  const [fundamentals, setFundamentals] = useState(null);
  const [news, setNews] = useState([]);
  const [quarterly, setQuarterly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      base44.functions.invoke("getStockData", { ticker, range: "1d", interval: "5m" }),
      base44.entities.Report.filter({ status: "published" }),
    ]).then(([stockRes, allReports]) => {
      setStockData(stockRes.data);
      setReports((allReports || []).filter(r => (r.tickers || []).includes(ticker)));
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  const loadFinancials = async () => {
    if (fundamentals) return;
    setFinancialsLoading(true);
    const res = await base44.functions.invoke("getStockFinancials", { ticker });
    setFundamentals(res.data.financials);
    setNews(res.data.news || []);
    setQuarterly(res.data.quarterly || []);
    setFinancialsLoading(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "Financials" || tab === "News") loadFinancials();
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-12 flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading {ticker}...
    </div>
  );

  if (error || !stockData) return (
    <div className="max-w-5xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground mb-4">{error || `Data for "${ticker}" not found.`}</p>
      <button onClick={() => navigate(-1)} className="text-primary hover:underline">Go Back</button>
    </div>
  );

  const price = stockData.regularMarketPrice;
  const prevClose = stockData.previousClose;
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;
  const isUp = change >= 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{ticker}</h1>
              <Badge variant="secondary" className="text-[10px]">{stockData.exchangeName || "NASDAQ"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{TICKER_NAMES[ticker] || ticker}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">${price?.toFixed(2)}</p>
            <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Prev close: ${prevClose?.toFixed(2)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">52W High</p>
            <p className="text-sm font-semibold">${stockData.fiftyTwoWeekHigh?.toFixed(2) ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">52W Low</p>
            <p className="text-sm font-semibold">${stockData.fiftyTwoWeekLow?.toFixed(2) ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-sm font-semibold">{fmt(stockData.volume)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => handleTabChange(t)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Chart" && <ResizableChart ticker={ticker} />}

      {activeTab === "Financials" && (
        <div>
          {financialsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching live financials...
            </div>
          ) : fundamentals ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Market Cap", value: fundamentals.marketCap },
                  { label: "P/E Ratio", value: fundamentals.pe },
                  { label: "Forward P/E", value: fundamentals.forwardPE },
                  { label: "EPS (TTM)", value: fundamentals.eps },
                  { label: "Revenue (TTM)", value: fundamentals.revenue },
                  { label: "Revenue Growth", value: fundamentals.revenueGrowth },
                  { label: "Gross Margin", value: fundamentals.grossMargin },
                  { label: "Operating Margin", value: fundamentals.operatingMargin },
                  { label: "Profit Margin", value: fundamentals.profitMargin },
                  { label: "Net Income", value: fundamentals.netIncome },
                  { label: "Free Cash Flow", value: fundamentals.freeCashFlow },
                  { label: "Total Debt", value: fundamentals.totalDebt },
                  { label: "Total Cash", value: fundamentals.totalCash },
                  { label: "Return on Equity", value: fundamentals.returnOnEquity },
                  { label: "Return on Assets", value: fundamentals.returnOnAssets },
                  { label: "Div Yield", value: fundamentals.divYield },
                  { label: "Beta", value: fundamentals.beta },
                  { label: "52W High", value: fundamentals.week52High },
                  { label: "52W Low", value: fundamentals.week52Low },
                ].map(item => (
                  <div key={item.label} className="bg-card border border-border rounded-xl p-3 text-center">
                    <p className="text-sm font-bold">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              {quarterly.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3">Quarterly Revenue (from Yahoo Finance)</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={quarterly.map(q => ({ q: q.period, rev: q.revenue ? q.revenue / 1e9 : 0 }))}>
                      <XAxis dataKey="q" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `$${v.toFixed(0)}B`} width={45} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => [`$${v.toFixed(2)}B`, "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {activeTab === "News" && (
        <div>
          {financialsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching latest news...
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
                  <div>
                    <p className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.source} · {item.time}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No news available.</p>
          )}
        </div>
      )}

      {activeTab === "Reports" && (
        <div className="space-y-4">
          {reports.length > 0
            ? reports.map(r => <ReportCard key={r.id} report={r} />)
            : <p className="text-sm text-muted-foreground text-center py-8">No reports for {ticker} yet.</p>
          }
        </div>
      )}
    </div>
  );
}