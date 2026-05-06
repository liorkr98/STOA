import React, { useState, useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, TrendingDown, Loader2, ExternalLink,
  PenLine, Building2, Globe, Users, Calendar, BarChart2, Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import TradingViewWidget from "@/components/feed/TradingViewWidget";
import ReportCard from "@/components/feed/ReportCard";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const YF_HEADERS = { "User-Agent": "Mozilla/5.0" };

async function fetchYahooQuote(ticker) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: YF_HEADERS }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta || {};
    return {
      price:     meta.regularMarketPrice,
      prevClose: meta.chartPreviousClose,
      volume:    meta.regularMarketVolume,
      marketCap: meta.marketCap,
      yearHigh:  meta.fiftyTwoWeekHigh,
      yearLow:   meta.fiftyTwoWeekLow,
      exchange:  meta.exchangeName,
      companyName: meta.longName || meta.shortName || ticker,
    };
  } catch (e) {
    console.error("Yahoo chart error:", e);
    return null;
  }
}

async function fetchYahooFundamentals(ticker) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile,price`,
      { headers: YF_HEADERS }
    );
    const data = await res.json();
    const r       = data?.quoteSummary?.result?.[0] || {};
    const detail  = r.summaryDetail || {};
    const stats   = r.defaultKeyStatistics || {};
    const fin     = r.financialData || {};
    const profile = r.assetProfile || {};
    const price   = r.price || {};
    return {
      price:           price.regularMarketPrice?.raw,
      prevClose:       price.regularMarketPreviousClose?.raw,
      change:          price.regularMarketChange?.raw,
      changePercent:   price.regularMarketChangePercent?.raw,
      marketCap:       price.marketCap?.raw ?? detail.marketCap?.raw,
      volume:          price.regularMarketVolume?.raw ?? detail.volume?.raw,
      avgVolume:       detail.averageVolume?.raw,
      yearHigh:        detail.fiftyTwoWeekHigh?.raw,
      yearLow:         detail.fiftyTwoWeekLow?.raw,
      pe:              detail.trailingPE?.raw,
      forwardPE:       detail.forwardPE?.raw,
      eps:             stats.trailingEps?.raw,
      pbRatio:         stats.priceToBook?.raw,
      psRatio:         detail.priceToSalesTrailing12Months?.raw,
      evEbitda:        stats.enterpriseToEbitda?.raw,
      beta:            stats.beta?.raw,
      dividendYield:   detail.dividendYield?.raw,
      revenuePerShare: fin.revenuePerShare?.raw,
      roe:             fin.returnOnEquity?.raw,
      roa:             fin.returnOnAssets?.raw,
      debtToEquity:    fin.debtToEquity?.raw,
      currentRatio:    fin.currentRatio?.raw,
      freeCashFlowYield: null,
      companyName:     price.longName || price.shortName || ticker,
      exchange:        price.exchangeName || price.fullExchangeName,
      sector:          profile.sector,
      industry:        profile.industry,
      website:         profile.website,
      employees:       profile.fullTimeEmployees,
      country:         profile.country,
      ceo:             profile.companyOfficers?.[0]?.name,
      description:     profile.longBusinessSummary,
      ipoDate:         null,
      logo:            null,
    };
  } catch (e) {
    console.error("Yahoo fundamentals error:", e);
    return null;
  }
}

const TABS = ["Chart", "Overview", "Financials", "News", "Analysts", "Reports"];

function fmt(n) {
  if (n == null || n === "") return "N/A";
  const num = parseFloat(n);
  if (isNaN(num)) return n;
  if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6)  return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

function fmtPct(n) {
  if (n == null) return "N/A";
  return `${(parseFloat(n) * 100).toFixed(2)}%`;
}

function fmtNum(n, decimals = 2) {
  if (n == null) return "N/A";
  return parseFloat(n).toFixed(decimals);
}

function StatCard({ label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className="text-sm font-bold text-foreground">{value ?? "N/A"}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// Resizable chart wrapper
function ResizableChart({ ticker }) {
  return <TradingViewWidget ticker={ticker} />;
}

const ACTION_COLORS = {
  "strong-buy":   "bg-gain/10 text-gain border-gain/30",
  "buy":          "bg-gain/10 text-gain border-gain/30",
  "hold":         "bg-amber-50 text-amber-600 border-amber-200",
  "sell":         "bg-loss/10 text-loss border-loss/30",
  "strong-sell":  "bg-loss/10 text-loss border-loss/30",
};

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
    setMeta({
      title: `${ticker} Stock — Chart, News & Analysis`,
      description: `Live chart, financials, news and analyst research for ${ticker} on STOA.`,
    });
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStockData(null);

    Promise.all([
      fetchYahooFundamentals(ticker),
      base44.entities.Report.filter({ status: "published" }),
    ]).then(([fundamentals, allReports]) => {
      if (cancelled) return;

      setStockData({
        ticker,
        ...fundamentals,
        week52High: fundamentals?.yearHigh,
        week52Low:  fundamentals?.yearLow,
        peRatio:    fundamentals?.pe,
        previousClose: fundamentals?.prevClose,
        change:     fundamentals?.change,
        changePercent: fundamentals?.changePercent,
        incomeHistory: [],
        news: [],
        analystRatings: [],
      });

      setReports((allReports || []).filter(r => {
        const tArr = (r.tickers || "").split(",").map(t => t.trim()).filter(Boolean);
        return tArr.includes(ticker);
      }));
    }).catch(e => {
      if (!cancelled) setError(e.message);
      console.error("StockPage Yahoo error:", e);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
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

  const price = stockData.price ?? stockData.regularMarketPrice;
  const prevClose = stockData.previousClose;
  const change = stockData.change ?? (price - prevClose);
  const changePct = stockData.changePercent ?? ((change / prevClose) * 100);
  const isUp = change >= 0;

  const incomeChart = (stockData.incomeHistory || [])
    .slice().reverse()
    .map(q => ({
      q: q.period ? q.period.slice(0, 7) : "",
      rev:   q.revenue    ? q.revenue    / 1e9 : 0,
      ni:    q.netIncome  ? q.netIncome  / 1e9 : 0,
    }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => navigate(`/editor?ticker=${ticker}`)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PenLine className="w-3.5 h-3.5" /> Write Report on {ticker}
        </button>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {stockData.logo && (
              <img src={stockData.logo} alt={ticker} className="w-12 h-12 rounded-xl object-contain border border-border bg-white p-1" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-2xl font-bold">{ticker}</h1>
                <Badge variant="secondary" className="text-[10px]">{stockData.exchange || stockData.exchangeName || "NASDAQ"}</Badge>
                {stockData.sector && <Badge variant="outline" className="text-[10px]">{stockData.sector}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{stockData.companyName || ticker}</p>
              {stockData.industry && <p className="text-xs text-muted-foreground mt-0.5">{stockData.industry}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold">${price?.toFixed(2)}</p>
            <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? "+" : ""}{Number(change).toFixed(2)} ({isUp ? "+" : ""}{Number(changePct).toFixed(2)}%)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Prev close: ${Number(prevClose).toFixed(2)}</p>
          </div>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Market Cap</p><p className="text-sm font-semibold">{fmt(stockData.marketCap)}</p></div>
          <div><p className="text-xs text-muted-foreground">P/E (TTM)</p><p className="text-sm font-semibold">{fmtNum(stockData.pe || stockData.peRatio)}</p></div>
          <div><p className="text-xs text-muted-foreground">EPS</p><p className="text-sm font-semibold">{stockData.eps ? `$${fmtNum(stockData.eps)}` : "N/A"}</p></div>
          <div><p className="text-xs text-muted-foreground">52W High</p><p className="text-sm font-semibold">${fmtNum(stockData.week52High ?? stockData.fiftyTwoWeekHigh)}</p></div>
          <div><p className="text-xs text-muted-foreground">52W Low</p><p className="text-sm font-semibold">${fmtNum(stockData.week52Low ?? stockData.fiftyTwoWeekLow)}</p></div>
          <div><p className="text-xs text-muted-foreground">Volume</p><p className="text-sm font-semibold">{fmt(stockData.volume)?.replace("$", "")}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Chart ── */}
      {activeTab === "Chart" && <ResizableChart ticker={ticker} />}

      {/* ── Overview ── */}
      {activeTab === "Overview" && (
        <div className="space-y-4">
          {/* Company info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">Company Profile</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {stockData.employees && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Employees</p><p className="font-medium">{Number(stockData.employees).toLocaleString()}</p></div>
                </div>
              )}
              {stockData.country && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Country</p><p className="font-medium">{stockData.country}</p></div>
                </div>
              )}
              {stockData.ipoDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">IPO Date</p><p className="font-medium">{stockData.ipoDate}</p></div>
                </div>
              )}
              {stockData.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Website</p>
                    <a href={stockData.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block max-w-[120px]">
                      {stockData.website?.replace(/https?:\/\//, "")}
                    </a>
                  </div>
                </div>
              )}
            </div>
            {stockData.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">{stockData.description}</p>
            )}
          </div>

          {/* Key metrics grid */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">Key Metrics (TTM)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Revenue/Share" value={stockData.revenuePerShare ? `$${fmtNum(stockData.revenuePerShare)}` : null} />
              <StatCard label="Net Income/Share" value={stockData.netIncomePerShare ? `$${fmtNum(stockData.netIncomePerShare)}` : null} />
              <StatCard label="P/E Ratio" value={fmtNum(stockData.peRatio)} />
              <StatCard label="P/B Ratio" value={fmtNum(stockData.pbRatio)} />
              <StatCard label="P/S Ratio" value={fmtNum(stockData.psRatio)} />
              <StatCard label="EV/EBITDA" value={fmtNum(stockData.evEbitda)} />
              <StatCard label="Debt / Equity" value={fmtNum(stockData.debtToEquity)} />
              <StatCard label="ROE" value={stockData.roe ? fmtPct(stockData.roe) : null} />
              <StatCard label="ROA" value={stockData.roa ? fmtPct(stockData.roa) : null} />
              <StatCard label="Current Ratio" value={fmtNum(stockData.currentRatio)} />
              <StatCard label="FCF Yield" value={stockData.freeCashFlowYield ? fmtPct(stockData.freeCashFlowYield) : null} />
              <StatCard label="Dividend Yield" value={stockData.dividendYield ? fmtPct(stockData.dividendYield) : null} />
            </div>
          </div>
        </div>
      )}

      {/* ── Financials ── */}
      {activeTab === "Financials" && (
        <div className="space-y-4">
          {incomeChart.length > 0 ? (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Quarterly Revenue vs Net Income</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={incomeChart} barGap={2}>
                    <XAxis dataKey="q" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${v.toFixed(1)}B`} width={52} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v, name) => [`$${v.toFixed(2)}B`, name === "rev" ? "Revenue" : "Net Income"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Legend formatter={v => v === "rev" ? "Revenue" : "Net Income"} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ni" fill="hsl(var(--gain))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quarterly table */}
              <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
                <h3 className="font-semibold text-sm mb-3">Quarterly Income Statement</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground pb-2 font-medium">Quarter</th>
                      <th className="text-right text-muted-foreground pb-2 font-medium">Revenue</th>
                      <th className="text-right text-muted-foreground pb-2 font-medium">Gross Profit</th>
                      <th className="text-right text-muted-foreground pb-2 font-medium">Op. Income</th>
                      <th className="text-right text-muted-foreground pb-2 font-medium">Net Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stockData.incomeHistory || []).map((q, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                        <td className="py-2 font-mono font-medium">{q.period?.slice(0, 7)}</td>
                        <td className="py-2 text-right">{fmt(q.revenue)}</td>
                        <td className="py-2 text-right">{fmt(q.grossProfit)}</td>
                        <td className="py-2 text-right">{fmt(q.operatingIncome)}</td>
                        <td className={`py-2 text-right font-medium ${(q.netIncome ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>{fmt(q.netIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No financial history available for {ticker}.</p>
          )}
        </div>
      )}

      {/* ── News ── */}
      {activeTab === "News" && (
        <div>
          {(stockData.news || []).length > 0 ? (
            <div className="space-y-3">
              {stockData.news.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
                  {item.image && (
                    <img src={item.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={e => e.target.style.display = "none"} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
                    {item.summary && <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{item.summary}</p>}
                    <p className="text-xs text-muted-foreground">
                      {item.source}{item.published ? ` · ${new Date(item.published).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No news available for {ticker}.</p>
          )}
        </div>
      )}

      {/* ── Analysts ── */}
      {activeTab === "Analysts" && (
        <div className="space-y-3">
          {(stockData.analystRatings || []).length > 0 ? (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Recent Analyst Ratings</h3>
                <div className="space-y-3">
                  {stockData.analystRatings.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div>
                        <p className="font-semibold text-sm">{r.firm}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        {r.from && <span className="text-xs text-muted-foreground">{r.from} →</span>}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${ACTION_COLORS[r.to?.toLowerCase()] || "bg-secondary text-secondary-foreground border-border"}`}>
                          {r.to}
                        </span>
                        {r.action && <span className="text-[10px] text-muted-foreground capitalize">{r.action}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No analyst ratings available for {ticker}.</p>
          )}
        </div>
      )}

      {/* ── Reports ── */}
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