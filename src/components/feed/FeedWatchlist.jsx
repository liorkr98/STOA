import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

const WATCHLIST_KEY = "stoa_watchlist";
const TIMEFRAMES = [
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "1Y", label: "1Y" },
];
const TF_PARAMS = {
  "1D": { range: "1d",  interval: "5m"  },
  "1W": { range: "5d",  interval: "60m" },
  "1M": { range: "1mo", interval: "1d"  },
  "1Y": { range: "1y",  interval: "1wk" },
};

// Normalise the shared `stoa_watchlist` localStorage entry. The key is written
// by both the Markets page (shape `{ symbol, name }`) and the legacy
// WatchlistPanel (shape `{ ticker, timeframe }`), plus older builds stored
// plain strings. Anything we can't recognise is dropped on the floor.
function loadShared() {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map((e) => (typeof e === "string"
        ? { symbol: e }
        : { symbol: e.symbol || e.ticker, name: e.name }))
      .filter((e) => e.symbol);
  } catch { return []; }
}

async function fetchQuote(symbol, timeframe) {
  try {
    const r = await base44.functions.invoke("proxyFetch", {
      url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const meta = r?.data?.chart?.result?.[0]?.meta || {};
    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose;
    let changePct = price != null && prev ? ((price - prev) / prev) * 100 : null;

    if (timeframe !== "1D") {
      const { range, interval } = TF_PARAMS[timeframe];
      const chart = await base44.functions.invoke("proxyFetch", {
        url: `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&formatted=false`,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const closes = chart?.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean);
      if (closes && closes.length >= 2) {
        changePct = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
      }
    }
    return { symbol, price, change: changePct, name: meta.longName || meta.shortName || symbol };
  } catch {
    return { symbol, price: null, change: null };
  }
}

export default function FeedWatchlist() {
  const [entries, setEntries] = useState(loadShared);
  const [data, setData] = useState({});
  const [timeframe, setTimeframe] = useState("1D");

  const refresh = useCallback(async (tf) => {
    if (!entries.length) return;
    const results = await Promise.all(entries.map((e) => fetchQuote(e.symbol, tf)));
    const map = {};
    results.forEach((r) => { map[r.symbol] = r; });
    setData(map);
  }, [entries]);

  useEffect(() => { refresh(timeframe); }, [refresh, timeframe]);

  // Keep in sync if another page edits the watchlist while this widget is
  // mounted — Markets removes/adds tickers via the same localStorage key.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === WATCHLIST_KEY) setEntries(loadShared());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="surface" style={{ padding: 0, marginTop: 16, overflow: "hidden" }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "0.5px solid var(--border-rgba)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Star size={12} strokeWidth={1.7} style={{ color: "var(--gold-hex)" }}/>
        <span className="t-eyebrow">Watchlist</span>
        <div style={{ flex: 1 }}/>
        <span className="t-meta" style={{ fontSize: 10 }}>{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: 18 }}>
          <p className="t-meta" style={{ fontSize: 11.5, lineHeight: 1.55, margin: 0 }}>
            Star tickers on the <Link to="/stocks" style={{ color: "var(--primary-blue)" }}>Markets page</Link> to track them here.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 18px",
            borderBottom: "0.5px solid var(--border-rgba)",
          }}>
            <span className="t-meta" style={{ fontSize: 10 }}>Show growth</span>
            <div style={{ flex: 1 }}/>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className="btn btn-sm"
                style={{
                  height: 20, padding: "0 7px", fontSize: 10,
                  background: timeframe === tf.value ? "var(--primary-blue)" : "transparent",
                  color: timeframe === tf.value ? "#fff" : "var(--text-mute)",
                  border: "0.5px solid",
                  borderColor: timeframe === tf.value ? "var(--primary-blue)" : "var(--border-rgba)",
                  borderRadius: 4,
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {entries.map((e, i) => {
            const q = data[e.symbol] || {};
            const up = (q.change ?? 0) >= 0;
            return (
              <Link
                key={e.symbol}
                to={`/stock/${e.symbol}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px",
                  borderBottom: i < entries.length - 1 ? "0.5px solid var(--border-rgba)" : "none",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <span className="t-num" style={{ fontSize: 12.5, color: "var(--text)", width: 56 }}>
                  {e.symbol}
                </span>
                <span className="t-num" style={{ fontSize: 12, color: "var(--text-mute)", flex: 1, textAlign: "right" }}>
                  {q.price != null ? `$${Number(q.price).toFixed(2)}` : "—"}
                </span>
                <span className="t-num" style={{
                  fontSize: 12,
                  color: q.change == null
                    ? "var(--text-faint)"
                    : up ? "var(--rolex-green)" : "var(--velvet-red)",
                  width: 64, textAlign: "right",
                }}>
                  {q.change != null
                    ? `${up ? "+" : ""}${Number(q.change).toFixed(2)}%`
                    : "—"}
                </span>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
