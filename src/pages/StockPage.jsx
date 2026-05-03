import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import TradingViewWidget from "@/components/feed/TradingViewWidget";
import ReportCard from "@/components/feed/ReportCard";

const TABS = ["Chart", "Financials", "Reports"];

const TICKER_NAMES = {
  NVDA: "NVIDIA Corporation", AAPL: "Apple Inc.", TSLA: "Tesla, Inc.",
  MSFT: "Microsoft Corporation", GOOGL: "Alphabet Inc.", AMD: "Advanced Micro Devices",
  META: "Meta Platforms", AMZN: "Amazon.com", NFLX: "Netflix", JPM: "JPMorgan Chase",
  COIN: "Coinbase Global", PLTR: "Palantir Technologies", RIVN: "Rivian Automotive",
  SHOP: "Shopify", ARM: "Arm Holdings", INTC: "Intel Corporation", AVGO: "Broadcom Inc.",
  QCOM: "Qualcomm", BAC: "Bank of America", GS: "Goldman Sachs",
};

function fmt(n, prefix = "") {
  if (n == null) return "N/A";
  if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`;
  return `${prefix}${n.toLocaleString()}`;
}

export default function StockPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const ticker = urlParams.get("ticker")?.toUpperCase() || "NVDA";
  const [activeTab, setActiveTab] = useState("Chart");
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
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
            <p className="text-sm text-muted-foreground">{TICKER_NAMES[ticker] || `${ticker}`}</p>
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

        {/* Quick stats */}
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
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Chart" && <TradingViewWidget ticker={ticker} height={600} />}

      {activeTab === "Financials" && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Live financials coming soon. Use the Chart tab for real-time price data.
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