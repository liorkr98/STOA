import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PenLine, TrendingUp, TrendingDown, Globe, Users, Building2, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";

import { isWatched as wlIs, addToWatchlist, removeFromWatchlist, subscribeToWatchlist } from "@/lib/watchlistStore";
import { Badge } from "@/components/ui/badge";
import { setMeta } from "@/lib/seo";
import {
  fetchQuote, fetchFundamentals, fetchNews,
  fetchEarnings, fetchAnalystRatings,
  fmtCap, fmtNum, fmtPct, fmtVol,
} from "@/lib/stockData";
import StockChart from "@/components/stock/StockChart";
import AnalystConsensus from "@/components/stock/AnalystConsensus";
import FinancialsTab from "@/components/stock/FinancialsTab";
import EarningsSentimentTab from "@/components/stock/EarningsSentimentTab";
import useGoBack from "@/hooks/useGoBack";

const TABS = [
  { id: "chart",     label: "Chart" },
  { id: "overview",  label: "Overview" },
  { id: "financial", label: "Financials" },
  { id: "news",      label: "News" },
  { id: "reports",   label: "Reports & Sentiment" },
];

export default function StockPage() {
  const navigate    = useNavigate();
  const goBack      = useGoBack("/stocks");
  const urlParams   = new URLSearchParams(window.location.search);
  const routeParams = useParams();
  // Accept either /stock/:ticker (path param) or /stock?ticker=XXX (query
  // string). Path param takes priority; falls back to NVDA only if neither
  // is present. Fix for trending tickers / stock cards / watchlist rows
  // that were all routing to NVDA regardless of which symbol was clicked.
  const ticker      = (routeParams.ticker || urlParams.get("ticker") || "NVDA").toUpperCase();

  const [tab,          setTab]          = useState("chart");
  const [quote,        setQuote]        = useState(null);
  const [fundamentals, setFundamentals] = useState(null);
  const [news,         setNews]         = useState([]);
  const [earnings,     setEarnings]     = useState(null);
  const [ratings,      setRatings]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // Watchlist toggle. All reads/writes go through watchlistStore so the
  // same data is visible on Markets, Feed sidebar, and Studio analytics
  // immediately (no page reload required).
  const [isWatched, setIsWatched] = useState(false);
  useEffect(() => {
    setIsWatched(wlIs(ticker));
    return subscribeToWatchlist(() => setIsWatched(wlIs(ticker)));
  }, [ticker]);

  const toggleWatch = useCallback(() => {
    try {
      const exists = wlIs(ticker);
      if (exists) removeFromWatchlist(ticker);
      else addToWatchlist(ticker, quote?.companyName || ticker);
      setIsWatched(!exists);
      toast.success(exists ? `${ticker} removed from watchlist` : `${ticker} added to watchlist`);
    } catch {
      toast.error("Could not update watchlist");
    }
  }, [ticker, quote?.companyName]);

  useEffect(() => {
    setMeta({
      title: `${ticker} Stock — Chart, News & Analysis`,
      description: `Live chart, financials, news and analyst research for ${ticker} on STOA.`,
    });
  }, [ticker]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setQuote(null);
    setFundamentals(null);

    // Only the quote is essential — if it loads, render the page. The
    // secondary panels (fundamentals, news, earnings, ratings) each fall back
    // to an empty value on failure so one rate-limited Yahoo endpoint can't
    // turn the whole ticker page into an error screen.
    fetchQuote(ticker)
      .then(q => {
        if (!q || q.price == null) throw new Error(`No market data found for ${ticker}.`);
        setQuote(q);
        // Fire the rest in the background; never let them surface an error.
        fetchFundamentals(ticker).then(setFundamentals).catch(() => setFundamentals(null));
        fetchNews(ticker).then(setNews).catch(() => setNews([]));
        fetchEarnings(ticker).then(setEarnings).catch(() => setEarnings(null));
        fetchAnalystRatings(ticker).then(setRatings).catch(() => setRatings(null));
      })
      .catch(err => setError(err.message || "Failed to load stock data."))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return <LoadingScreen ticker={ticker} />;
  if (error)   return <ErrorScreen message={error} onBack={goBack} />;
  if (!quote)  return null;

  // Treat changes that round to exactly 0.00% as neutral — gray, no arrow,
  // no "+". The previous `>= 0` lumped 0.00 in with positives, which painted
  // flat tickers (like APLS with "+0.00%") as green.
  const changePctNum = Number(quote.changePct);
  const changeAbs    = Math.abs(changePctNum);
  const isFlat       = !isFinite(changePctNum) || changeAbs < 0.005;
  const isUp         = !isFlat && changePctNum > 0;
  const isDown       = !isFlat && changePctNum < 0;
  const directionColor = isUp ? "text-gain" : isDown ? "text-loss" : "text-muted-foreground";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          {/* Watchlist star — prominent, optimistic toggle, syncs with Markets page */}
          <button
            type="button"
            onClick={toggleWatch}
            aria-pressed={isWatched}
            aria-label={isWatched ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
            title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            className={`btn btn-sm ${isWatched ? "btn-ghost-gold" : "btn-ghost"}`}
          >
            <Star className="w-4 h-4" style={{ fill: isWatched ? "var(--gold-hex)" : "transparent" }} />
            {isWatched ? "Watching" : "Watch"}
          </button>
          <button
            onClick={() => navigate(`/editor?ticker=${ticker}`)}
            className="btn btn-primary btn-sm"
          >
            <PenLine className="w-3.5 h-3.5" /> Write Report on {ticker}
          </button>
        </div>
      </div>

      {/* ── Header card ──────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-[10px] p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          {/* Left: name + badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-medium">{ticker}</h1>
              {quote.exchange && (
                <Badge variant="secondary" className="text-[10px]">{quote.exchange}</Badge>
              )}
              {fundamentals?.sector && (
                <Badge variant="outline" className="text-[10px]">{fundamentals.sector}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{quote.companyName}</p>
            {fundamentals?.industry && (
              <p className="text-xs text-muted-foreground mt-0.5">{fundamentals.industry}</p>
            )}
          </div>

          {/* Right: price */}
          <div className="text-right">
            <div className="text-3xl font-medium">${fmtNum(quote.price)}</div>
            <div className={`flex items-center justify-end gap-1 text-sm font-medium mt-0.5 ${directionColor}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : isDown ? <TrendingDown className="w-4 h-4" /> : null}
              {isUp ? "+" : ""}{fmtNum(quote.change)} ({isUp ? "+" : ""}{fmtNum(quote.changePct)}%)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prev close: ${fmtNum(quote.prevClose)} · {quote.currency}
            </p>
          </div>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-4 border-t border-border">
          {[
            { label: "Market Cap",  value: fmtCap(fundamentals?.marketCap ?? quote.marketCap) },
            { label: "P/E (TTM)",   value: fmtNum(fundamentals?.pe) },
            { label: "EPS (TTM)",   value: fundamentals?.eps ? `$${fmtNum(fundamentals.eps)}` : "—" },
            { label: "Fwd P/E",     value: fmtNum(fundamentals?.forwardPE) },
            { label: "52W High",    value: `$${fmtNum(quote.yearHigh)}` },
            { label: "52W Low",     value: `$${fmtNum(quote.yearLow)}` },
            { label: "Volume",      value: fmtVol(quote.volume) },
            { label: "Analyst Target", value: fundamentals?.targetPrice ? `$${fmtNum(fundamentals.targetPrice)}` : "—" },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-[10px] text-muted-foreground mb-0.5">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────── */}

      {/* Chart */}
      {tab === "chart" && (
        <StockChart ticker={ticker} exchange={quote.exchange} />
      )}

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Company Profile */}
          <div className="bg-card border border-border rounded-[10px] p-5">
            <h3 className="font-medium text-sm mb-3">Company Profile</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {fundamentals?.description || "No description available."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Details */}
            <div className="bg-card border border-border rounded-[10px] p-5">
              <h3 className="font-medium text-sm mb-3">Company Details</h3>
              {[
                { label: "Sector",    value: fundamentals?.sector },
                { label: "Industry",  value: fundamentals?.industry },
                { label: "CEO",       value: fundamentals?.ceo },
                { label: "Employees", value: fundamentals?.employees?.toLocaleString() },
                { label: "Country",   value: fundamentals?.country },
                { label: "Website",   value: fundamentals?.website, isLink: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  {row.isLink && row.value ? (
                    <a href={row.value} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium truncate max-w-[180px] flex items-center gap-1">
                      {row.value.replace(/https?:\/\//, "")}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="font-medium text-right max-w-[180px] truncate">{row.value || "—"}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="bg-card border border-border rounded-[10px] p-5">
              <h3 className="font-medium text-sm mb-3">Key Metrics</h3>
              {[
                { label: "P/E Ratio (TTM)",    value: fmtNum(fundamentals?.pe) },
                { label: "Forward P/E",        value: fmtNum(fundamentals?.forwardPE) },
                { label: "P/B Ratio",          value: fmtNum(fundamentals?.pb) },
                { label: "P/S Ratio",          value: fmtNum(fundamentals?.ps) },
                { label: "EV/EBITDA",          value: fmtNum(fundamentals?.evEbitda) },
                { label: "Return on Equity",   value: fmtPct(fundamentals?.roe) },
                { label: "Gross Margin",       value: fmtPct(fundamentals?.grossMargin) },
                { label: "Revenue Growth YoY", value: fmtPct(fundamentals?.revenueGrowth) },
                { label: "Debt/Equity",        value: fmtNum(fundamentals?.debtToEquity) },
                { label: "Current Ratio",      value: fmtNum(fundamentals?.currentRatio) },
                { label: "Beta",               value: fmtNum(fundamentals?.beta) },
                { label: "Dividend Yield",     value: fmtPct(fundamentals?.dividendYield) },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analyst Consensus */}
          <AnalystConsensus ratings={ratings} />
        </div>
      )}

      {/* Financials */}
      {tab === "financial" && <FinancialsTab ticker={ticker} />}

      {/* News */}
      {tab === "news" && (
        <div className="space-y-3">
          {news.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No recent news for {ticker}.</p>
          )}
          {news.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-4 p-4 bg-card border border-border rounded-[10px] hover:border-primary/30 transition-all group"
            >
              {item.thumbnail?.resolutions?.[0]?.url && (
                <img
                  src={item.thumbnail.resolutions[0].url}
                  alt=""
                  className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                  onError={e => e.target.style.display = "none"}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.publisher}
                  {item.providerPublishTime
                    ? ` · ${new Date(item.providerPublishTime * 1000).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      )}

      {/* Reports & Sentiment */}
      {tab === "reports" && (
        <EarningsSentimentTab earnings={earnings} ratings={ratings} ticker={ticker} />
      )}
    </div>
  );
}

// ── Sub-screens ───────────────────────────────────────────────
function LoadingScreen({ ticker }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground" style={{ minHeight: 400 }}>
      <div className="w-10 h-10 rounded-full border border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm">Loading {ticker} data...</p>
    </div>
  );
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 text-center">
      <div className="bg-loss/5 border border-loss/20 rounded-[10px] p-8 inline-block">
        <p className="font-medium text-loss mb-2">Failed to load data</p>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <button onClick={onBack} className="text-sm text-primary hover:underline">← Go Back</button>
      </div>
    </div>
  );
}