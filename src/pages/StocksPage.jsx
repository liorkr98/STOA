import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, X, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { loadWatchlist, saveWatchlist, subscribeToWatchlist } from "@/lib/watchlistStore";

const PAGE_SIZE = 50;

// ── Data fetchers (preserved verbatim from .backup) ──────────────────────────
async function fetchTopStocks() {
  const r = await base44.functions.invoke("proxyFetch", {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=100&formatted=false",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const quotes = r.data?.finance?.result?.[0]?.quotes || [];
  return quotes.map((q) => ({
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    exchange: q.fullExchangeName || q.exchange,
    price: q.regularMarketPrice,
    change: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    mktCap: q.marketCap,
  }));
}

async function searchStocks(query) {
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return (r.data?.quotes || [])
    .filter((q) => q.quoteType === "EQUITY")
    .map((q) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
      price: null,
      change: null,
    }));
}

async function fetchIndexes() {
  // Hit Yahoo's chart endpoint directly (via proxyFetch) — the cached
  // `getStockData` backend function the original implementation called was
  // returning stale / null prices for the broad indexes, which is why the
  // hero tile strip was rendering empty. Use the same source the watchlist
  // and ticker detail page hit so prices stay consistent across the app.
  const TICKERS = ["SPY", "QQQ", "DIA", "^VIX"];
  const results = await Promise.allSettled(
    TICKERS.map(async (sym) => {
      const r = await base44.functions.invoke("proxyFetch", {
        url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const meta = r?.data?.chart?.result?.[0]?.meta || {};
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      const changePct = price != null && prev ? ((price - prev) / prev) * 100 : null;
      return {
        symbol: sym === "^VIX" ? "VIX" : sym,
        price,
        change: changePct,
      };
    })
  );
  return results.filter((r) => r.status === "fulfilled" && r.value.price != null).map((r) => r.value);
}

async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const r = await base44.functions.invoke("proxyFetch", {
        url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const meta = r?.data?.chart?.result?.[0]?.meta || {};
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      const changePct = price != null && prev ? ((price - prev) / prev) * 100 : null;
      return {
        symbol: sym,
        name: meta.longName || meta.shortName || sym,
        price,
        change: changePct,
        volume: meta.regularMarketVolume,
        mktCap: meta.marketCap,
      };
    })
  );
  return results.filter((r) => r.status === "fulfilled" && r.value.price != null).map((r) => r.value);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtCap(n) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

const SECTORS = ["All", "Semis", "Tech", "Energy", "Macro", "Financials", "Auto", "Healthcare", "Space"];
const EXCHANGES = ["All", "NASDAQ", "NYSE"];

// Sector-by-symbol fallback (Yahoo screener doesn't return sector reliably)
const SECTOR_MAP = {
  NVDA: "Semis", AMD: "Semis", INTC: "Semis", AVGO: "Semis", ASML: "Semis", TSM: "Semis", MU: "Semis", QCOM: "Semis",
  AAPL: "Tech", MSFT: "Tech", GOOGL: "Tech", GOOG: "Tech", META: "Tech", AMZN: "Tech",
  TSLA: "Auto", F: "Auto", GM: "Auto",
  JPM: "Financials", BAC: "Financials", "BRK.B": "Financials", V: "Financials", MA: "Financials", KRE: "Financials",
  XOM: "Energy", CVX: "Energy",
  TLT: "Macro", GLD: "Macro", SLV: "Macro",
  LLY: "Healthcare", PFE: "Healthcare", JNJ: "Healthcare",
  ASTS: "Space", RKLB: "Space", LUNR: "Space", MNTS: "Space",
  BKSY: "Space", SPIR: "Space", PL: "Space", RDW: "Space",
};

function sectorFor(stock) {
  return stock.sector || SECTOR_MAP[stock.symbol] || "Other";
}

// ── Stoa coverage badge (the differentiator) ─────────────────────────────────
function StoaCoverageBadge({ stock }) {
  if (stock.openLong) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 7px",
        background: "rgba(14,107,69,0.06)",
        border: "0.5px solid rgba(14,107,69,0.32)",
        borderRadius: 4,
        fontSize: 10, color: "var(--rolex-green)",
        whiteSpace: "nowrap", fontFamily: "var(--f-sans)", fontWeight: 500,
      }}>
        <span className="t-num">{stock.openLong}</span> open{" "}
        <span style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>long</span>
      </span>
    );
  }
  if (stock.openShort) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 7px",
        background: "rgba(146,43,62,0.06)",
        border: "0.5px solid rgba(146,43,62,0.32)",
        borderRadius: 4,
        fontSize: 10, color: "var(--velvet-red)",
        whiteSpace: "nowrap", fontFamily: "var(--f-sans)", fontWeight: 500,
      }}>
        <span className="t-num">{stock.openShort}</span> open{" "}
        <span style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>short</span>
      </span>
    );
  }
  if (stock.analysts > 0) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--text-meta)" }}>
        <Users size={10} strokeWidth={1.5}/>
        <span className="t-num">{stock.analysts}</span> covering
      </span>
    );
  }
  return <span className="t-meta" style={{ fontSize: 10, color: "var(--text-faint)" }}>No coverage</span>;
}

// ── Stock card ───────────────────────────────────────────────────────────────
function StockCard({ stock, isWatched, onToggleWatch, onClick }) {
  const up = (stock.change ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      className="surface surface-interactive"
      style={{
        padding: 16, cursor: "pointer", position: "relative",
        background: isWatched ? "rgba(212,175,55,0.04)" : "var(--bg-soft)",
        borderColor: isWatched ? "rgba(212,175,55,0.28)" : "var(--border-rgba)",
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatch(); }}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
        style={{
          position: "absolute", top: 10, right: 10,
          width: 26, height: 26, borderRadius: 5,
          background: "transparent", border: 0,
          color: isWatched ? "var(--gold-hex)" : "var(--text-faint)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "color var(--t-fast) var(--ease), background var(--t-fast) var(--ease)",
        }}
      >
        <Star size={14} strokeWidth={1.5} style={{ fill: isWatched ? "var(--gold-hex)" : "transparent" }}/>
      </button>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span className="t-num" style={{ fontSize: 15, color: "var(--text)", letterSpacing: "0.02em" }}>
          {stock.symbol}
        </span>
        {stock.exchange && (
          <span style={{
            fontSize: 9, padding: "2px 5px",
            border: "0.5px solid var(--border-strong)",
            borderRadius: 3, color: "var(--text-meta)", letterSpacing: "0.06em",
          }}>
            {stock.exchange}
          </span>
        )}
      </div>

      <div style={{
        fontSize: 11.5, color: "var(--text-mute)", lineHeight: 1.4,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: 12,
      }}>
        {stock.name}
      </div>

      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <span className="t-num" style={{ fontSize: 18, color: "var(--text)", letterSpacing: "-0.01em" }}>
          {stock.price != null ? `$${Number(stock.price).toFixed(2)}` : "—"}
        </span>
        {stock.change != null && (
          <span style={{
            fontSize: 11, fontFamily: "var(--f-mono)", fontWeight: 500,
            padding: "2px 7px", borderRadius: 4,
            color: up ? "var(--rolex-green)" : "var(--velvet-red)",
            background: up ? "rgba(14,107,69,0.08)" : "rgba(146,43,62,0.08)",
            border: "0.5px solid",
            borderColor: up ? "rgba(14,107,69,0.32)" : "rgba(146,43,62,0.32)",
          }}>
            {up ? "▲" : "▼"} {up ? "+" : ""}
            {Number(stock.change).toFixed(2)}%
          </span>
        )}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        paddingTop: 10, borderTop: "0.5px solid var(--border-rgba)", gap: 8,
      }}>
        <span className="t-meta" style={{ fontSize: 10.5 }}>
          <span style={{ color: "var(--text-meta)" }}>Cap</span>{" "}
          <span className="t-num" style={{ color: "var(--text-body)" }}>{fmtCap(stock.mktCap)}</span>
        </span>
        <StoaCoverageBadge stock={stock}/>
      </div>
    </div>
  );
}

// ── Watchlist row ────────────────────────────────────────────────────────────
function WatchRow({ stock, onRemove, onClick }) {
  const up = (stock.change ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      className="surface-interactive"
      style={{
        display: "flex", alignItems: "center",
        padding: "12px 16px", gap: 14, cursor: "pointer",
        background: "var(--bg-soft)",
        border: "0.5px solid var(--border-rgba)",
        borderRadius: 8,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: 6,
        background: "linear-gradient(135deg, var(--deepest-navy), var(--primary-blue))",
        color: "#fff", fontSize: 10, fontFamily: "var(--f-mono)", fontWeight: 500,
        letterSpacing: "0.02em", flexShrink: 0,
      }}>
        {stock.symbol.slice(0, 4)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="t-num" style={{ fontSize: 13, color: "var(--text)" }}>{stock.symbol}</span>
          <span className="t-meta" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {stock.name}
          </span>
        </div>
      </div>

      {stock.analysts != null && (
        <span className="t-meta" style={{
          fontSize: 10.5, display: "inline-flex", alignItems: "center",
          gap: 4, color: "var(--text-mute)", whiteSpace: "nowrap",
        }}>
          <Users size={10} strokeWidth={1.5}/>
          <span className="t-num">{stock.analysts}</span>
          <span>covering</span>
        </span>
      )}

      <span className="t-num" style={{ fontSize: 13, color: "var(--text)", width: 90, textAlign: "right" }}>
        {stock.price != null ? `$${Number(stock.price).toFixed(2)}` : "—"}
      </span>

      <span className="t-meta" style={{ fontSize: 11, width: 80, textAlign: "right", color: "var(--text-mute)" }}>
        {fmtCap(stock.mktCap)}
      </span>

      {stock.change != null && (
        <span className="t-num" style={{
          fontSize: 12, width: 70, textAlign: "right",
          color: up ? "var(--rolex-green)" : "var(--velvet-red)",
          whiteSpace: "nowrap",
        }}>
          {up ? "+" : ""}{Number(stock.change).toFixed(2)}%
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove from watchlist"
        style={{
          width: 26, height: 26, borderRadius: 5,
          background: "transparent", border: 0,
          color: "var(--text-faint)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <X size={13} strokeWidth={1.7}/>
      </button>
    </div>
  );
}

/**
 * StocksPage — markets browser (v3 rebuild).
 * Layout per prototype/src/screens/markets.jsx: navy hero with live index
 * tiles, watchlist, filter row, stock grid with Stoa coverage badges.
 *
 * Data: preserves existing fetchTopStocks / fetchQuotes / fetchIndexes /
 * searchStocks plumbing and the stoa_watchlist localStorage key.
 */
export default function StocksPage() {
  const navigate = useNavigate();

  // Watchlist — single source of truth lives in watchlistStore (key
  // stoa_watchlist). Subscribe so Feed/Studio mutations show up here
  // immediately, and write back through saveWatchlist so the same custom
  // event fires the other direction too.
  const [watchlist, setWatchlist] = useState(loadWatchlist);
  useEffect(() => subscribeToWatchlist(setWatchlist), []);
  const [watchlistData, setWatchlistData] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Catalog
  const [topStocks, setTopStocks] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [exchange, setExchange] = useState("All");
  const [loading, setLoading] = useState(true);
  const [indexQuotes, setIndexQuotes] = useState([]);
  const [coverage, setCoverage] = useState({}); // { TICKER: { analysts, openLong, openShort } }
  const debounceRef = useRef(null);

  // Open predictions → coverage map (so badges reflect real Stoa activity)
  useEffect(() => {
    base44.entities.Prediction.filter({ status: "active" }, "-created_date", 500)
      .then((preds) => {
        const map = {};
        (preds || []).forEach((p) => {
          const t = (p.ticker || "").toUpperCase();
          if (!t) return;
          if (!map[t]) map[t] = { analysts: new Set(), openLong: 0, openShort: 0 };
          if (p.created_by) map[t].analysts.add(p.created_by);
          const dir = (p.direction || p.action || "").toLowerCase();
          if (dir === "long") map[t].openLong += 1;
          else if (dir === "short") map[t].openShort += 1;
        });
        const out = {};
        Object.entries(map).forEach(([t, v]) => {
          out[t] = { analysts: v.analysts.size, openLong: v.openLong, openShort: v.openShort };
        });
        setCoverage(out);
      })
      .catch(() => {});
  }, []);

  const toggleWatch = useCallback((symbol, name) => {
    const prev = loadWatchlist();
    const exists = prev.some((w) => w.symbol === symbol);
    const next = exists
      ? prev.filter((w) => w.symbol !== symbol)
      : [...prev, { symbol, name: name || symbol }];
    saveWatchlist(next);
    toast.success(exists ? `${symbol} removed` : `${symbol} added to watchlist`);
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (!watchlist.length) { setWatchlistData([]); return; }
    setWatchlistLoading(true);
    try {
      const data = await fetchQuotes(watchlist.map((w) => w.symbol));
      setWatchlistData(data);
    } catch {}
    finally { setWatchlistLoading(false); }
  }, [watchlist]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  useEffect(() => {
    // Two-call boot. fetchTopStocks failing was previously letting the
    // unhandled rejection bubble out of the useEffect, but `setLoading(false)`
    // never fired which kept the page stuck on "Loading markets…" forever.
    // Catching here ensures the grid always either renders rows or an
    // empty-state — never a perpetual spinner.
    fetchTopStocks()
      .then(setTopStocks)
      .catch(() => setTopStocks([]))
      .finally(() => setLoading(false));
    fetchIndexes().then(setIndexQuotes).catch(() => setIndexQuotes([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query.trim());
        setSearchResults(results);
      } catch { setSearchResults([]); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Merge Stoa coverage into each stock
  const withCoverage = (s) => ({
    ...s,
    ...(coverage[(s.symbol || "").toUpperCase()] || { analysts: 0 }),
    sector: sectorFor(s),
  });

  const sourceList = (searchResults !== null ? searchResults : topStocks).map(withCoverage);
  const filtered = sourceList.filter((s) =>
    (sector === "All" || s.sector === sector) &&
    (exchange === "All" || (s.exchange || "").toUpperCase().includes(exchange))
  );
  const watchedSet = new Set(watchlist.map((w) => w.symbol));
  const liveWatch = watchlist.map((w) => {
    const live = watchlistData.find((d) => d.symbol === w.symbol);
    return withCoverage(live || w);
  });

  return (
    <div className="page" style={{ background: "var(--bg)" }}>
      {/* ── Hero: live indexes ─────────────────────────────── */}
      <section className="ambient" style={{
        background: "var(--deepest-navy)", color: "#fff",
        padding: "44px 0 36px",
        position: "relative", overflow: "hidden",
      }}>
        <style>{`
          .markets-hero::before { background: var(--primary-blue); opacity: 0.22; }
          .markets-hero::after  { background: var(--gold-hex); opacity: 0.10; }
        `}</style>
        <div className="markets-hero ambient" style={{ position: "absolute", inset: 0, padding: 0 }}/>
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, height: 22, padding: "0 10px",
              border: "0.5px solid rgba(122,214,163,0.35)",
              background: "rgba(122,214,163,0.10)",
              borderRadius: 4, color: "#7AD6A3",
              fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
            }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, background: "#7AD6A3", borderRadius: "50%" }}/>
              Live market data · NYSE &amp; NASDAQ
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div className="t-eyebrow" style={{ color: "var(--gold-light-hex)", marginBottom: 8 }}>Markets</div>
              <h1 className="t-display" style={{ fontSize: 40, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                US equities
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "10px 0 0", maxWidth: 460, lineHeight: 1.55 }}>
                Browse the universe. Every ticker shows how many Stoa analysts are publishing on it.
              </p>
            </div>

            {indexQuotes.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {indexQuotes.map((idx) => {
                  const up = (idx.change ?? 0) >= 0;
                  return (
                    <div key={idx.symbol} style={{
                      padding: "10px 14px",
                      border: "0.5px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 8, minWidth: 102,
                    }}>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                        {idx.symbol}
                      </div>
                      <div style={{ fontFamily: "var(--f-mono)", fontWeight: 500, fontSize: 15, color: "#fff" }}>
                        {idx.symbol === "VIX" ? Number(idx.price).toFixed(2) : `$${Number(idx.price).toFixed(2)}`}
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        <span style={{ color: up ? "#7AD6A3" : "#E8847B", fontSize: 10.5, fontFamily: "var(--f-mono)" }}>
                          {up ? "▲" : "▼"} {up ? "+" : ""}{Number(idx.change).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="shell" style={{ padding: "32px 32px 80px" }}>
        {/* ── Watchlist ── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 6,
                background: "rgba(212,175,55,0.12)",
              }}>
                <Star size={13} strokeWidth={1.6} style={{ color: "var(--gold-hex)" }}/>
              </span>
              <div>
                <h2 className="t-title" style={{ fontSize: 16, margin: 0 }}>Watchlist</h2>
                <span className="t-meta" style={{ fontSize: 11 }}>
                  {watchlist.length} {watchlist.length === 1 ? "ticker" : "tickers"} tracked
                </span>
              </div>
            </div>
          </div>

          {watchlist.length === 0 ? (
            <div className="surface" style={{
              padding: 32, textAlign: "center",
              borderStyle: "dashed", background: "transparent",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, borderRadius: 8,
                background: "rgba(212,175,55,0.10)", margin: "0 auto 10px",
              }}>
                <Star size={18} strokeWidth={1.5} style={{ color: "var(--gold-hex)" }}/>
              </div>
              <div className="t-body" style={{ fontSize: 14, color: "var(--text)" }}>Your watchlist is empty</div>
              <div className="t-meta" style={{ marginTop: 4 }}>Star any ticker below to start tracking.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {liveWatch.map((s) => (
                <WatchRow
                  key={s.symbol}
                  stock={s}
                  onRemove={() => toggleWatch(s.symbol, s.name)}
                  onClick={() => navigate(`/stock?ticker=${s.symbol}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Filter row ── */}
        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "flex-end" }}>
            <div>
              <h2 className="t-title" style={{ fontSize: 16, margin: 0 }}>Most active</h2>
              <span className="t-meta" style={{ fontSize: 11 }}>
                {filtered.length} stocks · Ranked by volume
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="search" style={{ width: 240, height: 32 }}>
                <Search size={13} aria-hidden="true"/>
                <input
                  placeholder="Ticker or company…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSector(s)}
                  className="btn btn-sm"
                  style={{
                    height: 28, padding: "0 12px",
                    background: sector === s ? "var(--bg-soft)" : "transparent",
                    border: "0.5px solid",
                    borderColor: sector === s ? "var(--border-strong)" : "var(--border-rgba)",
                    color: sector === s ? "var(--text)" : "var(--text-mute)",
                    fontWeight: 500,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{
              display: "flex", gap: 4, padding: 3,
              background: "var(--bg-soft)",
              border: "0.5px solid var(--border-rgba)", borderRadius: 6,
            }}>
              {EXCHANGES.map((e) => (
                <button
                  key={e}
                  onClick={() => setExchange(e)}
                  className="btn btn-sm"
                  style={{
                    height: 22, padding: "0 10px", fontSize: 11,
                    background: exchange === e ? "var(--deepest-navy)" : "transparent",
                    color: exchange === e ? "#fff" : "var(--text-mute)",
                    borderRadius: 4,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <span className="t-meta">Loading markets…</span>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}>
            {filtered.slice(0, PAGE_SIZE).map((s) => (
              <StockCard
                key={s.symbol}
                stock={s}
                isWatched={watchedSet.has(s.symbol)}
                onToggleWatch={() => toggleWatch(s.symbol, s.name)}
                onClick={() => navigate(`/stock?ticker=${s.symbol}`)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: "center" }}>
            <span className="t-meta">No stocks match those filters.</span>
          </div>
        )}
      </div>
    </div>
  );
}
