/**
 * Price lock provider — multi-source live price fetching with fallback.
 *
 * Used by the publish flow to lock a tamper-proof entry price at the exact
 * moment an analyst clicks Publish. Returns the price, the timestamp, and
 * the source so the UI can display data provenance on the report
 * ("Locked at $123.45 via Finnhub real-time, 2026-05-12 14:23:17 UTC").
 *
 * Provider chain (first available wins):
 *   1. Finnhub      — real-time US stocks, 60 calls/min free tier
 *   2. Polygon.io   — real-time, requires paid plan
 *   3. Yahoo (proxy) — 15-min delayed, no SLA, last-resort
 *
 * Configure via env:
 *   VITE_FINNHUB_API_KEY  = "..."
 *   VITE_POLYGON_API_KEY  = "..."
 * If neither is set, Yahoo is used.
 *
 * Note: API keys exposed client-side are fine for free tiers but for a
 * production scale-up move this fetch into a Base44 server function.
 */
import { base44 } from "@/api/base44Client";

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const POLYGON_KEY = import.meta.env.VITE_POLYGON_API_KEY;

// ── Provider implementations ──────────────────────────────────────────────────

async function fetchFinnhub(ticker) {
  if (!FINNHUB_KEY) throw new Error("no_key");
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`,
  });
  const d = r?.data || {};
  // Finnhub returns: { c: current, pc: prev close, t: unix-seconds, ... }
  if (!d.c || d.c <= 0) throw new Error("no_price");
  return {
    price:     d.c,
    timestamp: d.t ? new Date(d.t * 1000).toISOString() : new Date().toISOString(),
    source:    "finnhub",
    sla:       "real-time",
  };
}

async function fetchPolygon(ticker) {
  if (!POLYGON_KEY) throw new Error("no_key");
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://api.polygon.io/v2/last/trade/${encodeURIComponent(ticker)}?apiKey=${POLYGON_KEY}`,
  });
  const t = r?.data?.results;
  if (!t?.p || t.p <= 0) throw new Error("no_price");
  return {
    price:     t.p,
    timestamp: t.t ? new Date(t.t / 1e6).toISOString() : new Date().toISOString(), // ns → ms
    source:    "polygon",
    sla:       "real-time",
  };
}

async function fetchYahoo(ticker) {
  // Existing path: Base44 server function wraps Yahoo
  const result = await base44.functions.invoke("getStockData", { ticker });
  const d = result?.data || result;
  const price = d?.price ?? d?.regularMarketPrice ?? null;
  if (!price) throw new Error("no_price");
  return {
    price,
    timestamp: new Date().toISOString(),
    source:    "yahoo",
    sla:       "delayed-15min",
  };
}

// ── Main entry ────────────────────────────────────────────────────────────────
// Tries each configured provider in order. Throws if all fail so the caller
// can abort publish (we never want to lock with a stale or wrong price).
export async function fetchLockPrice(ticker) {
  if (!ticker) throw new Error("ticker_required");
  const sym = ticker.trim().toUpperCase();

  const chain = [];
  if (FINNHUB_KEY) chain.push(fetchFinnhub);
  if (POLYGON_KEY) chain.push(fetchPolygon);
  chain.push(fetchYahoo); // always last-resort

  let lastErr = null;
  for (const fn of chain) {
    try {
      const result = await fn(sym);
      if (result?.price) return result;
    } catch (e) {
      lastErr = e;
      // try next provider
    }
  }
  throw lastErr || new Error("all_providers_failed");
}

// ── Timeframe → expiry ────────────────────────────────────────────────────────
// Converts a human timeframe ("3 Days", "1 Week", "1 Month", "90 days", …) into
// a number of days. Used to stamp a concrete expiry date on a prediction at the
// moment it's locked, so the UI can show "Expires in 12 days" and the resolver
// knows exactly when to close the call. Defaults to 180 days if unparseable.
export function timeframeToDays(timeframe) {
  if (!timeframe) return 180;
  const str = String(timeframe).toLowerCase();
  const n = parseInt(str, 10);
  const num = isFinite(n) && n > 0 ? n : 1;
  if (str.includes("day"))   return num;
  if (str.includes("week"))  return num * 7;
  if (str.includes("month")) return num * 30;
  if (str.includes("year"))  return num * 365;
  return 180;
}

// Given a lock timestamp (ISO string or Date) and a timeframe, returns the
// expiry as an ISO string.
export function computeExpiry(lockTime, timeframe) {
  const start = lockTime ? new Date(lockTime) : new Date();
  const days = timeframeToDays(timeframe);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ── Display helpers for the UI ────────────────────────────────────────────────
export function describeSource(source) {
  switch (source) {
    case "finnhub": return { label: "Finnhub", quality: "Real-time",        color: "text-green-700", bg: "bg-green-50 border-green-200" };
    case "polygon": return { label: "Polygon", quality: "Real-time",        color: "text-green-700", bg: "bg-green-50 border-green-200" };
    case "iex":     return { label: "IEX",     quality: "Real-time",        color: "text-green-700", bg: "bg-green-50 border-green-200" };
    case "yahoo":   return { label: "Yahoo",   quality: "~15-min delayed",  color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    default:        return { label: source || "Unknown", quality: "Unknown", color: "text-muted-foreground", bg: "bg-secondary border-border" };
  }
}